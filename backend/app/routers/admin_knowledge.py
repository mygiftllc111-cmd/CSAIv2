from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.dependencies import get_admin_session
from app.models.admin import AdminSession
from app.schemas.admin import (
    KnowledgeSourceResponse,
    KnowledgeSourceUpdate,
    SyncRequest,
)
from app.services.knowledge_service import (
    get_knowledge_sources,
    update_knowledge_source,
    trigger_sync,
    upload_document,
)

router = APIRouter()


def _format_source(source) -> KnowledgeSourceResponse:
    config = dict(source.connection_config or {})
    last_error = config.pop("_last_error", None)
    return KnowledgeSourceResponse(
        source_id=source.source_id,
        type=source.type,
        connection_config=config,
        sync_interval_minutes=source.sync_interval_minutes,
        last_synced_at=source.last_synced_at.isoformat() if source.last_synced_at else None,
        document_count=source.document_count,
        status=source.status,
        last_error=last_error,
    )


@router.get("/admin/knowledge-sources", response_model=List[KnowledgeSourceResponse])
async def list_knowledge_sources(
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """ナレッジソース一覧"""
    sources = await get_knowledge_sources(db=db)
    return [_format_source(s) for s in sources]


@router.put(
    "/admin/knowledge-sources/{source_id}",
    response_model=KnowledgeSourceResponse,
)
async def update_source(
    source_id: str,
    body: KnowledgeSourceUpdate,
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """ナレッジソース設定更新"""
    source = await update_knowledge_source(
        db=db,
        source_id=source_id,
        sync_interval_minutes=body.sync_interval_minutes,
        connection_config=body.connection_config,
    )
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ナレッジソースが見つかりません",
        )
    return _format_source(source)


@router.post("/admin/sync", response_model=KnowledgeSourceResponse)
async def sync_knowledge(
    body: SyncRequest,
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """手動再同期"""
    source = await trigger_sync(db=db, source_id=body.source_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ナレッジソースが見つからないか、既に同期中です",
        )
    return _format_source(source)


ALLOWED_EXTENSIONS = {'.txt', '.md', '.csv', '.html', '.json'}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/admin/knowledge-upload")
async def upload_knowledge_file(
    file: UploadFile = File(...),
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """ファイルを直接ナレッジとしてアップロード"""
    import os
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"対応形式: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ファイルサイズは5MB以下にしてください",
        )

    content = raw.decode('utf-8', errors='replace')
    result = await upload_document(db=db, filename=file.filename or 'unknown', content=content)
    return result
