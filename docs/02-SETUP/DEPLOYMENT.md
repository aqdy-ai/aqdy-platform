# 🚀 Deployment Guide

> A practical deployment reference for Aqdy Platform, covering architecture, containers, runtime services, environments, and release flow.

## 🏗️ Architecture Overview

```text
Users
  ↓
Frontend (React)
  ↓
Express API
  ├── MongoDB
  ├── Redis (BullMQ / Rate Limiting)
  ├── Gemini AI
  ├── Stripe
  └── Langfuse
```

## 📦 Containers

```text
backend/
  └── Dockerfile

frontend/
  └── Dockerfile

docker-compose.yml
```

## 🛠️ Build & Run

### Backend

```bash
cd backend
docker build -t aqdy-backend .
```

### Frontend

```bash
cd frontend
docker build -t aqdy-frontend .
```

### Docker Compose

```bash
docker compose up --build
```

## ☁️ Infrastructure (AWS CDK)

```bash
cd infra
npm install
cdk synth
cdk deploy
```

## 🔐 Production Environment Variables

### Backend

```text
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

### Frontend

```text
VITE_API_URL
VITE_GOOGLE_CLIENT_ID
VITE_STRIPE_PUBLISHABLE_KEY
```

## 🔄 Deployment Flow

```text
Developer
  ↓
Push / Pull Request
  ↓
GitHub Actions
  ├── ESLint
  ├── Backend Tests
  ├── Frontend Tests
  ├── Security Audit
  ├── Docker Image Build
  └── Deploy to Staging / Production
  ↓
AWS ECS / Infrastructure
```

## 🤖 AI Pipeline Components

```text
- Gemini LLM
- RAG Service
- Knowledge Base
- Agent Orchestrator
- Risk Classifier Agent
- Extractor Agent
- Redline Agent
```

## 📈 Observability

```text
- Langfuse tracing
- Metrics endpoint
- Request ID middleware
- Response time middleware
- Audit logs
```

## 🩺 Health & Monitoring

```text
GET /api/health
GET /api/metrics
GET /api/docs
```

## 🧵 Background Workers

```text
Analysis Queue
  ↓
BullMQ
  ↓
Redis
  ↓
analysis.worker.ts
```


