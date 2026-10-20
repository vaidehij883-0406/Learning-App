from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.core.database import get_db
from app.models.user import User
from app.models.batch import Batch, BatchMembership
from app.models.lecture import Lecture
from app.schemas.batch import BatchCreate, BatchUpdate, BatchResponse, BatchDetailResponse, BatchMembershipResponse
from app.api.deps import get_current_user, get_optional_current_user, require_educator

router = APIRouter(prefix="/batches", tags=["Batches"])


@router.get("", response_model=List[BatchResponse])
def list_batches(
    search: Optional[str] = None,
    category: Optional[str] = None,
    educator_id: Optional[str] = None,
    my_batches_only: bool = False,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = db.query(Batch)

    if my_batches_only:
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        if current_user.role in ["educator", "admin"]:
            query = query.filter(Batch.educator_id == current_user.id)
        else:
            # Enrolled batches for learner
            query = query.join(BatchMembership).filter(
                BatchMembership.user_id == current_user.id,
                BatchMembership.is_active == True
            )
    else:
        # For public/learners, only show published unless educator/admin viewing their own
        if not current_user or current_user.role == "learner":
            query = query.filter(Batch.is_published == True)
        elif current_user.role == "educator":
            query = query.filter(or_(Batch.is_published == True, Batch.educator_id == current_user.id))

    if search:
        query = query.filter(or_(
            Batch.title.ilike(f"%{search}%"),
            Batch.description.ilike(f"%{search}%"),
            Batch.category.ilike(f"%{search}%")
        ))
    if category and category != "All":
        query = query.filter(Batch.category == category)
    if educator_id:
        query = query.filter(Batch.educator_id == educator_id)

    batches = query.order_by(Batch.created_at.desc()).all()

    # Pre-calculate counts and enrollment
    result = []
    user_id = current_user.id if current_user else None
    user_enrollments = set()
    if user_id:
        user_enrollments = set(
            row[0] for row in db.query(BatchMembership.batch_id).filter(
                BatchMembership.user_id == user_id,
                BatchMembership.is_active == True
            ).all()
        )

    for b in batches:
        lectures_count = db.query(Lecture).filter(
            Lecture.batch_id == b.id,
            Lecture.is_published == True
        ).count()
        enrolled_count = db.query(BatchMembership).filter(
            BatchMembership.batch_id == b.id,
            BatchMembership.is_active == True
        ).count()
        is_enrolled = bool((b.id in user_enrollments) or (user_id and b.educator_id == user_id))

        res_item = BatchResponse(
            id=b.id,
            title=b.title,
            description=b.description,
            category=b.category,
            thumbnail_url=b.thumbnail_url,
            start_date=b.start_date,
            end_date=b.end_date,
            language=b.language,
            is_published=b.is_published,
            enrollment_type=b.enrollment_type,
            educator_id=b.educator_id,
            educator=b.educator,
            lectures_count=lectures_count,
            enrolled_count=enrolled_count,
            is_enrolled=is_enrolled,
            created_at=b.created_at,
            updated_at=b.updated_at
        )
        result.append(res_item)

    return result


@router.post("", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    batch_in: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    batch = Batch(
        title=batch_in.title,
        description=batch_in.description,
        educator_id=current_user.id,
        category=batch_in.category,
        thumbnail_url=batch_in.thumbnail_url,
        start_date=batch_in.start_date,
        end_date=batch_in.end_date,
        language=batch_in.language,
        is_published=batch_in.is_published,
        enrollment_type=batch_in.enrollment_type
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Automatically add educator as member with 'educator' role
    membership = BatchMembership(
        batch_id=batch.id,
        user_id=current_user.id,
        role_in_batch="educator"
    )
    db.add(membership)
    db.commit()

    return BatchResponse(
        id=batch.id,
        title=batch.title,
        description=batch.description,
        category=batch.category,
        thumbnail_url=batch.thumbnail_url,
        start_date=batch.start_date,
        end_date=batch.end_date,
        language=batch.language,
        is_published=batch.is_published,
        enrollment_type=batch.enrollment_type,
        educator_id=batch.educator_id,
        educator=current_user,
        lectures_count=0,
        enrolled_count=1,
        is_enrolled=True,
        created_at=batch.created_at,
        updated_at=batch.updated_at
    )


@router.get("/{id}", response_model=BatchDetailResponse)
def get_batch(
    id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    batch = db.query(Batch).filter(Batch.id == id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    user_id = current_user.id if current_user else None
    is_educator_or_admin = current_user and (current_user.role == "admin" or batch.educator_id == current_user.id)

    if not batch.is_published and not is_educator_or_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This batch is not currently published")

    is_enrolled = False
    if user_id:
        membership = db.query(BatchMembership).filter(
            BatchMembership.batch_id == batch.id,
            BatchMembership.user_id == user_id,
            BatchMembership.is_active == True
        ).first()
        is_enrolled = (membership is not None) or is_educator_or_admin

    lectures_count = db.query(Lecture).filter(
        Lecture.batch_id == batch.id,
        or_(Lecture.is_published == True, is_educator_or_admin)
    ).count()

    enrolled_count = db.query(BatchMembership).filter(
        BatchMembership.batch_id == batch.id,
        BatchMembership.is_active == True
    ).count()

    return BatchDetailResponse(
        id=batch.id,
        title=batch.title,
        description=batch.description,
        category=batch.category,
        thumbnail_url=batch.thumbnail_url,
        start_date=batch.start_date,
        end_date=batch.end_date,
        language=batch.language,
        is_published=batch.is_published,
        enrollment_type=batch.enrollment_type,
        educator_id=batch.educator_id,
        educator=batch.educator,
        lectures_count=lectures_count,
        enrolled_count=enrolled_count,
        is_enrolled=is_enrolled,
        created_at=batch.created_at,
        updated_at=batch.updated_at
    )


@router.put("/{id}", response_model=BatchResponse)
def update_batch(
    id: str,
    batch_in: BatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    batch = db.query(Batch).filter(Batch.id == id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
    if batch.educator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit this batch")

    for field, val in batch_in.model_dump(exclude_unset=True).items():
        setattr(batch, field, val)

    db.commit()
    db.refresh(batch)

    lectures_count = db.query(Lecture).filter(Lecture.batch_id == batch.id).count()
    enrolled_count = db.query(BatchMembership).filter(BatchMembership.batch_id == batch.id, BatchMembership.is_active == True).count()

    return BatchResponse(
        id=batch.id,
        title=batch.title,
        description=batch.description,
        category=batch.category,
        thumbnail_url=batch.thumbnail_url,
        start_date=batch.start_date,
        end_date=batch.end_date,
        language=batch.language,
        is_published=batch.is_published,
        enrollment_type=batch.enrollment_type,
        educator_id=batch.educator_id,
        educator=batch.educator,
        lectures_count=lectures_count,
        enrolled_count=enrolled_count,
        is_enrolled=True,
        created_at=batch.created_at,
        updated_at=batch.updated_at
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    batch = db.query(Batch).filter(Batch.id == id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
    if batch.educator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this batch")

    db.delete(batch)
    db.commit()
    return None


@router.post("/{id}/enroll", response_model=BatchMembershipResponse)
def enroll_batch(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(Batch).filter(Batch.id == id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
    if not batch.is_published and current_user.role != "admin" and batch.educator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot enroll in an unpublished batch")

    membership = db.query(BatchMembership).filter(
        BatchMembership.batch_id == id,
        BatchMembership.user_id == current_user.id
    ).first()

    if membership:
        if not membership.is_active:
            membership.is_active = True
            db.commit()
            db.refresh(membership)
        return membership

    membership = BatchMembership(
        batch_id=id,
        user_id=current_user.id,
        role_in_batch="student",
        is_active=True
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


@router.get("/{id}/members", response_model=List[BatchMembershipResponse])
def get_batch_members(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    members = db.query(BatchMembership).filter(
        BatchMembership.batch_id == id,
        BatchMembership.is_active == True
    ).all()
    return members
