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
    ADMIN_PASSWORD: str = ""

    # JWT / Session
    SECRET_KEY: str = ""
    ADMIN_SESSION_EXPIRE_HOURS: int = 24

    # OpenAI / LLM
    OPENAI_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 1024
    LLM_EMBEDDING_MODEL: str = "text-embedding-3-small"
    LLM_EMBEDDING_DIMENSIONS: int = 1536

    # Notion
    NOTION_API_TOKEN: Optional[str] = None

    # Google Drive
    GOOGLE_SERVICE_ACCOUNT_JSON: Optional[str] = None

    # Environment
    ENVIRONMENT: str = "development"  # "development" | "production"
    PORT: int = 8080

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3247", "http://127.0.0.1:3247"]

    model_config = {
        "env_file": "../.env.local",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
