from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.communication import Notification
from app.models.batch import BatchMembership


def create_notification(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    type: str = "info",
    link: Optional[str] = None
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def notify_batch_members(
    db: Session,
    batch_id: str,
    title: str,
    message: str,
    type: str = "announcement",
    link: Optional[str] = None,
    exclude_user_id: Optional[str] = None
) -> int:
    members = db.query(BatchMembership).filter(
        BatchMembership.batch_id == batch_id,
        BatchMembership.is_active == True
    ).all()

    count = 0
    for m in members:
        if exclude_user_id and m.user_id == exclude_user_id:
            continue
        notif = Notification(
            user_id=m.user_id,
            title=title,
            message=message,
            type=type,
            link=link
        )
        db.add(notif)
        count += 1
    
    if count > 0:
        db.commit()
    return count
