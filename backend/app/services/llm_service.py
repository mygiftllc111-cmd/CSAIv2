import logging
from typing import List, Optional

from app.config import settings

logger = logging.getLogger(__name__)


async def generate_chat_response(
    user_message: str,
    system_prompt: str,
    few_shot_examples: Optional[List[dict]] = None,
    chat_history: Optional[List[dict]] = None,
    rag_context: Optional[str] = None,
) -> dict:
    """
    Generate a chat response using OpenAI GPT-4o-mini.
    Falls back to placeholder response if OPENAI_API_KEY is not set or on error.

    Returns:
        dict with "content" (str) key.
    """
    if not settings.OPENAI_API_KEY:
        logger.info("OPENAI_API_KEY not set, using placeholder response")
        return _placeholder_response(user_message)

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        messages = _build_messages(
            user_message=user_message,
            system_prompt=system_prompt,
            few_shot_examples=few_shot_examples,
            chat_history=chat_history,
            rag_context=rag_context,
        )

        response = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=messages,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=settings.LLM_MAX_TOKENS,
        )

        content = response.choices[0].message.content or ""
        return {"content": content}

    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return {
            "content": "申し訳ありません、回答生成に時間がかかっています。"
            "しばらくしてからもう一度お試しください。"
        }


def _build_messages(
    user_message: str,
    system_prompt: str,
    few_shot_examples: Optional[List[dict]] = None,
    chat_history: Optional[List[dict]] = None,
    rag_context: Optional[str] = None,
) -> List[dict]:
    """
    Build the messages array for the OpenAI chat completions API.
    Order: system_prompt → few-shot → RAG context → chat_history (last 10) → user_message
    """
    messages = []

    # 1. System prompt
    messages.append({"role": "system", "content": system_prompt})

    # 2. Few-shot examples
    if few_shot_examples:
        for example in few_shot_examples:
            messages.append({"role": "user", "content": example.get("user_message", "")})
            messages.append({"role": "assistant", "content": example.get("assistant_message", "")})

    # 3. RAG context (injected as a system message)
    if rag_context:
        messages.append({
            "role": "system",
            "content": "以下は関連するナレッジベースの情報です。回答の参考にしてください:\n\n" + rag_context,
        })

    # 4. Chat history (last 10 messages)
    if chat_history:
        recent = chat_history[-10:]
        for msg in recent:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

    # 5. Current user message
    messages.append({"role": "user", "content": user_message})

    return messages


def _placeholder_response(content: str) -> dict:
    """Fallback placeholder response when no API key is configured."""
    response_content = (
        f"お疲れさまです。「{content[:30]}」についてお調べしますね。\n\n"
        "現在、ナレッジベースを検索中です。"
        "具体的な情報が見つかり次第、詳しくお伝えいたします。\n\n"
        "もし急ぎの場合は、研修担当の方にも直接ご確認いただけますと確実です。"
    )
    return {"content": response_content}
