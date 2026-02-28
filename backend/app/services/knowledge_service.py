import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.knowledge import KnowledgeSource, Document
from app.services import notion_sync, gdrive_sync, vector_service, url_crawler
from app.utils.chunking import chunk_document

logger = logging.getLogger(__name__)


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
    Fetches documents from Notion or Google Drive, chunks them,
    generates embeddings, and stores in the database.
    """
    result = await db.execute(
        select(KnowledgeSource).where(KnowledgeSource.source_id == source_id)
    )
    source = result.scalars().first()
    if not source:
        return None

    if source.status == "syncing":
        # Force-reset stuck syncing status before proceeding
        logger.warning(f"Force-resetting stuck 'syncing' status for source {source_id}")
        source.status = "active"
        await db.commit()

    # Mark as syncing
    source.status = "syncing"
    await db.commit()

    try:
        # Fetch documents from external source
        fetched_docs = await _fetch_documents(source)

        if not fetched_docs:
            logger.info(f"No documents fetched for source {source.type} ({source_id})")
            source.status = "active"
            source.last_synced_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(source)
            return source

        # Delete existing chunks for this source
        await vector_service.delete_chunks_by_source(db, source_id)

        # Process each document
        doc_count = 0
        for doc_data in fetched_docs:
            try:
                # Upsert document record
                doc_id = await _upsert_document(db, source_id, doc_data)

                # Chunk the document
                chunks = chunk_document(
                    content=doc_data["content"],
                    chunk_size=512,
                    chunk_overlap=50,
                    title=doc_data.get("title", ""),
                )

                # Store chunks with embeddings
                if chunks:
                    await vector_service.store_chunks(
                        db=db,
                        chunks=chunks,
                        doc_id=doc_id,
                        source_id=source_id,
                        document_title=doc_data.get("title", ""),
                        source_type=source.type,
                        source_url=doc_data.get("url"),
                    )

                doc_count += 1

                # URL crawling: detect URLs in document content and index their pages
                try:
                    crawled_pages = await url_crawler.crawl_urls_from_text(doc_data["content"])
                    for crawled in crawled_pages:
                        crawled_doc_id = await _upsert_document(db, source_id, {
                            "title": "[リンク] " + crawled["title"],
                            "content": crawled["content"],
                            "url": crawled["url"],
                            "external_id": "crawled-" + crawled["url"][:100],
                        })
                        crawled_chunks = chunk_document(
                            content=crawled["content"],
                            chunk_size=512,
                            chunk_overlap=50,
                            title=crawled["title"],
                        )
                        if crawled_chunks:
                            await vector_service.store_chunks(
                                db=db,
                                chunks=crawled_chunks,
                                doc_id=crawled_doc_id,
                                source_id=source_id,
                                document_title=crawled["title"],
                                source_type=source.type,
                                source_url=crawled["url"],
                            )
                        doc_count += 1
                except Exception as e:
                    logger.warning(f"URL crawling failed for document '{doc_data.get('title', '?')}': {e}")

            except Exception as e:
                logger.error(f"Error processing document '{doc_data.get('title', '?')}': {e}")
                continue

        source.status = "active"
        source.last_synced_at = datetime.now(timezone.utc)
        source.document_count = doc_count
        await db.commit()
        await db.refresh(source)

    except Exception as e:
        logger.error(f"Sync failed for source {source_id}: {e}")
        source.status = "error"
        # Store error message for frontend diagnostics
        config = dict(source.connection_config or {})
        config["_last_error"] = str(e)
        source.connection_config = config
        await db.commit()
        await db.refresh(source)

    return source


async def reset_sync_status(
    db: AsyncSession,
    source_id: str,
) -> Optional[KnowledgeSource]:
    """Force-reset a stuck 'syncing' status back to 'active'."""
    result = await db.execute(
        select(KnowledgeSource).where(KnowledgeSource.source_id == source_id)
    )
    source = result.scalars().first()
    if not source:
        return None

    source.status = "active"
    # Clear stored error if any
    config = dict(source.connection_config or {})
    config.pop("_last_error", None)
    source.connection_config = config
    await db.commit()
    await db.refresh(source)
    return source


async def upload_document(
    db: AsyncSession,
    filename: str,
    content: str,
) -> dict:
    """
    Upload a file directly as a knowledge document.
    Creates (or reuses) an 'upload' type KnowledgeSource.
    """
    # Get or create the 'upload' type source
    result = await db.execute(
        select(KnowledgeSource).where(KnowledgeSource.type == "upload")
    )
    source = result.scalars().first()

    if not source:
        source = KnowledgeSource(
            source_id=str(uuid.uuid4()),
            type="upload",
            connection_config={},
            sync_interval_minutes=0,
            document_count=0,
            status="active",
        )
        db.add(source)
        await db.commit()
        await db.refresh(source)

    # Upsert document
    doc_id = await _upsert_document(db, source.source_id, {
        "title": filename,
        "content": content,
        "external_id": f"upload-{filename}",
    })

    # Re-chunk: delete existing chunks for this doc then re-store
    await vector_service.delete_chunks_by_doc(db, doc_id)
    chunks = chunk_document(
        content=content,
        chunk_size=512,
        chunk_overlap=50,
        title=filename,
    )
    if chunks:
        await vector_service.store_chunks(
            db=db,
            chunks=chunks,
            doc_id=doc_id,
            source_id=source.source_id,
            document_title=filename,
            source_type="upload",
            source_url=None,
        )

    # Update document count
    count_result = await db.execute(
        select(Document).where(Document.source_id == source.source_id)
    )
    source.document_count = len(list(count_result.scalars().all()))
    source.last_synced_at = datetime.now(timezone.utc)
    await db.commit()

    return {"doc_id": doc_id, "title": filename, "chunk_count": len(chunks)}


async def _fetch_documents(source: KnowledgeSource) -> List[dict]:
    """Fetch documents from the appropriate external source."""
    config = source.connection_config or {}

    if source.type == "notion":
        token = config.get("integration_token") or settings.NOTION_API_TOKEN or ""
        if not token:
            logger.warning("No Notion API token configured")
            return []
        target = config.get("target_pages")
        return await notion_sync.fetch_notion_pages(token, target)

    elif source.type == "google_drive":
        sa_json = config.get("service_account") or settings.GOOGLE_SERVICE_ACCOUNT_JSON or ""
        if not sa_json:
            logger.warning("No Google service account configured")
            return []
        target = config.get("target_folder")
        return await gdrive_sync.fetch_gdrive_documents(sa_json, target)

    else:
        logger.warning(f"Unknown source type: {source.type}")
        return []


async def _upsert_document(
    db: AsyncSession,
    source_id: str,
    doc_data: dict,
) -> str:
    """Create or update a document record. Returns doc_id."""
    external_id = doc_data.get("external_id", "")
    title = doc_data.get("title", "Untitled")
    content = doc_data.get("content", "")

    # Try to find existing document by title and source
    result = await db.execute(
        select(Document).where(
            Document.source_id == source_id,
            Document.title == title,
        )
    )
    existing = result.scalars().first()

    if existing:
        existing.content = content
        existing.synced_at = datetime.now(timezone.utc)
        await db.commit()
        return existing.doc_id

    doc = Document(
        doc_id=str(uuid.uuid4()),
        source_id=source_id,
        title=title,
        content=content,
    )
    db.add(doc)
    await db.commit()
    return doc.doc_id
