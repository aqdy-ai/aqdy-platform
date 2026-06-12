# Contributing to Aqdy

Welcome to Aqdy! This guide covers everything you need to start contributing — from setting up your local environment to submitting a pull request. All six team members are equal full-stack contributors. There are no silos: everyone works across backend, frontend, testing, DevOps, and documentation.

---

## Table of Contents

1. [Team Members](#team-members)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Branch Strategy](#branch-strategy)
5. [Commit Conventions](#commit-conventions)
6. [Development Workflow](#development-workflow)
7. [Code Style & Linting](#code-style--linting)
8. [Testing](#testing)
9. [Pull Request Process](#pull-request-process)
10. [Code Review Guidelines](#code-review-guidelines)
11. [Daily Standup](#daily-standup)
12. [Pair Programming](#pair-programming)
13. [Blockers & Escalation](#blockers--escalation)

---

## Team Members

| Name | GitHub |
|------|--------|
| Islam Ahmed Ibrahim | |
| Kareem Khaled Ismail | |
| Merna Hamada Hanafy | |
| Belal Mahmoud Abdelfattah | |
| Mostafa Nageh Fathi | |
| Islam Najah Fawzy | |

All developers are equal contributors. Task ownership rotates across all areas so everyone learns every part of the system.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) & Docker Compose
- [Git](https://git-scm.com/)
- MongoDB Atlas account (or local MongoDB via Docker)
- A `.env` file — copy `.env.example` and fill in your values

### Local Setup (< 10 minutes)

```bash
# 1. Clone both repositories
git clone https://github.com/aqdy/backend.git
git clone https://github.com/aqdy/frontend.git

# 2. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Fill in your API keys and DB URI

# 3. Start the full stack with one command
docker-compose up --build

# 4. Verify everything is running
curl http://localhost:4000/api/health   # → { "status": "ok" }
# Frontend should be available at http://localhost:3000
```

### Running Without Docker

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables

All required variables are documented in `.env.example`. Never commit `.env` files. Key variables include:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PINECONE_API_KEY` | Pinecone vector DB key |
| `LANGFUSE_SECRET_KEY` | Langfuse tracing key |
| `STRIPE_SECRET_KEY` | Stripe API key (use test key locally) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

---

## Project Structure

```
aqdy/
├── backend/
│   ├── src/
│   │   ├── agents/              # AI pipeline agents
│   │   │   ├── extractorAgent.js
│   │   │   ├── classifierAgent.js
│   │   │   └── redlineAgent.js
│   │   ├── middleware/          # Express middleware
│   │   │   ├── validateInput.js
│   │   │   ├── rateLimit.js
│   │   │   └── creditEnforcement.js
│   │   ├── models/              # Mongoose models
│   │   │   ├── Contract.js
│   │   │   ├── User.js
│   │   │   ├── Plan.js
│   │   │   ├── Subscription.js
│   │   │   ├── CreditLedger.js
│   │   │   ├── Payment.js
│   │   │   ├── RiskAnalysis.js
│   │   │   └── AuditLog.js
│   │   ├── routes/              # Express route handlers
│   │   ├── services/            # Business logic
│   │   │   ├── agentOrchestration.js
│   │   │   ├── creditService.js
│   │   │   ├── documentParsing/
│   │   │   ├── llmService.js
│   │   │   ├── paymentService.js
│   │   │   ├── piiFiltering.js
│   │   │   └── ragService.js
│   │   └── app.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route-level pages
│   │   ├── services/            # API call helpers (axios)
│   │   ├── locales/             # i18n translation files
│   │   │   ├── en.json
│   │   │   └── ar.json
│   │   └── App.jsx
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
└── docker-compose.yml
```

---

## Branch Strategy

```
main          ← Production-ready code only. Never commit directly.
develop       ← Integration branch. All features merge here first.
feature/*     ← Feature branches (branch off develop)
fix/*         ← Bug fix branches
chore/*       ← Housekeeping (deps, config, docs)
```

### Branch Naming

```bash
feature/extractor-agent
feature/stripe-checkout
fix/rtl-layout-modal
chore/update-dependencies
```

### Workflow

```bash
# Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Work, commit, push
git push origin feature/your-feature-name

# Open a PR into develop (not main)
# After sprint review, develop is merged into main
```

**`main` only receives code that has been reviewed and tested on `develop`.**

---

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `chore` | Build, config, or dependency changes |
| `refactor` | Code change that isn't a fix or feature |
| `perf` | Performance improvement |
| `style` | Formatting, linting (no logic change) |

**Examples:**

```
feat(agents): add extractor agent with bilingual support
fix(auth): correct JWT expiry handling on refresh
test(creditService): add edge cases for zero balance
docs(api): update Swagger spec for /api/account/credits
chore(deps): upgrade langchain to v0.2
```

Keep the subject line under 72 characters. Reference a task ID in the body if applicable.

---

## Development Workflow

### Per-Feature Checklist

Before marking any task as complete, verify:

- [ ] Code compiles and runs without errors
- [ ] Follows linting rules (ESLint, Prettier — run `npm run lint`)
- [ ] Code reviewed by at least 2 team members
- [ ] Unit tests written (80%+ coverage for the component)
- [ ] All tests passing (`npm test`)
- [ ] Integration tests passing (where applicable)
- [ ] Code comments explain non-obvious logic
- [ ] README or API docs updated (if backend endpoint)
- [ ] No critical bugs
- [ ] Bilingual support working if user-facing (AR + EN)
- [ ] Accessibility checked for frontend (WCAG 2.1 AA)

---

## Code Style & Linting

We use **ESLint** and **Prettier** for consistent code style across the monorepo.

```bash
# Check for linting errors
npm run lint

# Auto-fix fixable issues
npm run lint:fix

# Format code
npm run format
```

Rules are defined in `.eslintrc.js` and `.prettierrc`. CI will fail if linting errors exist — fix them before pushing. Do not disable lint rules inline without a comment explaining why.

**Key conventions:**

- Use `async/await` over raw Promises
- Destructure where it improves readability
- Keep functions small and single-purpose
- Name variables and functions clearly — avoid abbreviations
- Arabic-facing strings always go through the `i18n` system, never hardcoded

---

## Testing

### Backend — Jest

```bash
cd backend
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

Tests live in `backend/tests/` mirroring the `src/` structure.

### Frontend — Vitest + React Testing Library

```bash
cd frontend
npm test
npm run test:coverage
```

### What to Test

| Layer | What |
|-------|------|
| Agents | Input/output for 5+ contract scenarios each, including Arabic text |
| Services | Business logic, edge cases, error paths |
| Middleware | Rate limiting, credit enforcement, validation — boundary values |
| API endpoints | Happy path + validation errors + auth errors |
| React components | Render, user interactions, bilingual output, RTL mode |

### Test Guidelines

- Each PR must include tests for all new code
- If fixing a bug, write a regression test first
- Use descriptive `describe` and `it` blocks — tests are documentation
- Mock external services (Gemini, Stripe, Pinecone) in unit tests
- Integration tests may use a test MongoDB instance

### Coverage Target

The project-wide target is **60%+ overall**, with **80%+ per individual component**. Coverage reports are generated on every CI run.

---

## Pull Request Process

1. **Create a PR** from your feature branch into `develop`
2. **Fill in the PR description:**
   - What does this PR do?
   - How should reviewers test it?
   - Any known limitations or follow-up tasks?
3. **Assign 2+ reviewers** — rotate who reviews whose code:
   - One reviewer familiar with the domain
   - One reviewer less familiar (for knowledge sharing)
4. **Pass CI checks** — lint, tests, and build must all be green
5. **Address all review feedback** — push additional commits; do not force-push after review starts
6. **Merge to `develop`** once approved — use "Squash and merge" for clean history
7. **`main`** only receives merges from `develop` at the end of a sprint after final review

### PR Title Format

Follow the same convention as commits:
```
feat(payments): add Stripe webhook handler for subscription events
```

---

## Code Review Guidelines

As a **reviewer**, check for:

- **Correctness:** Does the logic do what it claims?
- **Test coverage:** Are edge cases covered?
- **Security:** Input validation, injection risks, auth checks, no secrets in code
- **Performance:** N+1 queries, missing indexes, unnecessary re-renders
- **Bilingual support:** New UI strings using `i18n`, RTL layout tested
- **Documentation:** New endpoints in Swagger, complex logic commented

As an **author**, when receiving feedback:

- Respond to every comment (fix it, explain why not, or ask for clarification)
- Don't take feedback personally — it's about the code, not you
- Approve reviews promptly so teammates aren't blocked

---

## Daily Standup

**Time:** 10:00 AM daily | **Duration:** 15 minutes | **All 6 developers**

Format:

```
1. Yesterday — What did you complete?
2. Today    — What will you complete?
3. Blockers — Any help needed?
```

Keep it brief. Extended discussions happen after standup, not during.

---

## Pair Programming

Encouraged (not mandatory) for:

- Complex features (Story Points > 5): agent orchestration, payment webhooks
- Critical security code: JWT, Stripe signature verification, input sanitization
- Debugging tricky issues
- Knowledge transfer when skill levels differ on a topic

**How to pair:**

- Driver writes code, Navigator reviews and guides
- Switch roles every 30 minutes
- Use VS Code Live Share or screen share

---

## Blockers & Escalation

If you're blocked:

1. Post in the team Slack channel immediately
2. Bring it up at the next standup
3. Pair with a teammate to unblock
4. Escalate to tech lead (Kareem) if unresolved

**Decision Making:**

- Technical decisions → discuss at standup, majority rules
- Architecture decisions → tech lead (Kareem) + team consensus
- Product decisions → what matters most for users?

---

## Knowledge Sharing

**Every Friday at 4 PM — 30-minute session.** One developer presents something they learned that week. Topics rotate across LLM integration, database patterns, security, testing, deployment, and more. Everyone is expected to present at least once per sprint cycle.

---

*Questions? Reach out in Slack or open a GitHub Discussion. Let's build Aqdy together. 🚀*
