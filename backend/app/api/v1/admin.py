from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.batch import Batch
from app.models.lecture import Lecture
from app.models.quiz import QuizAttempt
from app.models.communication import Report
from app.schemas.auth import UserProfileResponse
from app.schemas.communication import ReportCreate, ReportResponse
from app.api.deps import get_current_user, require_admin

router = APIRouter(tags=["Administration and Moderation"])


class RoleUpdateRequest(BaseModel):
    role: str


class ReportStatusUpdate(BaseModel):
    status: str  # 'reviewed', 'resolved', 'dismissed'


@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def submit_report(
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = Report(
        reporter_id=current_user.id,
        target_type=report_in.target_type,
        target_id=report_in.target_id,
        reason=report_in.reason,
        status="pending"
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/admin/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    total_users = db.query(User).count()
    total_educators = db.query(User).filter(User.role == "educator").count()
    total_learners = db.query(User).filter(User.role == "learner").count()
    total_batches = db.query(Batch).count()
    total_lectures = db.query(Lecture).count()
    total_attempts = db.query(QuizAttempt).count()
    pending_reports = db.query(Report).filter(Report.status == "pending").count()

    return {
        "total_users": total_users,
        "total_educators": total_educators,
        "total_learners": total_learners,
        "total_batches": total_batches,
        "total_lectures": total_lectures,
        "total_quiz_attempts": total_attempts,
        "pending_reports": pending_reports
    }


@router.get("/admin/users", response_model=List[UserProfileResponse])
def get_all_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    return q.order_by(User.created_at.desc()).all()


@router.put("/admin/users/{id}/role", response_model=UserProfileResponse)
def update_user_role(
    id: str,
    payload: RoleUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    new_role = payload.role.lower()
    if new_role not in ["learner", "educator", "admin"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

    user.role = new_role
    db.commit()
    db.refresh(user)
    return user


@router.delete("/admin/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == admin_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account")

    db.delete(user)
    db.commit()
    return None


@router.get("/admin/reports", response_model=List[ReportResponse])
def get_reports(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    q = db.query(Report)
    if status_filter:
        q = q.filter(Report.status == status_filter)
    return q.order_by(Report.created_at.desc()).all()


@router.put("/admin/reports/{id}", response_model=ReportResponse)
def update_report_status(
    id: str,
    payload: ReportStatusUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    report.status = payload.status
    if payload.status in ["resolved", "dismissed"]:
        report.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)
    return report
