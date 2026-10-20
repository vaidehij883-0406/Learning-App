from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.batch import Batch, BatchMembership
from app.models.lecture import Lecture, LectureProgress
from app.models.quiz import Quiz, QuizAttempt
from app.api.deps import get_current_user
from app.services.progress_service import get_batch_progress_summary

router = APIRouter(prefix="/progress", tags=["Learning Progress"])


@router.get("/my-learning")
def get_my_learning_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    memberships = db.query(BatchMembership).filter(
        BatchMembership.user_id == current_user.id,
        BatchMembership.is_active == True
    ).all()

    enrolled_batch_ids = [m.batch_id for m in memberships]

    batches = db.query(Batch).filter(Batch.id.in_(enrolled_batch_ids)).all() if enrolled_batch_ids else []

    batches_data = []
    total_completed_lectures = 0

    for b in batches:
        summary = get_batch_progress_summary(db=db, user_id=current_user.id, batch_id=b.id)
        total_completed_lectures += summary["completed_lectures"]

        batches_data.append({
            "id": b.id,
            "title": b.title,
            "category": b.category,
            "thumbnail_url": b.thumbnail_url,
            "educator_name": b.educator.full_name if b.educator else "Educator",
            "progress_percentage": summary["percentage"],
            "total_lectures": summary["total_lectures"],
            "completed_lectures": summary["completed_lectures"],
            "next_lecture": summary["next_lecture"]
        })

    # Quiz statistics
    quiz_attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).all()
    quizzes_passed = sum(1 for a in quiz_attempts if a.passed)

    # Recent activity
    recent_progress = db.query(LectureProgress).filter(
        LectureProgress.user_id == current_user.id
    ).order_by(LectureProgress.updated_at.desc()).limit(5).all()

    recent_activities = []
    for rp in recent_progress:
        lec = db.query(Lecture).filter(Lecture.id == rp.lecture_id).first()
        if lec:
            batch = db.query(Batch).filter(Batch.id == lec.batch_id).first()
            recent_activities.append({
                "lecture_id": lec.id,
                "lecture_title": lec.title,
                "batch_id": lec.batch_id,
                "batch_title": batch.title if batch else "Course",
                "completed": rp.completed,
                "last_position_seconds": rp.last_position_seconds,
                "updated_at": rp.updated_at
            })

    return {
        "enrolled_batches_count": len(batches_data),
        "total_completed_lectures": total_completed_lectures,
        "quizzes_attempted": len(quiz_attempts),
        "quizzes_passed": quizzes_passed,
        "batches": batches_data,
        "recent_activities": recent_activities
    }


@router.get("/batches/{batch_id}")
def get_single_batch_progress(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_batch_progress_summary(db=db, user_id=current_user.id, batch_id=batch_id)
