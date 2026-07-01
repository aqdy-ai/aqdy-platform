# Deployment (Aqdy Platform)

> Project-specific deployment instructions: how services connect, build commands, CDK flow and production variables.

Architecture Diagram

```
Users

↓

Frontend (React)

↓

Express API
   │
   ├── MongoDB
   ├── Redis (BullMQ / Rate Limiting)
   ├── Gemini AI
   ├── Stripe
   └── Langfuse
```

Containers

```
backend/
Dockerfile

frontend/
Dockerfile

docker-compose.yml
```


Build

Backend

```bash
cd backend
docker build -t aqdy-backend .
```

Frontend

```bash
cd frontend
docker build -t aqdy-frontend .
```

Docker Compose

```bash
docker compose up --build
```

Infrastructure (AWS CDK)

```bash
cd infra
npm install
cdk synth
cdk deploy
```

Production environment variables

Backend

```
PORT

MONGODB_URI

REDIS_URL

JWT_SECRET

STRIPE_SECRET_KEY

STRIPE_WEBHOOK_SECRET

SMTP_HOST

SMTP_USER

SMTP_PASS

GEMINI_API_KEY

LANGFUSE_PUBLIC_KEY

LANGFUSE_SECRET_KEY
```

Frontend

```
VITE_API_URL

VITE_GOOGLE_CLIENT_ID

VITE_STRIPE_PUBLISHABLE_KEY
```

Deployment Flow

```
Developer
      │
      ▼
Push / Pull Request
      │
      ▼
GitHub Actions
      │
      ├── ESLint
      ├── Unit Tests
      ├── Integration Tests
      ├── Frontend Build
      ├── Backend Build
      ├── Docker Image Build
      └── Playwright E2E
      │
      ▼
CDK Deployment
      │
      ▼
AWS Infrastructure
```

AI Pipeline Components

```
- Gemini LLM
- RAG Service
- Knowledge Base
- Agent Orchestrator
- Risk Classifier Agent
- Extractor Agent
- Redline Agent
```

Observability

```
- Langfuse tracing
- Metrics endpoint
- Request ID middleware
- Response time middleware
- Audit logs
```

Health & Monitoring

```
GET /health
GET /metrics (if enabled)
```

Background Workers

```
Analysis Queue

↓

BullMQ

↓

Redis

↓

analysis.worker.ts
```

Post Deployment Checklist

- Health endpoint responds (`/health`)
- Frontend loads successfully
- Authentication works
- Google Login works
- Stripe Checkout works
- Email service works
- Redis connection is healthy
- MongoDB connection is healthy
- AI analysis pipeline is operational

Notes

- If you want, I can add a `scripts/deploy.sh` and/or scaffold CDK deployment permissions and GitHub Actions jobs to automate the image build + `cdk deploy` sequence.
