"""Text chunking utility with Japanese text support."""
import re
from typing import List, Dict


def chunk_document(
    content: str,
    chunk_size: int = 512,
    chunk_overlap: int = 50,
    title: str = "",
) -> List[Dict]:
    """
    Split document content into chunks suitable for embedding.

    Args:
        content: The document text to split.
        chunk_size: Target chunk size in approximate token count.
                    For Japanese text, ~2 chars per token.
        chunk_overlap: Number of overlapping tokens between chunks.
        title: Document title to prefix each chunk.

    Returns:
        List of dicts with "content" and "token_count" keys.
    """
    if not content or not content.strip():
        return []

    # Approximate character limits (Japanese: ~2 chars/token)
    char_limit = chunk_size * 2
    overlap_chars = chunk_overlap * 2

    # Split into sentences at Japanese boundaries
    sentences = _split_sentences(content)

    chunks = []
    current_chunk = []
    current_len = 0

    for sentence in sentences:
        sentence_len = len(sentence)

        # If single sentence exceeds limit, force-split it
        if sentence_len > char_limit:
            # Flush current chunk
            if current_chunk:
                chunks.append(_make_chunk(current_chunk, title))
                current_chunk = []
                current_len = 0
            # Force-split the long sentence
            for sub in _force_split(sentence, char_limit, overlap_chars):
                chunks.append(_make_chunk([sub], title))
            continue

        # If adding this sentence would exceed limit, flush current chunk
        if current_len + sentence_len > char_limit and current_chunk:
            chunks.append(_make_chunk(current_chunk, title))
            # Keep overlap from end of previous chunk
            overlap_text = "".join(current_chunk)[-overlap_chars:] if overlap_chars > 0 else ""
            current_chunk = [overlap_text] if overlap_text else []
            current_len = len(overlap_text) if overlap_text else 0

        current_chunk.append(sentence)
        current_len += sentence_len

    # Flush remaining
    if current_chunk:
        chunks.append(_make_chunk(current_chunk, title))

    return chunks


def _split_sentences(text: str) -> List[str]:
    """Split text into sentences at Japanese/common boundaries."""
    # Split on: "。", "！", "？", "\n\n", "\n"
    # Keep the delimiter with the preceding text
    parts = re.split(r'(。|！|？|\n\n|\n)', text)

    sentences = []
    current = ""
    for part in parts:
        current += part
        if part in ("。", "！", "？", "\n\n", "\n"):
            stripped = current.strip()
            if stripped:
                sentences.append(stripped)
            current = ""

    if current.strip():
        sentences.append(current.strip())

    return sentences


def _force_split(text: str, char_limit: int, overlap_chars: int) -> List[str]:
    """Force-split a long text into chunks of char_limit size."""
    parts = []
    start = 0
    while start < len(text):
        end = min(start + char_limit, len(text))
        parts.append(text[start:end])
        start = end - overlap_chars if end < len(text) else end
    return parts


def _make_chunk(parts: List[str], title: str) -> Dict:
    """Combine parts into a chunk dict."""
    text = "".join(parts).strip()
    if title:
        text = f"[{title}] {text}"
    # Approximate token count: Japanese ~2 chars/token, English ~4 chars/token
    token_count = max(1, len(text) // 2)
    return {"content": text, "token_count": token_count}
