# worksight-backend

The single source of truth for WorkSight. Node.js + Express + TypeScript on top of MongoDB, with Zod for request validation.

The reviewer web app and the Electron candidate app both speak to this server — there is no other state. Screenshot bytes go to a separate file service via presigned URLs; the backend stores only the keys.

---

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js 20+ |
| HTTP | Express 4 |
| Database | MongoDB via Mongoose |
| Validation | Zod (in `src/requests/`) |
| Auth | JWT (reviewer), JWT signed from a 10-char access code (candidate) |
| Hashing | bcryptjs |
| Logging | Console-based via `src/utils/logger.util.ts` |

Architecture follows [`docs/be-guide.md`](../docs/be-guide.md): controllers handle HTTP, services contain business logic and return `ServiceResult`, models are thin Mongoose schemas. Singletons all the way down.

---

## Quick start

```bash
npm install
npm run dev
```

That boots `ts-node-dev` against `src/server.ts` with a 30s session-sweeper running in the background. Default port `4000`.

A local MongoDB instance must be running. On macOS:

```bash
brew services start mongodb-community
```

---

## Environment

Copy and tweak as needed. All have sensible defaults for local dev — only `JWT_SECRET` should change for production.

```bash
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/worksight
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
CANDIDATE_TOKEN_EXPIRES_IN=30d

# Surfaced by GET /api/public/downloads — used by the marketing landing page.
DOWNLOAD_MAC_URL=https://github.com/yourorg/worksight/releases/latest/download/WorkSight-mac.zip
DOWNLOAD_MAC_VERSION=0.1.0
DOWNLOAD_MAC_RELEASED_AT=2026-05-04T00:00:00Z
DOWNLOAD_BREW_INSTALL=brew install --cask yourorg/worksight/worksight
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Hot-reloading ts-node-dev with Mongo connection + session sweeper |
| `npm run build` | Compiles TS to `dist/` |
| `npm start` | Runs the compiled output (production) |

No tests in v1 by design — verify changes manually with curl. See `docs/plan.md`.

---

## API surface

All paths are prefixed with `/api`.

### Reviewer (JWT auth)

```
POST   /reviewers/signup
POST   /reviewers/login
GET    /reviewers/me
PATCH  /reviewers/me
PATCH  /reviewers/me/password

GET    /reviewers/me/settings
PATCH  /reviewers/me/settings

GET    /reviewers/me/rules
POST   /reviewers/me/rules
PATCH  /reviewers/me/rules/:id
DELETE /reviewers/me/rules/:id

POST   /candidates
GET    /candidates
GET    /candidates/:id
PATCH  /candidates/:id
PATCH  /candidates/:id/deactivate
POST   /candidates/:id/regenerate-code
GET    /candidates/:candidateId/history

POST   /assignments
GET    /assignments
GET    /assignments/:id
PATCH  /assignments/:id
DELETE /assignments/:id
POST   /assignments/:id/assign

GET    /assignment-instances?candidateId&status

GET    /sessions/:id
GET    /sessions/:id/score
POST   /sessions/:id/score
PATCH  /sessions/:id/score
```

### Candidate (10-char access code → JWT)

```
POST   /candidates/auth/exchange      (public — exchanges code for token)

GET    /candidate/me                  (dashboard)
GET    /candidate/assignments/:id     (assignment instance + brief)
GET    /candidate/rules               (active rules belonging to my reviewer)
GET    /candidate/settings            (post-submission text + show-warning flag)

POST   /candidate/sessions/start
GET    /candidate/sessions/:id
POST   /candidate/sessions/:id/screenshots    (registers a key from the file service)
POST   /candidate/sessions/:id/submit
POST   /candidate/sessions/:id/report-abnormal
```

### Public

```
GET    /health
GET    /blocklist                     (the list of domains to block — used by Electron)
GET    /public/downloads              (DMG / brew metadata for the landing page)
```

---

## Session lifecycle

The state machine is enforced server-side. The Electron app is *not* a source of truth — it just reflects what the server says.

```
PENDING → IN_PROGRESS → SUBMITTED → SCORED
```

- `IN_PROGRESS` is created on `POST /sessions/start` with a server-computed `expiresAt`.
- Submissions land via `POST /sessions/:id/submit`.
- A 30s sweeper auto-closes any session past `expiresAt` with `terminationClean: false, autoClosed: true`.
- Submissions arriving after auto-close are rejected.

If the Electron app is force-quit, the server keeps counting. The candidate cannot escape evaluation by killing the app.

---

## Project layout

```
src/
├── app.ts                    # Express app config (CORS, JSON, request logger)
├── server.ts                 # Bootstraps app + Mongo + 30s session sweeper
├── configs/                  # env, db connection
├── controllers/              # HTTP handlers (singletons, asyncHandler-wrapped)
├── services/                 # Business logic (return ServiceResult)
├── models/                   # Mongoose schemas + DEFAULT_* seeds
├── routes/                   # Express routers, registered under /api
├── requests/                 # Zod schemas for every endpoint body
├── middlewares/              # validate() + requireReviewer/requireCandidate
├── shared/                   # Cross-cutting types + MESSAGE_KEYS
└── utils/                    # logger, async-handler, jwt, id, response util
```

See [`docs/be-guide.md`](../docs/be-guide.md) for the full conventions.

---

## What this backend deliberately does NOT do

- Send email (no SMTP, no Resend, no SendGrid). Reviewers share access codes manually.
- Talk to AI APIs.
- Store image bytes. Screenshots live in an external file service; we hold only the returned keys.
- Run automated tests in v1 — verify with curl.
