"""Tests for llm_service.py"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.llm_service import _build_messages, _placeholder_response, generate_chat_response


class TestBuildMessages:
    """Test message construction for OpenAI API."""

    def test_basic_message(self):
        messages = _build_messages(
            user_message="有給の申請方法は？",
            system_prompt="あなたはAIです。",
        )
        assert len(messages) == 2
        assert messages[0] == {"role": "system", "content": "あなたはAIです。"}
        assert messages[1] == {"role": "user", "content": "有給の申請方法は？"}

    def test_with_few_shot(self):
        few_shots = [
            {"user_message": "質問A", "assistant_message": "回答A"},
            {"user_message": "質問B", "assistant_message": "回答B"},
        ]
        messages = _build_messages(
            user_message="質問C",
            system_prompt="sys",
            few_shot_examples=few_shots,
        )
        assert len(messages) == 6  # system + 2*(user+assistant) + user
        assert messages[1] == {"role": "user", "content": "質問A"}
        assert messages[2] == {"role": "assistant", "content": "回答A"}
        assert messages[3] == {"role": "user", "content": "質問B"}
        assert messages[4] == {"role": "assistant", "content": "回答B"}

    def test_with_rag_context(self):
        messages = _build_messages(
            user_message="質問",
            system_prompt="sys",
            rag_context="[参考資料1: マニュアル]\n有給は社内ポータルから申請",
        )
        assert len(messages) == 3  # system + rag_system + user
        assert messages[1]["role"] == "system"
        assert "ナレッジベース" in messages[1]["content"]
        assert "有給は社内ポータルから申請" in messages[1]["content"]

    def test_with_chat_history(self):
        history = [
            {"role": "user", "content": "こんにちは"},
            {"role": "assistant", "content": "お疲れさまです"},
        ]
        messages = _build_messages(
            user_message="質問",
            system_prompt="sys",
            chat_history=history,
        )
        assert len(messages) == 4  # system + 2 history + user
        assert messages[1] == {"role": "user", "content": "こんにちは"}
        assert messages[2] == {"role": "assistant", "content": "お疲れさまです"}

    def test_chat_history_limited_to_10(self):
        history = [{"role": "user", "content": f"msg{i}"} for i in range(20)]
        messages = _build_messages(
            user_message="質問",
            system_prompt="sys",
            chat_history=history,
        )
        # system + 10 history + user = 12
        assert len(messages) == 12
        # Should include last 10 messages (msg10 through msg19)
        assert messages[1]["content"] == "msg10"

    def test_full_message_order(self):
        messages = _build_messages(
            user_message="質問",
            system_prompt="sys",
            few_shot_examples=[{"user_message": "fs_q", "assistant_message": "fs_a"}],
            rag_context="RAGデータ",
            chat_history=[{"role": "user", "content": "前の質問"}],
        )
        # system, few-shot user, few-shot assistant, rag system, history, user
        assert len(messages) == 6
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == "sys"
        assert messages[1]["content"] == "fs_q"
        assert messages[2]["content"] == "fs_a"
        assert messages[3]["role"] == "system"
        assert "RAGデータ" in messages[3]["content"]
        assert messages[4]["content"] == "前の質問"
        assert messages[5]["content"] == "質問"


class TestPlaceholderResponse:
    def test_returns_content(self):
        result = _placeholder_response("テスト質問")
        assert "content" in result
        assert "テスト質問" in result["content"]

    def test_truncates_long_content(self):
        long_text = "あ" * 100
        result = _placeholder_response(long_text)
        assert "あ" * 30 in result["content"]


class TestGenerateChatResponse:
    @pytest.mark.asyncio
    async def test_no_api_key_returns_placeholder(self):
        with patch("app.services.llm_service.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = None
            result = await generate_chat_response(
                user_message="テスト",
                system_prompt="sys",
            )
            assert "content" in result
            assert "テスト" in result["content"]

    @pytest.mark.asyncio
    async def test_api_call_success(self):
        mock_choice = MagicMock()
        mock_choice.message.content = "LLM応答です"
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]

        mock_client_instance = AsyncMock()
        mock_client_instance.chat.completions.create = AsyncMock(return_value=mock_response)

        with patch("app.services.llm_service.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.LLM_MODEL = "gpt-4o-mini"
            mock_settings.LLM_TEMPERATURE = 0.7
            mock_settings.LLM_MAX_TOKENS = 1024

            with patch("openai.AsyncOpenAI", return_value=mock_client_instance):
                result = await generate_chat_response(
                    user_message="テスト",
                    system_prompt="sys",
                )
                assert result["content"] == "LLM応答です"

    @pytest.mark.asyncio
    async def test_api_call_error_returns_fallback(self):
        with patch("app.services.llm_service.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"

            with patch("openai.AsyncOpenAI", side_effect=Exception("API Error")):
                result = await generate_chat_response(
                    user_message="テスト",
                    system_prompt="sys",
                )
                assert "申し訳ありません" in result["content"]
