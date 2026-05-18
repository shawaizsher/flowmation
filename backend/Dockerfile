FROM node:18-alpine

WORKDIR /app

# Install system deps first (least likely to change — stays cached longest)
RUN apk add --no-cache netcat-openbsd postgresql-client

# Copy package files and install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy application code (this layer busts if ANY file changes)
COPY . .

# Ensure init script is executable
RUN chmod +x /app/docker-init.sh

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

ENTRYPOINT ["/app/docker-init.sh"]
CMD ["npm", "start"]
