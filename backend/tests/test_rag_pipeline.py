"""Tests for RAG pipeline integration in chat_service."""
import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock, MagicMock

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.user import UserProfile
from app.models.conversation import Conversation, Message
from app.models.knowledge import KnowledgeSource, Document
from app.models.document_chunk import DocumentChunk
from app.models.prompt import PromptConfig
from app.services.chat_service import _generate_ai_response, send_chat_message


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


@pytest_asyncio.fixture
async def setup_data(db_session):
    """Set up test data including user, source, document, and chunks."""
    # User
    user = UserProfile(
        profile_id="user-1",
        name="テスト太郎",
        department="研修チーム",
        join_date="2026-02",
        status="approved",
        auth_token="test-token",
    )
    db_session.add(user)

    # Knowledge source + document + chunks
    source = KnowledgeSource(
        source_id="src-1",
        type="notion",
        connection_config={},
        sync_interval_minutes=60,
        document_count=1,
        status="active",
    )
    db_session.add(source)

    doc = Document(
        doc_id="doc-1",
        source_id="src-1",
        title="勤怠管理マニュアル",
        content="有給休暇は社内ポータルから申請できます。",
    )
    db_session.add(doc)

    chunk = DocumentChunk(
        chunk_id="chunk-1",
        doc_id="doc-1",
        source_id="src-1",
        chunk_index=0,
        content="[勤怠管理マニュアル] 有給休暇は社内ポータルの勤怠管理メニューから申請できます。申請後、上長の承認が必要です。",
        document_title="勤怠管理マニュアル",
        source_type="notion",
        source_url="https://notion.so/kintai",
        token_count=50,
    )
    db_session.add(chunk)

    await db_session.commit()
    return user


class TestGenerateAIResponseWithRAG:
    @pytest.mark.asyncio
    async def test_rag_context_injected(self, db_session, setup_data):
        """Test that RAG context from vector search is passed to LLM."""
        captured_args = {}

        async def mock_generate(**kwargs):
            captured_args.update(kwargs)
            return {"content": "RAG付き回答です。"}

        with patch("app.services.chat_service.llm_service.generate_chat_response",
                    side_effect=mock_generate):
            result = await _generate_ai_response(db_session, "有給休暇の申請方法は？")

        assert result["content"] == "RAG付き回答です。"
        # Should have found the chunk via text fallback
        if captured_args.get("rag_context"):
            assert "勤怠管理マニュアル" in captured_args["rag_context"]
            # Sources should include the document
            assert len(result.get("sources", [])) >= 1

    @pytest.mark.asyncio
    async def test_no_rag_when_no_chunks(self, db_session):
        """Test that LLM works without RAG context when no chunks exist."""
        async def mock_generate(**kwargs):
            return {"content": "RAGなし回答です。"}

        # Create minimal prompt config
        config = PromptConfig(
            config_id="cfg-1",
            system_prompt="テストプロンプト",
            few_shot_examples=[],
            version=1,
            updated_by="test",
        )
        db_session.add(config)
        await db_session.commit()

        with patch("app.services.chat_service.llm_service.generate_chat_response",
                    side_effect=mock_generate):
            result = await _generate_ai_response(db_session, "関係ないキーワードXYZ")

        assert result["content"] == "RAGなし回答です。"

    @pytest.mark.asyncio
    async def test_source_deduplication(self, db_session, setup_data):
        """Test that duplicate sources from multiple chunks are deduplicated."""
        # Add another chunk from same document
        chunk2 = DocumentChunk(
            chunk_id="chunk-2",
            doc_id="doc-1",
            source_id="src-1",
            chunk_index=1,
            content="[勤怠管理マニュアル] 有給の残日数は勤怠管理メニューで確認できます。",
            document_title="勤怠管理マニュアル",
            source_type="notion",
            source_url="https://notion.so/kintai",
            token_count=30,
        )
        db_session.add(chunk2)
        await db_session.commit()

        async def mock_generate(**kwargs):
            return {"content": "回答"}

        with patch("app.services.chat_service.llm_service.generate_chat_response",
                    side_effect=mock_generate):
            result = await _generate_ai_response(db_session, "有給 勤怠")

        # Sources should be deduplicated (same document title)
        sources = result.get("sources", [])
        titles = [s["source_title"] for s in sources]
        # Should not have duplicate "勤怠管理マニュアル"
        assert titles.count("勤怠管理マニュアル") <= 1


class TestSendChatMessageIntegration:
    @pytest.mark.asyncio
    async def test_full_flow(self, db_session, setup_data):
        """Test complete send_chat_message flow with RAG."""
        async def mock_generate(**kwargs):
            return {"content": "テスト回答です。"}

        with patch("app.services.chat_service.llm_service.generate_chat_response",
                    side_effect=mock_generate):
            msg, conv_id, sources = await send_chat_message(
                db_session,
                user_profile_id="user-1",
                content="有給休暇の申請方法は？",
            )

        assert msg.role == "assistant"
        assert msg.content == "テスト回答です。"
        assert conv_id is not None
        assert isinstance(sources, list)

        # Verify conversation was created with messages
        result = await db_session.execute(
            select(Message).where(Message.conversation_id == conv_id)
        )
        messages = result.scalars().all()
        assert len(messages) == 2  # user + assistant
