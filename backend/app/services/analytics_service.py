from typing import List, Optional
from collections import Counter

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message
from app.models.user import UserProfile


async def get_conversation_logs(
    db: AsyncSession,
    department: Optional[str] = None,
    join_date: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[dict]:
    """Get conversation logs with optional filters."""
    query = (
        select(Conversation)
        .join(UserProfile, Conversation.user_profile_id == UserProfile.profile_id)
        .options(selectinload(Conversation.user_profile))
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.created_at.desc())
    )

    # Apply filters
    conditions = []
    if department:
        conditions.append(UserProfile.department == department)
    if join_date:
        conditions.append(UserProfile.join_date == join_date)
    if date_from:
        conditions.append(Conversation.created_at >= date_from)
    if date_to:
        conditions.append(Conversation.created_at <= date_to + "T23:59:59")

    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(query)
    conversations = result.scalars().unique().all()

    logs = []
    for conv in conversations:
        user = conv.user_profile
        messages = conv.messages or []
        first_msg = next((m.content for m in messages if m.role == "user"), "")

        logs.append({
            "conversation_id": conv.conversation_id,
            "title": conv.title,
            "user_name": user.name if user else "",
            "department": user.department if user else "",
            "join_date": user.join_date if user else "",
            "created_at": conv.created_at.isoformat() if conv.created_at else "",
            "message_count": len(messages),
            "first_message": first_msg,
        })

    return logs


async def get_conversation_log_detail(
    db: AsyncSession,
    conversation_id: str,
) -> Optional[list]:
    """Get all messages for a conversation."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.conversation_id == conversation_id)
    )
    conv = result.scalars().first()
    if not conv:
        return None

    return [
        {
            "message_id": m.message_id,
            "role": m.role,
            "content": m.content,
            "input_method": m.input_method,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in (conv.messages or [])
    ]


async def get_frequent_questions(db: AsyncSession) -> List[dict]:
    """Analyze frequent questions from user messages."""
    result = await db.execute(
        select(Message.content)
        .where(Message.role == "user")
        .order_by(Message.created_at.desc())
    )
    messages = [row[0] for row in result.all()]

    # Simple frequency analysis - group similar questions
    # In production, this would use NLP/embeddings for better grouping
    counter = Counter()
    categories = {}

    for msg in messages:
        # Simple: use first 30 chars as key
        key = msg[:30].strip()
        counter[key] += 1

        # Simple category assignment based on keywords
        if any(w in msg for w in ["休暇", "有給", "休み"]):
            categories[key] = "休暇・勤怠"
        elif any(w in msg for w in ["経費", "精算", "領収"]):
            categories[key] = "経費"
        elif any(w in msg for w in ["システム", "ポータル", "ログイン"]):
            categories[key] = "システム"
        elif any(w in msg for w in ["研修", "トレーニング"]):
            categories[key] = "研修"
        else:
            categories[key] = "その他"

    return [
        {
            "question": question,
            "count": count,
            "category": categories.get(question, "その他"),
        }
        for question, count in counter.most_common(20)
    ]
