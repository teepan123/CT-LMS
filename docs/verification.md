# Verification record

Date: 10 October 2026 (Asia/Bangkok). This document distinguishes local evidence from deployment verification.

| Stage | Implemented and checked | Evidence / current limitation |
|---|---|---|
| 1 | Schema, identities, Decomposition and teacher evidence | PostgreSQL-engine integration tests cover baseline gates, authorization, stage order, persistence, hint revision links and teacher evidence. |
| 2 | Four complete lessons and quizzes | Two worked examples + five quiz items per mission. Select/keep-remove/order activities; algorithm accepts valid dependency orders. Both browser viewport journeys pass. |
| 3 | Final drafts/submission, rubric review, portfolio and /100 | Browser student journey and a separate teacher browser context verify the saved submission, explicit review and student reload showing /100. |
| 4 | Prepared hints, bounded optional provider, analytics, offline | Integration tests verify hint gates and reports; browser tests verify offline draft queue, reconnect, repeated UUID with one persisted record, offline lesson reader and logout clearing. Live provider is not configured or verified. |
| 5 | Accessibility, build, deployment configuration and documentation | Local typecheck/build and 21 integration tests pass. Six browser tests pass at 390×844 and 1440×1000. The same build/test workflow passes on GitHub's Linux runner. Automated axe scans on landing and results found no WCAG A/AA violations in tested states. Netlify preview browser verification is still in progress. |

## Scope of evidence

Local tests run on the PostgreSQL engine via PGlite, with actual SQL transactions and persisted application state in `.local/postgres` for browser tests. They are not evidence of cloud persistence. Browser tests create marked test learners, not fabricated class statistics. Scores of 100 belong to test answers intentionally selected to exercise the score path.

Screenshots: `docs/screenshots/mobile-map.png`, `classroom-map.png`, corresponding teacher and results images. Automated accessibility scans do not replace manual testing with Thai-speaking children or assistive technology users. Ordering uses ordinary labeled up/down controls and native inputs support keyboard operation; reduced-motion CSS disables transitions.

## Deployment status

Netlify project `ct-ai-learning-lab-ginger124su` and its PostgreSQL service were created in team `ginger124su`. The Git-based Linux branch build for commit `fb175a4` succeeded (deploy `6aca372d90d71f61007c5f15`). Native Netlify migrations created the schema and content version `2026.10.1` in database branch `codex/learning-lab`. A trusted setup script successfully read the catalog and persisted an isolated test classroom plus administrator, teacher and student accounts using that branch connection. Credentials are kept only in ignored local files.

Preview: https://codex-learning-lab--ct-ai-learning-lab-ginger124su.netlify.app. The team's default private visibility currently returns a Netlify login gate to unauthenticated browsers. Thus a successful deploy and direct SQL writes do **not yet verify** the deployed browser-to-server learning journey. Preview access is awaiting the owner's decision; no production promotion has occurred.

GitHub Linux verification: https://github.com/teepan123/CT-LMS/actions/runs/38054051400. Draft implementation review: https://github.com/teepan123/CT-LMS/pull/1.

## Remaining release boundaries

Live AI, physical multi-device testing, database backup restoration, production account recovery and classroom research validation remain outside the verified scope. The initial administrator UI provisions classes/users; versioned content and AI configuration are managed by a maintainer. Production promotion is separate from preview verification.
