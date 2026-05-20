# Edusi Frontend

This is the Next.js App Router frontend for Edusi.

## Setup

From the repository root, copy `.env.example` to `.env` and fill in the required public Supabase and API values.

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Environment

The frontend reads these public variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional fallback
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_BACKEND_URL`, used by older content-generation screens

Do not put private secrets in `NEXT_PUBLIC_*` variables.

## Docker Build

Build from the repository root so the Dockerfile can copy the frontend directory:

```bash
docker build -f frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=local-anon-key \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 \
  --build-arg NEXT_PUBLIC_BACKEND_URL=http://localhost:8000 \
  -t edusi-frontend .
```
