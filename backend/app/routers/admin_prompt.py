from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.dependencies import get_admin_session
from app.models.admin import AdminSession
from app.schemas.admin import (
    PromptConfigResponse,
    PromptConfigUpdate,
    FewShotExample,
)
from app.services.prompt_service import (
    get_current_prompt,
    update_prompt,
    get_prompt_history,
)

router = APIRouter()


def _format_prompt(config) -> PromptConfigResponse:
    examples = config.few_shot_examples or []
    return PromptConfigResponse(
        config_id=config.config_id,
        system_prompt=config.system_prompt,
        few_shot_examples=[FewShotExample(**e) if isinstance(e, dict) else e for e in examples],
        version=config.version,
        created_at=config.created_at.isoformat() if config.created_at else "",
        updated_by=config.updated_by,
    )


@router.get("/admin/prompt", response_model=PromptConfigResponse)
async def get_prompt(
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """プロンプト設定取得"""
    config = await get_current_prompt(db=db)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロンプト設定が見つかりません",
        )
    return _format_prompt(config)


@router.put("/admin/prompt", response_model=PromptConfigResponse)
async def update_prompt_config(
    body: PromptConfigUpdate,
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """プロンプト設定更新"""
    config = await update_prompt(
        db=db,
        system_prompt=body.system_prompt,
        few_shot_examples=[e.dict() for e in body.few_shot_examples],
    )
    return _format_prompt(config)


@router.get("/admin/prompt/history", response_model=List[PromptConfigResponse])
async def list_prompt_history(
    session: AdminSession = Depends(get_admin_session),
    db: AsyncSession = Depends(get_db),
):
    """プロンプト変更履歴"""
    configs = await get_prompt_history(db=db)
    return [_format_prompt(c) for c in configs]
