# 🚀 Flowa Consolidated Docker Image

## What's Changed

You now have a **single consolidated Docker image** containing both backend API and frontend, replacing the previous 2-image setup.

### Before (2 Images)
```
shawaizsher/flowa-backend:1.0.0    (263MB)
shawaizsher/flowa-frontend:1.0.0   (206MB)
Total: ~470MB downloaded
```

### After (1 Image)
```
shawaizsher/flowa:1.0.0            (705MB)
Total: ~705MB downloaded
Single image, simpler deployment
```

---

## How It Works

The consolidated image:
1. **Builds frontend** → React app compiled to static files
2. **Packages with backend** → Express server serves both API and static frontend
3. **Single port** → Everything runs on port 4000
   - API endpoints: `/api/*` routes
   - Frontend: `/` and app routes (index.html SPA fallback)

---

## Building the Image

### Option 1: Use the helper script
```bash
./scripts/docker-build-hub.sh shawaizsher 1.0.0
```

### Option 2: Build manually
```bash
docker build -t shawaizsher/flowa:1.0.0 -t shawaizsher/flowa:latest .
```

---

## Testing Locally

```bash
# Start all services (PostgreSQL, Redis, App)
docker-compose up -d

# Wait 15 seconds for services to start
sleep 15

# Access the app
# Frontend: http://localhost:4000
# Backend API: http://localhost:4000/api/*
# Database: localhost:5432
# Redis: localhost:6379

# Check logs
docker-compose logs -f app

# Stop everything
docker-compose down
```

---

## Pushing to Docker Hub

### Prerequisites
1. Create Docker Hub account: https://hub.docker.com/signup
2. Create access token: https://hub.docker.com/settings/security
3. Login: `docker login` (use username + token)

### Push the image
```bash
# Build the image
./scripts/docker-build-hub.sh shawaizsher 1.0.0

# Push to Docker Hub
./scripts/docker-push-hub.sh shawaizsher 1.0.0
```

---

## Sharing with Others

Users can run your app with a single command:

```bash
DOCKER_USERNAME=shawaizsher VERSION=1.0.0 \
  docker-compose -f docker-compose.pull.yml up -d
```

Or use latest:
```bash
DOCKER_USERNAME=shawaizsher docker-compose -f docker-compose.pull.yml up -d
```

Then access at: **http://localhost:4000**

---

## Docker Compose Files

| File | Purpose | Use Case |
|------|---------|----------|
| `docker-compose.yml` | Development (build from source) | Development with hot reload |
| `docker-compose.pull.yml` | Production (pull pre-built images) | Users, testing, production |
| `Dockerfile` | Build consolidated image | Build for Docker Hub |

---

## File Changes Made

### New Files
- `Dockerfile` - Consolidated image (backend + frontend)

### Updated Files
- `docker-compose.yml` - Now builds single image from root Dockerfile
- `docker-compose.pull.yml` - Now pulls single image: `${DOCKER_USERNAME}/flowa:${VERSION}`
- `scripts/docker-build-hub.sh` - Builds single image instead of 2
- `scripts/docker-push-hub.sh` - Pushes single image instead of 2
- `backend/src/index.js` - Added static file serving for frontend dist

### Removed (No Longer Used)
- `backend/Dockerfile` - Replaced by root Dockerfile
- `frontend/Dockerfile` - Replaced by root Dockerfile

---

## Architecture

```
Dockerfile (Root)
├── Stage 1: frontend-builder
│   ├── Copy frontend/package.json
│   ├── npm ci (install deps)
│   ├── Copy frontend source
│   └── npm run build → /frontend/dist
│
└── Stage 2: backend (final image)
    ├── Copy backend/package.json
    ├── npm ci (install deps)
    ├── Copy backend source
    ├── Copy /frontend/dist → /app/public
    ├── Expose port 4000
    └── Run docker-init.sh + npm dev
```

---

## Express Static File Serving

The backend Express server now:
1. Serves `/api/*` routes from API handlers
2. Serves static files from `/app/public` (frontend dist)
3. Serves `index.html` for SPA routes (client-side routing)

```javascript
// From backend/src/index.js
app.use(express.static(publicPath));  // Serve static files
app.use((req, res, next) => {          // SPA fallback
  if (!req.path.startsWith('/api') && ...) {
    res.sendFile(path.join(publicPath, 'index.html'));
  } else {
    next();
  }
});
```

---

## Port Mapping

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 4000 | React app (served as static files) |
| Backend API | 4000 | Express API (/api/* routes) |
| PostgreSQL | 5432 | Database (internal) |
| Redis | 6379 | Cache (internal) |

Both frontend and backend share port 4000:
- Routes like `/workflows`, `/executions` serve `index.html` (SPA routing)
- Routes like `/api/auth/*` serve from API handlers
- All requests go to single container

---

## Advantages of Consolidated Image

✅ **Simpler deployment** - One image instead of two  
✅ **Smaller total size** - No duplicate dependencies  
✅ **Fewer moving parts** - One container to manage  
✅ **Better co-location** - Frontend and backend always match  
✅ **Easier sharing** - Single image to push/pull  

---

## Potential Issues & Fixes

### "Port 4000 already in use"
```bash
# Find and kill the process
lsof -i :4000
kill -9 <PID>
```

### "Frontend not loading"
Check that Express is serving static files:
```bash
docker exec flowa-app curl http://localhost:4000/
```

Should return HTML (not API response).

### "API endpoints 404"
Check backend routes are working:
```bash
docker exec flowa-app curl http://localhost:4000/api/auth/register
```

Should return error (not 404).

---

## Next Steps

1. **Test the build**:
   ```bash
   docker build -t test-flowa:1.0.0 .
   docker-compose up -d
   ```

2. **Verify it works**:
   - Frontend: http://localhost:4000
   - API: http://localhost:4000/api/*

3. **Push to Docker Hub**:
   ```bash
   docker login
   ./scripts/docker-build-hub.sh shawaizsher 1.0.0
   ./scripts/docker-push-hub.sh shawaizsher 1.0.0
   ```

4. **Share with others**:
   ```
   DOCKER_USERNAME=shawaizsher docker-compose -f docker-compose.pull.yml up -d
   ```

---

## Version Management

When releasing new versions:

```bash
# Build version 1.1.0
./scripts/docker-build-hub.sh shawaizsher 1.1.0

# Push to Docker Hub
./scripts/docker-push-hub.sh shawaizsher 1.1.0

# Users update with
DOCKER_USERNAME=shawaizsher VERSION=1.1.0 docker-compose pull
docker-compose up -d
```

---

## Environment Variables

All environment variables in `.env` are passed to the container:

```env
# Database
DB_NAME=flowa_db
DB_USER=flowa_user
DB_PASSWORD=your_password

# API
JWT_SECRET=your_secret
CORS_ORIGIN=http://localhost:4000

# Frontend
API_URL=http://localhost:4000      # Set at build time
WS_URL=ws://localhost:4000         # Set at build time
```

The `API_URL` and `WS_URL` are build-time variables (embedded in the frontend bundle).

---

## Deployment Checklist

- [ ] Run `docker build -t test-flowa:1.0.0 .` locally
- [ ] Run `docker-compose up -d` and test
- [ ] Verify frontend loads at http://localhost:4000
- [ ] Verify API works at http://localhost:4000/api/*
- [ ] Create Docker Hub account (if not already)
- [ ] Create access token
- [ ] Run `docker login`
- [ ] Build: `./scripts/docker-build-hub.sh shawaizsher 1.0.0`
- [ ] Push: `./scripts/docker-push-hub.sh shawaizsher 1.0.0`
- [ ] Verify on Docker Hub: https://hub.docker.com/r/shawaizsher/flowa
- [ ] Test pull-based deployment with docker-compose.pull.yml
- [ ] Share command with users

---

## Quick Commands

```bash
# Build locally
./scripts/docker-build-hub.sh shawaizsher 1.0.0

# Test locally
docker-compose up -d

# View logs
docker-compose logs -f app

# Access
http://localhost:4000

# Push
./scripts/docker-push-hub.sh shawaizsher 1.0.0

# Share
DOCKER_USERNAME=shawaizsher docker-compose -f docker-compose.pull.yml up -d
```

---

**Status**: ✅ Single consolidated image ready for production

