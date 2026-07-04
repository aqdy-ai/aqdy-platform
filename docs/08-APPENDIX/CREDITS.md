# Credits & Attributions

> Open-source libraries, tools, services, APIs, and contributors that power the Aqdy platform.

---

## Frontend

### Core Framework & Build

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [React](https://react.dev/) | 19 | MIT | UI component framework |
| [Vite](https://vitejs.dev/) | 8 | MIT | Build tool and dev server |
| [TypeScript](https://www.typescriptlang.org/) | 6 | Apache-2.0 | Type-safe JavaScript |
| [React Router DOM](https://reactrouter.com/) | 7 | MIT | Client-side routing |

### UI & Design System

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [Tailwind CSS](https://tailwindcss.com/) | 4 | MIT | Utility-first CSS framework |
| [shadcn/ui](https://ui.shadcn.com/) | 4 | MIT | Component primitives (built on Radix) |
| [Radix UI](https://www.radix-ui.com/) | 1 | MIT | Headless accessible UI primitives |
| [Framer Motion](https://www.framer.com/motion/) | 12 | MIT | Animation library |
| [Lucide React](https://lucide.dev/) | 1 | ISC | Icon pack |
| [HugeIcons](https://hugeicons.com/) | 4 | MIT | Extended icon pack |
| [tw-animate-css](https://github.com/jamiebuilds/tailwindcss-animate) | 1 | MIT | Tailwind animation utilities |
| [class-variance-authority](https://cva.style/) | 0.7 | Apache-2.0 | Component variant management |
| [clsx](https://github.com/lukeed/clsx) | 2 | MIT | Conditional className utility |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | 3 | MIT | Merge Tailwind classes safely |

### Fonts

| Font | Provider | License | Usage |
|:---|:---|:---|:---|
| [Inter Variable](https://rsms.me/inter/) | `@fontsource-variable/inter` | OFL-1.1 | Primary UI font (LTR) |
| [Noto Sans Arabic](https://fonts.google.com/noto/specimen/Noto+Sans+Arabic) | System fallback | OFL-1.1 | Arabic text rendering (RTL) |

### Data Fetching & State

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [TanStack Query](https://tanstack.com/query) | 5 | MIT | Server state management, caching |
| [Axios](https://axios-http.com/) | 1 | MIT | HTTP client |

### Internationalization

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [i18next](https://www.i18next.com/) | 26 | MIT | i18n framework |
| [react-i18next](https://react.i18next.com/) | 17 | MIT | React bindings for i18next |
| [i18next-browser-languagedetector](https://github.com/i18next/i18next-browser-languageDetector) | 8 | MIT | Browser language detection |
| [i18next-http-backend](https://github.com/i18next/i18next-http-backend) | 4 | MIT | Lazy-load translation files |

### Charts & Visualization

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [Recharts](https://recharts.org/) | 3 | MIT | Analytics and data charts |

### Content Rendering

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [react-markdown](https://github.com/remarkjs/react-markdown) | 10 | MIT | Render Markdown in React |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | 4 | MIT | GitHub Flavored Markdown support |

### Notifications & UX

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [Sonner](https://sonner.emilkowal.ski/) | 2 | MIT | Toast notification system |
| [react-helmet-async](https://github.com/staylor/react-helmet-async) | 3 | MIT | Dynamic `<head>` management (SEO) |
| [next-themes](https://github.com/pacocoursey/next-themes) | 0.4 | MIT | Dark / light theme management |

### Authentication

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [@react-oauth/google](https://github.com/MomenSherif/react-oauth) | 0.13 | MIT | Google OAuth 2.0 sign-in button |

---

## Backend

### Server & Runtime

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [Node.js](https://nodejs.org/) | ≥ 18 | MIT | JavaScript runtime |
| [Express](https://expressjs.com/) | 5 | MIT | HTTP server framework |
| [TypeScript](https://www.typescriptlang.org/) | 6 | Apache-2.0 | Type safety |
| [tsx](https://tsx.is/) | 4 | MIT | TypeScript execution |

### AI / LLM Integration

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [LangChain](https://js.langchain.com/) | 1 | MIT | LLM orchestration framework |
| [@langchain/core](https://js.langchain.com/docs/introduction/) | 1 | MIT | LangChain core primitives |
| [@langchain/google-genai](https://github.com/langchain-ai/langchainjs) | 2 | MIT | Google Gemini integration |
| [@langchain/openai](https://github.com/langchain-ai/langchainjs) | 1 | MIT | OpenAI GPT-4o integration (fallback) |
| [@langfuse/langchain](https://langfuse.com/) | 5 | MIT | LLM observability via Langfuse |
| [langfuse](https://langfuse.com/) | 3 | MIT | Tracing, cost, latency monitoring |

### Vector Database & Embeddings

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [@pinecone-database/pinecone](https://www.pinecone.io/) | 7 | Apache-2.0 | Vector similarity search |

### Database & Caching

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [Mongoose](https://mongoosejs.com/) | 9 | MIT | MongoDB ODM |
| [ioredis](https://github.com/luin/ioredis) | 5 | MIT | Redis client |
| [BullMQ](https://bullmq.io/) | 5 | MIT | Redis-backed job queue |

### Security & Auth

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [Helmet](https://helmetjs.github.io/) | 8 | MIT | HTTP security headers |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 2 | MIT | Password hashing |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | 9 | MIT | JWT auth tokens |
| [cors](https://github.com/expressjs/cors) | 2 | MIT | Cross-Origin Resource Sharing |
| [validator](https://github.com/validatorjs/validator.js) | 13 | MIT | Input sanitization |
| [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs) | 10 | Apache-2.0 | Google OAuth verification |
| [Zod](https://zod.dev/) | 4 | MIT | Schema validation |

### File Processing

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [pdfjs-dist](https://github.com/mozilla/pdf.js) | 5 | Apache-2.0 | PDF text extraction |
| [pdfkit](https://pdfkit.org/) | 0.19 | MIT | PDF generation (export reports) |
| [mammoth](https://github.com/mwilliamson/mammoth.js) | 1 | BSD-2-Clause | DOCX to text extraction |
| [multer](https://github.com/expressjs/multer) | 2 | MIT | Multipart file upload handling |

### Payments

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [Stripe](https://stripe.com/docs/api?lang=node) | 22 | MIT | Subscription billing and payments |

### Email

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [Nodemailer](https://nodemailer.com/) | 9 | MIT | Transactional email (SMTP) |

### API Documentation

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) | 6 | MIT | Generate OpenAPI spec from JSDoc |
| [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) | 5 | MIT | Serve Swagger UI |

### Utilities

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [uuid](https://github.com/uuidjs/uuid) | 11 | MIT | UUID generation |
| [p-map](https://github.com/sindresorhus/p-map) | 7 | MIT | Concurrent async operations with concurrency limit |
| [dotenv](https://github.com/motdotla/dotenv) | 17 | BSD-2-Clause | Environment variable loading |
| [cookie-parser](https://github.com/expressjs/cookie-parser) | 1 | MIT | HTTP cookie parsing |
| [morgan](https://github.com/expressjs/morgan) | 1 | MIT | HTTP request logging |

---

## Testing

| Library | Version | License | Purpose |
|:---|:---|:---|:---|
| [Jest](https://jestjs.io/) | 29 | MIT | Backend unit & integration testing |
| [Supertest](https://github.com/ladjs/supertest) | 7 | MIT | HTTP endpoint testing |
| [ts-jest](https://kulshekhar.github.io/ts-jest/) | 29 | MIT | TypeScript Jest transformer |
| [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) | 11 | MIT | In-memory MongoDB for tests |
| [Vitest](https://vitest.dev/) | 4 | MIT | Frontend unit testing |
| [@testing-library/react](https://testing-library.com/) | 16 | MIT | React component testing |
| [@testing-library/user-event](https://testing-library.com/docs/user-event/intro/) | 14 | MIT | Simulated user interaction |
| [MSW (Mock Service Worker)](https://mswjs.io/) | 2 | MIT | API mocking in tests |
| [vitest-axe](https://github.com/nickmccurdy/vitest-axe) | 0.1 | MIT | Accessibility (axe-core) in Vitest |
| [Playwright](https://playwright.dev/) | latest | Apache-2.0 | End-to-end browser testing |

---

## Infrastructure & DevOps

| Tool | Purpose |
|:---|:---|
| [Docker](https://www.docker.com/) | Containerization |
| [Docker Compose](https://docs.docker.com/compose/) | Multi-service local orchestration |
| [AWS CDK](https://aws.amazon.com/cdk/) | Infrastructure as code (cloud deployment) |
| [GitHub Actions](https://github.com/features/actions) | CI/CD pipeline |
| [Husky](https://typicode.github.io/husky/) | Git pre-commit hooks |
| [lint-staged](https://github.com/okonet/lint-staged) | Run linters on staged files |

---

## Secret Management

| Service | Purpose |
|:---|:---|
| [Doppler](https://www.doppler.com/) | Secrets manager — syncs `.env` to production environments |

---

## External Services & APIs

| Service | Purpose |
|:---|:---|
| [Google Gemini API](https://ai.google.dev/) | Primary LLM (contract analysis, classification, redline) |
| [OpenAI API](https://platform.openai.com/) | Fallback LLM (GPT-4o) |
| [Pinecone](https://www.pinecone.io/) | Managed vector database for RAG retrieval |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Managed MongoDB cloud database |
| [Redis Cloud / Upstash](https://redis.io/) | Managed Redis (queues, rate limiting) |
| [Langfuse](https://langfuse.com/) | LLM observability, tracing, and cost monitoring |
| [Stripe](https://stripe.com/) | Payment processing and subscription management |
| [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2) | Social sign-in |
| [SMTP (Gmail)](https://support.google.com/mail/answer/7126229) | Transactional email delivery |

---

## Code Quality & Formatting

| Tool | Purpose |
|:---|:---|
| [ESLint](https://eslint.org/) | JavaScript/TypeScript linting |
| [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | Accessibility lint rules |
| [Prettier](https://prettier.io/) | Code formatting |
| [Stylelint](https://stylelint.io/) | CSS linting |

---

## Acknowledgements

Special thanks to the open-source community and the maintainers of every library listed above. This project would not be possible without their work.

---

*This document was last updated: July 2026.*
