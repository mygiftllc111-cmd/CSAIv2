"""Tests for knowledge sync (Notion and GDrive integration)."""
import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock, MagicMock

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.knowledge import KnowledgeSource, Document
from app.models.document_chunk import DocumentChunk
from app.services.knowledge_service import trigger_sync
from app.services.notion_sync import _extract_title, _block_to_text


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
        yield session

    await engine.dispose()


class TestNotionHelpers:
    def test_extract_title(self):
        page = {
            "properties": {
                "Name": {
                    "type": "title",
                    "title": [{"plain_text": "テストページ"}],
                }
            }
        }
        assert _extract_title(page) == "テストページ"

    def test_extract_title_empty(self):
        page = {"properties": {}}
        assert _extract_title(page) == "Untitled"

    def test_block_to_text_paragraph(self):
        block = {
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"plain_text": "これはテキストです"}],
            },
        }
        assert _block_to_text(block) == "これはテキストです"

    def test_block_to_text_heading(self):
        block = {
            "type": "heading_1",
            "heading_1": {
                "rich_text": [{"plain_text": "見出し"}],
            },
        }
        result = _block_to_text(block)
        assert "見出し" in result
        assert "#" in result

    def test_block_to_text_bullet(self):
        block = {
            "type": "bulleted_list_item",
            "bulleted_list_item": {
                "rich_text": [{"plain_text": "リスト項目"}],
            },
        }
        assert "リスト項目" in _block_to_text(block)


class TestTriggerSync:
    @pytest.mark.asyncio
    async def test_sync_notion_success(self, db_session):
        """Test sync with mocked Notion API returning documents."""
        source = KnowledgeSource(
            source_id="src-notion",
            type="notion",
            connection_config={"integration_token": "test-token"},
            sync_interval_minutes=60,
            document_count=0,
            status="active",
        )
        db_session.add(source)
        await db_session.commit()

        mock_docs = [
            {
                "title": "テストページ",
                "content": "テスト内容です。",
                "url": "https://notion.so/test",
                "external_id": "page-1",
            }
        ]

        with patch("app.services.knowledge_service.notion_sync.fetch_notion_pages",
                    new_callable=AsyncMock, return_value=mock_docs):
            with patch("app.services.vector_service.embed_text",
                       new_callable=AsyncMock, return_value=None):
                result = await trigger_sync(db_session, "src-notion")

        assert result is not None
        assert result.status == "active"
        assert result.document_count == 1
        assert result.last_synced_at is not None

        # Verify document was created
        doc_result = await db_session.execute(
            select(Document).where(Document.source_id == "src-notion")
        )
        docs = doc_result.scalars().all()
        assert len(docs) == 1
        assert docs[0].title == "テストページ"

        # Verify chunks were created
        chunk_result = await db_session.execute(
            select(DocumentChunk).where(DocumentChunk.source_id == "src-notion")
        )
        chunks = chunk_result.scalars().all()
        assert len(chunks) >= 1

    @pytest.mark.asyncio
    async def test_sync_no_token(self, db_session):
        """Test sync with no API token configured."""
        source = KnowledgeSource(
            source_id="src-empty",
            type="notion",
            connection_config={"integration_token": ""},
            sync_interval_minutes=60,
            document_count=0,
            status="active",
        )
        db_session.add(source)
        await db_session.commit()

        with patch("app.services.knowledge_service.settings") as mock_settings:
            mock_settings.NOTION_API_TOKEN = None
            mock_settings.GOOGLE_SERVICE_ACCOUNT_JSON = None
            result = await trigger_sync(db_session, "src-empty")

        assert result is not None
        assert result.status == "active"  # No error, just empty

    @pytest.mark.asyncio
    async def test_sync_recovers_from_stuck_syncing(self, db_session):
        """Test that stuck 'syncing' status is reset and sync proceeds."""
        source = KnowledgeSource(
            source_id="src-busy",
            type="notion",
            connection_config={},
            sync_interval_minutes=60,
            document_count=0,
            status="syncing",
        )
        db_session.add(source)
        await db_session.commit()

        with patch("app.services.knowledge_service.settings") as mock_settings:
            mock_settings.NOTION_API_TOKEN = None
            mock_settings.GOOGLE_SERVICE_ACCOUNT_JSON = None
            result = await trigger_sync(db_session, "src-busy")

        assert result is not None
        assert result.status == "active"  # Recovered from stuck state

    @pytest.mark.asyncio
    async def test_sync_not_found(self, db_session):
        result = await trigger_sync(db_session, "nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_sync_error_sets_status(self, db_session):
        """Test that sync errors set status to 'error'."""
        source = KnowledgeSource(
            source_id="src-err",
            type="notion",
            connection_config={"integration_token": "test-token"},
            sync_interval_minutes=60,
            document_count=0,
            status="active",
        )
        db_session.add(source)
        await db_session.commit()

        with patch("app.services.knowledge_service.notion_sync.fetch_notion_pages",
                    new_callable=AsyncMock, side_effect=Exception("API crash")):
            result = await trigger_sync(db_session, "src-err")

        assert result is not None
        assert result.status == "error"
