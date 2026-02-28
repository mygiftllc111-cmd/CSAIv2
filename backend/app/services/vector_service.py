"""Vector store service for embedding generation and similarity search."""
import json
import logging
import uuid
from typing import List, Optional, Dict

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import _db_url
from app.models.document_chunk import DocumentChunk

logger = logging.getLogger(__name__)


def is_postgres() -> bool:
    """Check if we're connected to PostgreSQL (vs SQLite)."""
    return _db_url.startswith("postgresql")


async def embed_text(content: str) -> Optional[List[float]]:
    """
    Generate embedding vector for text using OpenAI text-embedding-3-small.
    Returns None if OPENAI_API_KEY is not set.
    """
    if not settings.OPENAI_API_KEY:
        return None

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.embeddings.create(
            model=settings.LLM_EMBEDDING_MODEL,
            input=content,
            dimensions=settings.LLM_EMBEDDING_DIMENSIONS,
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return None


async def store_chunks(
    db: AsyncSession,
    chunks: List[Dict],
    doc_id: str,
    source_id: str,
    document_title: str = "",
    source_type: str = "unknown",
    source_url: Optional[str] = None,
) -> int:
    """
    Store document chunks with embeddings in the database.
    Returns number of chunks stored.
    """
    stored = 0
    for i, chunk in enumerate(chunks):
        content = chunk["content"]
        token_count = chunk.get("token_count", 0)

        # Generate embedding
        embedding = await embed_text(content)
        embedding_json = json.dumps(embedding) if embedding else None

        db_chunk = DocumentChunk(
            chunk_id=str(uuid.uuid4()),
            doc_id=doc_id,
            source_id=source_id,
            chunk_index=i,
            content=content,
            embedding_json=embedding_json,
            document_title=document_title,
            source_type=source_type,
            source_url=source_url,
            token_count=token_count,
        )
        db.add(db_chunk)
        stored += 1

    await db.commit()
    return stored


async def search_similar(
    db: AsyncSession,
    query: str,
    top_k: int = 5,
) -> List[Dict]:
    """
    Search for similar document chunks.
    PostgreSQL: uses pgvector cosine distance.
    SQLite: falls back to text LIKE search.
    """
    if is_postgres() and settings.OPENAI_API_KEY:
        return await _search_pgvector(db, query, top_k)
    return await _search_text_fallback(db, query, top_k)


async def _search_pgvector(
    db: AsyncSession,
    query: str,
    top_k: int,
) -> List[Dict]:
    """Vector similarity search using pgvector."""
    query_embedding = await embed_text(query)
    if not query_embedding:
        return await _search_text_fallback(db, query, top_k)

    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    try:
        sql = text("""
            SELECT chunk_id, content, document_title, source_type, source_url,
                   embedding <=> :embedding::vector AS distance
            FROM document_chunks
            WHERE embedding IS NOT NULL
            ORDER BY distance ASC
            LIMIT :top_k
        """)
        result = await db.execute(sql, {"embedding": embedding_str, "top_k": top_k})
        rows = result.fetchall()

        return [
            {
                "chunk_id": row[0],
                "content": row[1],
                "document_title": row[2],
                "source_type": row[3],
                "source_url": row[4],
                "distance": row[5],
            }
            for row in rows
        ]
    except Exception as e:
        logger.warning(f"pgvector search failed, falling back to text search: {e}")
        await db.rollback()
        return await _search_text_fallback(db, query, top_k)


async def _search_text_fallback(
    db: AsyncSession,
    query: str,
    top_k: int,
) -> List[Dict]:
    """Text-based fallback search for SQLite or when embeddings are unavailable."""
    # Extract keywords from query (split on spaces and particles)
    keywords = [w for w in query.split() if len(w) >= 2]

    if not keywords:
        keywords = [query[:10]] if len(query) >= 2 else []

    if not keywords:
        return []

    # Search for chunks containing any keyword
    conditions = []
    for kw in keywords[:5]:  # Limit to 5 keywords
        conditions.append(DocumentChunk.content.contains(kw))

    from sqlalchemy import or_
    result = await db.execute(
        select(DocumentChunk)
        .where(or_(*conditions))
        .limit(top_k)
    )
    chunks = result.scalars().all()

    return [
        {
            "chunk_id": chunk.chunk_id,
            "content": chunk.content,
            "document_title": chunk.document_title,
            "source_type": chunk.source_type,
            "source_url": chunk.source_url,
            "distance": None,
        }
        for chunk in chunks
    ]


async def delete_chunks_by_doc(db: AsyncSession, doc_id: str) -> int:
    """Delete all chunks for a document. Returns count deleted."""
    result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.doc_id == doc_id)
    )
    chunks = result.scalars().all()
    count = len(chunks)
    for chunk in chunks:
        await db.delete(chunk)
    await db.commit()
    return count


async def delete_chunks_by_source(db: AsyncSession, source_id: str) -> int:
    """Delete all chunks for a knowledge source. Returns count deleted."""
    result = await db.execute(
        select(DocumentChunk).where(DocumentChunk.source_id == source_id)
    )
    chunks = result.scalars().all()
    count = len(chunks)
    for chunk in chunks:
        await db.delete(chunk)
    await db.commit()
    return count
