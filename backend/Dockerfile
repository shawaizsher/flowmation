FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Expose port
EXPOSE 4000

# Copy initialization script
COPY docker-init.sh /app/docker-init.sh
RUN chmod +x /app/docker-init.sh

# Install nc for health checks and postgres client for init
RUN apk add --no-cache netcat-openbsd postgresql-client

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Use init script as entrypoint to set up database, then run server
ENTRYPOINT ["/app/docker-init.sh"]
CMD ["npm", "run", "dev"]
