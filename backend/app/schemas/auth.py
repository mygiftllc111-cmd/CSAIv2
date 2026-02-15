from pydantic import BaseModel, Field
from typing import Optional


class ProfileSubmission(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    department: str = Field(..., min_length=1, max_length=100)
    join_date: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$")


class UserProfileResponse(BaseModel):
    profile_id: str
    name: str
    department: str
    join_date: str
    status: str
    approved_at: Optional[str] = None
    auth_token: Optional[str] = None
    created_at: str
    last_accessed_at: str

    model_config = {"from_attributes": True}


class AdminLoginRequest(BaseModel):
    password: str = Field(..., min_length=1)


class AdminSessionResponse(BaseModel):
    session_id: str
    authenticated: bool
    created_at: str
    expires_at: str

    model_config = {"from_attributes": True}
