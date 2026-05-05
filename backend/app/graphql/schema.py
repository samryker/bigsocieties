import uuid
from datetime import date, datetime
from enum import Enum
from statistics import median
from typing import Any

import jwt
import strawberry
from fastapi import Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from strawberry.fastapi import BaseContext
from strawberry.scalars import JSON

from app.core.security import create_access_token, hash_password, verify_password
from app.db.postgres import get_session
from app.listings.models import Furnishing, Inquiry, Listing, ListingImage, ListingStatus, PropertyType
from app.users.models import User, UserRole


class GraphQLContext(BaseContext):
    def __init__(self, session: AsyncSession, user: User | None):
        self.session = session
        self.user = user


async def get_context(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> GraphQLContext:
    user = None
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "bearer" and token:
        from app.core.security import decode_access_token

        try:
            payload = decode_access_token(token)
            user_id = uuid.UUID(payload["sub"])
            user = await session.get(User, user_id)
            if user is not None and not user.is_active:
                user = None
        except (KeyError, ValueError, jwt.PyJWTError):
            user = None
    return GraphQLContext(session=session, user=user)


def require_user(context: GraphQLContext) -> User:
    if context.user is None:
        raise ValueError("Not authenticated")
    return context.user


def require_role(context: GraphQLContext, *roles: UserRole) -> User:
    user = require_user(context)
    if user.role not in roles:
        raise ValueError("Insufficient role")
    return user


@strawberry.enum
class GQLUserRole(Enum):
    tenant = "tenant"
    owner = "owner"
    admin = "admin"


@strawberry.enum
class GQLPropertyType(Enum):
    flat = "flat"
    plot = "plot"


@strawberry.enum
class GQLListingStatus(Enum):
    draft = "draft"
    published = "published"
    unpublished = "unpublished"


@strawberry.enum
class GQLFurnishing(Enum):
    unfurnished = "unfurnished"
    semi_furnished = "semi_furnished"
    fully_furnished = "fully_furnished"


@strawberry.type
class UserType:
    id: strawberry.ID
    email: str
    phone: str | None
    role: GQLUserRole
    is_active: bool


@strawberry.type
class ListingImageType:
    id: strawberry.ID
    url: str
    storage_key: str | None
    caption: str | None
    width: int | None
    height: int | None
    sort_order: int


@strawberry.type
class ListingType:
    id: strawberry.ID
    owner_id: strawberry.ID
    title: str
    description: str
    property_type: GQLPropertyType
    status: GQLListingStatus
    rent: int
    deposit: int
    currency: str
    locality: str
    city: str
    address_line1: str
    landmark: str | None
    postal_code: str | None
    latitude: float
    longitude: float
    bedrooms: int | None
    bathrooms: int | None
    area_sqft: int | None
    furnishing: GQLFurnishing | None
    amenities: list[str]
    attributes: JSON
    available_from: date | None
    created_at: datetime
    updated_at: datetime
    images: list[ListingImageType]


@strawberry.type
class InquiryType:
    id: strawberry.ID
    listing_id: strawberry.ID
    owner_id: strawberry.ID
    tenant_id: strawberry.ID
    message: str
    created_at: datetime


@strawberry.type
class AuthPayload:
    access_token: str
    token_type: str
    user: UserType


@strawberry.type
class ListingSearchResponse:
    items: list[ListingType]
    total: int
    limit: int
    offset: int


@strawberry.type
class PricingSuggestion:
    suggested_min: int | None
    suggested_max: int | None
    median_rent: int | None
    sample_size: int


@strawberry.input
class RegisterInput:
    email: str
    password: str
    role: GQLUserRole
    phone: str | None = None


@strawberry.input
class LoginInput:
    email: str
    password: str


@strawberry.input
class ListingImageInput:
    url: str
    storage_key: str | None = None
    caption: str | None = None
    width: int | None = None
    height: int | None = None
    sort_order: int = 0


@strawberry.input
class ListingInput:
    title: str
    description: str
    property_type: GQLPropertyType
    rent: int
    deposit: int
    locality: str
    city: str
    address_line1: str
    latitude: float
    longitude: float
    currency: str = "INR"
    landmark: str | None = None
    postal_code: str | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    area_sqft: int | None = None
    furnishing: GQLFurnishing | None = None
    amenities: list[str] | None = None
    attributes: JSON | None = None
    images: list[ListingImageInput] | None = None
    available_from: date | None = None


@strawberry.input
class ListingUpdateInput:
    title: str | None = None
    description: str | None = None
    rent: int | None = None
    deposit: int | None = None
    locality: str | None = None
    city: str | None = None
    address_line1: str | None = None
    landmark: str | None = None
    postal_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    area_sqft: int | None = None
    furnishing: GQLFurnishing | None = None
    amenities: list[str] | None = None
    attributes: JSON | None = None
    images: list[ListingImageInput] | None = None
    available_from: date | None = None


@strawberry.input
class ListingFilterInput:
    locality: str | None = None
    city: str | None = None
    property_type: GQLPropertyType | None = None
    min_rent: int | None = None
    max_rent: int | None = None
    bedrooms: int | None = None
    limit: int = 20
    offset: int = 0


def user_type(user: User) -> UserType:
    return UserType(
        id=strawberry.ID(str(user.id)),
        email=user.email,
        phone=user.phone,
        role=GQLUserRole(user.role.value),
        is_active=user.is_active,
    )


def image_type(image: ListingImage) -> ListingImageType:
    return ListingImageType(
        id=strawberry.ID(str(image.id)),
        url=image.url,
        storage_key=image.storage_key,
        caption=image.caption,
        width=image.width,
        height=image.height,
        sort_order=image.sort_order,
    )


def listing_type(listing: Listing) -> ListingType:
    return ListingType(
        id=strawberry.ID(str(listing.id)),
        owner_id=strawberry.ID(str(listing.owner_id)),
        title=listing.title,
        description=listing.description,
        property_type=GQLPropertyType(listing.property_type.value),
        status=GQLListingStatus(listing.status.value),
        rent=listing.rent,
        deposit=listing.deposit,
        currency=listing.currency,
        locality=listing.locality,
        city=listing.city,
        address_line1=listing.address_line1,
        landmark=listing.landmark,
        postal_code=listing.postal_code,
        latitude=listing.latitude,
        longitude=listing.longitude,
        bedrooms=listing.bedrooms,
        bathrooms=listing.bathrooms,
        area_sqft=listing.area_sqft,
        furnishing=GQLFurnishing(listing.furnishing.value) if listing.furnishing else None,
        amenities=listing.amenities or [],
        attributes=listing.attributes or {},
        available_from=listing.available_from,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        images=[image_type(image) for image in listing.images],
    )


def inquiry_type(inquiry: Inquiry) -> InquiryType:
    return InquiryType(
        id=strawberry.ID(str(inquiry.id)),
        listing_id=strawberry.ID(str(inquiry.listing_id)),
        owner_id=strawberry.ID(str(inquiry.owner_id)),
        tenant_id=strawberry.ID(str(inquiry.tenant_id)),
        message=inquiry.message,
        created_at=inquiry.created_at,
    )


def listing_query(filter_input: ListingFilterInput | None = None):
    filter_input = filter_input or ListingFilterInput()
    statement = select(Listing).where(Listing.status == ListingStatus.published)
    count_statement = select(func.count()).select_from(Listing).where(
        Listing.status == ListingStatus.published
    )
    conditions = []
    if filter_input.locality:
        conditions.append(Listing.locality.ilike(f"%{filter_input.locality}%"))
    if filter_input.city:
        conditions.append(Listing.city.ilike(f"%{filter_input.city}%"))
    if filter_input.property_type:
        conditions.append(Listing.property_type == PropertyType(filter_input.property_type.value))
    if filter_input.bedrooms is not None:
        conditions.append(Listing.bedrooms == filter_input.bedrooms)
    if filter_input.min_rent is not None:
        conditions.append(Listing.rent >= filter_input.min_rent)
    if filter_input.max_rent is not None:
        conditions.append(Listing.rent <= filter_input.max_rent)
    for condition in conditions:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    return statement, count_statement, filter_input


async def get_listing_or_error(
    session: AsyncSession,
    listing_id: strawberry.ID,
    owner_id: uuid.UUID | None = None,
) -> Listing:
    statement = (
        select(Listing)
        .options(selectinload(Listing.images))
        .where(Listing.id == uuid.UUID(str(listing_id)))
    )
    if owner_id is not None:
        statement = statement.where(Listing.owner_id == owner_id)
    listing = (await session.execute(statement)).scalar_one_or_none()
    if listing is None:
        raise ValueError("Listing not found")
    return listing


def apply_listing_input(listing: Listing, payload: ListingInput | ListingUpdateInput) -> Listing:
    for field in (
        "title",
        "description",
        "rent",
        "deposit",
        "locality",
        "city",
        "address_line1",
        "landmark",
        "postal_code",
        "latitude",
        "longitude",
        "bedrooms",
        "bathrooms",
        "area_sqft",
        "amenities",
        "attributes",
        "available_from",
    ):
        value = getattr(payload, field, None)
        if value is not None:
            setattr(listing, field, value)
    if getattr(payload, "property_type", None) is not None:
        listing.property_type = PropertyType(payload.property_type.value)
    if getattr(payload, "furnishing", None) is not None:
        listing.furnishing = Furnishing(payload.furnishing.value)
    if getattr(payload, "images", None) is not None:
        listing.images = [
            ListingImage(
                url=image.url,
                storage_key=image.storage_key,
                caption=image.caption,
                width=image.width,
                height=image.height,
                sort_order=image.sort_order,
            )
            for image in payload.images
        ]
    return listing


@strawberry.type
class Query:
    @strawberry.field
    async def me(self, info: strawberry.Info[GraphQLContext, Any]) -> UserType | None:
        return user_type(info.context.user) if info.context.user else None

    @strawberry.field
    async def listings(
        self,
        info: strawberry.Info[GraphQLContext, Any],
        filter: ListingFilterInput | None = None,
    ) -> ListingSearchResponse:
        statement, count_statement, filter_input = listing_query(filter)
        limit = min(max(filter_input.limit, 1), 100)
        offset = max(filter_input.offset, 0)
        statement = (
            statement.options(selectinload(Listing.images))
            .order_by(Listing.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        items = (await info.context.session.execute(statement)).scalars().all()
        total = (await info.context.session.execute(count_statement)).scalar_one()
        return ListingSearchResponse(
            items=[listing_type(item) for item in items],
            total=total,
            limit=limit,
            offset=offset,
        )

    @strawberry.field
    async def listing(
        self,
        info: strawberry.Info[GraphQLContext, Any],
        id: strawberry.ID,
    ) -> ListingType:
        listing = await get_listing_or_error(info.context.session, id)
        if listing.status != ListingStatus.published:
            raise ValueError("Listing not found")
        return listing_type(listing)

    @strawberry.field
    async def owner_listings(self, info: strawberry.Info[GraphQLContext, Any]) -> list[ListingType]:
        owner = require_role(info.context, UserRole.owner, UserRole.admin)
        statement = (
            select(Listing)
            .options(selectinload(Listing.images))
            .where(Listing.owner_id == owner.id)
            .order_by(Listing.updated_at.desc())
        )
        listings = (await info.context.session.execute(statement)).scalars().all()
        return [listing_type(listing) for listing in listings]

    @strawberry.field
    async def owner_inquiries(self, info: strawberry.Info[GraphQLContext, Any]) -> list[InquiryType]:
        owner = require_role(info.context, UserRole.owner, UserRole.admin)
        statement = select(Inquiry).where(Inquiry.owner_id == owner.id).order_by(Inquiry.created_at.desc())
        inquiries = (await info.context.session.execute(statement)).scalars().all()
        return [inquiry_type(inquiry) for inquiry in inquiries]

    @strawberry.field
    async def tenant_inquiries(self, info: strawberry.Info[GraphQLContext, Any]) -> list[InquiryType]:
        tenant = require_role(info.context, UserRole.tenant)
        statement = select(Inquiry).where(Inquiry.tenant_id == tenant.id).order_by(Inquiry.created_at.desc())
        inquiries = (await info.context.session.execute(statement)).scalars().all()
        return [inquiry_type(inquiry) for inquiry in inquiries]

    @strawberry.field
    async def pricing_suggestion(
        self,
        info: strawberry.Info[GraphQLContext, Any],
        locality: str,
        property_type: GQLPropertyType,
        bedrooms: int | None = None,
        area_sqft: int | None = None,
    ) -> PricingSuggestion:
        statement = select(Listing.rent).where(
            Listing.status == ListingStatus.published,
            Listing.locality.ilike(locality),
            Listing.property_type == PropertyType(property_type.value),
        )
        if bedrooms is not None:
            statement = statement.where(Listing.bedrooms == bedrooms)
        if area_sqft is not None:
            statement = statement.where(
                Listing.area_sqft >= int(area_sqft * 0.8),
                Listing.area_sqft <= int(area_sqft * 1.2),
            )
        rents = list((await info.context.session.execute(statement.limit(100))).scalars().all())
        if not rents:
            return PricingSuggestion(None, None, None, 0)
        median_rent = int(median(rents))
        return PricingSuggestion(
            suggested_min=int(median_rent * 0.9),
            suggested_max=int(median_rent * 1.1),
            median_rent=median_rent,
            sample_size=len(rents),
        )


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def register(
        self,
        info: strawberry.Info[GraphQLContext, Any],
        input: RegisterInput,
    ) -> AuthPayload:
        user = User(
            email=input.email.lower(),
            phone=input.phone,
            password_hash=hash_password(input.password),
            role=UserRole(input.role.value),
        )
        info.context.session.add(user)
        await info.context.session.commit()
        await info.context.session.refresh(user)
        token = create_access_token(str(user.id), {"role": user.role.value})
        return AuthPayload(access_token=token, token_type="bearer", user=user_type(user))

    @strawberry.mutation
    async def login(
        self,
        info: strawberry.Info[GraphQLContext, Any],
        input: LoginInput,
    ) -> AuthPayload:
        statement = select(User).where(User.email == input.email.lower())
        user = (await info.context.session.execute(statement)).scalar_one_or_none()
        if user is None or not verify_password(input.password, user.password_hash):
            raise ValueError("Invalid credentials")
        if not user.is_active:
            raise ValueError("User is disabled")
        token = create_access_token(str(user.id), {"role": user.role.value})
        return AuthPayload(access_token=token, token_type="bearer", user=user_type(user))

    @strawberry.mutation
    async def create_listing(
        self,
        info: strawberry.Info[GraphQLContext, Any],
        input: ListingInput,
    ) -> ListingType:
        owner = require_role(info.context, UserRole.owner, UserRole.admin)
        listing = Listing(owner_id=owner.id)
        apply_listing_input(listing, input)
        info.context.session.add(listing)
        await info.context.session.commit()
        await info.context.session.refresh(listing, attribute_names=["images"])
        return listing_type(listing)

    @strawberry.mutation
    async def update_listing(
        self,
        info: strawberry.Info[GraphQLContext, Any],
        id: strawberry.ID,
        input: ListingUpdateInput,
    ) -> ListingType:
        owner = require_role(info.context, UserRole.owner, UserRole.admin)
        listing = await get_listing_or_error(info.context.session, id, owner_id=owner.id)
        apply_listing_input(listing, input)
        await info.context.session.commit()
        await info.context.session.refresh(listing, attribute_names=["images"])
        return listing_type(listing)

    @strawberry.mutation
    async def publish_listing(
        self,
        info: strawberry.Info[GraphQLContext, Any],
        id: strawberry.ID,
    ) -> ListingType:
        owner = require_role(info.context, UserRole.owner, UserRole.admin)
        listing = await get_listing_or_error(info.context.session, id, owner_id=owner.id)
        listing.status = ListingStatus.published
        await info.context.session.commit()
        listing = await get_listing_or_error(info.context.session, id, owner_id=owner.id)
        return listing_type(listing)

    @strawberry.mutation
    async def unpublish_listing(
        self,
        info: strawberry.Info[GraphQLContext, Any],
        id: strawberry.ID,
    ) -> ListingType:
        owner = require_role(info.context, UserRole.owner, UserRole.admin)
        listing = await get_listing_or_error(info.context.session, id, owner_id=owner.id)
        listing.status = ListingStatus.unpublished
        await info.context.session.commit()
        listing = await get_listing_or_error(info.context.session, id, owner_id=owner.id)
        return listing_type(listing)

    @strawberry.mutation
    async def create_inquiry(
        self,
        info: strawberry.Info[GraphQLContext, Any],
        listing_id: strawberry.ID,
        message: str,
    ) -> InquiryType:
        tenant = require_role(info.context, UserRole.tenant)
        if len(message.strip()) < 10:
            raise ValueError("Inquiry message must be at least 10 characters")
        listing = await get_listing_or_error(info.context.session, listing_id)
        if listing.status != ListingStatus.published:
            raise ValueError("Listing not found")
        inquiry = Inquiry(
            listing_id=listing.id,
            owner_id=listing.owner_id,
            tenant_id=tenant.id,
            message=message.strip(),
        )
        info.context.session.add(inquiry)
        await info.context.session.commit()
        await info.context.session.refresh(inquiry)
        return inquiry_type(inquiry)


schema = strawberry.Schema(query=Query, mutation=Mutation)
