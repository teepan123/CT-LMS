# CT–AI Learning Lab

**คิดเป็น แก้ปัญหาเป็น เรียนรู้ร่วมกับ AI** — Thai Computational Thinking learning environment for Grades 4–6. Isometric mission islands, three preset animal companions, four complete lessons, an assessed school-waste challenge, teacher review, and evidence-based learning records.

## Run locally

Node.js 24, npm, and PostgreSQL 16+ are recommended. The committed lockfile pins resolved dependencies.

```sh
npm ci
cp .env.example .env.local
# Set DATABASE_URL to your PostgreSQL database, then:
npm run db:migrate
# Set ADMIN_LOGIN and ADMIN_PASSWORD (at least 12 characters) in .env.local.
npm run db:seed
npm run dev
```

Open http://localhost:3000. Sign in as the administrator (class code blank), create a class, then create a teacher and student assigned to it. Use pseudonyms. Students sign in with class code, individual login, and password. Teachers use their individual credentials with no class code. There is no public self-registration or client-side role switch.

### Local demonstration without a PostgreSQL service

PGlite executes PostgreSQL in-process and persists files on this machine. It is **development only**, not a cross-device or Netlify database. Stop the app before running migration/seed against the same local directory.

```sh
mkdir .local
# .env.local should contain only this database setting:
# LOCAL_DATABASE_PATH=.local/postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Local-only fixtures: class `LAB2569`; `student01`, `teacher01`, `admin01`; password `Explore2026!`. These accounts are never created by the seed script on Netlify or when using a remote DATABASE_URL. Real classroom deployments must use individual accounts. The application labels local mode visibly.

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Server-only PostgreSQL connection; takes precedence over Netlify DB URL. Use TLS with certificate verification for hosted databases. |
| `NETLIFY_DB_URL` | Managed by Netlify Database; appropriate deployed database branch. |
| `LOCAL_DATABASE_PATH` | Explicit development-only PGlite directory. Never set on Netlify. |
| `ADMIN_LOGIN`, `ADMIN_PASSWORD` | Initial admin provisioning with `db:seed`; no default remote password. |
| `APP_ORIGIN` | Optional canonical origin if behind a reverse proxy that rewrites Host. Netlify deploy URLs are accepted through its server environment. |
| `AI_API_KEY`, `AI_MODEL` | Optional live hint provider. No provider is necessary for lessons or scoring. |
| `AI_ENDPOINT` | Optional HTTPS chat-completions endpoint. Defaults to the OpenAI endpoint. Never supplied by the browser. |

Never prefix secrets with `NEXT_PUBLIC_`. `.env*`, `.local`, `.netlify`, sessions, test output and local DB files are ignored. Provider credentials are never sent to students. No external analytics, advertising, unrestricted chatbot, public leaderboard, or student photo uploads.

## Learning and scoring

Diagnostic → real-life challenge → explanation + two examples → game → guided writing and requested hints → independent writing → five-question quiz → reflection → next island. Completing four missions opens the seven-day **โรงเรียนปลอดขยะ** challenge.

* Diagnostic: four scenario questions, baseline only, zero contribution to the course score.
* Quizzes: five questions × 2 points × four modules = **40**. Best saved attempt per module before final assessment; every attempt is retained.
* Final: four component criteria × 15 = **60**. Teacher selects 0/5/10/15 using visible descriptors, records evidence for every component, and writes feedback. Pending means unreviewed, never an automatic zero.
* Profile: each CT component is quiz /10 + rubric /15 = /25. Total becomes /100 only after teacher review. Badges, games, hints, diagnostic and reflections never add points.
* Starting final assessment permanently freezes quiz changes and disables hints for that course enrollment. Drafts may be saved repeatedly before the one assessed submission. Corrections to teacher review create additional review records. The latest review applies; earlier evidence remains in storage.

The baseline is a brief instructional diagnostic, not a validated research instrument. Its single item per skill is shown as a starting-point response, not a statistically equivalent pre/post competency percentage. Open writing revisions are marked as **changed**, not automatically **improved**.

## Architecture

Next.js App Router + React + TypeScript modular monolith; parameterized SQL via `pg`; Zod validation at application boundaries. See [architecture](docs/architecture.md) for the five functional modules, research data flow and authorization model.

* `src/components`: presentation, interaction, keyboard controls, Thai UI.
* `src/modules/content`: immutable, typed lesson catalogs. Public projection removes quiz keys, answer feedback and prepared hint banks.
* `src/modules/learning`: enrollment version, progression gates, append-only attempts and final locks.
* `src/modules/assessment`: deterministic objective scoring and component profiles.
* `src/modules/ai`: bounded actions, stage/level checks, rate limit, provider integration and prepared fallback.
* `src/modules/reporting`: class-scoped evidence, rubric review and research JSON.
* `src/modules/admin`: initial classroom and account provisioning. Content editing/AI settings remain versioned code and server environment extension points.
* `src/lib`: persistence, authentication, canonical serialization and client synchronization.

Records: classrooms, users, teacher memberships, hashed sessions, login limits, content versions, version-pinned enrollments, assignments, attempts, final locks, hints, hint-to-revision links and rubric reviews. Application updates to learning evidence append rows; current views derive from those rows. This is not a tamper-proof event store against database administrators.

## Shared devices and offline behavior

Passwords use salted scrypt. Session tokens are random, hashed in the database, HttpOnly, SameSite Strict, Secure on production; two-hour expiry, one active login per account, and a 15-minute client inactivity privacy lock. The class code alone never grants access. Server role/class checks guard every restricted route. Mutation requests require same-origin or explicitly configured origin. Login and hint limits are stored in PostgreSQL rather than serverless process memory.

Implemented offline features:

* Previously fetched **public lesson text** is retained in tab session storage. After the service worker has installed, offline navigation displays a dedicated cached reader with that material. No quiz keys are cached.
* An already open lesson remains readable offline. Unfinished text/final drafts are stored in session storage, scoped by student ID, and survive reload in the same tab.
* Saving without network queues the exact request body and UUID in a tab-scoped outbox. Reconnection or the sync button replays in order after checking account identity. The database's `(user_id, request_id)` uniqueness plus learner transaction lock prevents duplicate attempts, including concurrent retries.
* Progress and badges only update after server acknowledgement. Login, scoring, hints, teacher review, reporting and unlocking new missions require the online server.
* Private API responses, grades and teacher reports are never cached by the service worker. Logout clears tab drafts, lesson cache and outbox. Logout warns when a queue is pending. Closing the tab or the inactivity privacy lock can discard unsent drafts; there is no background synchronization after closing the browser. Do not describe this as a fully offline LMS.

## AI Thinking Buddy

Only four actions: thinking question, hint, approach check, revision help. Guided practice allows levels 1–3; independent practice only level 1; final assessment rejects hint requests server-side. Students must write an approach first. Each hint records action, level, stage, input, output, content version, source and subsequent changed response.

Without a provider, or after provider timeout/invalid output, the interface explicitly says **คำใบ้ที่เตรียมไว้ · ไม่ใช่ AI สด**. Live mode uses lesson objective, current prompt, permitted level and a short Thai system instruction, excluding keys and identities. Output has a length/Thai-language/basic safety check. These are bounded safeguards, not a guarantee that every LLM response is appropriate; live mode needs provider-specific child-safety and answer-leakage evaluation before classroom activation. No live AI grading exists.

## Tests

```sh
npm test                 # PostgreSQL-engine integration tests (isolated in-memory PGlite)
npm run typecheck
npm run build
npm audit --omit=dev
# Start the seeded local app before browser tests:
npm run test:e2e
```

Playwright uses installed Microsoft Edge on Windows and Chromium when `CI=true`. Install Chromium in CI using `npx playwright install --with-deps chromium`. Two viewport projects: 390×844 and 1440×1000. Tests create explicitly named test learners using the administrator API, walk the lessons, submit the challenge, review from a separate teacher browser context, reload the student session, and check /100. Screenshots are in `docs/screenshots`; failure traces in ignored `test-results`.

Remote preview testing uses `E2E_BASE_URL`, `E2E_ADMIN_LOGIN`, `E2E_ADMIN_PASSWORD`, `E2E_TEACHER_LOGIN`, `E2E_TEACHER_PASSWORD`. Configure these only for a dedicated preview classroom/database. Browser tests must never run with real student credentials. Reports honestly include these test accounts; they are not fabricated dashboard statistics.

## GitHub → Netlify

Repository: https://github.com/teepan123/CT-LMS. Target team: `ginger124su`.

1. In Netlify, import the GitHub repository (authorize that repository through the Netlify GitHub integration if requested). Choose the **Next.js** preset, build command `npm run build`, publish directory `.next`, Node 24. `netlify.toml` supplies these values. No static export or SPA catch-all redirect is used.
2. Enable Netlify Database in Data & Storage. The project includes `@netlify/database`; migrations under `netlify/database/migrations` run through Netlify's deployment lifecycle. Use a separate database branch for previews. Do not configure a fixed production DATABASE_URL for untrusted pull requests.
3. Netlify supplies `NETLIFY_DB_URL` to the deployed server. For another PostgreSQL provider, configure DATABASE_URL and run `db:migrate` out-of-band with migration privileges before publishing. Runtime should have only the privileges needed to read/write application tables.
4. Provision the real administrator with the seed script and a writable database connection; use deployment-specific environment or a trusted terminal. Remove provisioning password environment variables when complete. Create teachers/classes through the administrator screen.
5. Open a pull request for a Deploy Preview, or run `npx netlify deploy --context deploy-preview`. Run the browser journey against that preview, including database writes, teacher review, session reload and offline handling, before promoting a release.
6. Optional AI service: configure the server-only provider variables, test representative Thai child prompts and fallback cases, then enable in a supervised class. Prepared hints remain available without this.

The existence of a build or public URL is not proof that classroom storage, live AI, backups, or cross-device behavior work. See [verification record](docs/verification.md) for the exact checks performed and outstanding limits.

## Operations and initial-release boundaries

Use the database provider's backups/snapshots and verify restoration in a separate environment before real classroom rollout. No in-app bulk delete, SSO, email recovery, rich content editor, video pipeline or automatic student enrollment is implemented in this release. Account provisioning and recovery are administrator-managed. Teacher evidence and research export require authorized class access; exports include pseudonyms, raw answers and hint text, so store them in the school's approved location. Set the school's retention/consent policy before collecting children's work.
