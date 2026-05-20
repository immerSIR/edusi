# Edusi

[![CI](https://github.com/immerSIR/edusi/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/immerSIR/edusi/actions/workflows/ci.yml)
[![Test and coverage](https://github.com/immerSIR/edusi/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/immerSIR/edusi/actions/workflows/test.yml)
[![Codecov](https://codecov.io/gh/immerSIR/edusi/graph/badge.svg)](https://codecov.io/gh/immerSIR/edusi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](frontend)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=white)](backend)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Storage-3FCF8E?logo=supabase&logoColor=white)](supabase)

Edusi is a gamified bilingual learning platform for Nigerian children. It teaches English and technology through Yoruba/English lessons, voice interactions, illustrations, progress tracking, and WhatsApp learning flows.

## Developer Docs

Developer documentation is available in [docs/](docs/) and is published as a GitHub Pages site from the `main` branch.

## Stack

- `frontend/` - Next.js App Router, TypeScript, Tailwind CSS, PWA assets
- `backend/` - FastAPI API server
- `supabase/` - Postgres migrations, RLS policies, seed data, storage setup, and Edge Functions
- `docker-compose.yml` - local development services for the frontend and backend

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- Python 3.12 or newer
- Docker, optional but recommended
- Supabase CLI, for local database and Edge Function development

## Quick Start

1. Clone the repository:

   ```bash
   git clone https://github.com/immerSIR/edusi.git
   cd edusi
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in the required values in `.env`.

   At minimum, frontend and backend development need:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-local-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-local-supabase-service-role-key
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   cd ..
   ```

5. Install backend dependencies:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cd ..
   ```

6. Start the app:

   ```bash
   # Terminal 1
   cd backend
   uvicorn app.main:app --reload

   # Terminal 2
   cd frontend
   npm run dev
   ```

7. Open `http://localhost:3000`.

## Docker Development

After creating `.env`, you can run the frontend and backend with Docker Compose:

```bash
docker compose up --build
```

The frontend runs at `http://localhost:3000` and the backend runs at `http://localhost:8000`.

## Supabase Setup

For a local Supabase project:

```bash
supabase start
supabase db reset
supabase functions serve whatsapp-webhook --env-file .env
```

The migrations in `supabase/migrations/` create the core schema, RLS policies, seed data, illustration storage, and curriculum data.

For hosted Supabase, apply the migrations through the Supabase CLI or dashboard and set the same environment variables in your deployment provider.

## Environment Variables

See [.env.example](.env.example) for the full list.

Important notes:

- Never commit `.env` or provider secrets.
- `NEXT_PUBLIC_*` variables are visible in the browser and must not contain private secrets.
- `SUPABASE_SERVICE_ROLE_KEY`, AI provider keys, and WhatsApp access tokens are server-only.
- Next.js public environment variables are read at build time for production builds.

## Common Commands

Frontend:

```bash
cd frontend
npm run dev
npm run lint
npm run build
```

Backend:

```bash
cd backend
uvicorn app.main:app --reload
python -m compileall app
```

Supabase:

```bash
supabase start
supabase db reset
supabase functions serve whatsapp-webhook --env-file .env
```

## Project Structure

```text
.
├── backend/              # FastAPI app
├── frontend/             # Next.js app
├── supabase/
│   ├── functions/        # Supabase Edge Functions
│   └── migrations/       # Database schema, RLS, and seed data
├── docker-compose.yml
└── README.md
```

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding conventions, and pull request expectations.

## Security

Please do not open public issues for vulnerabilities or exposed secrets. Read [SECURITY.md](SECURITY.md) for reporting guidance.

## License

Edusi is released under the [MIT License](LICENSE).
