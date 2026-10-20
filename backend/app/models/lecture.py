import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), nullable=True)
    duration_seconds = Column(Integer, default=0, nullable=False)
    video_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    sequence_order = Column(Integer, default=1, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    is_public_preview = Column(Boolean, default=True, nullable=False)
    share_token = Column(String(64), unique=True, default=lambda: secrets.token_hex(16), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    batch = relationship("Batch", back_populates="lectures")
    resources = relationship("LectureResource", back_populates="lecture", cascade="all, delete-orphan")
    progress = relationship("LectureProgress", back_populates="lecture", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="lecture")


class LectureResource(Base):
    __tablename__ = "lecture_resources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lecture_id = Column(String(36), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    file_url = Column(Text, nullable=False)
    file_type = Column(String(50), default="pdf", nullable=False)
    file_size_bytes = Column(BigInteger, default=0, nullable=False)
    is_downloadable = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    lecture = relationship("Lecture", back_populates="resources")


class LectureProgress(Base):
    __tablename__ = "lecture_progress"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    lecture_id = Column(String(36), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False)
    last_position_seconds = Column(Integer, default=0, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "lecture_id", name="uq_user_lecture"),
    )

    user = relationship("User", back_populates="progress")
    lecture = relationship("Lecture", back_populates="progress")
