from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.dependencies import get_admin_session
from app.models.admin import AdminSession
from app.schemas.auth import UserProfileResponse
from app.services.admin_user_service import (
    get_pending_users,
    get_all_users,
    approve_user,
    reject_user,
)

router = APIRouter()


def _format_user(user) -> UserProfileResponse:
    return UserProfileResponse(
        profile_id=user.profile_id,
        name=user.name,
        department=user.department,
        join_date=user.join_date,
        status=user.status,
        approved_at=user.approved_at.isoformat() if user.approved_at else None,
        auth_token=user.auth_token,
        created_at=user.created_at.isoformat() if user.created_at else "",
        last_accessed_at=user.last_accessed_at.isoformat() if user.last_accessed_at else "",
    )


@router.get("/admin/users/pending", response_model=List[UserProfileResponse])
async def list_pending_users(
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """承認待ちユーザー一覧"""
    users = await get_pending_users(db=db)
    return [_format_user(u) for u in users]


@router.get("/admin/users", response_model=List[UserProfileResponse])
async def list_all_users(
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """全ユーザー一覧"""
    users = await get_all_users(db=db)
    return [_format_user(u) for u in users]


@router.put("/admin/users/{profile_id}/approve", response_model=UserProfileResponse)
async def approve_user_endpoint(
    profile_id: str,
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """ユーザー承認"""
    user = await approve_user(db=db, profile_id=profile_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )
    return _format_user(user)


@router.put("/admin/users/{profile_id}/reject", response_model=UserProfileResponse)
async def reject_user_endpoint(
    profile_id: str,
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """ユーザー拒否"""
    user = await reject_user(db=db, profile_id=profile_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )
    return _format_user(user)
