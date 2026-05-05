import enum
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.postgres import Base


class PropertyType(str, enum.Enum):
    flat = "flat"
    plot = "plot"


class ListingStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    unpublished = "unpublished"


class Furnishing(str, enum.Enum):
    unfurnished = "unfurnished"
    semi_furnished = "semi_furnished"
    fully_furnished = "fully_furnished"


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (
        Index("ix_listings_search", "status", "city", "locality", "property_type"),
        Index("ix_listings_rent", "status", "rent"),
        Index("ix_listings_attributes_gin", "attributes", postgresql_using="gin"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    property_type: Mapped[PropertyType] = mapped_column(Enum(PropertyType), index=True)
    status: Mapped[ListingStatus] = mapped_column(
        Enum(ListingStatus), default=ListingStatus.draft, index=True
    )
    rent: Mapped[int] = mapped_column(Integer)
    deposit: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    locality: Mapped[str] = mapped_column(String(120), index=True)
    city: Mapped[str] = mapped_column(String(120), index=True)
    address_line1: Mapped[str] = mapped_column(String(255))
    landmark: Mapped[str | None] = mapped_column(String(160), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    bedrooms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bathrooms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    area_sqft: Mapped[int | None] = mapped_column(Integer, nullable=True)
    furnishing: Mapped[Furnishing | None] = mapped_column(Enum(Furnishing), nullable=True)
    amenities: Mapped[list[str]] = mapped_column(JSONB, default=list)
    attributes: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    available_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    images: Mapped[list["ListingImage"]] = relationship(
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="ListingImage.sort_order",
        lazy="selectin",
    )
    inquiries: Mapped[list["Inquiry"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan", lazy="selectin"
    )


class ListingImage(Base):
    __tablename__ = "listing_images"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("listings.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(Text)
    storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    caption: Mapped[str | None] = mapped_column(String(160), nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    listing: Mapped[Listing] = relationship(back_populates="images")


class Inquiry(Base):
    __tablename__ = "inquiries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    listing: Mapped[Listing] = relationship(back_populates="inquiries")
