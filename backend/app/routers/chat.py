from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import UserProfile
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationResponse,
    MessageResponse,
    KnowledgeReference,
)
from app.services.chat_service import (
    create_conversation,
    get_conversations,
    get_conversation_detail,
    get_message_count,
    send_chat_message,
)

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def send_message(
    body: ChatRequest,
    user: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """メッセージ送信（質問）"""
    assistant_msg, conversation_id, sources = await send_chat_message(
        db=db,
        user_profile_id=user.profile_id,
        content=body.content,
        input_method=body.input_method,
        conversation_id=body.conversation_id,
    )

    return ChatResponse(
        message=MessageResponse(
            message_id=assistant_msg.message_id,
            role=assistant_msg.role,
            content=assistant_msg.content,
            input_method=assistant_msg.input_method,
            created_at=assistant_msg.created_at.isoformat() if assistant_msg.created_at else "",
        ),
        conversation_id=conversation_id,
        sources=[KnowledgeReference(**s) for s in sources],
    )


@router.post("/conversations/new", response_model=ConversationResponse)
async def new_conversation(
    user: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """新規会話作成"""
    conv = await create_conversation(db=db, user_profile_id=user.profile_id)
    return ConversationResponse(
        conversation_id=conv.conversation_id,
        title=conv.title,
        created_at=conv.created_at.isoformat() if conv.created_at else "",
        updated_at=conv.updated_at.isoformat() if conv.updated_at else "",
        messages=[],
        message_count=0,
    )


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    user: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """会話一覧取得"""
    convs = await get_conversations(db=db, user_profile_id=user.profile_id)
    result = []
    for conv in convs:
        count = await get_message_count(db=db, conversation_id=conv.conversation_id)
        result.append(ConversationResponse(
            conversation_id=conv.conversation_id,
            title=conv.title,
            created_at=conv.created_at.isoformat() if conv.created_at else "",
            updated_at=conv.updated_at.isoformat() if conv.updated_at else "",
            message_count=count,
        ))
    return result


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    user: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """会話詳細取得"""
    conv = await get_conversation_detail(
        db=db,
        conversation_id=conversation_id,
        user_profile_id=user.profile_id,
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会話が見つかりません",
        )

    return ConversationResponse(
        conversation_id=conv.conversation_id,
        title=conv.title,
        created_at=conv.created_at.isoformat() if conv.created_at else "",
        updated_at=conv.updated_at.isoformat() if conv.updated_at else "",
        messages=[
            MessageResponse(
                message_id=m.message_id,
                role=m.role,
                content=m.content,
                input_method=m.input_method,
                created_at=m.created_at.isoformat() if m.created_at else "",
            )
            for m in (conv.messages or [])
        ],
        message_count=len(conv.messages or []),
    )
