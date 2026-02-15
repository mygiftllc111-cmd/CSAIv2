from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_admin_session
from app.models.admin import AdminSession
from app.schemas.admin import ConversationLogResponse, FrequentQuestionResponse
from app.schemas.chat import MessageResponse
from app.services.analytics_service import (
    get_conversation_logs,
    get_conversation_log_detail,
    get_frequent_questions,
)

router = APIRouter()


@router.get("/admin/logs", response_model=List[ConversationLogResponse])
async def list_logs(
    department: Optional[str] = Query(None),
    join_date: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """対話ログ一覧（フィルタ付き）"""
    logs = await get_conversation_logs(
        db=db,
        department=department,
        join_date=join_date,
        date_from=date_from,
        date_to=date_to,
    )
    return [ConversationLogResponse(**log) for log in logs]


@router.get("/admin/logs/analytics", response_model=List[FrequentQuestionResponse])
async def get_analytics(
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """よくある質問分析"""
    questions = await get_frequent_questions(db=db)
    return [FrequentQuestionResponse(**q) for q in questions]


@router.get("/admin/logs/{conversation_id}", response_model=List[MessageResponse])
async def get_log_detail(
    conversation_id: str,
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """対話ログ詳細"""
    messages = await get_conversation_log_detail(db=db, conversation_id=conversation_id)
    if messages is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会話が見つかりません",
        )
    return [MessageResponse(**m) for m in messages]
