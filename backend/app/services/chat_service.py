import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message
from app.models.user import UserProfile


async def create_conversation(
    db: AsyncSession,
    user_profile_id: str,
    title: str = "新しい会話",
) -> Conversation:
    """Create a new conversation."""
    conv = Conversation(
        conversation_id=str(uuid.uuid4()),
        user_profile_id=user_profile_id,
        title=title,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


async def get_conversations(
    db: AsyncSession,
    user_profile_id: str,
) -> List[Conversation]:
    """Get all conversations for a user (without messages)."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_profile_id == user_profile_id)
        .order_by(Conversation.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_conversation_detail(
    db: AsyncSession,
    conversation_id: str,
    user_profile_id: str,
) -> Optional[Conversation]:
    """Get a conversation with all messages."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(
            Conversation.conversation_id == conversation_id,
            Conversation.user_profile_id == user_profile_id,
        )
    )
    return result.scalars().first()


async def get_message_count(
    db: AsyncSession,
    conversation_id: str,
) -> int:
    """Get message count for a conversation."""
    result = await db.execute(
        select(func.count(Message.message_id))
        .where(Message.conversation_id == conversation_id)
    )
    return result.scalar() or 0


async def add_message(
    db: AsyncSession,
    conversation_id: str,
    role: str,
    content: str,
    input_method: str = "text",
) -> Message:
    """Add a message to a conversation."""
    msg = Message(
        message_id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role=role,
        content=content,
        input_method=input_method,
    )
    db.add(msg)

    # Update conversation updated_at and title (if first user message)
    result = await db.execute(
        select(Conversation).where(Conversation.conversation_id == conversation_id)
    )
    conv = result.scalars().first()
    if conv and role == "user" and conv.title == "新しい会話":
        conv.title = content[:50] if len(content) > 50 else content

    await db.commit()
    await db.refresh(msg)
    return msg


async def send_chat_message(
    db: AsyncSession,
    user_profile_id: str,
    content: str,
    input_method: str = "text",
    conversation_id: Optional[str] = None,
) -> Tuple[Message, str, list]:
    """
    Process a chat message: save user message, generate AI response, save assistant message.
    Returns (assistant_message, conversation_id, sources).
    """
    # Create or get conversation
    if not conversation_id:
        conv = await create_conversation(db, user_profile_id, title=content[:50])
        conversation_id = conv.conversation_id

    # Save user message
    await add_message(db, conversation_id, "user", content, input_method)

    # Generate AI response (placeholder - will be replaced with LlamaIndex in production)
    ai_response = await _generate_ai_response(content)
    sources = ai_response.get("sources", [])

    # Save assistant message
    assistant_msg = await add_message(
        db, conversation_id, "assistant", ai_response["content"], "text"
    )

    return assistant_msg, conversation_id, sources


async def _generate_ai_response(content: str) -> dict:
    """
    Generate AI response using LlamaIndex + RAG.
    This is a placeholder that returns a hospitality-style response.
    Will be replaced with actual LLM integration in production.
    """
    # Placeholder response with hospitality principles
    response_content = (
        f"お疲れさまです。「{content[:30]}」についてお調べしますね。\n\n"
        "現在、ナレッジベースを検索中です。"
        "具体的な情報が見つかり次第、詳しくお伝えいたします。\n\n"
        "もし急ぎの場合は、研修担当の方にも直接ご確認いただけますと確実です。"
    )

    return {
        "content": response_content,
        "sources": [
            {
                "source_title": "社内マニュアル",
                "source_url": None,
                "source_type": "notion",
            }
        ],
    }
