import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    educator_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(100), default="General", nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    language = Column(String(50), default="English", nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    enrollment_type = Column(String(20), default="open", nullable=False)  # 'open', 'approval', 'private'
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    educator = relationship("User", back_populates="batches")
    memberships = relationship("BatchMembership", back_populates="batch", cascade="all, delete-orphan")
    lectures = relationship("Lecture", back_populates="batch", cascade="all, delete-orphan", order_by="Lecture.sequence_order")
    quizzes = relationship("Quiz", back_populates="batch", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="batch", cascade="all, delete-orphan")
    announcements = relationship("Announcement", back_populates="batch", cascade="all, delete-orphan")


class BatchMembership(Base):
    __tablename__ = "batch_memberships"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    role_in_batch = Column(String(20), default="student", nullable=False)  # 'student', 'assistant', 'educator'
    enrolled_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("batch_id", "user_id", name="uq_batch_user"),
    )

    batch = relationship("Batch", back_populates="memberships")
    user = relationship("User", back_populates="memberships")
