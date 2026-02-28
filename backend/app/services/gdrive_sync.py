"""Google Drive sync service for fetching documents."""
import asyncio
import io
import json
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit per CLAUDE.md

# Supported MIME types for text extraction
EXPORTABLE_MIME_TYPES = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.spreadsheet": "text/csv",
    "application/vnd.google-apps.presentation": "text/plain",
}

DOWNLOADABLE_MIME_TYPES = {
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "text/html",
}


async def fetch_gdrive_documents(
    service_account_json: str,
    target_folder: Optional[str] = None,
) -> List[Dict]:
    """
    Fetch documents from Google Drive using a service account.

    Args:
        service_account_json: Service account JSON key string or file path.
        target_folder: Optional folder name or ID to search in.

    Returns:
        List of dicts with "title", "content", "url", "external_id" keys.
    """
    if not service_account_json:
        logger.warning("Google service account JSON is empty, skipping sync")
        return []

    try:
        service = await _build_drive_service(service_account_json)
    except Exception as e:
        logger.error(f"Failed to build Google Drive service: {e}")
        return []

    loop = asyncio.get_event_loop()
    documents = []

    try:
        # List files
        file_list = await loop.run_in_executor(
            None, lambda: _list_files(service, target_folder)
        )
        logger.info(f"Found {len(file_list)} Google Drive files")

        for file_info in file_list:
            try:
                content = await loop.run_in_executor(
                    None, lambda f=file_info: _download_file_content(service, f)
                )
                if content and content.strip():
                    documents.append({
                        "title": file_info.get("name", "Untitled"),
                        "content": content,
                        "url": file_info.get("webViewLink", ""),
                        "external_id": file_info["id"],
                    })
            except Exception as e:
                logger.error(f"Error fetching GDrive file {file_info.get('name', '?')}: {e}")
                continue

    except Exception as e:
        logger.error(f"Google Drive sync error: {e}")

    return documents


async def _build_drive_service(service_account_json: str):
    """Build Google Drive API service from service account credentials."""
    from google.oauth2 import service_account as sa
    from googleapiclient.discovery import build

    # Parse JSON (could be a JSON string or file path)
    if service_account_json.strip().startswith("{"):
        info = json.loads(service_account_json)
    else:
        with open(service_account_json, "r") as f:
            info = json.load(f)

    credentials = sa.Credentials.from_service_account_info(
        info,
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )

    loop = asyncio.get_event_loop()
    service = await loop.run_in_executor(
        None, lambda: build("drive", "v3", credentials=credentials)
    )
    return service


def _list_files(service, target_folder: Optional[str] = None) -> List[dict]:
    """List accessible files from Google Drive, recursing into subfolders."""
    supported = list(EXPORTABLE_MIME_TYPES.keys()) + list(DOWNLOADABLE_MIME_TYPES)
    mime_conditions = " or ".join(f"mimeType = '{m}'" for m in supported)
    FOLDER_MIME = "application/vnd.google-apps.folder"

    # Resolve starting folder IDs
    root_folder_ids: List[str] = []
    if target_folder:
        if len(target_folder) > 20 and " " not in target_folder:
            # Looks like a folder ID directly
            root_folder_ids = [target_folder]
        else:
            folder_results = service.files().list(
                q=f"name = '{target_folder}' and mimeType = '{FOLDER_MIME}' and trashed = false",
                fields="files(id, name)",
                pageSize=5,
            ).execute()
            root_folder_ids = [f["id"] for f in folder_results.get("files", [])]
            if not root_folder_ids:
                logger.warning(f"Target folder '{target_folder}' not found in Google Drive")
                return []

    def _fetch_files_in_folder(folder_id: str) -> List[dict]:
        """Fetch all supported files directly in a folder (non-recursive)."""
        results = []
        page_token = None
        while True:
            resp = service.files().list(
                q=f"'{folder_id}' in parents and ({mime_conditions}) and trashed = false",
                fields="nextPageToken, files(id, name, mimeType, size, webViewLink)",
                pageSize=100,
                pageToken=page_token,
            ).execute()
            for f in resp.get("files", []):
                size = int(f.get("size", 0))
                if size <= MAX_FILE_SIZE:
                    results.append(f)
                else:
                    logger.warning(f"Skipping large file: {f['name']} ({size} bytes)")
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
        return results

    def _fetch_subfolders(folder_id: str) -> List[str]:
        """Return IDs of all direct subfolders."""
        resp = service.files().list(
            q=f"'{folder_id}' in parents and mimeType = '{FOLDER_MIME}' and trashed = false",
            fields="files(id, name)",
            pageSize=100,
        ).execute()
        return [f["id"] for f in resp.get("files", [])]

    all_files: List[dict] = []
    visited: set = set()

    if root_folder_ids:
        # BFS over subfolders
        queue = list(root_folder_ids)
        while queue:
            fid = queue.pop(0)
            if fid in visited:
                continue
            visited.add(fid)
            all_files.extend(_fetch_files_in_folder(fid))
            queue.extend(_fetch_subfolders(fid))
    else:
        # No folder filter: fetch all accessible supported files
        page_token = None
        while True:
            results = service.files().list(
                q=f"({mime_conditions}) and trashed = false",
                fields="nextPageToken, files(id, name, mimeType, size, webViewLink)",
                pageSize=100,
                pageToken=page_token,
            ).execute()
            for f in results.get("files", []):
                size = int(f.get("size", 0))
                if size <= MAX_FILE_SIZE:
                    all_files.append(f)
                else:
                    logger.warning(f"Skipping large file: {f['name']} ({size} bytes)")
            page_token = results.get("nextPageToken")
            if not page_token:
                break

    logger.info(f"Found {len(all_files)} files across {len(visited)} folders")
    return all_files


def _download_file_content(service, file_info: dict) -> Optional[str]:
    """Download and extract text content from a Google Drive file."""
    mime_type = file_info.get("mimeType", "")
    file_id = file_info["id"]

    # Google Workspace files: export
    if mime_type in EXPORTABLE_MIME_TYPES:
        export_mime = EXPORTABLE_MIME_TYPES[mime_type]
        try:
            content = service.files().export(
                fileId=file_id,
                mimeType=export_mime,
            ).execute()
            if isinstance(content, bytes):
                return content.decode("utf-8", errors="replace")
            return str(content)
        except Exception as e:
            logger.error(f"Export failed for {file_info['name']}: {e}")
            return None

    # Regular files: download
    if mime_type in DOWNLOADABLE_MIME_TYPES:
        try:
            content = service.files().get_media(fileId=file_id).execute()
            if isinstance(content, bytes):
                return content.decode("utf-8", errors="replace")
            return str(content)
        except Exception as e:
            logger.error(f"Download failed for {file_info['name']}: {e}")
            return None

    return None
