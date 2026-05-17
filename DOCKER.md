# Flowa Docker & Docker Hub Setup Guide

## Overview

This guide walks you through:
1. Building Docker images for Flowa
2. Pushing images to Docker Hub
3. Running Flowa locally with Docker Compose
4. Managing containers and deployments

---

## Prerequisites

- **Docker**: Install Docker Desktop
- **Docker Compose**: v2.0+
- **Docker Hub Account**: Free account at hub.docker.com
- **Git**: For cloning the repository

### Verify Installation

```bash
docker --version
docker-compose --version
docker login
```

---

## Step 1: Prepare Your Environment

### Clone Repository

```bash
git clone https://github.com/yourusername/flowa-automation-platform.git
cd flowa-automation-platform

cp .env.example .env
```

### Configure Environment

Edit `.env` file with your settings:

```
DB_NAME=flowa_db
DB_USER=flowa_user
DB_PASSWORD=your_secure_password
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_jwt_secret_here
DOCKER_USERNAME=your_docker_hub_username
VERSION=1.0.0

# ⚠️  IMPORTANT: Update these if not running on localhost
API_URL=http://localhost:4000           # Change to your domain
WS_URL=ws://localhost:4000              # Change to your domain
```

**Note**: `API_URL` and `WS_URL` are embedded into the frontend build. If running on a different domain or server, update these BEFORE building the Docker image.

---

## Step 2: Build Docker Images

### Using Build Script

```bash
chmod +x scripts/docker-build.sh
DOCKER_USERNAME=yourusername VERSION=1.0.0 ./scripts/docker-build.sh
```

### Manual Build

```bash
# Backend
docker build -t yourusername/flowa-backend:1.0.0 -f backend/Dockerfile ./backend

# Frontend
docker build -t yourusername/flowa-frontend:1.0.0 -f frontend/Dockerfile ./frontend

# Verify
docker images | grep flowa-
```

---

## Step 3: Run Locally with Docker Compose

### Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check status
docker-compose ps

# Stop services
docker-compose down
```

### Access Services

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Database Migrations

```bash
# Automatic on startup, or manually:
docker-compose exec backend npx prisma migrate deploy
```

---

## Step 4: Push to Docker Hub

### Authenticate

```bash
docker login

# Use Docker Hub username and personal access token (not password)
# Create token at: hub.docker.com/settings/security
```

### Push Images Using Script

```bash
chmod +x scripts/docker-push.sh
DOCKER_USERNAME=yourusername VERSION=1.0.0 ./scripts/docker-push.sh
```

### Manual Push

```bash
docker push yourusername/flowa-backend:1.0.0
docker push yourusername/flowa-backend:latest
docker push yourusername/flowa-frontend:1.0.0
docker push yourusername/flowa-frontend:latest
```

### Verify on Docker Hub

Visit: https://hub.docker.com/r/yourusername/flowa-backend

---

## Step 5: Share for Others to Use

### For End Users

```bash
# Create directory
mkdir my-flowa && cd my-flowa

# Download files
wget https://raw.githubusercontent.com/yourusername/flowa/main/docker-compose.yml
wget https://raw.githubusercontent.com/yourusername/flowa/main/.env.example -O .env

# Edit .env with their configuration
nano .env

# Pull and run
docker-compose pull
docker-compose up -d

# Access at http://localhost:3000
```

---

## Production Deployment

### Use Production Compose

```bash
# Setup production environment
cp .env.example .env.prod
nano .env.prod

# Start with production config
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml ps
```

### Enable HTTPS (Optional)

```bash
# Generate certificates
certbot certonly --standalone -d yourdomain.com

# Copy to project
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/

# Restart NGINX
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## Common Commands

```bash
# View containers
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View specific logs
docker-compose logs -f backend

# Execute in container
docker-compose exec backend npm test
docker-compose exec postgres psql -U flowa_user -d flowa_db

# Rebuild
docker-compose up --build

# Clean up
docker-compose down -v

# Health check
docker-compose ps | grep healthy

# Resource usage
docker stats
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Reset everything
docker-compose down -v
docker-compose up -d

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Database Connection Error

```bash
# Reset database
docker-compose exec backend npx prisma migrate reset

# Check status
docker-compose ps postgres
```

### Port Already In Use

```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :4000

# Kill the process
kill -9 <PID>

# Or use different ports in docker-compose.yml
```

---

## Image Specifications

### Backend Image
- Base: node:18-alpine
- Size: ~450MB
- Port: 4000
- Includes: Prisma, health checks

### Frontend Image
- Base: node:18-alpine
- Size: ~80MB
- Port: 3000
- Multi-stage optimized build

---

## Security Best Practices

1. **Use Environment Variables**
   - Never hardcode secrets
   - Add .env to .gitignore

2. **Rotate Secrets Regularly**
   - Change JWT_SECRET
   - Change DB_PASSWORD
   - Update Redis password

3. **Keep Images Updated**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

4. **Network Security**
   - Use private networks for databases
   - Only expose necessary ports
   - Use HTTPS in production

---

## CI/CD Integration

Use GitHub Actions to automatically build and push images:

1. Add secrets to GitHub: DOCKER_USERNAME, DOCKER_PASSWORD
2. Create .github/workflows/docker.yml
3. On push/tag, automatically build and push to Docker Hub

---

## Support

- Docker Docs: https://docs.docker.com/
- Docker Hub: https://hub.docker.com/
- Flowa GitHub: https://github.com/yourusername/flowa

---

## License

Flowa is open-source under the MIT License.
