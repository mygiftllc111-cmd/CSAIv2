"""URL crawler service for extracting and fetching linked content from documents."""

import asyncio
import logging
import re
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

MAX_URLS_PER_DOCUMENT = 10
MAX_RESPONSE_SIZE = 5 * 1024 * 1024  # 5MB
REQUEST_TIMEOUT = 15.0
SAME_DOMAIN_DELAY = 0.5

URL_PATTERN = re.compile(r'https?://[^\s<>"\')\]]+')

REMOVE_TAGS = {"script", "style", "nav", "footer", "header"}


def extract_urls(text: str) -> List[str]:
    """Extract unique URLs from text, up to MAX_URLS_PER_DOCUMENT."""
    urls = URL_PATTERN.findall(text)
    # Deduplicate while preserving order
    seen: set = set()
    unique: List[str] = []
    for url in urls:
        # Strip trailing punctuation that may have been captured
        url = url.rstrip(".,;:!?)")
        if url not in seen:
            seen.add(url)
            unique.append(url)
        if len(unique) >= MAX_URLS_PER_DOCUMENT:
            break
    return unique


async def crawl_url(url: str) -> Optional[Dict[str, str]]:
    """
    Crawl a single URL and extract text content.

    Returns dict with {url, title, content} or None on failure.
    """
    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": "CSAIv2-KnowledgeBot/1.0"},
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

            # Check content type - only process HTML
            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type:
                logger.info(f"Skipping non-HTML URL: {url} (content-type: {content_type})")
                return None

            # Check response size
            content_length = len(response.content)
            if content_length > MAX_RESPONSE_SIZE:
                logger.warning(f"Skipping oversized response: {url} ({content_length} bytes)")
                return None

            # Parse HTML
            soup = BeautifulSoup(response.text, "html.parser")

            # Remove unwanted tags
            for tag_name in REMOVE_TAGS:
                for tag in soup.find_all(tag_name):
                    tag.decompose()

            # Extract title
            title_tag = soup.find("title")
            title = title_tag.get_text(strip=True) if title_tag else urlparse(url).netloc

            # Extract text content
            text = soup.get_text(separator="\n", strip=True)

            # Clean up excessive whitespace
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            content = "\n".join(lines)

            if not content:
                logger.info(f"No text content extracted from: {url}")
                return None

            return {
                "url": url,
                "title": title,
                "content": content,
            }

    except httpx.HTTPStatusError as e:
        logger.warning(f"HTTP error crawling {url}: {e.response.status_code}")
        return None
    except httpx.RequestError as e:
        logger.warning(f"Request error crawling {url}: {e}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected error crawling {url}: {e}")
        return None


async def crawl_urls_from_text(text: str) -> List[Dict[str, str]]:
    """
    Extract URLs from text and crawl each one.

    Returns list of {url, title, content} dicts for successfully crawled pages.
    Applies same-domain delay to avoid hammering servers.
    """
    urls = extract_urls(text)
    if not urls:
        return []

    results: List[Dict[str, str]] = []
    last_domain: Optional[str] = None

    for url in urls:
        domain = urlparse(url).netloc

        # Same-domain delay
        if last_domain and domain == last_domain:
            await asyncio.sleep(SAME_DOMAIN_DELAY)

        crawled = await crawl_url(url)
        if crawled:
            results.append(crawled)

        last_domain = domain

    logger.info(f"Crawled {len(results)}/{len(urls)} URLs successfully")
    return results
