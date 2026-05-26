# Local Development Setup

This document describes steps to run the project locally (backend and frontend), required environment variables, and helpful commands.

## Prerequisites

- Node.js (recommended >= 18)
- npm (comes with Node.js) or yarn
- Git
- MongoDB (local) or MongoDB Atlas (connection string required)
- Docker & Docker Compose (optional)

## Repository layout

- Backend: `backend/`
- Frontend: `frontend/`

## Environment variables (backend)

Create a `.env` file inside the `backend/` folder with the following variables (values required unless noted):

- `PORT` (optional, default `5000`)
- `NODE_ENV` (optional, one of `development|production|test`, default `development`)
- `MONGODB_URI` — MongoDB connection string (e.g. `mongodb://localhost:27017/aqdy` or Atlas URI)
- `GEMINI_API_KEY` — API key for Gemini (LLM provider)
- `PINECONE_API_KEY` — Pinecone API key (vector DB)
- `PINECONE_INDEX` — Pinecone index name
- `LANGFUSE_SECRET_KEY` — Langfuse secret key (observability)
- `LANGFUSE_PUBLIC_KEY` — Langfuse public key
- `JWT_SECRET` — secret string for signing JWTs

Note: The backend validates these environment variables on startup. See `backend/src/config/env.ts` for details.

## Backend: install & run

1. Install dependencies:

   cd backend
   npm install

2. Start in development mode (auto-reloads on changes):

   npm run dev

3. Build & run production:

   npm run build
   npm start

4. Tests:

   npm test
   npm run test:coverage

5. Lint & format:

   npm run lint
   npm run format

## Frontend: install & run

1. Install dependencies:

   cd frontend
   npm install

2. Start dev server (Vite):

   npm run dev

3. Build for production:

   npm run build

4. Tests:

   npm test

5. Lint & format:

   npm run lint
   npm run format

## Run everything with Docker Compose (optional)

If you prefer containers, the repository includes `docker-compose.yml` at the project root. Example:

  docker compose up --build

This will build and run services defined in the compose file. You may still need to provide secrets (via environment or an env file) depending on the compose configuration.

## Database setup

- For local development, run a local MongoDB instance (default port 27017) and point `MONGODB_URI` to it.
- To use Atlas, create a free cluster and set `MONGODB_URI` to the provided connection string.

## Common troubleshooting

- If the server exits on startup with env errors, ensure `.env` is present in `backend/` and contains all required variables.
- Check logs printed in the terminal for specific missing environment keys.
- If the frontend cannot reach the backend, confirm backend is running and CORS/network settings allow the connection. Frontend runs on Vite default (usually `http://localhost:5173`).

## Useful file references

- Backend env parsing: `backend/src/config/env.ts`
- Backend entrypoint: `backend/src/index.ts`
- Frontend entrypoint: `frontend/src/main.tsx`

