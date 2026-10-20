from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# Options
class QuizOptionCreate(BaseModel):
    option_text: str = Field(..., min_length=1)
    is_correct: bool = False
    sequence_order: int = 1


class QuizOptionLearnerResponse(BaseModel):
    id: str
    option_text: str
    sequence_order: int

    model_config = ConfigDict(from_attributes=True)


class QuizOptionEducatorResponse(QuizOptionLearnerResponse):
    is_correct: bool


# Questions
class QuizQuestionCreate(BaseModel):
    prompt: str = Field(..., min_length=2)
    sequence_order: int = 1
    points: int = 10
    options: List[QuizOptionCreate] = Field(..., min_length=2)


class QuizQuestionLearnerResponse(BaseModel):
    id: str
    prompt: str
    sequence_order: int
    points: int
    options: List[QuizOptionLearnerResponse]

    model_config = ConfigDict(from_attributes=True)


class QuizQuestionEducatorResponse(BaseModel):
    id: str
    prompt: str
    sequence_order: int
    points: int
    options: List[QuizOptionEducatorResponse]

    model_config = ConfigDict(from_attributes=True)


# Quiz
class QuizBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    time_limit_minutes: Optional[int] = 15
    passing_score: int = Field(60, ge=0, le=100)
    max_attempts: int = Field(3, ge=1)
    is_published: bool = False


class QuizCreate(QuizBase):
    batch_id: str
    lecture_id: Optional[str] = None
    questions: List[QuizQuestionCreate] = Field(..., min_length=1)


class QuizUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    time_limit_minutes: Optional[int] = None
    passing_score: Optional[int] = None
    max_attempts: Optional[int] = None
    is_published: Optional[bool] = None


class QuizLearnerResponse(QuizBase):
    id: str
    batch_id: str
    lecture_id: Optional[str] = None
    questions_count: int = 0
    questions: List[QuizQuestionLearnerResponse] = []
    user_attempts_count: int = 0
    best_score: Optional[int] = None
    passed: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuizEducatorResponse(QuizBase):
    id: str
    batch_id: str
    lecture_id: Optional[str] = None
    questions: List[QuizQuestionEducatorResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Attempts and Submissions
class QuestionAnswerSubmission(BaseModel):
    question_id: str
    selected_option_id: str


class QuizAttemptSubmit(BaseModel):
    answers: List[QuestionAnswerSubmission]


class QuestionResultDetail(BaseModel):
    question_id: str
    prompt: str
    selected_option_id: Optional[str]
    correct_option_id: str
    is_correct: bool
    points_earned: int
    points_possible: int


class QuizAttemptResultResponse(BaseModel):
    id: str
    quiz_id: str
    score: int
    max_score: int
    percentage: float
    passed: bool
    started_at: datetime
    completed_at: datetime
    attempts_remaining: int
    breakdown: List[QuestionResultDetail] = []
