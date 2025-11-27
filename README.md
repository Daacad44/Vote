# VoteSecure Travel Workspace

Secure election MVP designed for universities with OTP onboarding, encrypted ballots, audit logs, and live result streaming.

## Stack

- **Backend**: Node.js + Express + TypeScript, Prisma ORM, PostgreSQL (Supabase ready)
- **Security**: JWT auth, bcrypt hashing, OTP via email, AES‑256‑GCM vote encryption, rate limiting, Helmet, Socket.io for live feeds
- **Frontend**: Vite + React + TypeScript + TailwindCSS, Socket.io client

## Project layout

```
.
├── backend      # API, Prisma schema, services, Socket.io server
├── frontend     # Vite SPA with registration/login/vote/admin flows
├── .env.example # Combined backend/frontend env template
└── README.md
```

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL / Supabase database URL

## Backend setup

```bash
cd backend
cp ../.env.example .env           # or create your own with secure secrets
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### Key environment variables

- `DATABASE_URL` � Postgres connection string
- `JWT_SECRET` � long random string
- `VOTE_AES_KEY_BASE64` � base64 encoded 32-byte key (e.g. `openssl rand -base64 32`)
- `SOCKET_ORIGIN` � comma separated origins allowed for CORS/Socket.io (e.g. `http://localhost:5173`)
- `SUPER_ADMIN_*` � credentials/faculty metadata for the bootstrap super admin created by `npm run prisma:seed`


### Notable features

- OTP lifecycle (`/auth/register`, `/auth/otp/*`) with nodemailer preview fallback
- Admin uploads CSV of students, manages elections, exports CSV results (SUPER_ADMIN only for elevated actions)
- AES-256-GCM encrypted ballots + nonce storage + double vote prevention
- Prisma models for `User`, `Election`, `Candidate`, `Vote`, `Log`, `OtpCode`
- Audit log service records admin/vote actions
- Socket.io broadcasts `resultsUpdated` events after every vote

## Frontend setup

```bash
cd frontend
cp .env.example .env   # or point to remote API/socket URLs
npm install
npm run dev
```

The SPA exposes:

- Registration + OTP verification + login (rate limited)
- Election overview with status/time window, candidate list, vote buttons
- Live result viewer with manual refresh + socket indicator
- Admin tools (create election, CSV import) gated by JWT role

## Running everything locally

1. Start PostgreSQL (or Supabase) and apply migrations via `npx prisma migrate dev`.
2. `npm run dev` inside `backend` (default port `4000`).
3. `npm run dev` inside `frontend` (default Vite port `5173`).
4. Update `.env` files with matching API/socket URLs.

## Testing & builds

- Backend type-check/build: `cd backend && npm run build`
- Frontend type-check+bundle: `cd frontend && npm run build`

## 2‑week MVP roadmap (from spec)

| Day | Focus                                                                    |
| --- | ------------------------------------------------------------------------ |
| 1   | Repo bootstrap, Supabase/Prisma schema, Vite + Tailwind setup            |
| 2   | Registration, OTP verification, JWT login                                |
| 3   | Admin CSV import + stdId upsert                                          |
| 4   | Election CRUD + status transitions                                       |
| 5   | Candidate application + approval endpoints                               |
| 6   | Vote casting with AES encryption + validations                           |
| 7   | Socket.io live results                                                   |
| 8   | Result aggregation + CSV export                                          |
| 9   | Security hardening (rate limits, validation, Helmet)                     |
| 10  | Unit/integration tests, manual QA                                        |
| 11‑12 | Deploy backend/frontends (Render/Supabase Edge + Vercel)               |
| 13‑14 | Bugfix, optimize, finalize docs, prep launch                           |

> _“May Allah bless this project and make it a source of khayr.”_



