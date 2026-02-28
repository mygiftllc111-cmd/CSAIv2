"""Notion API sync service for fetching and converting pages to text."""
import asyncio
import logging
from typing import List, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
RATE_LIMIT_SLEEP = 0.35  # 3 req/sec = 0.33s, add margin
MAX_RETRY = 1
RETRY_DELAY = 2.0
MAX_BLOCK_DEPTH = 3


async def fetch_notion_pages(
    integration_token: str,
    target_pages: Optional[str] = None,
) -> List[Dict]:
    """
    Fetch pages from Notion workspace.

    Args:
        integration_token: Notion integration token.
        target_pages: Optional filter (unused for now; fetches all accessible pages).

    Returns:
        List of dicts with "title", "content", "url" keys.
    """
    if not integration_token:
        logger.warning("Notion integration token is empty, skipping sync")
        return []

    headers = {
        "Authorization": f"Bearer {integration_token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }

    pages = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Search for all pages
        page_list = await _search_pages(client, headers)
        logger.info(f"Found {len(page_list)} Notion pages")

        for page_info in page_list:
            await asyncio.sleep(RATE_LIMIT_SLEEP)
            try:
                page_id = page_info["id"]
                title = _extract_title(page_info)
                url = page_info.get("url", "")

                # Fetch blocks (content)
                blocks_text = await _fetch_blocks_recursive(
                    client, headers, page_id, depth=0
                )

                if blocks_text.strip():
                    pages.append({
                        "title": title,
                        "content": blocks_text,
                        "url": url,
                        "external_id": page_id,
                    })
            except Exception as e:
                logger.error(f"Error fetching Notion page {page_info.get('id', '?')}: {e}")
                continue

    return pages


async def _search_pages(
    client: httpx.AsyncClient,
    headers: dict,
) -> List[dict]:
    """Search all accessible pages with pagination."""
    all_pages = []
    start_cursor = None

    while True:
        body = {"filter": {"value": "page", "property": "object"}, "page_size": 100}
        if start_cursor:
            body["start_cursor"] = start_cursor

        resp = await _api_request(client, "POST", f"{NOTION_API_BASE}/search", headers, json=body)
        if not resp:
            break

        results = resp.get("results", [])
        all_pages.extend(results)

        if resp.get("has_more") and resp.get("next_cursor"):
            start_cursor = resp["next_cursor"]
            await asyncio.sleep(RATE_LIMIT_SLEEP)
        else:
            break

    return all_pages


async def _fetch_blocks_recursive(
    client: httpx.AsyncClient,
    headers: dict,
    block_id: str,
    depth: int = 0,
) -> str:
    """Recursively fetch block content up to MAX_BLOCK_DEPTH."""
    if depth > MAX_BLOCK_DEPTH:
        return ""

    text_parts = []
    start_cursor = None

    while True:
        url = f"{NOTION_API_BASE}/blocks/{block_id}/children?page_size=100"
        if start_cursor:
            url += f"&start_cursor={start_cursor}"

        resp = await _api_request(client, "GET", url, headers)
        if not resp:
            break

        for block in resp.get("results", []):
            block_text = _block_to_text(block)
            if block_text:
                text_parts.append(block_text)

            # Recurse into children
            if block.get("has_children") and depth < MAX_BLOCK_DEPTH:
                await asyncio.sleep(RATE_LIMIT_SLEEP)
                child_text = await _fetch_blocks_recursive(
                    client, headers, block["id"], depth + 1
                )
                if child_text:
                    text_parts.append(child_text)

        if resp.get("has_more") and resp.get("next_cursor"):
            start_cursor = resp["next_cursor"]
            await asyncio.sleep(RATE_LIMIT_SLEEP)
        else:
            break

    return "\n".join(text_parts)


def _extract_title(page: dict) -> str:
    """Extract title from a Notion page object."""
    props = page.get("properties", {})
    for prop in props.values():
        if prop.get("type") == "title":
            title_parts = prop.get("title", [])
            return "".join(t.get("plain_text", "") for t in title_parts)
    return "Untitled"


def _block_to_text(block: dict) -> str:
    """Convert a Notion block to plain text."""
    block_type = block.get("type", "")
    block_data = block.get(block_type, {})

    if not block_data:
        return ""

    # Handle rich_text-based blocks
    rich_text = block_data.get("rich_text", [])
    if rich_text:
        text = "".join(rt.get("plain_text", "") for rt in rich_text)
        if block_type in ("heading_1", "heading_2", "heading_3"):
            return f"\n{'#' * int(block_type[-1])} {text}\n"
        if block_type == "bulleted_list_item":
            return f"・{text}"
        if block_type == "numbered_list_item":
            return f"- {text}"
        if block_type == "to_do":
            checked = "✓" if block_data.get("checked") else "□"
            return f"{checked} {text}"
        return text

    # Handle code blocks
    if block_type == "code":
        code_text = block_data.get("rich_text", [])
        return "".join(ct.get("plain_text", "") for ct in code_text)

    # Handle dividers, etc.
    if block_type == "divider":
        return "---"

    return ""


async def _api_request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    headers: dict,
    json: Optional[dict] = None,
    retry_count: int = 0,
) -> Optional[dict]:
    """Make an API request with retry on 429."""
    try:
        if method == "POST":
            resp = await client.post(url, headers=headers, json=json)
        else:
            resp = await client.get(url, headers=headers)

        if resp.status_code == 429:
            if retry_count < MAX_RETRY:
                logger.warning(f"Notion rate limited, retrying in {RETRY_DELAY}s...")
                await asyncio.sleep(RETRY_DELAY)
                return await _api_request(client, method, url, headers, json, retry_count + 1)
            logger.error("Notion rate limit exceeded after retry")
            return None

        resp.raise_for_status()
        return resp.json()

    except httpx.HTTPStatusError as e:
        logger.error(f"Notion API error: {e.response.status_code} - {e.response.text[:200]}")
        return None
    except Exception as e:
        logger.error(f"Notion API request failed: {e}")
        return None
