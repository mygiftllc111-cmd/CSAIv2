from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.config import settings
from app.database import get_db
from app.dependencies import get_admin_session
from app.models.admin import AdminSession
from app.models.knowledge import KnowledgeSource
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
    reset_sync_status,
)
from app.services import gdrive_sync

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
            detail="ナレッジソースが見つかりません",
        )
    return _format_source(source)


@router.post("/admin/knowledge-sources/{source_id}/reset", response_model=KnowledgeSourceResponse)
async def reset_knowledge_status(
    source_id: str,
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """同期スタックリセット"""
    source = await reset_sync_status(db=db, source_id=source_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ナレッジソースが見つかりません",
        )
    return _format_source(source)


@router.get("/admin/knowledge-sources/{source_id}/diagnose")
async def diagnose_knowledge_source(
    source_id: str,
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """Google Drive接続診断"""
    result = await db.execute(
        select(KnowledgeSource).where(KnowledgeSource.source_id == source_id)
    )
    source = result.scalars().first()
    if not source or source.type != "google_drive":
        raise HTTPException(status_code=404, detail="Google Driveソースが見つかりません")

    config = source.connection_config or {}
    sa_json = config.get("service_account") or settings.GOOGLE_SERVICE_ACCOUNT_JSON or ""
    target_folder = config.get("target_folder", "")

    if not sa_json:
        return {"error": "サービスアカウントJSONが設定されていません（環境変数 GOOGLE_SERVICE_ACCOUNT_JSON も未設定）"}

    import json as _json
    import asyncio

    # Parse service account email
    try:
        info = _json.loads(sa_json) if sa_json.strip().startswith("{") else {}
        sa_email = info.get("client_email", "不明")
    except Exception:
        sa_email = "JSON解析エラー"

    # Build service
    try:
        svc = await gdrive_sync._build_drive_service(sa_json)
    except Exception as e:
        return {"error": f"サービス構築失敗: {e}", "service_account_email": sa_email}

    loop = asyncio.get_event_loop()

    # Check total accessible files (no folder filter)
    try:
        all_files_result = await loop.run_in_executor(
            None, lambda: svc.files().list(
                q="trashed = false",
                fields="files(id, name, mimeType)",
                pageSize=20,
            ).execute()
        )
        all_files = all_files_result.get("files", [])
    except Exception as e:
        return {"error": f"ファイル一覧取得失敗: {e}", "service_account_email": sa_email}

    # Check folder search
    folder_found = None
    folder_id = None
    if target_folder:
        try:
            folder_result = await loop.run_in_executor(
                None, lambda: svc.files().list(
                    q=f"name = '{target_folder}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
                    fields="files(id, name)",
                    pageSize=5,
                ).execute()
            )
            folders = folder_result.get("files", [])
            folder_found = bool(folders)
            folder_id = folders[0]["id"] if folders else None
        except Exception as e:
            folder_found = f"検索エラー: {e}"

    # Files in target folder
    folder_files = []
    if folder_id:
        try:
            ff_result = await loop.run_in_executor(
                None, lambda: svc.files().list(
                    q=f"'{folder_id}' in parents and trashed = false",
                    fields="files(id, name, mimeType)",
                    pageSize=20,
                ).execute()
            )
            folder_files = ff_result.get("files", [])
        except Exception as e:
            folder_files = [{"error": str(e)}]

    return {
        "service_account_email": sa_email,
        "target_folder": target_folder,
        "total_accessible_files": len(all_files),
        "accessible_files_sample": [{"name": f["name"], "mimeType": f["mimeType"]} for f in all_files[:10]],
        "folder_found": folder_found,
        "files_in_folder": [{"name": f["name"], "mimeType": f.get("mimeType", "")} for f in folder_files],
    }


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
