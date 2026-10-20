# Supabase Integration & Database Migration Guide

LearnBatch is natively compatible with Supabase PostgreSQL, Supabase Auth, and Supabase Storage. Follow these steps to connect your Supabase project.

---

## 1. Create a Supabase Project
1. Log in to your [Supabase Dashboard](https://app.supabase.com).
2. Click **New Project**, select an organization, name your project (e.g. `learnbatch`), and set a secure database password.
3. Choose the region closest to your users.

---

## 2. Apply Database Migrations & RLS Policies
1. In your Supabase Dashboard, navigate to the **SQL Editor** tab on the left sidebar.
2. Click **New Query**.
3. Open the migration file:
   `supabase/migrations/20261020000000_init_learnbatch.sql`
4. Copy the entire file contents and paste them into the SQL editor.
5. Click **Run**.
6. The query will create all 15 relational tables, indexes, and configure all Row Level Security (RLS) policies.

---

## 3. Configure Storage Buckets
1. In the Supabase Dashboard, navigate to **Storage** -> **Buckets**.
2. Create the following buckets:
   - `videos`: Public bucket (or Private if using signed streaming URLs).
   - `notes`: Public or Private for downloadable PDF notes.
   - `thumbnails`: Public bucket for course and lecture images.
   - `media`: Default upload bucket.
3. For public buckets, toggle **Public Bucket** to enabled so images and public previews stream without authorization barriers.

---

## 4. Obtain API Credentials
1. Go to **Project Settings** -> **API**.
2. Copy the following values:
   - **Project URL** (`https://[YOUR-PROJECT-REF].supabase.co`)
   - **Project API Keys**: `anon` (public key) and `service_role` (secret key).
   - **JWT Secret**: Found under the **JWT Settings** section.

---

## 5. Configure the Backend Environment
Edit `backend/.env`:

```env
# Database Connection (Transaction Pooler or Direct Connection)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Supabase Auth & Storage Integration
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
SUPABASE_JWT_SECRET="[YOUR-JWT-SECRET]"

# Storage Engine
STORAGE_BACKEND="supabase"
```

Once configured, the FastAPI backend will automatically use your Supabase PostgreSQL cluster and upload files directly to Supabase Storage!
