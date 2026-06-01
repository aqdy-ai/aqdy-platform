
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

# Set environment to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Remove husky prepare script during docker builds to avoid failures
RUN npm pkg delete scripts.prepare

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/index.js"]
