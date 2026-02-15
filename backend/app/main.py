import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)

from app.config import settings
from app.database import engine, Base
from app.routers import auth, chat, admin_users, admin_logs, admin_prompt, admin_knowledge

# Import all models so they are registered with Base.metadata
from app.models import user, conversation, admin, prompt, knowledge  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev only; use migrations in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers - Slice 1: Auth
app.include_router(auth.router, prefix="/api", tags=["auth"])

# Routers - Slice 2-A: Chat
app.include_router(chat.router, prefix="/api", tags=["chat"])

# Routers - Slice 2-B: Admin Users
app.include_router(admin_users.router, prefix="/api", tags=["admin-users"])

# Routers - Slice 3-A: Log Analytics
app.include_router(admin_logs.router, prefix="/api", tags=["admin-logs"])

# Routers - Slice 3-B: Prompt Config
app.include_router(admin_prompt.router, prefix="/api", tags=["admin-prompt"])

# Routers - Slice 3-C: Knowledge Sources
app.include_router(admin_knowledge.router, prefix="/api", tags=["admin-knowledge"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {exc}\n{traceback.format_exc()}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/")
async def root():
    return {"message": "Hospitality Agent Infrastructure API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
