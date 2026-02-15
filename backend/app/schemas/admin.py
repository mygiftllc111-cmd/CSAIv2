from pydantic import BaseModel, Field
from typing import Dict, List, Optional


# --- Log Analytics ---

class LogFilter(BaseModel):
    department: Optional[str] = None
    join_date: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None


class ConversationLogResponse(BaseModel):
    conversation_id: str
    title: str
    user_name: str
    department: str
    join_date: str
    created_at: str
    message_count: int
    first_message: str


class FrequentQuestionResponse(BaseModel):
    question: str
    count: int
    category: str


# --- Prompt Config ---

class FewShotExample(BaseModel):
    user_message: str
    assistant_message: str


class PromptConfigResponse(BaseModel):
    config_id: str
    system_prompt: str
    few_shot_examples: List[FewShotExample]
    version: int
    created_at: str
    updated_by: str

    model_config = {"from_attributes": True}


class PromptConfigUpdate(BaseModel):
    system_prompt: str = Field(..., min_length=1, max_length=10000)
    few_shot_examples: List[FewShotExample] = []


# --- Knowledge Sources ---

class KnowledgeSourceResponse(BaseModel):
    source_id: str
    type: str
    connection_config: Dict
    sync_interval_minutes: int
    last_synced_at: Optional[str] = None
    document_count: int
    status: str

    model_config = {"from_attributes": True}


class KnowledgeSourceUpdate(BaseModel):
    sync_interval_minutes: Optional[int] = Field(None, ge=15, le=1440)
    connection_config: Optional[Dict] = None


class SyncRequest(BaseModel):
    source_id: str
