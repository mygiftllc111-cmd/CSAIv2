import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import UserProfile


class Conversation(Base):
    __tablename__ = "conversations"

    conversation_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_profile_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("user_profiles.profile_id"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="新しい会話")
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user_profile: Mapped["UserProfile"] = relationship(
        "UserProfile", back_populates="conversations"
    )
    messages: Mapped[List["Message"]] = relationship(
        "Message",
        back_populates="conversation",
        order_by="Message.created_at",
        lazy="selectin",
    )


class Message(Base):
    __tablename__ = "messages"

    message_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    conversation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("conversations.conversation_id"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # user / assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    input_method: Mapped[str] = mapped_column(
        String(10), nullable=False, default="text"
    )  # text / voice
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )
