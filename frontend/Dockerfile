# Multi-stage build for optimized production image
ARG VITE_API_URL=http://localhost:4000
ARG VITE_WS_URL=ws://localhost:4000

FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application with Vite env vars
ARG VITE_API_URL
ARG VITE_WS_URL
RUN VITE_API_URL=${VITE_API_URL} VITE_WS_URL=${VITE_WS_URL} npm run build

# Production stage - serve with lightweight server
FROM node:18-alpine

WORKDIR /app

# Install serve to run the production build
RUN npm install -g serve

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
