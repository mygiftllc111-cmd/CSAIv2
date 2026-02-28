import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message
from app.models.user import UserProfile
from app.services import llm_service, prompt_service

logger = logging.getLogger(__name__)


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

    # Generate AI response
    ai_response = await _generate_ai_response(db, content, conversation_id)
    sources = ai_response.get("sources", [])

    # Save assistant message
    assistant_msg = await add_message(
        db, conversation_id, "assistant", ai_response["content"], "text"
    )

    return assistant_msg, conversation_id, sources


async def _generate_ai_response(
    db: AsyncSession,
    content: str,
    conversation_id: Optional[str] = None,
) -> dict:
    """
    Generate AI response using OpenAI GPT-4o-mini with admin prompt settings,
    few-shot examples, conversation history, and RAG context.
    Falls back to placeholder when OPENAI_API_KEY is not set.
    """
    # Get admin-configured system prompt and few-shot examples
    prompt_config = await prompt_service.get_current_prompt(db)
    system_prompt = prompt_config.system_prompt if prompt_config else ""
    few_shot_examples = prompt_config.few_shot_examples if prompt_config else []

    # Get conversation history (last 10 messages)
    chat_history = []
    if conversation_id:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(10)
        )
        messages = list(reversed(result.scalars().all()))
        chat_history = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

    # RAG context (will be populated in Slice D)
    rag_context = None
    sources = []

    # Try vector search if available
    try:
        from app.services import vector_service
        search_results = await vector_service.search_similar(db, content, top_k=5)
        if search_results:
            rag_parts = []
            seen_titles = set()
            for i, chunk in enumerate(search_results, 1):
                title = chunk.get("document_title", "不明")
                rag_parts.append(f"[参考資料{i}: {title}]\n{chunk['content']}")
                if title not in seen_titles:
                    seen_titles.add(title)
                    sources.append({
                        "source_title": title,
                        "source_url": chunk.get("source_url"),
                        "source_type": chunk.get("source_type", "unknown"),
                    })
            rag_context = "\n\n".join(rag_parts)
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"RAG search failed, continuing without context: {e}")
        await db.rollback()

    # Call LLM
    llm_response = await llm_service.generate_chat_response(
        user_message=content,
        system_prompt=system_prompt,
        few_shot_examples=few_shot_examples,
        chat_history=chat_history,
        rag_context=rag_context,
    )

    # If no RAG sources and using placeholder, add default source
    if not sources:
        sources = [
            {
                "source_title": "社内マニュアル",
                "source_url": None,
                "source_type": "notion",
            }
        ]

    return {
        "content": llm_response["content"],
        "sources": sources,
    }
