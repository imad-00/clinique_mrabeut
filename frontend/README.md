# Clinic Frontend (Next.js)

This app is frontend-only.
All backend APIs are served by Django.

## Setup

1. Install deps:
   ```bash
   cd frontend
   pnpm install
   ```
2. Configure env:
   ```bash
   cp .env.example .env
   ```
3. Start local dev frontend:
   ```bash
   pnpm dev
   ```

## Production Build

```bash
pnpm build
```

## Required Env

```bash
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
```

## Auth

- Admin auth now uses Django JWT endpoints:
  - `POST /api/auth/login`
  - `GET /api/auth/session`
  - `POST /api/auth/logout`
- Token is stored client-side and attached as `Authorization: Bearer <token>` for `/api/admin/*`.

## Notes

- All business API paths remain `/api/...` and are called against `NEXT_PUBLIC_API_BASE_URL`.
- Video playback URLs are returned by the backend and consumed directly by the display page.

## Vercel

- Set the Vercel project root directory to `frontend`.
- Set environment variable:
  - `NEXT_PUBLIC_API_BASE_URL=https://your-railway-backend.up.railway.app`
- Build command:
  ```bash
  npm run build
  ```
- Output uses the default Next.js Vercel runtime.
