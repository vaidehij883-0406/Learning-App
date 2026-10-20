from sqlalchemy.orm import Session
from app.models.user import User
from app.models.batch import Batch, BatchMembership
from app.models.lecture import Lecture, LectureResource
from app.models.quiz import Quiz, QuizQuestion, QuizOption
from app.models.communication import Announcement, ChatMessage
from app.core.security import get_password_hash


def seed_dev_data(db: Session):
    """
    Populates sample development data if database is empty.
    Creates sample Admin, Educator, and Learner, plus a full Batch with lectures and quizzes.
    """
    # Check if admin already exists or needs update
    admin_user = db.query(User).filter(User.email == "vaidehij883@gmail.com").first()
    if admin_user:
        admin_user.hashed_password = get_password_hash("Vaidehi@123")
        admin_user.role = "admin"
        db.commit()
        return

    old_admin = db.query(User).filter(User.email == "admin@learnbatch.com").first()
    if old_admin:
        old_admin.email = "vaidehij883@gmail.com"
        old_admin.full_name = "Vaidehi Joshi (Admin)"
        old_admin.hashed_password = get_password_hash("Vaidehi@123")
        old_admin.role = "admin"
        db.commit()
        return

    print("Seeding development data for LearnBatch...")

    # 1. Users
    admin = User(
        email="vaidehij883@gmail.com",
        full_name="Vaidehi Joshi (Admin)",
        role="admin",
        hashed_password=get_password_hash("Vaidehi@123"),
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
        bio="LearnBatch System Administrator"
    )

    educator = User(
        email="educator@learnbatch.com",
        full_name="Dr. Sarah Mitchell",
        role="educator",
        hashed_password=get_password_hash("EducatorPass123!"),
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
        bio="Senior Computer Science Professor specializing in Full-Stack Distributed Systems & Python."
    )

    learner = User(
        email="learner@learnbatch.com",
        full_name="Alex Chen",
        role="learner",
        hashed_password=get_password_hash("LearnerPass123!"),
        avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80",
        bio="Passionate computer engineering student eager to master modern application architecture."
    )

    db.add_all([admin, educator, learner])
    db.commit()
    db.refresh(educator)
    db.refresh(learner)

    # 2. Batches
    batch1 = Batch(
        title="Modern Full-Stack Engineering 2026",
        description="Comprehensive masterclass covering FastAPI backend APIs, React + TypeScript web frontends, and cross-platform mobile app development with Expo.",
        educator_id=educator.id,
        category="Computer Science",
        thumbnail_url="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
        language="English",
        is_published=True,
        enrollment_type="open"
    )

    batch2 = Batch(
        title="Python Distributed Systems & Microservices",
        description="Learn scalable architecture design, caching with Redis, asynchronous queues, and database optimization.",
        educator_id=educator.id,
        category="Software Architecture",
        thumbnail_url="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
        language="English",
        is_published=True,
        enrollment_type="open"
    )

    db.add_all([batch1, batch2])
    db.commit()
    db.refresh(batch1)

    # Enrollments
    m_educator = BatchMembership(batch_id=batch1.id, user_id=educator.id, role_in_batch="educator")
    m_learner = BatchMembership(batch_id=batch1.id, user_id=learner.id, role_in_batch="student")
    db.add_all([m_educator, m_learner])

    # 3. Lectures for Batch 1
    # Use reliable, high-quality public test video stream (Big Buck Bunny / Blender Open Movie)
    lec1 = Lecture(
        batch_id=batch1.id,
        title="Lecture 1: Full-Stack Architecture Principles & System Design",
        description="In this introductory lecture, we explore how client-server systems communicate, API contracts, token-based authentication, and state synchronization.",
        subject="Architecture",
        duration_seconds=596,
        video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        thumbnail_url="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
        sequence_order=1,
        is_published=True,
        is_public_preview=True
    )

    lec2 = Lecture(
        batch_id=batch1.id,
        title="Lecture 2: High-Performance FastAPI and Database Schemas",
        description="Deep dive into asynchronous endpoints, SQLAlchemy 2.0 ORM modeling, migration management, and Row Level Security policies.",
        subject="Backend Development",
        duration_seconds=653,
        video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        thumbnail_url="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
        sequence_order=2,
        is_published=True,
        is_public_preview=True
    )

    lec3 = Lecture(
        batch_id=batch1.id,
        title="Lecture 3: React 19 State Management & Custom Video Players (Draft)",
        description="Draft lecture exploring advanced HTML5 Video API bindings and playback position persistence.",
        subject="Frontend Development",
        duration_seconds=420,
        video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        thumbnail_url="https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80",
        sequence_order=3,
        is_published=False,  # Intentionally draft to verify access control!
        is_public_preview=False
    )

    db.add_all([lec1, lec2, lec3])
    db.commit()
    db.refresh(lec1)

    # 4. Lecture Resources (PDF Notes)
    note1 = LectureResource(
        lecture_id=lec1.id,
        title="System Design Architecture Cheatsheet.pdf",
        file_url="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        file_type="pdf",
        file_size_bytes=13264,
        is_downloadable=True
    )
    db.add(note1)

    # 5. Quiz for Batch 1
    quiz1 = Quiz(
        batch_id=batch1.id,
        lecture_id=lec1.id,
        title="Full-Stack Core Concepts Assessment",
        description="Test your understanding of API contracts, JWT authentication mechanics, and client-server synchronization.",
        time_limit_minutes=10,
        passing_score=60,
        max_attempts=3,
        is_published=True
    )
    db.add(quiz1)
    db.commit()
    db.refresh(quiz1)

    # Questions & Options
    q1 = QuizQuestion(
        quiz_id=quiz1.id,
        prompt="Which HTTP status code is most appropriate when a public guest attempts to access a private, unpublished lecture without credentials?",
        sequence_order=1,
        points=10
    )
    db.add(q1)
    db.flush()

    db.add_all([
        QuizOption(question_id=q1.id, option_text="200 OK", is_correct=False, sequence_order=1),
        QuizOption(question_id=q1.id, option_text="403 Forbidden or 404 Not Found", is_correct=True, sequence_order=2),
        QuizOption(question_id=q1.id, option_text="500 Internal Server Error", is_correct=False, sequence_order=3),
        QuizOption(question_id=q1.id, option_text="301 Moved Permanently", is_correct=False, sequence_order=4),
    ])

    q2 = QuizQuestion(
        quiz_id=quiz1.id,
        prompt="Where should correct quiz answers be evaluated to prevent client tampering?",
        sequence_order=2,
        points=10
    )
    db.add(q2)
    db.flush()

    db.add_all([
        QuizOption(question_id=q2.id, option_text="In the browser frontend React component", is_correct=False, sequence_order=1),
        QuizOption(question_id=q2.id, option_text="Exclusively on the secure backend server", is_correct=True, sequence_order=2),
        QuizOption(question_id=q2.id, option_text="In the user's localStorage storage object", is_correct=False, sequence_order=3),
        QuizOption(question_id=q2.id, option_text="In the URL query parameters", is_correct=False, sequence_order=4),
    ])

    # 6. Announcements & Chat
    ann1 = Announcement(
        batch_id=batch1.id,
        educator_id=educator.id,
        title="Welcome to Modern Full-Stack Engineering!",
        content="Welcome everyone! Please watch Lecture 1 and download the attached architecture cheat sheet. Our first live Q&A session will be announced shortly."
    )
    db.add(ann1)

    chat1 = ChatMessage(
        batch_id=batch1.id,
        user_id=educator.id,
        message="Hello class! Feel free to ask any architectural questions right here in the batch discussion board.",
        is_announcement=True
    )
    chat2 = ChatMessage(
        batch_id=batch1.id,
        user_id=learner.id,
        message="Excited to be here! The lecture video stream loaded smoothly on mobile as well.",
        is_announcement=False
    )
    db.add_all([chat1, chat2])

    db.commit()
    print("Seed data successfully created!")
