# Edusi Developer Documentation

Edusi is a gamified bilingual learning platform for Nigerian children. The product combines a Next.js frontend, a FastAPI backend, Supabase data services, AI-powered voice and illustration flows, and WhatsApp learning interactions.

This page is the developer entry point for understanding, running, changing, and deploying the project.

## Repository Map

| Path | Purpose |
| --- | --- |
| `frontend/` | Next.js App Router app, TypeScript, Tailwind CSS, PWA assets, browser Supabase client, and UI workflows. |
| `backend/` | FastAPI API server, service integrations, request/response schemas, and backend tests. |
| `supabase/migrations/` | Database schema, row-level security policies, seed data, curriculum data, and storage setup. |
| `supabase/functions/` | Supabase Edge Functions, currently including the WhatsApp webhook entry point. |
| `.github/workflows/` | Continuous integration, test coverage, and GitHub Pages publishing workflows. |
| `docker-compose.yml` | Local container orchestration for the frontend and backend. |

## Runtime Architecture

The frontend talks to the FastAPI backend through `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_BACKEND_URL`. Browser-visible Supabase access uses public Supabase environment variables, while privileged database access stays on the backend through `SUPABASE_SERVICE_ROLE_KEY`.

The backend groups route handlers under `backend/app/api/` and shared logic under `backend/app/services/`:

| Area | Main files |
| --- | --- |
| Authentication | `backend/app/api/auth.py`, `frontend/src/app/auth/` |
| Lessons and curriculum | `backend/app/api/lessons.py`, `backend/app/services/ai_service.py`, `supabase/migrations/` |
| Voice interactions | `backend/app/api/voice.py`, `backend/app/services/voice_service.py` |
| Translation | `backend/app/services/translate_service.py` |
| Illustrations | `backend/app/services/illustration_service.py`, Supabase storage migrations |
| WhatsApp | `backend/app/api/whatsapp.py`, `backend/app/services/whatsapp_service.py`, `supabase/functions/whatsapp-webhook/` |

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- Python 3.12 or newer
- Docker, optional but recommended
- Supabase CLI, for local database and Edge Function development

## Local Setup

Clone the repository and create your local environment file:

```bash
git clone https://github.com/immerSIR/edusi.git
cd edusi
cp .env.example .env
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

Install backend dependencies:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

Start the backend and frontend in separate terminals:

```bash
cd backend
uvicorn app.main:app --reload
```

```bash
cd frontend
npm run dev
```

The frontend runs at `http://localhost:3000` and the backend runs at `http://localhost:8000`.

## Environment Variables

Use `.env.example` as the source of truth for local variable names. Required local development values include:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-local-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-supabase-service-role-key
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000
```

Provider keys are only needed when developing the matching integration:

| Variable | Used by |
| --- | --- |
| `OPENAI_API_KEY` | English ASR/TTS and OpenAI-backed services. |
| `GOOGLE_TRANSLATE_API_KEY` | Translation service. |
| `GOOGLE_GEMINI_API_KEY` | Gemini-backed generation flows. |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API calls. |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp sender configuration. |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp webhook verification. |
| `WHATSAPP_APP_SECRET` | Meta webhook signature verification. |
| `BACKEND_INTERNAL_SECRET` | Shared internal request protection where required. |

Never commit `.env`, service-role keys, API keys, WhatsApp tokens, generated transcripts, dependency folders, or build output.

## Supabase Development

Start Supabase locally and apply migrations:

```bash
supabase start
supabase db reset
```

The migrations create the core schema, RLS policies, seed data, illustration storage, child profile enhancements, WhatsApp session updates, and curriculum records.

When changing data models:

- Add a new migration in `supabase/migrations/`; do not edit migrations that have already shipped.
- Keep RLS policy changes close to the schema changes they protect.
- Run `supabase db reset` before opening a pull request.
- Update backend schemas, frontend types, and seed data together when a table contract changes.

## API Development

FastAPI routes live in `backend/app/api/`. Keep route handlers thin and move provider or business logic into `backend/app/services/`.

Common backend commands:

```bash
cd backend
uvicorn app.main:app --reload
python -m compileall app
pytest
```

The backend reads settings from `backend/app/core/config.py` through Pydantic settings. Local values are loaded from `.env`.

## Frontend Development

The frontend uses Next.js App Router and TypeScript. Pages live in `frontend/src/app/`, shared components in `frontend/src/components/`, hooks in `frontend/src/hooks/`, and browser utilities in `frontend/src/lib/`.

Common frontend commands:

```bash
cd frontend
npm run dev
npm run lint
npm run build
npm run test
```

Keep UI changes consistent with the existing child-friendly learning interface. Components that interact with API contracts should use the shared types in `frontend/src/lib/types.ts` and API helpers in `frontend/src/lib/api.ts`.

## WhatsApp Flows

WhatsApp support spans the FastAPI backend and the Supabase Edge Function:

- `backend/app/api/whatsapp.py`
- `backend/app/services/whatsapp_service.py`
- `supabase/functions/whatsapp-webhook/index.ts`

For local webhook testing, run the edge function with the local environment file:

```bash
supabase functions serve whatsapp-webhook --env-file .env
```

Use a tunnel such as ngrok when Meta needs to reach a local machine. Keep webhook verification tokens and app secrets out of source control.

## Quality Checks

Run the checks that match your change before opening a pull request:

```bash
cd frontend
npm run lint
npm run build
npm run test
```

```bash
cd backend
python -m compileall app
pytest
```

```bash
supabase db reset
```

The GitHub workflows run frontend lint/build checks, backend compile checks, unit tests, and coverage upload.

## Deployment Notes

Deploy the frontend and backend as separate services. The frontend needs build-time public variables, while backend provider keys and Supabase service-role access must remain server-side.

Recommended deployment checklist:

- Configure frontend public variables before building the Next.js app.
- Configure backend secrets in the backend hosting provider, not in the frontend project.
- Apply Supabase migrations before routing production traffic to code that depends on new schema.
- Configure `CORS_ORIGINS` with the production frontend origin.
- Register WhatsApp webhook callback URLs after the public backend or edge function endpoint is available.
- Verify voice, translation, illustration, and WhatsApp provider credentials in staging before production.

## GitHub Pages

This documentation is published by `.github/workflows/pages.yml`. The workflow builds the `docs/` directory with Jekyll and deploys the generated site with GitHub Pages on pushes to `main`.

Repository admins should set the Pages publishing source to GitHub Actions in the repository settings before relying on this workflow for production docs publishing.

To preview locally, install Jekyll if needed and serve the docs directory:

```bash
cd docs
bundle install
bundle exec jekyll serve
```

You can also read the Markdown directly without a local preview server.
