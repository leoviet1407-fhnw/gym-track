# GymTrack

Fitness tracking app for Viet & Jullie. Built with Next.js 14, Vercel Blob, and Vercel Cron.

## Features

- **Workout tracking** — Templates pre-loaded for Viet (Chest+Triceps, Back+Biceps, Legs+Shoulders). Log sets, reps, weight per exercise.
- **Automated progression** — Weight increase suggestions after 2 consecutive target sessions. Deload suggestions after 4+ weeks of progression.
- **PR detection** — Auto-detects new max weight, max reps, and best estimated 1RM (Epley formula).
- **Rest timer** — 60 / 90 / 120 / 180s presets with vibration on finish.
- **Supplements** — Daily checklist (Viet: Creatine · Jullie: Omega 3-6-9). Resets at midnight CET.
- **Habits** — Personal habits with streaks + Together habits with couple streak.
- **Compete** — Weekly side-by-side stats: workouts, volume, habit %, top streak.
- **Weight log** — Daily weigh-in with 90-day trend chart.
- **Profile** — BMI (live) + calorie baseline (Mifflin-St Jeor).
- **Midnight reset** — Vercel Cron resets daily data at 00:00 Europe/Zurich.

---

## Deployment (5 minutes)

### 1. Get the required API keys

**Vercel Blob token**
1. Go to [vercel.com](https://vercel.com) → your project → Storage → Create Database → Blob
2. Copy the `BLOB_READ_WRITE_TOKEN`

**Anthropic API key** (for AI Coach when enabled later)
1. Go to [console.anthropic.com](https://console.anthropic.com) → API Keys → Create key
2. Copy the key

**Cron secret** — any long random string, e.g. `openssl rand -hex 32`

---

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial GymTrack"
git remote add origin https://github.com/YOUR_USERNAME/gymtrack.git
git push -u origin main
```

---

### 3. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Add these Environment Variables:

| Variable | Value |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | from Vercel Blob |
| `ANTHROPIC_API_KEY` | from Anthropic console |
| `CRON_SECRET` | your random string |

5. Click **Deploy**

---

### 4. Verify cron job

After deploy, go to Vercel Dashboard → your project → Settings → Cron Jobs.
You should see `/api/cron/midnight` scheduled at `0 23 * * *` (= 00:00 CET winter / 01:00 CEST summer).

---

## Local development

```bash
cp .env.example .env.local
# Fill in your keys in .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> Note: Blob storage works locally with your real token. Data is shared with production.

---

## Date format

All dates display as **DD/MM/YYYY** (e.g. 24/04/2026). Storage uses ISO YYYY-MM-DD internally.

## Timezone

All resets and calculations use **Europe/Zurich** (CET/CEST).

## Stats route missing?

If `/api/stats` returns 404, make sure `app/api/stats/route.ts` exists. It was included in the project — check your deployment logs.

---

## Migrating from Blob to Postgres (faster app)

### Why migrate?
Vercel Blob is object storage — every read/write takes 300–800ms. Postgres is a proper database — operations take under 50ms. The app feels significantly faster after migration.

### Step 1 — Create Postgres database on Vercel
1. Go to your Vercel project → **Storage** → **Create Database** → **Postgres (Neon)**
2. Name it anything (e.g. `gymtrack-db`)
3. Click **Connect Project** — this auto-adds `POSTGRES_URL` and related env vars

### Step 2 — Redeploy
Push your updated code to GitHub. Vercel will auto-deploy.

### Step 3 — Run the migration
Open this URL in your browser (replace with your actual domain):
```
https://your-app.vercel.app/api/migrate?secret=YOUR_CRON_SECRET
```
You'll see a JSON response listing everything migrated. Takes 10–30 seconds.

### Step 4 — Verify
Open the app and check your data is all there. Your Blob store is untouched and stays as a backup.

### Env vars after migration
You need both:
- `BLOB_READ_WRITE_TOKEN` — still needed for the migration endpoint to read from Blob
- `POSTGRES_URL` — added automatically when you connected Postgres
- `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` — also added automatically, used by @vercel/postgres
