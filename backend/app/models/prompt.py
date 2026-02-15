import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, DateTime, func
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PromptConfig(Base):
    __tablename__ = "prompt_configs"

    config_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    few_shot_examples: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=False, default=list
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_by: Mapped[str] = mapped_column(
        String(50), nullable=False, default="管理者"
    )
