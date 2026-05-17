# 🐛 Docker Setup - Issues & Recommendations

## Critical Issues

### Issue #1: Frontend VITE Environment Variables Not Passed to Build
**Severity**: 🔴 CRITICAL

**Problem**: 
- Frontend uses `import.meta.env.VITE_API_URL` and `import.meta.env.VITE_WS_URL` 
- These are compile-time constants that must be embedded during `npm run build`
- The Dockerfile runs build without these variables
- docker-compose.yml sets them at runtime, but too late (frontend already built)

**Current Flow** (WRONG):
```
Dockerfile: npm run build                           ← VITE vars not available!
          ↓
docker-compose: Sets VITE_API_URL at runtime        ← Too late, build already done!
          ↓
Frontend loads but has hardcoded defaults
```

**Solution**: Pass VITE variables as Docker build arguments:

**Option A - Update Frontend Dockerfile**:
```dockerfile
# Accept build arguments
ARG VITE_API_URL=http://localhost:4000
ARG VITE_WS_URL=ws://localhost:4000

# Pass to build step
RUN VITE_API_URL=${VITE_API_URL} VITE_WS_URL=${VITE_WS_URL} npm run build
```

**Option B - Update docker-compose.yml**:
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:
      VITE_API_URL: http://localhost:4000
      VITE_WS_URL: ws://localhost:4000
```

**Impact**: Without this fix, frontend will hardcode localhost:4000 internally even if it's running on a different domain.

---

### Issue #2: Database Migration Reliability
**Severity**: 🟡 MEDIUM

**Problem**:
- Backend runs migrations with `npx prisma migrate deploy` on every startup
- If migration fails, container restarts but doesn't retry with backoff
- Database might still be starting up when migration runs

**Current Setup**:
```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
```

**Improvement**: Add retry logic:
```dockerfile
CMD ["sh", "-c", "for i in 1 2 3 4 5; do npx prisma migrate deploy && npm run dev && break; sleep 10; done"]
```

**Or use health checks**: Let docker-compose manage retries via health checks

---

### Issue #3: Hardcoded localhost in docker-compose.yml
**Severity**: 🟡 MEDIUM

**Problem**:
```yaml
environment:
  VITE_API_URL: http://localhost:4000  # Hardcoded!
  VITE_WS_URL: ws://localhost:4000     # Hardcoded!
```

When running in Docker or on a server, localhost:4000 won't be accessible from client browser.

**Solution**: Make these configurable:
```yaml
environment:
  VITE_API_URL: ${API_URL:-http://localhost:4000}
  VITE_WS_URL: ${WS_URL:-ws://localhost:4000}
```

Then in .env.example:
```
# Docker URLs (change if running on a server)
API_URL=http://localhost:4000
WS_URL=ws://localhost:4000
```

---

### Issue #4: Missing Docker Image Publication
**Severity**: 🟡 MEDIUM

**Problem**:
- DOCKER.md and QUICKSTART.md reference pushing images to Docker Hub
- But no images have been pushed yet
- End users trying to `docker-compose pull` will fail

**Current docker-compose.yml references**:
```yaml
backend:
  build:
    context: ./backend           # Local build, not from Docker Hub
```

**For end users to just `docker pull`**, need to:
1. Push images to Docker Hub with tags (yourusername/flowa-backend:latest, etc.)
2. Provide a separate docker-compose.pull.yml for users who just want to pull:
```yaml
services:
  backend:
    image: yourusername/flowa-backend:latest    # Pull from registry
  frontend:
    image: yourusername/flowa-frontend:latest   # Pull from registry
```

---

### Issue #5: .env Variable Name Mismatch
**Severity**: 🟠 MINOR

**Problem**:
- .env uses `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- docker-compose.yml expects `DB_USER`, `DB_PASSWORD`, `DB_NAME`

**Current docker-compose.yml**:
```yaml
environment:
  POSTGRES_DB: ${DB_NAME:-flowa_db}
  POSTGRES_USER: ${DB_USER:-flowa_user}
  POSTGRES_PASSWORD: ${DB_PASSWORD:-flowa_password}
```

But .env.example uses different names.

**Solution**: Standardize on one naming convention. Either:
- Update .env.example to use DB_* naming
- Or update docker-compose.yml to use POSTGRES_* naming

---

## Testing Checklist for Docker Setup

### For Someone Pulling From Docker Hub:
- [ ] Images exist on Docker Hub
- [ ] `docker-compose pull` succeeds
- [ ] `docker-compose up -d` starts all services
- [ ] PostgreSQL initializes and is accessible
- [ ] Redis starts and is accessible  
- [ ] Backend migrations run automatically
- [ ] Backend is accessible at localhost:4000
- [ ] Frontend is accessible at localhost:3000
- [ ] Frontend can communicate with backend API
- [ ] WebSocket connection works
- [ ] User can register and log in
- [ ] Workflows can be created and executed

### For Local Development (build from source):
- [ ] `docker-compose up -d` builds both images
- [ ] Services start in correct order (DB → Cache → Backend → Frontend)
- [ ] Health checks pass for all services
- [ ] Backend logs show "PostgreSQL connected"
- [ ] Backend logs show "Redis connected"
- [ ] Frontend can connect to backend

---

## Recommended Fixes (Priority Order)

### 🔴 P0 - Critical (Must Fix)
1. **Fix Vite environment variables in frontend Dockerfile**
   - Impact: Frontend won't work correctly on non-localhost domains
   - Time: 10 minutes
   - Files: `frontend/Dockerfile`, `docker-compose.yml`

### 🟠 P1 - Important (Should Fix)
2. **Make localhost hardcoding configurable**
   - Impact: Can't run on servers/different domains
   - Time: 5 minutes
   - Files: `.env.example`, `docker-compose.yml`

3. **Fix environment variable naming consistency**
   - Impact: Confusing documentation
   - Time: 5 minutes
   - Files: `.env.example`, `docker-compose.yml`

### 🟡 P2 - Nice to Have (Could Fix)
4. **Add retry logic to migrations**
   - Impact: Better resilience on slow databases
   - Time: 10 minutes
   - Files: `backend/Dockerfile`

5. **Document Docker Hub image publication**
   - Impact: End users can pull and run without building
   - Time: 20 minutes
   - Files: Create `docker-compose.pull.yml`, update DOCKER.md

---

## Quick Fix Suggestions

### Fix #1: Frontend Dockerfile
```dockerfile
ARG VITE_API_URL=http://localhost:4000
ARG VITE_WS_URL=ws://localhost:4000

FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN VITE_API_URL=${VITE_API_URL} VITE_WS_URL=${VITE_WS_URL} npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
CMD ["serve", "-s", "dist", "-l", "3000"]
```

### Fix #2: docker-compose.yml (frontend service)
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:
      VITE_API_URL: ${API_URL:-http://localhost:4000}
      VITE_WS_URL: ${WS_URL:-ws://localhost:4000}
  container_name: flowa-frontend
  ports:
    - "3000:3000"
  depends_on:
    - backend
  networks:
    - flowa-network
  restart: unless-stopped
```

### Fix #3: .env.example
```env
# Database
DB_NAME=flowa_db
DB_USER=flowa_user
DB_PASSWORD=flowa_password

# Redis
REDIS_PASSWORD=redis_password_change_me

# JWT
JWT_SECRET=your_jwt_secret_key_change_this

# URLs (change these if not running on localhost)
API_URL=http://localhost:4000
WS_URL=ws://localhost:4000

# ...rest of config
```

---

## Test Commands

```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Test API
curl http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"Password123"}'

# Test frontend
curl http://localhost:3000

# Stop
docker-compose down -v
```

---

## Current Status

✅ **Working**:
- Docker builds (locally)
- Services start and communicate
- Database migrations run
- Backend API functional
- Frontend accessible

❌ **Broken**:
- Frontend VITE variables not embedded (will use defaults)
- Can't customize API URLs without rebuilding
- Unclear how to pull from Docker Hub

⚠️  **Needs Testing**:
- Running on non-localhost domain
- Running on server with different IP
- Docker Compose on different machines
