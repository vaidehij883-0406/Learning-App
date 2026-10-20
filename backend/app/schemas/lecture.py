from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.auth import UserProfileResponse


class LectureResourceBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    file_url: str
    file_type: str = "pdf"
    file_size_bytes: int = 0
    is_downloadable: bool = True


class LectureResourceCreate(LectureResourceBase):
    pass


class LectureResourceResponse(LectureResourceBase):
    id: str
    lecture_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LectureBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    subject: Optional[str] = None
    duration_seconds: int = 0
    video_url: str
    thumbnail_url: Optional[str] = None
    sequence_order: int = 1
    is_published: bool = False
    is_public_preview: bool = True


class LectureCreate(LectureBase):
    batch_id: str


class LectureUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    duration_seconds: Optional[int] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    sequence_order: Optional[int] = None
    is_published: Optional[bool] = None
    is_public_preview: Optional[bool] = None


class LectureProgressResponse(BaseModel):
    last_position_seconds: int = 0
    completed: bool = False
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LectureResponse(LectureBase):
    id: str
    batch_id: str
    share_token: str
    share_url: Optional[str] = None
    resources: List[LectureResourceResponse] = []
    user_progress: Optional[LectureProgressResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LecturePublicResponse(BaseModel):
    id: str
    batch_id: str
    batch_title: str
    batch_category: str
    educator: Optional[UserProfileResponse] = None
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    duration_seconds: int = 0
    video_url: str
    thumbnail_url: Optional[str] = None
    sequence_order: int = 1
    resources: List[LectureResourceResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProgressUpdate(BaseModel):
    position_seconds: int = Field(..., ge=0)
    duration_seconds: Optional[int] = Field(None, ge=0)
