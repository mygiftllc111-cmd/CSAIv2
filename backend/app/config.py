from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # Project
    PROJECT_NAME: str = "Hospitality Agent Infrastructure"
    API_PREFIX: str = "/api"

    # Database (Supabase PostgreSQL)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    DATABASE_URL: str = ""  # postgresql+asyncpg://...

    # Admin
    ADMIN_PASSWORD: str = "dev-admin-2026!"

    # JWT / Session
    SECRET_KEY: str = "csai-dev-secret-key-change-in-production"
    ADMIN_SESSION_EXPIRE_HOURS: int = 24

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None

    # Notion
    NOTION_API_TOKEN: Optional[str] = None

    # Google Drive
    GOOGLE_SERVICE_ACCOUNT_JSON: Optional[str] = None

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3247", "http://127.0.0.1:3247"]

    model_config = {
        "env_file": "../.env.local",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
