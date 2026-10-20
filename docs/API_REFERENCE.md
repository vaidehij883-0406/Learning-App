# LearnBatch — REST API Reference

The backend provides complete OpenAPI / Swagger documentation accessible interactively at `http://localhost:8000/docs`.

---

## 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a new user (`learner` or `educator`). Prevents admin self-escalation. |
| `POST` | `/auth/login` | Public | Authenticate with email and password; returns JWT token. |
| `GET` | `/auth/me` | Authenticated | Retrieve profile details of currently logged-in user. |
| `PUT` | `/auth/me` | Authenticated | Update user full name, bio, or avatar image URL. |
| `POST` | `/auth/logout` | Authenticated | Invalidate local session. |

---

## 2. Batches (`/api/v1/batches`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/batches` | Public | List published batches with search and category filtering. |
| `POST` | `/batches` | Educator / Admin | Create a new cohort batch. |
| `GET` | `/batches/{id}` | Public / Enrolled | Retrieve batch details and enrollment status. |
| `PUT` | `/batches/{id}` | Educator (Owner) | Update batch details. |
| `DELETE` | `/batches/{id}` | Educator (Owner) | Delete batch and related cascades. |
| `POST` | `/batches/{id}/enroll` | Authenticated | Join a batch as a learner. |
| `GET` | `/batches/{id}/members` | Enrolled | List active batch members. |

---

## 3. Lectures (`/api/v1/lectures`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/lectures` | Public / Enrolled | List lectures for a batch. Public users see previews; enrolled see all published. |
| `POST` | `/lectures` | Educator | Upload/create a new lecture. Notifies members if published. |
| `GET` | `/lectures/share/{token}` | **Public (Zero Auth)** | Open public lecture page without login. Draft lectures blocked. |
| `GET` | `/lectures/{id}` | Enrolled / Educator | Get lecture details and user's saved playback position. |
| `PUT` | `/lectures/{id}` | Educator (Owner) | Edit lecture metadata or publish/unpublish. |
| `DELETE` | `/lectures/{id}` | Educator (Owner) | Delete a lecture. |
| `POST` | `/lectures/{id}/progress` | Authenticated | Save playback position (sec). Auto-completes at >= 90%. |
| `POST` | `/lectures/{id}/resources`| Educator | Attach PDF study notes to lecture. |
| `DELETE` | `/lectures/{id}/resources/{res_id}` | Educator | Delete attached note. |

---

## 4. Quizzes & Assessments (`/api/v1/quizzes`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/quizzes` | Enrolled / Educator | List quizzes for a batch with user attempt statistics. |
| `POST` | `/quizzes` | Educator | Create quiz with questions, multiple options, and answer keys. |
| `GET` | `/quizzes/{id}` | Enrolled | Get quiz questions. Correct answer keys are strictly concealed! |
| `POST` | `/quizzes/{id}/attempt` | Authenticated | Submit quiz attempt. Evaluated server-side; returns graded breakdown. |
| `GET` | `/quizzes/{id}/my-attempts` | Authenticated | Review learner's past attempts. |
| `DELETE` | `/quizzes/{id}` | Educator (Owner) | Delete a quiz. |

---

## 5. Learning Progress (`/api/v1/progress`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/progress/my-learning` | Authenticated | Dashboard summary: batches, completed lectures, quiz scores, recent activity. |
| `GET` | `/progress/batches/{id}` | Authenticated | Progress breakdown for a specific batch. |

---

## 6. Chat & Announcements (`/api/v1`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/batches/{id}/messages` | Enrolled | Get batch discussion feed. |
| `POST` | `/batches/{id}/messages` | Enrolled | Send message. Educators can pin as announcement. |
| `GET` | `/batches/{id}/announcements` | Enrolled | Get list of educator announcements. |
| `POST` | `/batches/{id}/announcements` | Educator | Post announcement and notify batch members. |

---

## 7. Storage & Uploads (`/api/v1/uploads`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/uploads/presigned-url` | Authenticated | Generate signed direct upload URL for video/PDF storage. |
| `POST` | `/uploads/direct` | Authenticated | Direct multipart file upload endpoint. |
| `GET` | `/uploads/files/{bucket}/{file}` | Public | Stream stored media files with byte-range support. |

---

## 8. Administration (`/api/v1/admin`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/admin/stats` | Admin | Global metrics: users, batches, lectures, attempts, reports. |
| `GET` | `/admin/users` | Admin | List all registered platform users. |
| `PUT` | `/admin/users/{id}/role` | Admin | Update user role (`learner`, `educator`, `admin`). |
| `DELETE` | `/admin/users/{id}` | Admin | Suspend or delete user account. |
| `GET` | `/admin/reports` | Admin | Review moderation reports. |
| `PUT` | `/admin/reports/{id}` | Admin | Resolve or dismiss report. |
| `POST` | `/reports` | Authenticated | File report against inappropriate content. |
