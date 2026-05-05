from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.auth.router import router as auth_router
from app.core.config import settings
from app.db.postgres import create_db_schema
from app.graphql.schema import get_context, schema
from app.listings import models as listing_models  # noqa: F401
from app.users import models as user_models  # noqa: F401


@asynccontextmanager
async def lifespan(_: FastAPI):
    await create_db_schema()
    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(GraphQLRouter(schema, context_getter=get_context), prefix="/graphql")


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
