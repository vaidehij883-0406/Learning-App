from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.auth import UserProfileResponse


class BatchBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    category: str = "General"
    thumbnail_url: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    language: str = "English"
    is_published: bool = False
    enrollment_type: str = Field("open", pattern="^(open|approval|private)$")


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    language: Optional[str] = None
    is_published: Optional[bool] = None
    enrollment_type: Optional[str] = None


class BatchResponse(BatchBase):
    id: str
    educator_id: str
    educator: Optional[UserProfileResponse] = None
    lectures_count: int = 0
    enrolled_count: int = 0
    is_enrolled: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BatchMembershipResponse(BaseModel):
    id: str
    batch_id: str
    user_id: str
    role_in_batch: str
    enrolled_at: datetime
    is_active: bool
    user: Optional[UserProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)


class BatchDetailResponse(BatchResponse):
    pass
