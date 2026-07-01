# Local Development Setup (Aqdy Platform)

> This document documents how to run the Aqdy Platform locally and the exact variables, ports and commands used in this repository.

Repository structure

```
aqdy-platform/
├── backend/      # Express + TypeScript API
├── frontend/     # React + Vite
├── infra/        # AWS CDK Infrastructure
├── docs/
├── .github/workflows/
├── docker-compose.yml
```

Important directories

```
backend/src
    Express API
    AI agents
    Queue workers
    Stripe integration

frontend/src
    React application
    Dashboard
    Authentication
    Billing

infra/
    AWS CDK stacks
```

Requirements

```
Node.js 20 LTS or later
npm 10+
Docker Desktop (recommended)
MongoDB
Redis (required for queues and rate limiting)
Git
```

Backend (run locally)

```bash
cd backend
npm install
npm run dev
```

Service URL:

```
http://localhost:3000
```

Frontend (run locally)

```bash
cd frontend
npm install
npm run dev
```

Service URL:

```
http://localhost:5173
```

Infrastructure

```bash
cd infra
npm install
cdk synth
```

To deploy (CDK):

```bash
cdk deploy
```

Seed Data

```
cd backend

# Run the backend seed scripts defined in backend/package.json
# for plans, knowledge base, payments, and demo data.
```

Queue Worker

```
Background processing is handled by BullMQ workers located in:

backend/src/queue/

- analysis.worker.ts
- analysis.queue.ts

Run the worker using the project script defined in backend/package.json (if configured).
```

Swagger / API docs

```
Swagger/OpenAPI documentation is available when Swagger is enabled in the backend configuration.

Default endpoint:

http://localhost:3000/api/docs
```

Environment variables

Backend (`backend/.env`)

```
PORT=

MONGODB_URI=

JWT_SECRET=

STRIPE_SECRET_KEY=

STRIPE_WEBHOOK_SECRET=

REDIS_URL=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

GEMINI_API_KEY=

LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
```

Frontend (`frontend/.env`)

```
VITE_API_URL=

VITE_GOOGLE_CLIENT_ID=

VITE_STRIPE_PUBLISHABLE_KEY=
```

Ports

```
Frontend

http://localhost:5173

Backend

http://localhost:3000

MongoDB

27017

Redis

6379
```

Scripts

Backend

```
npm run dev

npm test

npm run lint

npm run build
```

Frontend

```
npm run dev

npm run build

npm test

npm run lint
```

Running tests

Backend

```bash
cd backend
npm test
```

Frontend

```bash
cd frontend
npm test
```

Playwright (E2E)

```bash
npm run test:e2e
```

Docker (full stack)

```bash
docker compose up --build
```

Checklist (quick verification)

- [ ] Backend responds at `http://localhost:3000`
- [ ] Frontend responds at `http://localhost:5173`
- [ ] Tests pass for backend and frontend
- [ ] CDK synthesizes without errors

Notes

- The file `backend/tests/setup-env.ts` lists env keys that tests expect. Keep CI and local `.env` aligned with those values.
- If you want, I can add a `backend/.env.example` and `frontend/.env.example` with the minimal keys above.
