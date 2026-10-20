from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.auth import UserProfileResponse


class ChatMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    is_announcement: bool = False


class ChatMessageResponse(BaseModel):
    id: str
    batch_id: str
    user_id: str
    user: Optional[UserProfileResponse] = None
    message: str
    is_announcement: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    content: str = Field(..., min_length=5)


class AnnouncementResponse(BaseModel):
    id: str
    batch_id: str
    educator_id: str
    educator: Optional[UserProfileResponse] = None
    title: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportCreate(BaseModel):
    target_type: str = Field(..., pattern="^(message|lecture|batch|user)$")
    target_id: str
    reason: str = Field(..., min_length=5, max_length=1000)


class ReportResponse(BaseModel):
    id: str
    reporter_id: str
    target_type: str
    target_id: str
    reason: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
