# Deployment Guide

This document describes recommended steps to build and deploy the codebase (backend + frontend) using Docker and docker-compose.

**Repo layout (relevant files):**
- [frontend/Dockerfile](frontend/Dockerfile)
- [frontend/.dockerignore](frontend/.dockerignore)
- [backend/Dockerfile](backend/Dockerfile)
- [docker-compose.yml](docker-compose.yml)

Prerequisites
- Install Docker Engine and Docker Compose (or Docker Desktop) on your machine.
- Have access to a container registry (Docker Hub, Azure Container Registry, etc.) if you intend to push images.

Local build & run (recommended quick start)

1) Using docker-compose (builds both services):

```bash
# from repo root
docker-compose up --build -d

# view logs
docker-compose logs -f

# stop
docker-compose down
```

2) Build images individually

Frontend (Vite app)

```bash
cd frontend
docker build -t myorg/aqdy-frontend:latest .
```

Backend (Node/Express service)

```bash
cd backend
docker build -t myorg/aqdy-backend:latest .
```

Run the containers

```bash
# run backend (example)
docker run -d --name aqdy-backend -e NODE_ENV=production -p 3000:3000 myorg/aqdy-backend:latest

# run frontend (serving static files via nginx)
docker run -d --name aqdy-frontend -p 80:80 myorg/aqdy-frontend:latest
```

Environment variables
- Backend reads environment variables from the environment (see `backend/config/env.ts`). Provide secrets and DB connection strings via a `.env` file or your deployment platform's secret manager. Do NOT commit secret values.
- Example with docker-compose: set values in an `.env` file next to `docker-compose.yml` or in the compose `environment:` section.

Push images to a registry

```bash
docker tag myorg/aqdy-backend:latest myregistry/myorg/aqdy-backend:1.0.0
docker push myregistry/myorg/aqdy-backend:1.0.0

docker tag myorg/aqdy-frontend:latest myregistry/myorg/aqdy-frontend:1.0.0
docker push myregistry/myorg/aqdy-frontend:1.0.0
```

Production recommendations
- Use a multi-stage Dockerfile (already used in `frontend/Dockerfile`) to keep images small.
- Serve static frontend files behind a CDN or a reverse proxy (nginx, CloudFront, Azure CDN) for caching and TLS.
- Use environment-specific configuration and secrets management (Azure Key Vault, AWS Secrets Manager, or platform-managed secrets).
- Add basic health and readiness checks for the backend; there is a `/health` route in the backend to use for container orchestration probes.
- Configure logging and monitoring (e.g., App Insights, Prometheus) and persistent storage for logs if needed.

CI/CD tips
- Build images in CI, tag with CI build number or git SHA, and push to your registry.
- Run tests in CI before pushing images: `npm test` for backend and `npm run test` for frontend.
- Use automated deployment pipelines (GitHub Actions, Azure Pipelines, GitLab CI) to deploy updated images to your environment.

Troubleshooting
- Build fails on native modules: ensure build stage uses the correct Node version and has build tools available.
- Large build context: add `.dockerignore` files (frontend already has one) to exclude `node_modules`, tests, and local files.
- If the frontend shows a blank page after build, ensure the `base` setting in `vite.config.ts` matches your hosting path.

Helpful commands

```bash
# inspect container status
docker ps -a

# fetch container logs
docker logs -f < container-name >

# rebuild a single service via compose
docker-compose build frontend
docker-compose up -d frontend


