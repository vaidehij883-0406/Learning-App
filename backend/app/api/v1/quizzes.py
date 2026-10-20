from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User
from app.models.batch import Batch, BatchMembership
from app.models.quiz import Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAnswer
from app.schemas.quiz import (
    QuizCreate, QuizUpdate, QuizLearnerResponse, QuizEducatorResponse,
    QuizAttemptSubmit, QuizAttemptResultResponse, QuizQuestionLearnerResponse,
    QuizOptionLearnerResponse, QuestionResultDetail
)
from app.api.deps import get_current_user, require_educator
from app.services.quiz_service import evaluate_quiz_submission
from app.services.notification_service import notify_batch_members

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


@router.get("", response_model=List[QuizLearnerResponse])
def list_quizzes(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    is_educator = (current_user.id == batch.educator_id or current_user.role == "admin")

    query = db.query(Quiz).filter(Quiz.batch_id == batch_id)
    if not is_educator:
        query = query.filter(Quiz.is_published == True)

    quizzes = query.order_by(Quiz.created_at.desc()).all()

    result = []
    for q in quizzes:
        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.quiz_id == q.id,
            QuizAttempt.user_id == current_user.id
        ).all()
        user_attempts_count = len(attempts)
        best_score = max((a.score for a in attempts), default=None)
        passed = any(a.passed for a in attempts)
        questions_count = len(q.questions)

        res_item = QuizLearnerResponse(
            id=q.id,
            batch_id=q.batch_id,
            lecture_id=q.lecture_id,
            title=q.title,
            description=q.description,
            time_limit_minutes=q.time_limit_minutes,
            passing_score=q.passing_score,
            max_attempts=q.max_attempts,
            is_published=q.is_published,
            questions_count=questions_count,
            questions=[],  # questions list loaded on quiz detail
            user_attempts_count=user_attempts_count,
            best_score=best_score,
            passed=passed,
            created_at=q.created_at
        )
        result.append(res_item)

    return result


@router.post("", response_model=QuizEducatorResponse, status_code=status.HTTP_201_CREATED)
def create_quiz(
    quiz_in: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    batch = db.query(Batch).filter(Batch.id == quiz_in.batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
    if batch.educator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to create quizzes for this batch")

    quiz = Quiz(
        batch_id=quiz_in.batch_id,
        lecture_id=quiz_in.lecture_id,
        title=quiz_in.title,
        description=quiz_in.description,
        time_limit_minutes=quiz_in.time_limit_minutes,
        passing_score=quiz_in.passing_score,
        max_attempts=quiz_in.max_attempts,
        is_published=quiz_in.is_published
    )
    db.add(quiz)
    db.flush()

    for q_idx, q_data in enumerate(quiz_in.questions, start=1):
        question = QuizQuestion(
            quiz_id=quiz.id,
            prompt=q_data.prompt,
            sequence_order=q_data.sequence_order or q_idx,
            points=q_data.points
        )
        db.add(question)
        db.flush()

        for o_idx, opt_data in enumerate(q_data.options, start=1):
            opt = QuizOption(
                question_id=question.id,
                option_text=opt_data.option_text,
                is_correct=opt_data.is_correct,
                sequence_order=opt_data.sequence_order or o_idx
            )
            db.add(opt)

    db.commit()
    db.refresh(quiz)

    if quiz.is_published:
        notify_batch_members(
            db=db,
            batch_id=batch.id,
            title=f"New Quiz Available: {quiz.title}",
            message=f"Test your knowledge in '{batch.title}' with the quiz '{quiz.title}'.",
            type="quiz",
            link=f"/quiz/{quiz.id}"
        )

    return quiz


@router.get("/{id}", response_model=QuizLearnerResponse)
def get_quiz_for_learner(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    batch = db.query(Batch).filter(Batch.id == quiz.batch_id).first()
    is_educator = (current_user.id == batch.educator_id or current_user.role == "admin")

    if not quiz.is_published and not is_educator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This quiz is not currently open")

    # Structure questions securely without answer keys!
    learner_questions: List[QuizQuestionLearnerResponse] = []
    for q in quiz.questions:
        learner_options = [
            QuizOptionLearnerResponse(
                id=o.id,
                option_text=o.option_text,
                sequence_order=o.sequence_order
            )
            for o in q.options
        ]
        learner_questions.append(
            QuizQuestionLearnerResponse(
                id=q.id,
                prompt=q.prompt,
                sequence_order=q.sequence_order,
                points=q.points,
                options=learner_options
            )
        )

    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz.id,
        QuizAttempt.user_id == current_user.id
    ).all()
    user_attempts_count = len(attempts)
    best_score = max((a.score for a in attempts), default=None)
    passed = any(a.passed for a in attempts)

    return QuizLearnerResponse(
        id=quiz.id,
        batch_id=quiz.batch_id,
        lecture_id=quiz.lecture_id,
        title=quiz.title,
        description=quiz.description,
        time_limit_minutes=quiz.time_limit_minutes,
        passing_score=quiz.passing_score,
        max_attempts=quiz.max_attempts,
        is_published=quiz.is_published,
        questions_count=len(quiz.questions),
        questions=learner_questions,
        user_attempts_count=user_attempts_count,
        best_score=best_score,
        passed=passed,
        created_at=quiz.created_at
    )


@router.post("/{id}/attempt", response_model=QuizAttemptResultResponse)
def submit_quiz_attempt(
    id: str,
    submission: QuizAttemptSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits quiz attempt answers, scores server-side, validates against attempt limits,
    persists results, and returns evaluated breakdown.
    """
    return evaluate_quiz_submission(
        db=db,
        quiz_id=id,
        user_id=current_user.id,
        submission=submission
    )


@router.get("/{id}/my-attempts")
def get_my_quiz_attempts(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == id,
        QuizAttempt.user_id == current_user.id
    ).order_by(QuizAttempt.completed_at.desc()).all()
    return attempts


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_educator)
):
    quiz = db.query(Quiz).filter(Quiz.id == id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    batch = db.query(Batch).filter(Batch.id == quiz.batch_id).first()
    if batch.educator_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this quiz")

    db.delete(quiz)
    db.commit()
    return None
