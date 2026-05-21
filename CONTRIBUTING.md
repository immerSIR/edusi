# Contributing to Edusi

Thanks for helping improve Edusi. This guide explains how to get a local development environment running and what maintainers expect from pull requests.

## Development Setup

1. Fork and clone the repository.
2. Copy `.env.example` to `.env` and fill in local values.
3. Install frontend dependencies with `cd frontend && npm install`.
4. Install backend runtime and test dependencies with:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt -r requirements-dev.txt
   ```

5. Start the backend with `cd backend && uvicorn app.main:app --reload`.
6. Start the frontend with `cd frontend && npm run dev`.

## Coding Conventions

- Keep user-facing lesson and UI text bilingual where the surrounding model expects `{ "en": "...", "yo": "..." }`.
- Prefer small, focused pull requests.
- Keep frontend code in `frontend/src/` and backend route logic in `backend/app/api/`.
- Put backend business logic in `backend/app/services/`.
- Add database changes as new SQL files in `supabase/migrations/`.
- Do not commit secrets, local environment files, generated transcripts, build output, or dependency folders.

## Quality Checks

Run these checks before opening a pull request:

```bash
cd frontend
npm run lint
npm run build
```

```bash
cd backend
pytest
python -m compileall app
```

If your change affects Supabase schema or seed data, also run:

```bash
supabase db reset
```

## Review and Merge Policy

Edusi uses a solo-maintainer pull request workflow for `main`.

- Pull requests are required before merging to `main`.
- CI must pass before merge, including frontend checks, backend checks, frontend unit tests, and backend unit tests.
- Branches must be up to date with `main` before merging.
- Review conversations must be resolved before merge.
- CodeRabbit and Claude comments are advisory unless their GitHub checks are later made reliable and required.
- Required human approval is disabled because a solo maintainer cannot approve their own pull request on GitHub.

## Pull Requests

Please include:

- A short summary of the change
- Screenshots or recordings for user-facing UI changes
- Any migration, deployment, or environment variable notes
- Tests or verification commands you ran

Maintainers may ask for changes to keep the codebase consistent, secure, and easy for new contributors to run locally.
