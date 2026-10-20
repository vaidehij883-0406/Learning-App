# LearnBatch Deployment Guide

This guide covers deploying the LearnBatch platform to production, including hosting the **React Web Frontend** on **GitHub Pages**, deploying the **FastAPI Backend** to cloud services like Render or Railway, and connecting to **Supabase**.

---

## 1. Deploying Frontend to GitHub Pages

The repository is configured with an automated GitHub Actions CI/CD workflow at [`.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml).

### Step 1: Enable GitHub Actions as Pages Source in GitHub
1. Open your repository on GitHub: `https://github.com/vaidehij883-0406/learning-app`
2. Go to **Settings** (top navigation tab).
3. In the left sidebar, click **Pages** (under the "Code and automation" section).
4. Under **Build and deployment** > **Source**, select:
   👉 **GitHub Actions**
   *(Do NOT select "Deploy from a branch", select "GitHub Actions")*

### Step 2: (Optional) Set Production Backend API URL
If you have a deployed backend (e.g. on Render or Railway):
1. In repository **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret**.
3. Name: `VITE_API_URL`
4. Value: `https://your-backend-api.onrender.com/api/v1`
5. Click **Add secret**.

### Step 3: Trigger the Deployment
Deployment triggers automatically whenever you push to `main` branch affecting the frontend, or you can trigger it manually:
1. Go to the **Actions** tab on GitHub.
2. Select **Deploy Frontend to GitHub Pages** in the left sidebar.
3. Click **Run workflow** > **Run workflow**.
4. Once completed, your live site will be accessible at:
   🌐 **`https://vaidehij883-0406.github.io/learning-app/`**

---

## 2. Deploying Backend (FastAPI + Python)

GitHub Pages hosts static client-side applications (HTML/CSS/JS). To run the Python FastAPI backend, host it on a cloud server such as **Render**, **Railway**, or **Fly.io**.

### Option A: Render (Free & Simple)
1. Sign up at [render.com](https://render.com) and click **New +** > **Web Service**.
2. Connect your GitHub repository `vaidehij883-0406/learning-app`.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && alembic upgrade head`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. In the **Environment Variables** section, add:
   - `DATABASE_URL`: Your Supabase connection string (or PostgreSQL URL).
   - `SECRET_KEY`: A secure random 64-character string.
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role secret key.
   - `ALLOWED_ORIGINS`: `https://vaidehij883-0406.github.io`
5. Click **Deploy Web Service**.
6. Copy the URL (e.g. `https://learnbatch-api.onrender.com`) and update `VITE_API_URL` in your GitHub secrets!

---

## 3. Database & Storage Setup (Supabase)

Follow the complete instructions in [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) to set up:
1. PostgreSQL database tables and indexes (`supabase/migrations/20261020000000_init_learnbatch.sql`).
2. Storage buckets for lecture videos and PDF study notes (`lectures`, `notes`).
3. Bucket public/authenticated access policies.

---

## 4. Mobile App Build (Expo / React Native)

To build an Android APK or iOS binary for the mobile application:
```bash
cd mobile
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
