# Consolidated Dockerfile - Backend + Frontend in single image
ARG VITE_API_URL=http://localhost:4000
ARG VITE_WS_URL=ws://localhost:4000

# ── Stage 1: Build Frontend ──
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend . .

# Build frontend with Vite env vars
ARG VITE_API_URL
ARG VITE_WS_URL
RUN VITE_API_URL=${VITE_API_URL} VITE_WS_URL=${VITE_WS_URL} npm run build

# ── Stage 2: Build Backend with Frontend ──
FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package.json backend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy backend source code
COPY backend . .

# Copy frontend dist to backend public directory for serving static files
COPY --from=frontend-builder /frontend/dist ./public

# Expose single port for both API and frontend
EXPOSE 4000

# Copy initialization script
COPY backend/docker-init.sh /app/docker-init.sh
RUN chmod +x /app/docker-init.sh

# Install nc for health checks and postgres client for init
RUN apk add --no-cache netcat-openbsd postgresql-client

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Use init script as entrypoint to set up database, then run server
ENTRYPOINT ["/app/docker-init.sh"]
CMD ["npm", "run", "dev"]
