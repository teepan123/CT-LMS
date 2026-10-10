# Verification record

Date: 10 October 2026 (Asia/Bangkok). This document distinguishes local evidence from deployment verification.

| Stage | Implemented and checked | Evidence / current limitation |
|---|---|---|
| 1 | Schema, identities, Decomposition and teacher evidence | PostgreSQL-engine integration tests cover baseline gates, authorization, stage order, persistence, hint revision links and teacher evidence. |
| 2 | Four complete lessons and quizzes | Two worked examples + five quiz items per mission. Select/keep-remove/order activities; algorithm accepts valid dependency orders. Both browser viewport journeys pass. |
| 3 | Final drafts/submission, rubric review, portfolio and /100 | Browser student journey and a separate teacher browser context verify the saved submission, explicit review and student reload showing /100. |
| 4 | Prepared hints, bounded optional provider, analytics, offline | Integration tests verify hint gates and reports; browser tests verify offline draft queue, reconnect, repeated UUID with one persisted record, offline lesson reader and logout clearing. Live provider is not configured or verified. |
| 5 | Accessibility, build, deployment configuration and documentation | Local typecheck/build and 21 integration tests pass. Six browser tests pass at 390×844 and 1440×1000. Automated axe scans on landing and results found no WCAG A/AA violations in tested states. Netlify preview verification is still in progress. |

## Scope of evidence

Local tests run on the PostgreSQL engine via PGlite, with actual SQL transactions and persisted application state in `.local/postgres` for browser tests. They are not evidence of cloud persistence. Browser tests create marked test learners, not fabricated class statistics. Scores of 100 belong to test answers intentionally selected to exercise the score path.

Screenshots: `docs/screenshots/mobile-map.png`, `classroom-map.png`, corresponding teacher and results images. Automated accessibility scans do not replace manual testing with Thai-speaking children or assistive technology users. Ordering uses ordinary labeled up/down controls and native inputs support keyboard operation; reduced-motion CSS disables transitions.

## Deployment status

Netlify project `ct-ai-learning-lab-ginger124su` and its PostgreSQL service were created in team `ginger124su`. Local Netlify builds compile successfully but the Next.js adapter fails to create Windows symlinks. Git-based Linux build and preview verification are the next step. The initial connection string lacks schema-creation privileges, so native Netlify migrations are used at deployment time. No feature is described as production-ready on the basis of local tests alone.

## Remaining release boundaries

Live AI, physical multi-device testing, database backup restoration, production account recovery and classroom research validation remain outside the verified scope. The initial administrator UI provisions classes/users; versioned content and AI configuration are managed by a maintainer. Production promotion is separate from preview verification.
