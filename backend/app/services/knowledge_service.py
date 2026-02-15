import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeSource


async def get_knowledge_sources(db: AsyncSession) -> List[KnowledgeSource]:
    """Get all knowledge sources."""
    result = await db.execute(
        select(KnowledgeSource).order_by(KnowledgeSource.type)
    )
    sources = list(result.scalars().all())

    # If no sources exist, create defaults
    if not sources:
        defaults = [
            KnowledgeSource(
                source_id=str(uuid.uuid4()),
                type="notion",
                connection_config={
                    "integration_token": "",
                    "target_pages": "ワークスペース全体",
                },
                sync_interval_minutes=60,
                document_count=0,
                status="active",
            ),
            KnowledgeSource(
                source_id=str(uuid.uuid4()),
                type="google_drive",
                connection_config={
                    "service_account": "",
                    "target_folder": "社内マニュアル / 研修資料",
                },
                sync_interval_minutes=120,
                document_count=0,
                status="active",
            ),
        ]
        for s in defaults:
            db.add(s)
        await db.commit()

        result = await db.execute(
            select(KnowledgeSource).order_by(KnowledgeSource.type)
        )
        sources = list(result.scalars().all())

    return sources


async def update_knowledge_source(
    db: AsyncSession,
    source_id: str,
    sync_interval_minutes: Optional[int] = None,
    connection_config: Optional[dict] = None,
) -> Optional[KnowledgeSource]:
    """Update a knowledge source configuration."""
    result = await db.execute(
        select(KnowledgeSource).where(KnowledgeSource.source_id == source_id)
    )
    source = result.scalars().first()
    if not source:
        return None

    if sync_interval_minutes is not None:
        source.sync_interval_minutes = sync_interval_minutes
    if connection_config is not None:
        source.connection_config = connection_config

    await db.commit()
    await db.refresh(source)
    return source


async def trigger_sync(
    db: AsyncSession,
    source_id: str,
) -> Optional[KnowledgeSource]:
    """
    Trigger manual sync for a knowledge source.
    In production, this would start the actual sync process.
    For MVP, it simulates a sync completion.
    """
    result = await db.execute(
        select(KnowledgeSource).where(KnowledgeSource.source_id == source_id)
    )
    source = result.scalars().first()
    if not source:
        return None

    if source.status == "syncing":
        return None  # Already syncing

    # Mark as syncing
    source.status = "syncing"
    await db.commit()

    # Simulate sync completion
    # In production: trigger background task for Notion/GDrive sync
    source.status = "active"
    source.last_synced_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(source)

    return source
