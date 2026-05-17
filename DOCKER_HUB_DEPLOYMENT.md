# 🐳 Publishing Flowa to Docker Hub

Complete guide to build, push, and share Docker images on Docker Hub.

---

## Step 1: Setup Docker Hub Account

### Create Account
1. Go to https://hub.docker.com/signup
2. Create free account with username (e.g., `yourusername`)
3. Verify email
4. Create two repositories:
   - `flowa-backend` (private or public)
   - `flowa-frontend` (private or public)

### Create Access Token (Better than password)
1. Go to https://hub.docker.com/settings/security
2. Click "New Access Token"
3. Name it: "flowa-deployment"
4. Copy the token (you'll need it)

### Login to Docker Locally
```bash
docker login
# When prompted:
# Username: yourusername
# Password: (paste your access token)
```

Verify login worked:
```bash
docker logout  # clears token
docker login   # re-login
echo $DOCKER_CONTENT_TRUST  # should be empty or false
```

---

## Step 2: Build Images with Docker Tags

### Option A: Manual Build (Simple)

```bash
cd ~/flowa-automation-platform

# Set your Docker Hub username
export DOCKER_USERNAME=yourusername
export VERSION=1.0.0

# Build backend
docker build -t ${DOCKER_USERNAME}/flowa-backend:${VERSION} \
  -t ${DOCKER_USERNAME}/flowa-backend:latest \
  -f backend/Dockerfile \
  ./backend

# Build frontend  
docker build -t ${DOCKER_USERNAME}/flowa-frontend:${VERSION} \
  -t ${DOCKER_USERNAME}/flowa-frontend:latest \
  -f frontend/Dockerfile \
  ./frontend

# Verify images were created
docker images | grep flowa-
```

**Output:**
```
REPOSITORY                      TAG       IMAGE ID       SIZE
yourusername/flowa-backend      latest    abc123...      450MB
yourusername/flowa-backend      1.0.0     abc123...      450MB
yourusername/flowa-frontend     latest    def456...      150MB
yourusername/flowa-frontend     1.0.0     def456...      150MB
```

### Option B: Using Build Script

Create `scripts/docker-build-hub.sh`:
```bash
#!/bin/bash
set -e

DOCKER_USERNAME=${1:-yourusername}
VERSION=${2:-1.0.0}

echo "🔨 Building Flowa Docker images..."
echo "   Username: $DOCKER_USERNAME"
echo "   Version: $VERSION"

# Build backend
echo "📦 Building backend..."
docker build \
  -t ${DOCKER_USERNAME}/flowa-backend:${VERSION} \
  -t ${DOCKER_USERNAME}/flowa-backend:latest \
  -f backend/Dockerfile \
  ./backend

# Build frontend
echo "📦 Building frontend..."
docker build \
  -t ${DOCKER_USERNAME}/flowa-frontend:${VERSION} \
  -t ${DOCKER_USERNAME}/flowa-frontend:latest \
  -f frontend/Dockerfile \
  ./frontend

echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "  docker push ${DOCKER_USERNAME}/flowa-backend:${VERSION}"
echo "  docker push ${DOCKER_USERNAME}/flowa-backend:latest"
echo "  docker push ${DOCKER_USERNAME}/flowa-frontend:${VERSION}"
echo "  docker push ${DOCKER_USERNAME}/flowa-frontend:latest"
```

Run it:
```bash
chmod +x scripts/docker-build-hub.sh
./scripts/docker-build-hub.sh yourusername 1.0.0
```

---

## Step 3: Push to Docker Hub

### Push All Images

```bash
export DOCKER_USERNAME=yourusername
export VERSION=1.0.0

# Push backend (both tags)
docker push ${DOCKER_USERNAME}/flowa-backend:${VERSION}
docker push ${DOCKER_USERNAME}/flowa-backend:latest

# Push frontend (both tags)
docker push ${DOCKER_USERNAME}/flowa-frontend:${VERSION}
docker push ${DOCKER_USERNAME}/flowa-frontend:latest
```

### Or Use Push Script

Create `scripts/docker-push-hub.sh`:
```bash
#!/bin/bash
set -e

DOCKER_USERNAME=${1:-yourusername}
VERSION=${2:-1.0.0}

echo "🚀 Pushing Flowa images to Docker Hub..."
echo "   Username: $DOCKER_USERNAME"
echo "   Version: $VERSION"

# Push backend
echo "📤 Pushing backend..."
docker push ${DOCKER_USERNAME}/flowa-backend:${VERSION}
docker push ${DOCKER_USERNAME}/flowa-backend:latest

# Push frontend
echo "📤 Pushing frontend..."
docker push ${DOCKER_USERNAME}/flowa-frontend:${VERSION}
docker push ${DOCKER_USERNAME}/flowa-frontend:latest

echo "✅ Push complete!"
echo ""
echo "Images available at:"
echo "  https://hub.docker.com/r/${DOCKER_USERNAME}/flowa-backend"
echo "  https://hub.docker.com/r/${DOCKER_USERNAME}/flowa-frontend"
```

Run it:
```bash
chmod +x scripts/docker-push-hub.sh
./scripts/docker-push-hub.sh yourusername 1.0.0
```

### Combined Build & Push

```bash
#!/bin/bash
set -e

DOCKER_USERNAME=${1:-yourusername}
VERSION=${2:-1.0.0}

echo "🔨 Building..."
docker build -t ${DOCKER_USERNAME}/flowa-backend:${VERSION} -t ${DOCKER_USERNAME}/flowa-backend:latest -f backend/Dockerfile ./backend
docker build -t ${DOCKER_USERNAME}/flowa-frontend:${VERSION} -t ${DOCKER_USERNAME}/flowa-frontend:latest -f frontend/Dockerfile ./frontend

echo "🚀 Pushing..."
docker push ${DOCKER_USERNAME}/flowa-backend:${VERSION}
docker push ${DOCKER_USERNAME}/flowa-backend:latest
docker push ${DOCKER_USERNAME}/flowa-frontend:${VERSION}
docker push ${DOCKER_USERNAME}/flowa-frontend:latest

echo "✅ Done! Images available at:"
echo "   https://hub.docker.com/r/${DOCKER_USERNAME}/flowa-backend"
echo "   https://hub.docker.com/r/${DOCKER_USERNAME}/flowa-frontend"
```

---

## Step 4: Monitor Push Progress

The push will take 2-10 minutes depending on your internet speed.

```bash
# Watch the progress
docker push yourusername/flowa-backend:latest
```

You'll see:
```
Preparing                                                             0.0B
Waiting                                                               0.0B
Pushing ▓████████▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 150.2MB/450.2MB
```

Once done:
```
1.0.0: digest: sha256:abc123... size: 1234
```

---

## Step 5: Verify on Docker Hub

1. Go to https://hub.docker.com/r/yourusername/flowa-backend
2. Click "Tags" tab
3. Should see:
   - `latest` (points to your latest build)
   - `1.0.0` (specific version)

---

## Step 6: Create Pull-Only Docker Compose

For users who just want to pull pre-built images (without building):

Create `docker-compose.pull.yml`:
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: flowa-postgres
    environment:
      POSTGRES_DB: ${DB_NAME:-flowa_db}
      POSTGRES_USER: ${DB_USER:-flowa_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-flowa_password}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-flowa_user}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - flowa-network

  redis:
    image: redis:7-alpine
    container_name: flowa-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - flowa-network

  backend:
    image: ${DOCKER_USERNAME:-yourusername}/flowa-backend:${VERSION:-latest}
    container_name: flowa-backend
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_URL: postgresql://${DB_USER:-flowa_user}:${DB_PASSWORD:-flowa_password}@postgres:5432/${DB_NAME:-flowa_db}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:-your-secret-key-change-in-production}
      API_PORT: 4000
      CORS_ORIGIN: http://localhost:3000
    ports:
      - "4000:4000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - flowa-network
    restart: unless-stopped

  frontend:
    image: ${DOCKER_USERNAME:-yourusername}/flowa-frontend:${VERSION:-latest}
    container_name: flowa-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - flowa-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  flowa-network:
    driver: bridge
```

Users can now use:
```bash
DOCKER_USERNAME=yourusername VERSION=1.0.0 docker-compose -f docker-compose.pull.yml up -d
```

---

## Step 7: Update Documentation

Update `QUICKSTART.md`:
```markdown
# Flowa Quick Start

## Option 1: Build From Source (Developer)

```bash
git clone https://github.com/yourusername/flowa-automation-platform.git
cd flowa-automation-platform
cp .env.example .env
docker-compose up -d
```

## Option 2: Pull Pre-built Images (User)

```bash
# Create directory
mkdir flowa && cd flowa

# Download compose file
wget https://raw.githubusercontent.com/yourusername/flowa/main/docker-compose.pull.yml -O docker-compose.yml
wget https://raw.githubusercontent.com/yourusername/flowa/main/.env.example -O .env

# Pull and run
DOCKER_USERNAME=yourusername VERSION=1.0.0 docker-compose up -d
```

**Access at**: http://localhost:3000
```

Update `DOCKER.md` with Docker Hub info:
```markdown
## Push to Docker Hub

### Prerequisites
- Docker Hub account at https://hub.docker.com
- Access token created at https://hub.docker.com/settings/security

### Steps

1. **Login to Docker Hub**
   ```bash
   docker login
   ```

2. **Build images**
   ```bash
   export DOCKER_USERNAME=yourusername
   export VERSION=1.0.0
   ./scripts/docker-build-hub.sh $DOCKER_USERNAME $VERSION
   ```

3. **Push to registry**
   ```bash
   ./scripts/docker-push-hub.sh $DOCKER_USERNAME $VERSION
   ```

4. **Verify**
   - Visit https://hub.docker.com/r/yourusername/flowa-backend
   - Should see tags: `latest`, `1.0.0`

### For Others to Use

```bash
# Pull and run without building
DOCKER_USERNAME=yourusername VERSION=1.0.0 docker-compose -f docker-compose.pull.yml up -d
```
```

---

## Step 8: Automate with GitHub Actions (Optional)

For automatic builds on every push, create `.github/workflows/docker-publish.yml`:

```yaml
name: Publish to Docker Hub

on:
  push:
    tags:
      - 'v*'  # Trigger on version tags like v1.0.0

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Extract version
        id: meta
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
      
      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/flowa-backend:${{ steps.meta.outputs.VERSION }}
            ${{ secrets.DOCKER_USERNAME }}/flowa-backend:latest
      
      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/flowa-frontend:${{ steps.meta.outputs.VERSION }}
            ${{ secrets.DOCKER_USERNAME }}/flowa-frontend:latest
```

Setup GitHub secrets:
1. Go to repo → Settings → Secrets and variables → Actions
2. Add `DOCKER_USERNAME` (your Docker Hub username)
3. Add `DOCKER_PASSWORD` (your Docker Hub access token)

Then tag releases:
```bash
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions will automatically build and push!
```

---

## Complete Command Reference

### Manual One-Time Setup
```bash
# 1. Login once
docker login

# 2. Build both images
docker build -t yourusername/flowa-backend:1.0.0 -t yourusername/flowa-backend:latest -f backend/Dockerfile ./backend
docker build -t yourusername/flowa-frontend:1.0.0 -t yourusername/flowa-frontend:latest -f frontend/Dockerfile ./frontend

# 3. Push both images
docker push yourusername/flowa-backend:1.0.0
docker push yourusername/flowa-backend:latest
docker push yourusername/flowa-frontend:1.0.0
docker push yourusername/flowa-frontend:latest
```

### Using Scripts (Recommended)
```bash
# Build
./scripts/docker-build-hub.sh yourusername 1.0.0

# Push
./scripts/docker-push-hub.sh yourusername 1.0.0

# Or both in one:
./scripts/docker-build-and-push.sh yourusername 1.0.0
```

### For Users to Pull & Run
```bash
# Create working directory
mkdir my-flowa && cd my-flowa

# Get docker-compose config
wget https://raw.githubusercontent.com/yourusername/flowa/main/docker-compose.pull.yml -O docker-compose.yml
wget https://raw.githubusercontent.com/yourusername/flowa/main/.env.example -O .env

# Run with specific image version
DOCKER_USERNAME=yourusername VERSION=1.0.0 docker-compose pull
docker-compose up -d

# Or use latest
DOCKER_USERNAME=yourusername docker-compose pull
docker-compose up -d
```

---

## Versioning Strategy

### Semantic Versioning
```
v1.0.0 = Major.Minor.Patch
- Major: Breaking changes (1.0.0 → 2.0.0)
- Minor: New features (1.0.0 → 1.1.0)
- Patch: Bug fixes (1.0.0 → 1.0.1)
```

### Docker Hub Tags
```
yourusername/flowa-backend:1.0.0      # Specific version
yourusername/flowa-backend:1.0        # Minor version (all 1.0.x)
yourusername/flowa-backend:1          # Major version (all 1.x.x)
yourusername/flowa-backend:latest     # Latest release
```

### Recommendation
Always push multiple tags:
```bash
docker build -t yourusername/flowa-backend:1.0.0 \
             -t yourusername/flowa-backend:1.0 \
             -t yourusername/flowa-backend:1 \
             -t yourusername/flowa-backend:latest \
             -f backend/Dockerfile ./backend

docker push yourusername/flowa-backend:1.0.0
docker push yourusername/flowa-backend:1.0
docker push yourusername/flowa-backend:1
docker push yourusername/flowa-backend:latest
```

---

## Troubleshooting

### Authentication Error
```
denied: requested access to the resource is denied
```
**Solution**: Re-login
```bash
docker logout
docker login
# Enter your username and access token (not password!)
```

### Image Not Found After Push
```
Error response from daemon: manifest not found
```
**Solution**: Make sure image exists locally
```bash
docker images | grep flowa-
```

### Slow Push
- Check internet speed
- Try pushing during off-peak hours
- Compress image with `docker build --compress`

### Docker Hub Rate Limit
For frequent pulls (>100 per 6 hours):
1. Login before pulling: `docker login`
2. Or use private repositories
3. Or use alternative registry (AWS ECR, Google Container Registry)

---

## Storage & Limits

### Docker Hub Free Plan
- Unlimited public repositories
- 1 private repository
- 20GB data push per day
- 100 pulls per 6 hours (per IP)

### If You Hit Limits
1. Delete old versions: Docker Hub → Repository → Tags → Delete
2. Use different registry (AWS ECR, GitHub Container Registry)
3. Upgrade to Docker Hub Pro ($5/month)

---

## Best Practices

✅ **DO**:
- Tag versions semantically (1.0.0, 1.1.0, 2.0.0)
- Always tag `latest` for current version
- Write comprehensive README on Docker Hub
- Add image labels for documentation
- Test images before pushing
- Keep image sizes small (use Alpine base)

❌ **DON'T**:
- Push every build to `latest` (reserve for stable releases)
- Use generic tags like `v1` alone (use 1.0.0, 1.0, 1, latest)
- Delete versions that users depend on
- Push debug/test builds to Docker Hub
- Store secrets in images
- Use `root` user in containers

---

## Image Labels (Optional Enhancement)

Add to Dockerfile for better documentation:

```dockerfile
LABEL maintainer="your-email@example.com"
LABEL description="Flowa - AI-native workflow automation platform"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/yourusername/flowa"
```

Then on Docker Hub, these show up in image info.

---

## Next Steps

1. ✅ Create Docker Hub account
2. ✅ Create access token
3. ✅ Login locally: `docker login`
4. ✅ Build images: `./scripts/docker-build-hub.sh yourusername 1.0.0`
5. ✅ Push images: `./scripts/docker-push-hub.sh yourusername 1.0.0`
6. ✅ Verify on https://hub.docker.com/r/yourusername/flowa-backend
7. ✅ Update documentation
8. ✅ Share pull commands with users

---

## References

- Docker Hub: https://hub.docker.com
- Docker CLI Docs: https://docs.docker.com/engine/reference/commandline/push/
- GitHub Actions: https://github.com/features/actions
- Image Security: https://docs.docker.com/engine/security/
