# LearnBatch — Architecture & System Design Documentation

## 1. System Overview
LearnBatch is an open, multi-tenant lecture learning platform engineered to connect educators with public learners. The platform is architected around the concept of **cohort batches** containing sequenced video lectures, downloadable PDF notes, server-graded quizzes, and live batch discussions.

---

## 2. Core Architecture Components

```
+--------------------------------------------------------------+
|                        Client Tier                           |
|  [React + Vite Web App]          [Expo Android Mobile App]   |
|  (Desktop / Mobile Browser)      (Native Android App)        |
+--------------------------------------------------------------+
                               |
                        HTTP / REST APIs
                               |
+--------------------------------------------------------------+
|                        API Tier                              |
|  FastAPI Application (Python 3.14 / 3.11+)                  |
|  - JWT Authentication & RBAC Guard                           |
|  - Public Lecture Token Resolver                             |
|  - Server-Side Quiz Grading Engine                           |
|  - Learning Progress & Playback Sync                         |
|  - Storage Abstraction Layer (Local & Supabase Storage)      |
+--------------------------------------------------------------+
                               |
                 SQLAlchemy 2.0 ORM & Pool
                               |
+--------------------------------------------------------------+
|                      Persistence Tier                        |
|  PostgreSQL 15+ (Supabase) / SQLite Development Database    |
|  - 15 Normalized Relational Tables                           |
|  - Row Level Security (RLS) Policies                         |
|  - Direct Signed URLs for File & Video Storage               |
+--------------------------------------------------------------+
```

---

## 3. Security & Access Control Model

### Role-Based Access Control (RBAC)
The platform enforces three strict roles:
1. **Learner**:
   - Access to public published batches and public preview lectures.
   - Enrolled batches: view all lectures, download permitted PDF notes, submit quiz attempts, and send batch chat messages.
   - Progress: can read and write only their own playback positions.
2. **Educator**:
   - Create, edit, and delete their own batches.
   - Upload lecture videos, thumbnails, and PDF notes.
   - Design quizzes with answer keys (answer keys are strictly concealed from learners until after submission).
   - Post pinned announcements to all enrolled batch students.
   - Protected from tampering: educators cannot edit or delete another educator's content.
3. **Administrator**:
   - Read and manage all users and role assignments.
   - Suspend or delete abusive accounts.
   - Resolve content moderation flags and view global system statistics.

### Public Shareable Lecture Links (Zero-Authentication)
- Every published lecture is provisioned with a cryptographic `share_token` (128-bit hex).
- Public guests can open `/lecture/share/{share_token}` and watch the lecture video without creating an account or logging in.
- Unpublished or draft lectures return `403 Forbidden` or `404 Not Found`.

---

## 4. Storage & Media Streaming Architecture
To prevent unnecessary server bandwidth bottlenecks, LearnBatch provides a modular Storage Provider interface:
- **`LocalStorageProvider`**: Streams local files with HTTP byte-range request support (`Accept-Ranges: bytes`) for seeking in dev environments.
- **`SupabaseStorageProvider`**: Direct uploads via signed upload URLs, and short-lived signed URLs for protected PDF documents and private videos.
- Easily extensible to Amazon S3, Cloudflare Stream, or Mux.
