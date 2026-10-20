from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.batch import Batch, BatchMembership
from app.models.lecture import Lecture, LectureResource, LectureProgress
from app.schemas.lecture import (
    LectureCreate, LectureUpdate, LectureResponse, LectureResourceCreate,
    LectureResourceResponse, LecturePublicResponse, ProgressUpdate, LectureProgressResponse
)
from app.api.deps import get_current_user, get_optional_current_user, require_educator
from app.services.progress_service import update_lecture_progress
from app.services.notification_service import notify_batch_members

router = APIRouter(prefix="/lectures", tags=["Lectures"])


@router.get("", response_model=List[LectureResponse])
def list_lectures(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    is_educator = current_user and (current_user.id == batch.educator_id or current_user.role == "admin")
    is_enrolled = False
    if current_user:
        membership = db.query(BatchMembership).filter(
            BatchMembership.batch_id == batch_id,
            BatchMembership.user_id == current_user.id,
            BatchMembership.is_active == True
        ).first()
        is_enrolled = (membership is not None) or is_educator

    query = db.query(Lecture).filter(Lecture.batch_id == batch_id)

    if not is_educator:
        query = query.filter(Lecture.is_published == True)

    lectures = query.order_by(Lecture.sequence_order.asc(), Lecture.created_at.asc()).all()

    # Fetch progress for current user
    progress_map = {}
    if current_user:
        user_progresses = db.query(LectureProgress).filter(
            LectureProgress.user_id == current_user.id,
            LectureProgress.lecture_id.in_([l.id for l in lectures])
        ).all()
        for p in user_progresses:
            progress_map[p.lecture_id] = LectureProgressResponse(
                last_position_seconds=p.last_position_seconds,
                completed=p.completed,
                completed_at=p.completed_at
            )

    result = []
    for l in lectures:
        res = LectureResponse(
            id=l.id,
            batch_id=l.batch_id,
            title=l.title,
            description=l.description,
            subject=l.subject,
            duration_seconds=l.duration_seconds,
            video_url=l.video_url,
            thumbnail_url=l.thumbnail_url,
            sequence_order=l.sequence_order,
            is_published=l.is_published,
            is_public_preview=l.is_public_preview,
            share_token=l.share_token,
            share_url=f"/lecture/share/{l.share_token}",
            resources=l.resources,
            user_progress=progress_map.get(l.id),
            created_at=l.created_at,
            updated_at=l.updated_at
        )
        result.append(res)

    return result


@router.post("", response_model=LectureResponse, status_code=status.HTTP_201_CREATED)
def create_lecture(
    lecture_in: LectureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    batch = db.query(Batch).filter(Batch.id == lecture_in.batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
    if batch.educator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add lectures to this batch")

    lecture = Lecture(
        batch_id=lecture_in.batch_id,
        title=lecture_in.title,
        description=lecture_in.description,
        subject=lecture_in.subject,
        duration_seconds=lecture_in.duration_seconds,
        video_url=lecture_in.video_url,
        thumbnail_url=lecture_in.thumbnail_url,
        sequence_order=lecture_in.sequence_order,
        is_published=lecture_in.is_published,
        is_public_preview=lecture_in.is_public_preview
    )
    db.add(lecture)
    db.commit()
    db.refresh(lecture)

    # If published, notify members
    if lecture.is_published:
        notify_batch_members(
            db=db,
            batch_id=batch.id,
            title=f"New Lecture: {lecture.title}",
            message=f"A new lecture '{lecture.title}' is now available in '{batch.title}'.",
            type="lecture",
            link=f"/lecture/{lecture.id}"
        )

    return LectureResponse(
        id=lecture.id,
        batch_id=lecture.batch_id,
        title=lecture.title,
        description=lecture.description,
        subject=lecture.subject,
        duration_seconds=lecture.duration_seconds,
        video_url=lecture.video_url,
        thumbnail_url=lecture.thumbnail_url,
        sequence_order=lecture.sequence_order,
        is_published=lecture.is_published,
        is_public_preview=lecture.is_public_preview,
        share_token=lecture.share_token,
        share_url=f"/lecture/share/{lecture.share_token}",
        resources=[],
        user_progress=None,
        created_at=lecture.created_at,
        updated_at=lecture.updated_at
    )


@router.get("/share/{share_token}", response_model=LecturePublicResponse)
def get_public_lecture_by_token(
    share_token: str,
    db: Session = Depends(get_db)
):
    """
    Public Lecture Page: accessible to ANYONE with the valid share link WITHOUT logging in.
    Draft or unpublished lectures are strictly inaccessible.
    """
    lecture = db.query(Lecture).filter(Lecture.share_token == share_token).first()
    if not lecture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lecture not found or invalid share link"
        )

    if not lecture.is_published:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This lecture is currently in draft status and not available publicly"
        )

    batch = db.query(Batch).filter(Batch.id == lecture.batch_id).first()
    educator = batch.educator if batch else None

    # Filter permitted resources
    resources = [
        LectureResourceResponse.model_validate(r) for r in lecture.resources if r.is_downloadable
    ]

    return LecturePublicResponse(
        id=lecture.id,
        batch_id=lecture.batch_id,
        batch_title=batch.title if batch else "Course Batch",
        batch_category=batch.category if batch else "General",
        educator=educator,
        title=lecture.title,
        description=lecture.description,
        subject=lecture.subject,
        duration_seconds=lecture.duration_seconds,
        video_url=lecture.video_url,
        thumbnail_url=lecture.thumbnail_url,
        sequence_order=lecture.sequence_order,
        resources=resources,
        created_at=lecture.created_at
    )


@router.get("/{id}", response_model=LectureResponse)
def get_lecture(
    id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    lecture = db.query(Lecture).filter(Lecture.id == id).first()
    if not lecture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lecture not found")

    batch = db.query(Batch).filter(Batch.id == lecture.batch_id).first()
    is_educator = current_user and (current_user.id == batch.educator_id or current_user.role == "admin")

    is_enrolled = False
    if current_user:
        membership = db.query(BatchMembership).filter(
            BatchMembership.batch_id == batch.id,
            BatchMembership.user_id == current_user.id,
            BatchMembership.is_active == True
        ).first()
        is_enrolled = (membership is not None) or is_educator

    if not is_educator:
        if not lecture.is_published:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This lecture has not been published")
        if not lecture.is_public_preview and not is_enrolled:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Enrollment required to view this lecture")

    user_progress = None
    if current_user:
        p = db.query(LectureProgress).filter(
            LectureProgress.user_id == current_user.id,
            LectureProgress.lecture_id == lecture.id
        ).first()
        if p:
            user_progress = LectureProgressResponse(
                last_position_seconds=p.last_position_seconds,
                completed=p.completed,
                completed_at=p.completed_at
            )

    return LectureResponse(
        id=lecture.id,
        batch_id=lecture.batch_id,
        title=lecture.title,
        description=lecture.description,
        subject=lecture.subject,
        duration_seconds=lecture.duration_seconds,
        video_url=lecture.video_url,
        thumbnail_url=lecture.thumbnail_url,
        sequence_order=lecture.sequence_order,
        is_published=lecture.is_published,
        is_public_preview=lecture.is_public_preview,
        share_token=lecture.share_token,
        share_url=f"/lecture/share/{lecture.share_token}",
        resources=lecture.resources,
        user_progress=user_progress,
        created_at=lecture.created_at,
        updated_at=lecture.updated_at
    )


@router.put("/{id}", response_model=LectureResponse)
def update_lecture(
    id: str,
    lecture_in: LectureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    lecture = db.query(Lecture).filter(Lecture.id == id).first()
    if not lecture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lecture not found")

    batch = db.query(Batch).filter(Batch.id == lecture.batch_id).first()
    if batch.educator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this lecture")

    was_published = lecture.is_published
    for field, val in lecture_in.model_dump(exclude_unset=True).items():
        setattr(lecture, field, val)

    db.commit()
    db.refresh(lecture)

    # If it was just published now, notify members
    if not was_published and lecture.is_published:
        notify_batch_members(
            db=db,
            batch_id=batch.id,
            title=f"New Lecture: {lecture.title}",
            message=f"Lecture '{lecture.title}' is now available in '{batch.title}'.",
            type="lecture",
            link=f"/lecture/{lecture.id}"
        )

    return LectureResponse(
        id=lecture.id,
        batch_id=lecture.batch_id,
        title=lecture.title,
        description=lecture.description,
        subject=lecture.subject,
        duration_seconds=lecture.duration_seconds,
        video_url=lecture.video_url,
        thumbnail_url=lecture.thumbnail_url,
        sequence_order=lecture.sequence_order,
        is_published=lecture.is_published,
        is_public_preview=lecture.is_public_preview,
        share_token=lecture.share_token,
        share_url=f"/lecture/share/{lecture.share_token}",
        resources=lecture.resources,
        user_progress=None,
        created_at=lecture.created_at,
        updated_at=lecture.updated_at
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lecture(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    lecture = db.query(Lecture).filter(Lecture.id == id).first()
    if not lecture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lecture not found")

    batch = db.query(Batch).filter(Batch.id == lecture.batch_id).first()
    if batch.educator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this lecture")

    db.delete(lecture)
    db.commit()
    return None


@router.post("/{id}/progress", response_model=LectureProgressResponse)
def save_lecture_progress(
    id: str,
    progress_in: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lecture = db.query(Lecture).filter(Lecture.id == id).first()
    if not lecture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lecture not found")

    p = update_lecture_progress(
        db=db,
        user_id=current_user.id,
        lecture_id=id,
        position_seconds=progress_in.position_seconds,
        duration_seconds=progress_in.duration_seconds or lecture.duration_seconds
    )
    return LectureProgressResponse(
        last_position_seconds=p.last_position_seconds,
        completed=p.completed,
        completed_at=p.completed_at
    )


@router.post("/{id}/resources", response_model=LectureResourceResponse, status_code=status.HTTP_201_CREATED)
def attach_lecture_resource(
    id: str,
    res_in: LectureResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    lecture = db.query(Lecture).filter(Lecture.id == id).first()
    if not lecture:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lecture not found")

    batch = db.query(Batch).filter(Batch.id == lecture.batch_id).first()
    if batch.educator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to attach notes")

    resource = LectureResource(
        lecture_id=id,
        title=res_in.title,
        file_url=res_in.file_url,
        file_type=res_in.file_type,
        file_size_bytes=res_in.file_size_bytes,
        is_downloadable=res_in.is_downloadable
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.delete("/{id}/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lecture_resource(
    id: str,
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    resource = db.query(LectureResource).filter(
        LectureResource.id == resource_id,
        LectureResource.lecture_id == id
    ).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    lecture = db.query(Lecture).filter(Lecture.id == id).first()
    batch = db.query(Batch).filter(Batch.id == lecture.batch_id).first()
    if batch.educator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this resource")

    db.delete(resource)
    db.commit()
    return None
