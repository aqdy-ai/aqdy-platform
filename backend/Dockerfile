
# Stage 1: Build Stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove husky prepare script during docker builds to avoid failures
RUN npm pkg delete scripts.prepare

# Install dependencies
RUN npm ci --omit=dev && \
    npm install --save-dev typescript ts-node @types/node rimraf

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript to JavaScript
RUN npm run build

# ======= Stage 2: Runtime Stage ======
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm pkg delete scripts.prepare
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# 💡 Optimized Health check configurations
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]