# 🐳 Docker Compose Files - Which One to Use?

Quick reference guide for the different `docker-compose` configurations available.

---

## Overview

| File | Use Case | Audience | Command |
|------|----------|----------|---------|
| `docker-compose.yml` | **Build consolidated image** (develop, test, modify) | Developers | `docker-compose up -d` |
| `docker-compose.pull.yml` | **Pull consolidated image** (just run) | End users | `DOCKER_USERNAME=you docker-compose -f docker-compose.pull.yml up -d` |
| `docker-compose.prod.yml` | **Production deployment** (with NGINX, SSL) | DevOps | `docker-compose -f docker-compose.prod.yml up -d` |

---

## 1. docker-compose.yml (Default - Build Consolidated Image)

**Purpose**: Development and testing  
**Builds**: Single consolidated image locally (backend + frontend)  
**When to use**: 
- You want to modify code
- Testing changes before pushing
- No access to Docker Hub
- Learning/development

### Quick Start
```bash
# Setup
git clone https://github.com/yourusername/flowa-automation-platform.git
cd flowa-automation-platform
cp .env.example .env

# Start
docker-compose up -d

# Access (both on same port)
# Frontend: http://localhost:4000
# Backend API: http://localhost:4000/api/*
```

### Features
- ✅ Builds consolidated image locally (backend + frontend in one)
- ✅ Source code mounted as volume for hot-reload
- ✅ Development environment defaults
- ✅ All ports exposed (5432, 6379, 4000)
- ✅ Single image serves both frontend and API

### Customization
```bash
# Change build environment variables
export API_URL=http://myserver.com:4000
export WS_URL=ws://myserver.com:4000
docker-compose build --no-cache
docker-compose up -d
```

---

## 2. docker-compose.pull.yml (Pull Pre-built Image)

**Purpose**: Run pre-built consolidated image from Docker Hub  
**Pulls**: Single image from Docker Hub registry  
**When to use**:
- Using published image
- End users who just want to run it
- Don't want to wait for build
- Already have image on Docker Hub

### Quick Start
```bash
# Create directory
mkdir my-flowa && cd my-flowa

# Download config files
wget https://raw.githubusercontent.com/yourusername/flowa/main/docker-compose.pull.yml -O docker-compose.yml
wget https://raw.githubusercontent.com/yourusername/flowa/main/.env.example -O .env

# Run (simple!)
DOCKER_USERNAME=yourusername docker-compose up -d

# Or with specific version
DOCKER_USERNAME=yourusername VERSION=1.0.0 docker-compose up -d

# Access (both on same port)
# Frontend: http://localhost:4000
# Backend API: http://localhost:4000/api/*
```

### Features
- ✅ Pulls single consolidated image (no building)
- ✅ Faster startup (no compilation, just pull + run)
- ✅ All services ready in ~10-15 seconds
- ✅ Production-ready image
- ✅ Frontend and API on same container

### How to Push Image First
Before users can pull, you need to push to Docker Hub:
```bash
# Build consolidated image
./scripts/docker-build-hub.sh yourusername 1.0.0

# Push to Docker Hub
./scripts/docker-push-hub.sh yourusername 1.0.0

# Now users can pull and run
```

### Share with Others
Simplest way - give them this command:
```bash
DOCKER_USERNAME=yourusername docker-compose -f docker-compose.pull.yml up -d
```

Or create a wrapper script:
```bash
#!/bin/bash
DOCKER_USERNAME=yourusername docker-compose -f docker-compose.pull.yml "$@"
```

---

## 3. docker-compose.prod.yml (Production Deployment)

**Purpose**: Production deployment with best practices  
**Features**: NGINX, SSL/TLS, resource limits, logging  
**When to use**:
- Deploying to production server
- Public-facing application
- Need HTTPS/SSL
- Need to manage resources
- Need centralized logging

### Quick Start
```bash
# Setup
cp .env.example .env.prod
nano .env.prod  # Update for production

# Configure environment
export API_URL=https://yourdomain.com
export WS_URL=wss://yourdomain.com
export NODE_ENV=production

# Start
docker-compose -f docker-compose.prod.yml up -d

# Access
# Frontend: https://yourdomain.com
# Backend: https://yourdomain.com/api
```

### Features (When Available)
- ✅ NGINX reverse proxy
- ✅ SSL/TLS termination
- ✅ Resource limits (CPU, memory)
- ✅ Health checks
- ✅ Logging configuration
- ✅ Automatic restarts
- ✅ Network isolation

### Production Checklist
```bash
# Before deploying
☐ Update .env.prod with production values
☐ Change JWT_SECRET to strong random value
☐ Change database password
☐ Configure SMTP for email
☐ Set up SSL certificates
☐ Configure backup strategy
☐ Set up monitoring/logging
☐ Test on staging environment first
```

---

## Comparison Table

| Feature | docker-compose.yml | docker-compose.pull.yml | docker-compose.prod.yml |
|---------|-------------------|------------------------|------------------------|
| **Image** | Build consolidated | Pull consolidated | Pull consolidated |
| **Build Time** | 5-10 min (first run) | None (just pull) | None (just pull) |
| **Download Size** | Full source code | ~700MB image | ~700MB image |
| **Frontend Port** | 4000 | 4000 | 443 (HTTPS) |
| **API Port** | 4000 | 4000 | 443 (HTTPS) |
| **Dev Ready** | ✅ Yes (hot reload) | ✅ Yes | ✅ Yes |
| **Production Ready** | ⚠️ Not ideal | ✅ Yes | ✅ Yes |
| **NGINX** | No | No | Yes (when implemented) |
| **SSL/TLS** | No | No | Yes (when implemented) |
| **Resource Limits** | No | No | Yes (when implemented) |
| **Logging** | Docker default | Docker default | Centralized (when implemented) |

---

## Workflow Examples

### Developer Workflow
```bash
# 1. Start development environment
docker-compose up -d

# 2. Edit code locally
nano frontend/src/App.tsx

# 3. See changes immediately (hot reload via volumes)

# 4. Rebuild when needed
docker-compose build --no-cache frontend

# 5. Push changes
git commit -m "Update App"
git push origin feature-branch

# 6. Build release images
./scripts/docker-build-hub.sh yourusername 1.1.0

# 7. Push to Docker Hub
./scripts/docker-push-hub.sh yourusername 1.1.0
```

### End User Workflow
```bash
# 1. Create directory
mkdir my-flowa && cd my-flowa

# 2. Download files
wget https://raw.githubusercontent.com/yourusername/flowa/main/docker-compose.pull.yml -O docker-compose.yml
wget https://raw.githubusercontent.com/yourusername/flowa/main/.env.example -O .env

# 3. Run it
DOCKER_USERNAME=yourusername docker-compose up -d

# 4. Access application
open http://localhost:3000

# 5. When done
docker-compose down
```

### Production Deployment
```bash
# 1. Download production compose
wget https://raw.githubusercontent.com/yourusername/flowa/main/docker-compose.prod.yml

# 2. Setup environment
cp .env.example .env.prod
# Edit .env.prod with production values

# 3. Setup SSL certificates
certbot certonly --standalone -d yourdomain.com

# 4. Start production
docker-compose -f docker-compose.prod.yml up -d

# 5. Monitor
docker-compose -f docker-compose.prod.yml logs -f

# 6. Backup regularly
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U flowa_user flowa_db | gzip > backup.sql.gz
```

---

## Environment Variables Reference

### .env (for docker-compose.yml)
```env
# Database
DB_NAME=flowa_db
DB_USER=flowa_user
DB_PASSWORD=your_password

# API
JWT_SECRET=your_secret
NODE_ENV=development

# Frontend (build time - embedded in image)
API_URL=http://localhost:4000
WS_URL=ws://localhost:4000
```

### .env.example (for docker-compose.pull.yml)
```env
# Docker Hub image credentials
DOCKER_USERNAME=yourusername
VERSION=latest

# Same environment variables as docker-compose.yml
DB_PASSWORD=change_me
JWT_SECRET=change_me
NODE_ENV=production
CORS_ORIGIN=http://localhost:4000
```

### .env.prod (for docker-compose.prod.yml)
```env
# Production settings
NODE_ENV=production
DB_PASSWORD=strong_password_here
JWT_SECRET=strong_secret_here

# HTTPS endpoints
API_URL=https://yourdomain.com
WS_URL=wss://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# SSL paths
SSL_CERT=/path/to/cert.pem
SSL_KEY=/path/to/key.pem
```

---

## Common Commands by Use Case

### I want to develop locally
```bash
docker-compose up -d              # Build & start
docker-compose logs -f            # Watch logs
docker-compose down -v            # Stop & clean
```

### I want to test pre-built images
```bash
DOCKER_USERNAME=me docker-compose -f docker-compose.pull.yml up -d
docker-compose -f docker-compose.pull.yml ps
docker-compose -f docker-compose.pull.yml down
```

### I want to deploy to production
```bash
docker-compose -f docker-compose.prod.yml -e NODE_ENV=production up -d
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f backend
```

### I want to push images to Docker Hub
```bash
./scripts/docker-build-hub.sh yourusername 1.0.0
./scripts/docker-push-hub.sh yourusername 1.0.0
```

### I want others to use my images
```bash
# Share this command:
DOCKER_USERNAME=yourusername VERSION=1.0.0 \
  docker-compose -f docker-compose.pull.yml up -d

# Or provide a shell script wrapper
```

---

## Troubleshooting

### "No such file or directory: docker-compose.prod.yml"
Make sure you're using the `-f` flag:
```bash
docker-compose -f docker-compose.prod.yml up -d  # ✅ Correct
docker-compose up -d                              # ❌ Uses default docker-compose.yml
```

### "Image not found" when using docker-compose.pull.yml
Make sure you've pushed to Docker Hub first:
```bash
# Check if image exists
docker images | grep flowa-

# If not, build and push
./scripts/docker-build-hub.sh yourusername 1.0.0
./scripts/docker-push-hub.sh yourusername 1.0.0
```

### "Cannot assign requested address" when binding ports
Port is already in use. Free it:
```bash
lsof -i :3000
kill -9 <PID>
```

### "Inconsistent image" between compose files
Different files might reference different image tags. Always explicitly set:
```bash
DOCKER_USERNAME=yourusername VERSION=1.0.0 docker-compose -f docker-compose.pull.yml up -d
```

---

## Recommendations

✅ **For Development**: Use `docker-compose.yml`
- You have source code
- You need hot reload
- You're making changes

✅ **For Testing Release**: Use `docker-compose.pull.yml`
- Test before pushing to production
- Verify images work
- Document user experience

✅ **For Production**: Use `docker-compose.prod.yml`
- Maximum security
- HTTPS/SSL enabled
- Resource limits
- Proper logging

✅ **For Sharing with Others**: Use `docker-compose.pull.yml`
- Fast setup (no building)
- Consistent versions
- No source code needed
- Easy to manage updates

---

## Next Steps

1. **Development**: Start with `docker-compose.yml`
2. **Testing**: Switch to `docker-compose.pull.yml`
3. **Pushing**: Use `./scripts/docker-push-hub.sh`
4. **Production**: Configure `docker-compose.prod.yml`
5. **Sharing**: Document pull-based setup for users
