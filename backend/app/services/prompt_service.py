import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prompt import PromptConfig


# Default system prompt for the hospitality AI agent
DEFAULT_SYSTEM_PROMPT = """あなたは「世界一安心して話せるAI」です。
新入社員の質問に対して、以下の原則を守って回答してください：

1. 否定しない（Do Not Deny）: どんな質問も受け入れる
2. 共感を先に返す（Empathy First）: まず共感の言葉から始める
3. 断定しない（No Absolutes）: 「〜の可能性があります」など柔らかい表現を使う
4. Next Action: 必ず次にすべきことを提示する

参照ソースがない場合は正直に伝え、誰に聞けば良いかを案内してください。
聞き返しは1回まで。"""


async def get_current_prompt(db: AsyncSession) -> Optional[PromptConfig]:
    """Get the latest prompt config version."""
    result = await db.execute(
        select(PromptConfig)
        .order_by(PromptConfig.version.desc())
        .limit(1)
    )
    config = result.scalars().first()

    # If no config exists, create default
    if not config:
        config = PromptConfig(
            config_id=str(uuid.uuid4()),
            system_prompt=DEFAULT_SYSTEM_PROMPT,
            few_shot_examples=[
                {
                    "user_message": "有給休暇の申請ってどうやるんですか？",
                    "assistant_message": "お疲れさまです。有給休暇の申請方法についてお調べしますね。社内ポータルの「勤怠管理」メニューから申請できるかと思います。詳しい手順については、研修担当の方にも確認されると確実です。",
                }
            ],
            version=1,
            updated_by="システム（初期設定）",
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)

    return config


async def update_prompt(
    db: AsyncSession,
    system_prompt: str,
    few_shot_examples: list,
) -> PromptConfig:
    """Create a new prompt config version."""
    # Get current max version
    result = await db.execute(
        select(PromptConfig.version)
        .order_by(PromptConfig.version.desc())
        .limit(1)
    )
    current_version = result.scalar() or 0

    config = PromptConfig(
        config_id=str(uuid.uuid4()),
        system_prompt=system_prompt,
        few_shot_examples=few_shot_examples,
        version=current_version + 1,
        updated_by="管理者",
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def get_prompt_history(db: AsyncSession) -> List[PromptConfig]:
    """Get all prompt config versions (newest first)."""
    result = await db.execute(
        select(PromptConfig)
        .order_by(PromptConfig.version.desc())
    )
    return list(result.scalars().all())
