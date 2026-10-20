from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.lecture import Lecture, LectureProgress
from app.models.batch import Batch, BatchMembership
from app.models.quiz import Quiz, QuizAttempt


def update_lecture_progress(
    db: Session,
    user_id: str,
    lecture_id: str,
    position_seconds: int,
    duration_seconds: int = 0
) -> LectureProgress:
    progress = db.query(LectureProgress).filter(
        LectureProgress.user_id == user_id,
        LectureProgress.lecture_id == lecture_id
    ).first()

    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    effective_duration = duration_seconds or (lecture.duration_seconds if lecture else 0)

    # 90% threshold for automatic completion
    threshold_seconds = effective_duration * 0.90 if effective_duration > 0 else 0
    should_complete = effective_duration > 0 and position_seconds >= threshold_seconds

    if not progress:
        progress = LectureProgress(
            user_id=user_id,
            lecture_id=lecture_id,
            last_position_seconds=position_seconds,
            completed=should_complete,
            completed_at=datetime.now(timezone.utc) if should_complete else None
        )
        db.add(progress)
    else:
        # Keep highest position if seeking back, but update last_position_seconds
        progress.last_position_seconds = position_seconds
        if should_complete and not progress.completed:
            progress.completed = True
            progress.completed_at = datetime.now(timezone.utc)
        progress.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(progress)
    return progress


def get_batch_progress_summary(db: Session, user_id: str, batch_id: str) -> Dict[str, Any]:
    lectures = db.query(Lecture).filter(
        Lecture.batch_id == batch_id,
        Lecture.is_published == True
    ).order_by(Lecture.sequence_order).all()

    total_lectures = len(lectures)
    lecture_ids = [l.id for l in lectures]

    completed_count = 0
    progress_map = {}

    if total_lectures > 0:
        progresses = db.query(LectureProgress).filter(
            LectureProgress.user_id == user_id,
            LectureProgress.lecture_id.in_(lecture_ids)
        ).all()
        for p in progresses:
            progress_map[p.lecture_id] = {
                "last_position_seconds": p.last_position_seconds,
                "completed": p.completed,
                "completed_at": p.completed_at
            }
            if p.completed:
                completed_count += 1

    percentage = round((completed_count / total_lectures * 100), 1) if total_lectures > 0 else 0.0

    # Next recommended lecture
    next_lecture = None
    for l in lectures:
        p = progress_map.get(l.id)
        if not p or not p["completed"]:
            next_lecture = {
                "id": l.id,
                "title": l.title,
                "sequence_order": l.sequence_order,
                "duration_seconds": l.duration_seconds
            }
            break

    return {
        "batch_id": batch_id,
        "total_lectures": total_lectures,
        "completed_lectures": completed_count,
        "percentage": percentage,
        "next_lecture": next_lecture,
        "lectures_progress": progress_map
    }
