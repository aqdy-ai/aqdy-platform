# 🚀 Local Development Setup

> A polished guide to run Aqdy Platform locally, with the exact services, ports, environment variables, and commands used by this repository.

## 📁 Repository Structure

```text
aqdy-platform/
├── backend/      # Express + TypeScript API
├── frontend/     # React + Vite app
├── infra/        # AWS CDK infrastructure
├── docs/
├── .github/workflows/
└── docker-compose.yml
```

## 🧭 Important Directories

```text
backend/src
  ├── Express API
  ├── AI agents
  ├── Queue workers
  └── Stripe integration

frontend/src
  ├── React application
  ├── Dashboard
  ├── Authentication
  └── Billing

infra/
  └── AWS CDK stacks
```

## ✅ Prerequisites

```text
Node.js 20 LTS or later
npm 10+
Docker Desktop (recommended)
MongoDB
Redis (required for queues and rate limiting)
Git
```

## ▶️ Start the Backend

```bash
cd backend
npm install
npm run dev
```

- Backend URL: http://localhost:3000
- Swagger docs: http://localhost:3000/api/docs

## 🎨 Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend URL: http://localhost:5173

## 🧱 Infrastructure

```bash
cd infra
npm install
cdk synth
```

Deploy with:

```bash
cdk deploy
```

## 🌱 Seed Data

```bash
cd backend
npm run seed:plans
npm run seed:kb
npm run seed:payments
# or
npm run seed:all
```

## ⚙️ Queue Worker

```text
Background processing is handled by BullMQ workers in:

backend/src/queue/
  ├── analysis.worker.ts
  └── analysis.queue.ts
```

## 📚 Swagger / API Docs

```text
Swagger/OpenAPI documentation is available when Swagger is enabled in the backend configuration.

Default endpoint:
http://localhost:3000/api/docs
```

## 🔐 Environment Variables

### Backend (.env)

```text
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

### Frontend (.env)

```text
VITE_API_URL=
VITE_GOOGLE_CLIENT_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
```

## 🔌 Ports

```text
Frontend → http://localhost:5173
Backend  → http://localhost:3000
MongoDB  → 27017
Redis    → 6379
```

## 🧪 Scripts

### Backend

```bash
npm run dev
npm run build
npm run lint
npm test
npm run seed:plans
npm run seed:kb
npm run seed:payments
npm run seed:all
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:e2e
```

## 🧪 Running Tests

```bash
cd backend
npm test
```

```bash
cd frontend
npm test
```

## 🎭 Playwright (E2E)

```bash
cd frontend
npm run test:e2e
```

## 🐳 Docker Compose

```bash
docker compose up --build
```
