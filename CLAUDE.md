# Edusi Project Conventions

## Overview
Edusi is a gamified bilingual (Yoruba/English) learning platform for Nigerian children.
- **Frontend**: Next.js 14+ (App Router, TypeScript, Tailwind CSS, PWA)
- **Backend**: Python FastAPI
- **Database**: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)

## Structure
- `frontend/` — Next.js app (App Router, `src/` directory)
- `backend/` — Python FastAPI API server
- `supabase/` — Database migrations and Edge Functions

## Frontend Conventions
- Use App Router (`src/app/`) with server components by default
- Client components must have `"use client"` directive
- Supabase client in `src/lib/supabase.ts` (browser) and `src/lib/supabase-server.ts` (server)
- All user-facing text must be bilingual: `{"en": "...", "yo": "..."}`
- Use Tailwind CSS with the Edusi theme (see `tailwind.config.ts`)
- Mobile-first: design for 360px width, scale up
- Icons: `lucide-react`
- Animations: `framer-motion`

## Backend Conventions
- FastAPI with async handlers
- Route modules in `app/api/`
- Business logic in `app/services/`
- Pydantic models in `app/models/`
- Config via `pydantic-settings` in `app/core/config.py`
- Supabase client helper in `app/db/supabase.py`

## Database Conventions
- Bilingual text fields use JSONB: `{"en": "...", "yo": "..."}`
- All tables have `created_at timestamptz DEFAULT now()`
- UUIDs for all primary keys
- RLS enabled on all tables
- Children are NOT auth users — they're rows owned by parent profiles

## Commands
- Frontend dev: `cd frontend && npm run dev`
- Backend dev: `cd backend && uvicorn app.main:app --reload`
- Lint frontend: `cd frontend && npm run lint`

## Review Standards
Reviews should prioritize correctness, security, accessibility, and regression risk.

- Keep changes scoped to the issue or PR description.
- Add or update tests for changed behavior.
- Do not request cosmetic-only changes unless they affect maintainability, accessibility, or user behavior.
- Treat Supabase RLS, authentication, authorization, dependency manifests, deployment files, and GitHub Actions as security-sensitive.
- GitHub Actions should use least-privilege permissions.
- Do not run untrusted pull request code under privileged `pull_request_target` workflows.
- In solo-maintainer mode, Claude review comments are advisory; deterministic CI and maintainer judgment decide merge readiness.
