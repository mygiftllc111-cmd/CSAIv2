"""Tests for vector_service.py"""
import json
import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock, MagicMock

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.document_chunk import DocumentChunk
from app.models.knowledge import KnowledgeSource, Document
from app.services.vector_service import embed_text, store_chunks, search_similar, _search_text_fallback


@pytest_asyncio.fixture
async def db_session():
    """Create an in-memory SQLite session for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        # Create prerequisite records
        source = KnowledgeSource(
            source_id="src-1",
            type="notion",
            connection_config={},
            sync_interval_minutes=60,
            document_count=0,
            status="active",
        )
        doc = Document(
            doc_id="doc-1",
            source_id="src-1",
            title="テストドキュメント",
            content="テスト内容",
        )
        session.add(source)
        session.add(doc)
        await session.commit()

        yield session

    await engine.dispose()


class TestEmbedText:
    @pytest.mark.asyncio
    async def test_no_api_key_returns_none(self):
        with patch("app.services.vector_service.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = None
            result = await embed_text("テスト")
            assert result is None

    @pytest.mark.asyncio
    async def test_api_call_success(self):
        mock_embedding = [0.1] * 1536
        mock_data = MagicMock()
        mock_data.embedding = mock_embedding
        mock_response = MagicMock()
        mock_response.data = [mock_data]

        mock_client = AsyncMock()
        mock_client.embeddings.create = AsyncMock(return_value=mock_response)

        with patch("app.services.vector_service.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.LLM_EMBEDDING_MODEL = "text-embedding-3-small"
            mock_settings.LLM_EMBEDDING_DIMENSIONS = 1536
            with patch("openai.AsyncOpenAI", return_value=mock_client):
                result = await embed_text("テスト")
                assert result == mock_embedding
                assert len(result) == 1536

    @pytest.mark.asyncio
    async def test_api_error_returns_none(self):
        with patch("app.services.vector_service.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            with patch("openai.AsyncOpenAI", side_effect=Exception("API Error")):
                result = await embed_text("テスト")
                assert result is None


class TestStoreChunks:
    @pytest.mark.asyncio
    async def test_store_chunks(self, db_session):
        chunks = [
            {"content": "チャンク1の内容", "token_count": 10},
            {"content": "チャンク2の内容", "token_count": 12},
        ]
        with patch("app.services.vector_service.embed_text", new_callable=AsyncMock, return_value=None):
            count = await store_chunks(
                db_session, chunks,
                doc_id="doc-1", source_id="src-1",
                document_title="テスト", source_type="notion",
            )
        assert count == 2

        result = await db_session.execute(
            select(DocumentChunk).where(DocumentChunk.doc_id == "doc-1")
        )
        stored = result.scalars().all()
        assert len(stored) == 2
        assert stored[0].chunk_index == 0
        assert stored[1].chunk_index == 1


class TestSearchTextFallback:
    @pytest.mark.asyncio
    async def test_search_finds_matching_chunks(self, db_session):
        # Store test chunks
        chunk = DocumentChunk(
            chunk_id="chunk-1",
            doc_id="doc-1",
            source_id="src-1",
            chunk_index=0,
            content="有給休暇の申請方法について説明します。",
            document_title="勤怠マニュアル",
            source_type="notion",
            token_count=20,
        )
        db_session.add(chunk)
        await db_session.commit()

        results = await _search_text_fallback(db_session, "有給休暇 申請", top_k=5)
        assert len(results) >= 1
        assert results[0]["document_title"] == "勤怠マニュアル"

    @pytest.mark.asyncio
    async def test_search_no_match(self, db_session):
        results = await _search_text_fallback(db_session, "存在しないキーワード", top_k=5)
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_search_empty_query(self, db_session):
        results = await _search_text_fallback(db_session, "", top_k=5)
        assert len(results) == 0
