import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, DateTime, func
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"

    source_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # notion / google_drive
    connection_config: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    sync_interval_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=60
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    document_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    status: Mapped[str] = mapped_column(
        String(10), nullable=False, default="active"
    )  # active / error / syncing


class Document(Base):
    __tablename__ = "documents"

    doc_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    source_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # embedding vector is managed via pgvector extension directly
    synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
