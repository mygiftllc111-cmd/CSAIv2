from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.schemas.auth import (
    ProfileSubmission,
    UserProfileResponse,
    AdminLoginRequest,
    AdminSessionResponse,
)
from app.services.auth_service import (
    submit_profile,
    check_status_by_token,
    admin_login,
    admin_logout,
)
from app.config import settings
from app.dependencies import get_admin_session
from app.models.admin import AdminSession

router = APIRouter()


@router.post("/auth/profile", response_model=UserProfileResponse)
async def submit_user_profile(
    body: ProfileSubmission,
    db: AsyncSession = Depends(get_db),
):
    """利用申請（プロフィール送信）"""
    user = await submit_profile(
        db=db,
        name=body.name,
        department=body.department,
        join_date=body.join_date,
    )
    return _format_user_response(user)


@router.get("/auth/status", response_model=UserProfileResponse)
async def check_user_status(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """承認ステータス確認"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証トークンが必要です",
        )

    token = authorization
    if authorization.startswith("Bearer "):
        token = authorization[7:]

    user = await check_status_by_token(db=db, token=token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません",
        )
    return _format_user_response(user)


@router.post("/admin/login", response_model=AdminSessionResponse)
async def login_admin(
    body: AdminLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """管理者ログイン"""
    session = await admin_login(db=db, password=body.password)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="パスワードが正しくありません",
        )

    # Set session cookie
    response.set_cookie(
        key="csai_admin_session",
        value=session.session_id,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=86400,  # 24 hours
    )

    return AdminSessionResponse(
        session_id=session.session_id,
        authenticated=session.authenticated,
        created_at=session.created_at.isoformat(),
        expires_at=session.expires_at.isoformat(),
    )


@router.post("/admin/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout_admin(
    response: Response,
    csai_admin_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """管理者ログアウト"""
    if csai_admin_session:
        await admin_logout(db=db, session_id=csai_admin_session)
    response.delete_cookie("csai_admin_session")
    return Response(status_code=204)


def _format_user_response(user) -> UserProfileResponse:
    """Format UserProfile model to response schema."""
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
