from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status, Cookie, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.user import UserProfile
from app.models.admin import AdminSession


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> UserProfile:
    """Extract user from Authorization header (Bearer token)."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証トークンが必要です",
        )

    # Parse "Bearer <token>" or just "<token>"
    token = authorization
    if authorization.startswith("Bearer "):
        token = authorization[7:]

    result = await db.execute(
        select(UserProfile).where(
            UserProfile.auth_token == token,
            UserProfile.status == "approved",
        )
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効な認証トークンです",
        )

    return user


async def get_admin_session(
    csai_admin_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> AdminSession:
    """Validate admin session from cookie."""
    if not csai_admin_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="管理者セッションが必要です",
        )

    result = await db.execute(
        select(AdminSession).where(
            AdminSession.session_id == csai_admin_session,
            AdminSession.authenticated == True,
        )
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なセッションです",
        )

    # Check expiration (handle both timezone-aware and naive datetimes for SQLite compat)
    now = datetime.now(timezone.utc)
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="セッションの有効期限が切れています",
        )

    return session
