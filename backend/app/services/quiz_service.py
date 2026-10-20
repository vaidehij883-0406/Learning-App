from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.quiz import Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAnswer
from app.schemas.quiz import QuizAttemptSubmit, QuizAttemptResultResponse, QuestionResultDetail


def evaluate_quiz_submission(
    db: Session,
    quiz_id: str,
    user_id: str,
    submission: QuizAttemptSubmit
) -> QuizAttemptResultResponse:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    if not quiz.is_published:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This quiz is not currently open")

    # Check attempt limits
    existing_attempts = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_id == user_id
    ).count()

    if existing_attempts >= quiz.max_attempts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum attempts reached ({quiz.max_attempts})"
        )

    # Fetch questions and options for this quiz
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    q_map = {q.id: q for q in questions}

    user_answers_map = {a.question_id: a.selected_option_id for a in submission.answers}

    earned_score = 0
    total_possible_score = 0
    breakdown: List[QuestionResultDetail] = []
    quiz_answer_records: List[QuizAnswer] = []

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=user_id,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc)
    )
    db.add(attempt)
    db.flush()  # populate attempt.id

    for q in questions:
        total_possible_score += q.points
        correct_opt = next((opt for opt in q.options if opt.is_correct), None)
        correct_opt_id = correct_opt.id if correct_opt else ""

        selected_opt_id = user_answers_map.get(q.id)
        is_correct = (selected_opt_id is not None and selected_opt_id == correct_opt_id)

        points_earned = q.points if is_correct else 0
        earned_score += points_earned

        quiz_answer_records.append(
            QuizAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                selected_option_id=selected_opt_id,
                is_correct=is_correct
            )
        )

        breakdown.append(
            QuestionResultDetail(
                question_id=q.id,
                prompt=q.prompt,
                selected_option_id=selected_opt_id,
                correct_option_id=correct_opt_id,
                is_correct=is_correct,
                points_earned=points_earned,
                points_possible=q.points
            )
        )

    db.add_all(quiz_answer_records)

    percentage = round((earned_score / total_possible_score * 100), 2) if total_possible_score > 0 else 0.0
    passed = percentage >= quiz.passing_score

    attempt.score = earned_score
    attempt.max_score = total_possible_score
    attempt.percentage = percentage
    attempt.passed = passed

    db.commit()
    db.refresh(attempt)

    remaining_attempts = max(0, quiz.max_attempts - (existing_attempts + 1))

    return QuizAttemptResultResponse(
        id=attempt.id,
        quiz_id=quiz.id,
        score=earned_score,
        max_score=total_possible_score,
        percentage=percentage,
        passed=passed,
        started_at=attempt.started_at,
        completed_at=attempt.completed_at,
        attempts_remaining=remaining_attempts,
        breakdown=breakdown
    )
