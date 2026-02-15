import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserProfile
from app.models.admin import AdminSession
from app.config import settings
from app.utils.security import generate_auth_token, generate_session_id, verify_admin_password


async def submit_profile(
    db: AsyncSession,
    name: str,
    department: str,
    join_date: str,
) -> UserProfile:
    """Register a new user profile with pending status."""
    user = UserProfile(
        profile_id=str(uuid.uuid4()),
        name=name,
        department=department,
        join_date=join_date,
        status="pending",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def check_status_by_token(
    db: AsyncSession,
    token: str,
) -> Optional[UserProfile]:
    """Get user profile by auth token or profile_id."""
    # Try auth_token first
    result = await db.execute(
        select(UserProfile).where(UserProfile.auth_token == token)
    )
    user = result.scalars().first()
    if user:
        return user

    # Try profile_id
    result = await db.execute(
        select(UserProfile).where(UserProfile.profile_id == token)
    )
    return result.scalars().first()


async def admin_login(
    db: AsyncSession,
    password: str,
) -> Optional[AdminSession]:
    """Verify admin password and create session."""
    if not verify_admin_password(password):
        return None

    session = AdminSession(
        session_id=generate_session_id(),
        authenticated=True,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.ADMIN_SESSION_EXPIRE_HOURS),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def admin_logout(
    db: AsyncSession,
    session_id: str,
) -> bool:
    """Invalidate admin session."""
    result = await db.execute(
        select(AdminSession).where(AdminSession.session_id == session_id)
    )
    session = result.scalars().first()
    if not session:
        return False

    session.authenticated = False
    await db.commit()
    return True
