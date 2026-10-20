# LearnBatch — Public Batch-Wise Lecture Learning Platform

[![Tests](https://img.shields.io/badge/backend%20tests-8%20passed-brightgreen.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)]()
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg?logo=react&logoColor=black)]()
[![React Native](https://img.shields.io/badge/Expo-52.0+-000020.svg?logo=expo&logoColor=white)]()
[![PostgreSQL](https://img.shields.io/badge/Supabase-PostgreSQL%2015+-3ECF8E.svg?logo=supabase&logoColor=white)]()

LearnBatch is a complete, production-minded learning platform where educators create cohorts, upload video lectures and companion PDF notes, publish shareable lecture links, build assessments, and discuss questions with enrolled learners.

The platform provides a unified backend powering both a responsive **Web platform** (React + Vite + Tailwind CSS) and an **Android mobile application** (React Native + Expo).

---

## 1. System Features

* **Role-Based Access Control**: Strict server-enforced permissions for **Learners**, **Educators**, and **Administrators**. Public signup strictly forbids self-promotion to Administrator.
* **Public Lecture Share Links**: Every published lecture has a unique cryptographic link (`/lecture/share/{token}`). Anyone with the link can open the lecture without logging in. Draft/unpublished lectures are strictly protected.
* **Responsive Video Player**: Adaptive HTML5 & Expo Video with Play/Pause, Seek, Volume, Fullscreen, Playback Speed (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x), and automatic progress saving every 5-10 seconds.
* **Automatic Progress Persistence**: Video playback position is automatically saved to the database. When position reaches >= 90%, the lecture is marked completed.
* **PDF Study Notes**: Downloadable and viewable notes attached to lectures.
* **Server-Graded Quizzes**: Multiple-choice assessment builder. Correct answer keys are strictly concealed from learners until after submission to prevent tampering.
* **Live Batch Discussion & Announcements**: Cohort chatroom with pinned educator announcements.
* **In-App Notifications**: Real-time alert tray with mark-as-read status, plus Expo Push Token registration for Android devices.

---

## 2. Pre-seeded Demo Accounts

When the backend starts up for the first time, it automatically initializes a local development database with sample accounts, courses, lectures, quizzes, and notes:

| Role | Email | Password | Access Highlights |
|---|---|---|---|
| **Educator** | `educator@learnbatch.com` | `EducatorPass123!` | Educator Studio, Create batches, Upload videos/notes, Quiz builder |
| **Learner** | `learner@learnbatch.com` | `LearnerPass123!` | Explore courses, Join batches, Watch lectures, Take quizzes, Track progress |
| **Administrator** | `vaidehij883@gmail.com` | `Vaidehi@123` | Admin Panel, Manage all users, Change roles, Review moderation reports |

*Note: The login page includes one-click "Instant Demo Fill" buttons for quick testing.*

---

## 3. Prerequisites

* **Node.js**: v18.0.0 or higher (v20+ recommended)
* **Python**: v3.10 or higher (v3.14 compatible)
* **Git** and standard terminal (PowerShell for Windows, Bash/Zsh for Linux/macOS)

---

## 4. Quick Start Guide

### Step 1: Start the FastAPI Backend

#### Windows PowerShell:
```powershell
# Navigate to backend
cd "backend"

# Create and activate Python virtual environment
py -3 -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --port 8000
```

#### Linux / macOS:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

*The backend will be live at `http://localhost:8000`. Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.*

---

### Step 2: Start the Web Frontend (React + Vite)

In a new terminal window:

#### Windows PowerShell & Linux/macOS:
```bash
cd frontend
npm install
npm run dev
```

*The website will be live at `http://localhost:5173`.*

---

### Step 3: Start the Android Mobile App (Expo)

In a third terminal window:

#### Windows PowerShell & Linux/macOS:
```bash
cd mobile
npm install
npm run start
```

* Press `a` in the Expo terminal to launch on an Android Emulator or connected physical device.
* Or press `w` to run and preview the mobile navigation and layout directly in your web browser.
* *Note: For the Android emulator, `10.0.2.2:8000` automatically bridges to your computer's `localhost:8000`.*

---

## 5. Running Automated Test Suites

The backend includes a comprehensive pytest test suite verifying authentication security, permission boundaries, public link access, unpublished lecture restrictions, video progress syncing, and server-side quiz grading.

#### Windows PowerShell:
```powershell
cd backend
.\venv\Scripts\pytest -v
```

#### Linux / macOS:
```bash
cd backend
source venv/bin/activate
pytest -v
```

*Expected output: 8 passed (100% pass rate).*

---

## 6. Testing Key End-to-End Workflows

### 1. Test Public Lecture Share Links (Zero Login)
1. Open your browser in an Incognito / Private window (ensure you are logged out).
2. Go to `http://localhost:5173/explore`.
3. Click on the course **Modern Full-Stack Engineering 2026**.
4. In the lecture list, click the **Share** button on Lecture 1 to copy its link, or open directly:
   `http://localhost:5173/lecture/share/` (or copy link from curriculum).
5. Notice the lecture video plays, metadata displays, and companion PDF notes can be downloaded without any account required!
6. Try accessing an unpublished/draft lecture: the platform will correctly return an Access Denied / 403 Forbidden screen.

### 2. Test Video Progress Resumption
1. Sign in as Learner: `learner@learnbatch.com` / `LearnerPass123!`.
2. Open a lecture, play the video, and seek to 2:30.
3. Refresh the page or switch devices: notice the player resumes directly at the saved playback position!
4. Watch past 90% of duration: the lecture will automatically be marked completed with a checkmark.

### 3. Test Server-Side Quiz Grading
1. While logged in as a learner, click on the **Quizzes & Tests** tab in a batch.
2. Click **Start Quiz**.
3. Select your answers and click **Submit Answers**.
4. The server grades the attempt, calculates points, verifies passing threshold, and displays the score breakdown.
5. In your browser's Developer Tools network inspector, inspect the quiz question request: note that correct answer keys (`is_correct`) are **never sent to the client** prior to submission!

### 4. Test Educator Studio
1. Sign in as Educator: `educator@learnbatch.com` / `EducatorPass123!`.
2. Click **Educator Studio** in the top navigation.
3. Click **Upload Lecture** to add a new video lecture with upload progress and attach PDF notes.
4. Click **Create Quiz** to design multiple-choice questions and mark correct answers.
5. Post a pinned announcement in the batch chat: all enrolled learners receive in-app notifications instantly.

---

## 7. Connecting Supabase in Production

By default, LearnBatch runs locally with zero external accounts required. To connect your cloud Supabase PostgreSQL cluster and Supabase Storage:

1. Refer to the step-by-step instructions in [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md).
2. Execute the migration script in your Supabase SQL Editor:
   `supabase/migrations/20261020000000_init_learnbatch.sql`
3. Update `backend/.env` with your Supabase Database URL and API keys.

---

## 8. Troubleshooting & Common Errors

* **Port 8000 already in use**:
  Run `uvicorn app.main:app --port 8001` and update `VITE_API_URL` in `frontend/.env`.
* **Android Emulator cannot connect to backend**:
  Ensure the backend is running on `0.0.0.0:8000` or use Android's loopback alias `http://10.0.2.2:8000`.
* **Windows Execution Policy Error when activating venv**:
  Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell.
* **Corrupted or locked npm cache**:
  Run `npm cache clean --force` and retry `npm install`.

---

## 9. Documentation Directory

* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Comprehensive technical architecture, database diagram, and security model.
* [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) — REST API endpoints specification and permissions matrix.
* [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) — Step-by-step Supabase PostgreSQL and Storage bucket configuration.
* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Step-by-step GitHub Pages frontend CI/CD & cloud backend hosting guide.
