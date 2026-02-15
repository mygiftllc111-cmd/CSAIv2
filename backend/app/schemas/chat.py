from pydantic import BaseModel, Field
from typing import List, Optional


class ChatRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    input_method: str = Field(default="text", pattern=r"^(text|voice)$")
    conversation_id: Optional[str] = None


class MessageResponse(BaseModel):
    message_id: str
    role: str
    content: str
    input_method: str
    created_at: str

    model_config = {"from_attributes": True}


class KnowledgeReference(BaseModel):
    source_title: str
    source_url: Optional[str] = None
    source_type: str  # notion / google_drive


class ChatResponse(BaseModel):
    message: MessageResponse
    conversation_id: str
    sources: List[KnowledgeReference] = []


class ConversationResponse(BaseModel):
    conversation_id: str
    title: str
    created_at: str
    updated_at: str
    messages: Optional[List[MessageResponse]] = None
    message_count: Optional[int] = None

    model_config = {"from_attributes": True}
