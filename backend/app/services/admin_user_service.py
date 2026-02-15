import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import UserProfile
from app.utils.security import generate_auth_token


async def get_pending_users(db: AsyncSession) -> List[UserProfile]:
    """Get all users with pending status."""
    result = await db.execute(
        select(UserProfile)
        .where(UserProfile.status == "pending")
        .order_by(UserProfile.created_at.desc())
    )
    return list(result.scalars().all())


async def get_all_users(db: AsyncSession) -> List[UserProfile]:
    """Get all users regardless of status."""
    result = await db.execute(
        select(UserProfile)
        .order_by(UserProfile.created_at.desc())
    )
    return list(result.scalars().all())


async def approve_user(
    db: AsyncSession,
    profile_id: str,
) -> Optional[UserProfile]:
    """Approve a user and issue auth token."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.profile_id == profile_id)
    )
    user = result.scalars().first()
    if not user:
        return None

    user.status = "approved"
    user.approved_at = datetime.now(timezone.utc)
    user.auth_token = generate_auth_token()

    await db.commit()
    await db.refresh(user)
    return user


async def reject_user(
    db: AsyncSession,
    profile_id: str,
) -> Optional[UserProfile]:
    """Reject a user."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.profile_id == profile_id)
    )
    user = result.scalars().first()
    if not user:
        return None

    user.status = "rejected"

    await db.commit()
    await db.refresh(user)
    return user
