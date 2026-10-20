import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.seed import seed_dev_data

# Use in-memory SQLite database for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_dev_data(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_login_seeded_users(client):
    # Test Educator Login
    resp_edu = client.post("/api/v1/auth/login", json={
        "email": "educator@learnbatch.com",
        "password": "EducatorPass123!"
    })
    assert resp_edu.status_code == 200
    data = resp_edu.json()
    assert "access_token" in data
    assert data["user"]["role"] == "educator"

    # Test Learner Login
    resp_learn = client.post("/api/v1/auth/login", json={
        "email": "learner@learnbatch.com",
        "password": "LearnerPass123!"
    })
    assert resp_learn.status_code == 200
    assert resp_learn.json()["user"]["role"] == "learner"


def test_registration_prevents_admin_privilege_escalation(client):
    # Public registration attempting to set role="admin" should be clamped to "learner"
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": "sneaky_admin@example.com",
        "password": "SecretPassword123!",
        "full_name": "Wannabe Admin",
        "role": "admin"
    })
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()["user"]
    assert user_data["role"] == "learner"


def test_public_lecture_share_link(client):
    batches_resp = client.get("/api/v1/batches")
    assert batches_resp.status_code == 200
    batches = batches_resp.json()
    batch = next((b for b in batches if b["title"] == "Modern Full-Stack Engineering 2026"), batches[0])
    batch_id = batch["id"]

    # List lectures for this batch
    lectures_resp = client.get(f"/api/v1/lectures?batch_id={batch_id}")
    assert lectures_resp.status_code == 200
    lectures = lectures_resp.json()
    assert len(lectures) >= 1
    
    published_lecture = lectures[0]
    share_token = published_lecture["share_token"]

    # Access via public share link WITHOUT ANY AUTH TOKEN
    public_resp = client.get(f"/api/v1/lectures/share/{share_token}")
    assert public_resp.status_code == 200
    data = public_resp.json()
    assert data["title"] == published_lecture["title"]
    assert "video_url" in data
    assert "educator" in data


def test_unpublished_lecture_cannot_be_accessed_publicly(client):
    # Log in as educator to view draft lecture share token
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "educator@learnbatch.com",
        "password": "EducatorPass123!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    batches = client.get("/api/v1/batches", headers=headers).json()
    batch = next((b for b in batches if b["title"] == "Modern Full-Stack Engineering 2026"), batches[0])
    batch_id = batch["id"]

    all_lectures = client.get(f"/api/v1/lectures?batch_id={batch_id}", headers=headers).json()
    draft_lecture = next((l for l in all_lectures if not l["is_published"]), None)
    assert draft_lecture is not None

    # Public anonymous user attempts to access draft lecture
    forbidden_resp = client.get(f"/api/v1/lectures/share/{draft_lecture['share_token']}")
    assert forbidden_resp.status_code in [403, 404]


def test_video_progress_saving_and_completion(client):
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "learner@learnbatch.com",
        "password": "LearnerPass123!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    batches = client.get("/api/v1/batches", headers=headers).json()
    batch = next((b for b in batches if b["title"] == "Modern Full-Stack Engineering 2026"), batches[0])
    batch_id = batch["id"]
    lectures = client.get(f"/api/v1/lectures?batch_id={batch_id}", headers=headers).json()
    lecture_id = lectures[0]["id"]

    # 1. Update position to 120 seconds
    prog_resp1 = client.post(f"/api/v1/lectures/{lecture_id}/progress", json={
        "position_seconds": 120,
        "duration_seconds": 600
    }, headers=headers)
    assert prog_resp1.status_code == 200
    assert prog_resp1.json()["last_position_seconds"] == 120
    assert prog_resp1.json()["completed"] is False

    # 2. Update position to 580 seconds (>= 90% of 600) -> should auto-complete!
    prog_resp2 = client.post(f"/api/v1/lectures/{lecture_id}/progress", json={
        "position_seconds": 580,
        "duration_seconds": 600
    }, headers=headers)
    assert prog_resp2.status_code == 200
    assert prog_resp2.json()["completed"] is True
    assert prog_resp2.json()["completed_at"] is not None


def test_quiz_attempt_scoring_server_side(client):
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "learner@learnbatch.com",
        "password": "LearnerPass123!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    batches = client.get("/api/v1/batches", headers=headers).json()
    batch = next((b for b in batches if b["title"] == "Modern Full-Stack Engineering 2026"), batches[0])
    batch_id = batch["id"]

    quizzes = client.get(f"/api/v1/quizzes?batch_id={batch_id}", headers=headers).json()
    assert len(quizzes) > 0
    quiz_id = quizzes[0]["id"]

    # Learner opens quiz details
    quiz_detail = client.get(f"/api/v1/quizzes/{quiz_id}", headers=headers).json()
    assert "questions" in quiz_detail
    assert len(quiz_detail["questions"]) > 0

    # Verify that answer keys (is_correct) are NOT exposed in learner response!
    for q in quiz_detail["questions"]:
        for opt in q["options"]:
            assert "is_correct" not in opt

    # Submit quiz attempt with correct and incorrect answers
    q1 = quiz_detail["questions"][0]
    # Pick first option
    selected_opt_id = q1["options"][0]["id"]

    submission_resp = client.post(f"/api/v1/quizzes/{quiz_id}/attempt", json={
        "answers": [
            {"question_id": q1["id"], "selected_option_id": selected_opt_id}
        ]
    }, headers=headers)
    assert submission_resp.status_code == 200
    result = submission_resp.json()
    assert "score" in result
    assert "percentage" in result
    assert "passed" in result
    assert "breakdown" in result
    assert len(result["breakdown"]) > 0


def test_unauthorized_user_cannot_edit_foreign_batch(client):
    # Register another educator
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": "other_educator@example.com",
        "password": "OtherPass123!",
        "full_name": "Other Educator",
        "role": "educator"
    })
    other_token = reg_resp.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Fetch batch owned by Dr. Sarah Mitchell
    batches = client.get("/api/v1/batches").json()
    sarah_batch_id = batches[0]["id"]

    # Attempt to modify Sarah's batch
    edit_resp = client.put(f"/api/v1/batches/{sarah_batch_id}", json={
        "title": "Hacked Title"
    }, headers=other_headers)
    assert edit_resp.status_code == 403
