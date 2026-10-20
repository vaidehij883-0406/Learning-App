from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.batch import Batch, BatchMembership
from app.models.communication import ChatMessage, Announcement
from app.schemas.communication import (
    ChatMessageCreate, ChatMessageResponse,
    AnnouncementCreate, AnnouncementResponse
)
from app.api.deps import get_current_user, require_educator
from app.services.notification_service import notify_batch_members

router = APIRouter(tags=["Chat and Announcements"])


def _check_batch_access(db: Session, batch_id: str, user: User) -> Batch:
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    if user.role == "admin" or batch.educator_id == user.id:
        return batch

    membership = db.query(BatchMembership).filter(
        BatchMembership.batch_id == batch_id,
        BatchMembership.user_id == user.id,
        BatchMembership.is_active == True
    ).first()

    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must be enrolled in this batch to access chat")
    return batch


@router.get("/batches/{batch_id}/messages", response_model=List[ChatMessageResponse])
def get_batch_messages(
    batch_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _check_batch_access(db, batch_id, current_user)
    messages = db.query(ChatMessage).filter(
        ChatMessage.batch_id == batch_id
    ).order_by(ChatMessage.created_at.asc()).limit(limit).all()
    return messages


@router.post("/batches/{batch_id}/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_batch_message(
    batch_id: str,
    message_in: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch = _check_batch_access(db, batch_id, current_user)

    is_educator = (current_user.id == batch.educator_id or current_user.role == "admin")
    is_announcement = message_in.is_announcement and is_educator

    msg = ChatMessage(
        batch_id=batch_id,
        user_id=current_user.id,
        message=message_in.message,
        is_announcement=is_announcement
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.get("/batches/{batch_id}/announcements", response_model=List[AnnouncementResponse])
def get_batch_announcements(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _check_batch_access(db, batch_id, current_user)
    announcements = db.query(Announcement).filter(
        Announcement.batch_id == batch_id
    ).order_by(Announcement.created_at.desc()).all()
    return announcements


@router.post("/batches/{batch_id}/announcements", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def post_batch_announcement(
    batch_id: str,
    ann_in: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
    if batch.educator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to post announcements in this batch")

    ann = Announcement(
        batch_id=batch_id,
        educator_id=current_user.id,
        title=ann_in.title,
        content=ann_in.content
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    # Notify all members
    notify_batch_members(
        db=db,
        batch_id=batch_id,
        title=f"Announcement: {ann.title}",
        message=ann.content[:120] + ("..." if len(ann.content) > 120 else ""),
        type="announcement",
        link=f"/batch/{batch_id}"
    )

    return ann
