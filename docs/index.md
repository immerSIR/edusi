---
layout: default
title: Edusi Developer Docs
description: Developer documentation for the Edusi learning platform.
---

<div class="page-shell">
  <div class="docs-grid">
    <aside class="side-panel" aria-label="Developer documentation sections">
      <nav class="side-nav">
        <p>Get started</p>
        <a href="#overview">Overview</a>
        <a href="#setup">Quick start</a>
        <a href="#architecture">Architecture</a>
        <p>Build</p>
        <a href="#repository">Repository map</a>
        <a href="#supabase">Supabase</a>
        <a href="#api">Environment</a>
        <a href="#deploy">Deploy</a>
      </nav>
      <div class="side-note">
        <strong>Developer rule</strong>
        <span>Keep public browser configuration separate from backend secrets and provider credentials.</span>
      </div>
    </aside>

    <div class="docs-content">
      <section class="intro" id="overview">
        <h1>Edusi Developer Docs</h1>
        <p>Build, run, and ship Edusi across Next.js, FastAPI, Supabase, AI services, and WhatsApp learning flows.</p>
        <div class="intro-actions">
          <a class="button primary" href="#setup">Start setup</a>
          <a class="button secondary" href="https://github.com/immerSIR/edusi">GitHub repository</a>
        </div>
      </section>

      <section class="section compact" id="setup">
        <div class="section-header">
          <div>
            <span class="section-label">Setup</span>
            <h2>Get the full stack<br>running locally.</h2>
          </div>
          <p class="section-intro">Use Node 22+, npm 10+, Python 3.12+, and the Supabase CLI. Docker is optional for local service orchestration.</p>
        </div>

        <div class="grid three">
          <article class="code-card">
            <header>
              <h3>Clone and configure</h3>
              <span>root</span>
            </header>
            <pre class="terminal"><code>gh repo clone immerSIR/edusi
cd edusi
cp .env.example .env</code></pre>
          </article>

          <article class="code-card">
            <header>
              <h3>Frontend</h3>
              <span>localhost:3000</span>
            </header>
            <pre class="terminal"><code>cd frontend
npm install
npm run dev</code></pre>
          </article>

          <article class="code-card">
            <header>
              <h3>Backend</h3>
              <span>localhost:8000</span>
            </header>
            <pre class="terminal"><code>cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload</code></pre>
          </article>
        </div>
      </section>

      <section class="section" id="architecture">
        <div class="section-header">
          <div>
            <span class="section-label">Architecture</span>
            <h2>Four lanes make up the product.</h2>
          </div>
          <p class="section-intro">Keep browser-safe access in the frontend and provider secrets on the backend. Shared contracts should move together across API schemas, frontend types, and migrations.</p>
        </div>

        <div class="architecture">
          <article class="lane">
            <div>
              <div class="lane-index">01</div>
              <h3>Frontend</h3>
              <p>Next.js screens, hooks, shared API helpers, child-friendly UI, and PWA assets.</p>
            </div>
            <ul>
              <li><code>frontend/src/app/</code> contains routes and pages.</li>
              <li><code>frontend/src/components/</code> contains reusable UI.</li>
              <li><code>frontend/src/lib/api.ts</code> centralizes backend calls.</li>
            </ul>
            <p>Public values use <code>NEXT_PUBLIC_*</code> and are visible in the browser.</p>
          </article>

          <article class="lane">
            <div>
              <div class="lane-index">02</div>
              <h3>Backend</h3>
              <p>FastAPI route handlers, Pydantic schemas, and provider integrations.</p>
            </div>
            <ul>
              <li><code>backend/app/api/</code> keeps route handlers.</li>
              <li><code>backend/app/services/</code> owns provider logic.</li>
              <li><code>backend/app/core/config.py</code> loads local settings.</li>
            </ul>
            <p>Service-role keys, AI keys, and WhatsApp tokens stay server-side.</p>
          </article>

          <article class="lane">
            <div>
              <div class="lane-index">03</div>
              <h3>Supabase</h3>
              <p>Postgres schema, RLS, seed data, child profiles, storage, and curriculum content.</p>
            </div>
            <ul>
              <li>Add SQL files under <code>supabase/migrations/</code>.</li>
              <li>Run <code>supabase db reset</code> after schema changes.</li>
              <li>Update frontend types and backend schemas together.</li>
            </ul>
            <p>Do not edit migrations that have already shipped.</p>
          </article>

          <article class="lane">
            <div>
              <div class="lane-index">04</div>
              <h3>WhatsApp</h3>
              <p>Learning flows span the FastAPI API and the Supabase Edge Function webhook.</p>
            </div>
            <ul>
              <li><code>backend/app/api/whatsapp.py</code></li>
              <li><code>backend/app/services/whatsapp_service.py</code></li>
              <li><code>supabase/functions/whatsapp-webhook/</code></li>
            </ul>
            <p>Use a tunnel for local Meta webhook callbacks.</p>
          </article>
        </div>
      </section>

      <section class="section" id="repository">
        <div class="section-header">
          <div>
            <span class="section-label">Repository map</span>
            <h2>Where to make changes.</h2>
          </div>
          <p class="section-intro">Start in the narrowest owning folder, then update adjacent contracts only when behavior crosses boundaries.</p>
        </div>

        <table class="repo-map">
          <thead>
            <tr>
              <th>Path</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>frontend/</code></td>
              <td>Next.js App Router app, TypeScript, Tailwind CSS, PWA assets, Supabase browser client, and UI workflows.</td>
            </tr>
            <tr>
              <td><code>backend/</code></td>
              <td>FastAPI server, service integrations, request and response schemas, and backend tests.</td>
            </tr>
            <tr>
              <td><code>supabase/migrations/</code></td>
              <td>Database schema, row-level security policies, seed data, curriculum records, and storage setup.</td>
            </tr>
            <tr>
              <td><code>supabase/functions/</code></td>
              <td>Edge Functions, including the WhatsApp webhook entry point.</td>
            </tr>
            <tr>
              <td><code>.github/workflows/</code></td>
              <td>CI, coverage, and GitHub Pages publishing workflows.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section" id="supabase">
        <div class="section-header">
          <div>
            <span class="section-label">Supabase</span>
            <h2>Reset locally before schema PRs.</h2>
          </div>
          <p class="section-intro">Supabase owns data shape and access control, so schema and policy changes need a full local reset before review.</p>
        </div>

        <div class="grid two">
          <article class="code-card">
            <header>
              <h3>Local database</h3>
              <span>supabase</span>
            </header>
            <pre class="terminal"><code>supabase start
supabase db reset</code></pre>
          </article>

          <article class="code-card">
            <header>
              <h3>WhatsApp webhook</h3>
              <span>edge function</span>
            </header>
            <pre class="terminal"><code>supabase functions serve whatsapp-webhook --env-file .env</code></pre>
          </article>
        </div>
      </section>

      <section class="section" id="api">
        <div class="section-header">
          <div>
            <span class="section-label">Environment</span>
            <h2>Know which values are public.</h2>
          </div>
          <p class="section-intro">Use <code>.env.example</code> as the source of truth. Browser variables are public; provider credentials and service-role access are backend-only.</p>
        </div>

        <table class="env-table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Scope</th>
              <th>Used by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>NEXT_PUBLIC_SUPABASE_URL</code></td>
              <td>Public</td>
              <td>Frontend and backend Supabase URL configuration.</td>
            </tr>
            <tr>
              <td><code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code></td>
              <td>Public</td>
              <td>Browser Supabase access.</td>
            </tr>
            <tr>
              <td><code>NEXT_PUBLIC_API_URL</code>, <code>NEXT_PUBLIC_BACKEND_URL</code></td>
              <td>Public</td>
              <td>Frontend API calls to FastAPI.</td>
            </tr>
            <tr>
              <td><code>SUPABASE_SERVICE_ROLE_KEY</code></td>
              <td>Secret</td>
              <td>Privileged backend database operations.</td>
            </tr>
            <tr>
              <td><code>OPENAI_API_KEY</code>, <code>GOOGLE_TRANSLATE_API_KEY</code>, <code>GOOGLE_GEMINI_API_KEY</code></td>
              <td>Secret</td>
              <td>Voice, translation, and generation services.</td>
            </tr>
            <tr>
              <td><code>WHATSAPP_ACCESS_TOKEN</code>, <code>WHATSAPP_PHONE_NUMBER_ID</code>, <code>WHATSAPP_VERIFY_TOKEN</code>, <code>WHATSAPP_APP_SECRET</code></td>
              <td>Secret</td>
              <td>WhatsApp Cloud API and webhook verification.</td>
            </tr>
          </tbody>
        </table>

        <p class="notice">Never commit <code>.env</code>, service-role keys, provider API keys, WhatsApp tokens, generated transcripts, dependency folders, or build output.</p>
      </section>

      <section class="section" id="deploy">
        <div class="section-header">
          <div>
            <span class="section-label">Ship</span>
            <h2>Verify the lane you changed.</h2>
          </div>
          <p class="section-intro">Run focused local checks, then let GitHub Actions repeat the full CI and Pages publishing path.</p>
        </div>

        <div class="grid three">
          <article class="checklist">
            <h3>Frontend</h3>
            <ul>
              <li><code>npm run lint</code></li>
              <li><code>npm run build</code></li>
              <li><code>npm run test</code></li>
            </ul>
          </article>

          <article class="checklist">
            <h3>Backend</h3>
            <ul>
              <li><code>python -m compileall app</code></li>
              <li><code>pytest</code></li>
              <li>Keep route handlers thin.</li>
            </ul>
          </article>

          <article class="checklist">
            <h3>Deployment</h3>
            <ul>
              <li>Apply Supabase migrations first.</li>
              <li>Set backend secrets server-side.</li>
              <li>Configure <code>CORS_ORIGINS</code>.</li>
            </ul>
          </article>
        </div>

        <div class="notice">
          GitHub Pages is published by <code>.github/workflows/pages.yml</code>. The repository Pages source should remain set to GitHub Actions to avoid duplicate legacy Pages deployment checks.
        </div>
      </section>
    </div>

    <aside class="right-rail" aria-label="Page status and supporting links">
      <div class="rail-card">
        <h2>On this page</h2>
        <a href="#setup">Quick start</a>
        <a href="#architecture">Architecture</a>
        <a href="#api">Environment</a>
        <a href="#deploy">Quality checks</a>
      </div>
      <div class="rail-card success">
        <h2>Pages status</h2>
        <p>Publishing source is set to GitHub Actions. Keep it there to avoid the legacy dynamic Pages check.</p>
      </div>
      <div class="rail-card warning">
        <h2>Secrets</h2>
        <p>Never expose service-role keys, AI provider keys, or WhatsApp tokens through frontend variables.</p>
      </div>
    </aside>
  </div>
</div>
