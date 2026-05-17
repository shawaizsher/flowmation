# 🚀 Docker Quick Reference Card

**Print this page or bookmark it!**

---

## 🎯 The 3-Step Process

```
1. Login to Docker Hub     (docker login)
2. Build & Push Images     (./scripts/docker-push-hub.sh yourusername 1.0.0)
3. Share with Others       (DOCKER_USERNAME=you docker-compose -f docker-compose.pull.yml up -d)
```

---

## 🔐 Setup (One Time)

```bash
# 1. Create account at https://hub.docker.com/signup

# 2. Create token at https://hub.docker.com/settings/security

# 3. Login locally
docker login
# Username: yourusername
# Password: (paste token, NOT password)

# 4. Verify
docker info | grep Username
```

---

## 🔨 Build & Push (Per Release)

```bash
# Set username
export DOCKER_USERNAME=yourusername
export VERSION=1.0.0

# Option A: Use scripts (recommended)
./scripts/docker-build-hub.sh $DOCKER_USERNAME $VERSION
./scripts/docker-push-hub.sh $DOCKER_USERNAME $VERSION

# Option B: Manual
docker build -t $DOCKER_USERNAME/flowa:$VERSION -t $DOCKER_USERNAME/flowa:latest .
docker push $DOCKER_USERNAME/flowa:$VERSION
docker push $DOCKER_USERNAME/flowa:latest

# Verify on Docker Hub
open https://hub.docker.com/r/$DOCKER_USERNAME/flowa
```

---

## 👥 Share with Users

**Option 1: One-liner (simplest)**
```bash
DOCKER_USERNAME=yourusername docker-compose -f docker-compose.pull.yml up -d
# Access at http://localhost:4000
```

**Option 2: GitHub-based**
```bash
mkdir my-flowa && cd my-flowa
wget https://raw.githubusercontent.com/yourusername/flowa/main/docker-compose.pull.yml -O docker-compose.yml
wget https://raw.githubusercontent.com/yourusername/flowa/main/.env.example -O .env
DOCKER_USERNAME=yourusername docker-compose up -d
```

**Option 3: Create wrapper script**
```bash
#!/bin/bash
# Save as docker-run.sh
DOCKER_USERNAME=yourusername docker-compose -f docker-compose.pull.yml "$@"
```

Users then run:
```bash
./docker-run.sh up -d
./docker-run.sh logs -f
./docker-run.sh down
```

---

## 📦 Common Commands

| Task | Command |
|------|---------|
| **Test locally (build)** | `docker-compose up -d` |
| **Test pull version** | `docker-compose -f docker-compose.pull.yml up -d` |
| **View logs** | `docker-compose logs -f backend` |
| **Stop services** | `docker-compose down` |
| **Reset everything** | `docker-compose down -v && docker-compose up -d` |
| **Check images** | `docker images \| grep flowa-` |
| **Push to Hub** | `./scripts/docker-push-hub.sh you 1.0.0` |

---

## 🔍 Troubleshooting

| Problem | Solution |
|---------|----------|
| **"denied: unauthorized"** | `docker logout && docker login` |
| **"Image not found"** | Run `docker build` and `docker push` first |
| **"Port already in use"** | `lsof -i :3000` then `kill -9 <PID>` |
| **"Database won't start"** | `docker-compose down -v && docker-compose up -d` |
| **"Connection refused"** | Wait 10-15 seconds for services to start |

---

## 📋 Pre-Push Checklist

- [ ] `docker login` successful
- [ ] Local images build without errors
- [ ] `docker-compose up -d` works
- [ ] Can register user via API
- [ ] Frontend loads at http://localhost:3000
- [ ] Backend responds at http://localhost:4000
- [ ] `docker push` completes without errors
- [ ] Images visible at docker.hub.com

---

## 🔄 Version Updates

```bash
# 1. Update code, commit to git
git commit -m "feature: add X"

# 2. Tag release
git tag v1.1.0
git push origin v1.1.0

# 3. Build new version
./scripts/docker-build-hub.sh yourusername 1.1.0

# 4. Push to Docker Hub
./scripts/docker-push-hub.sh yourusername 1.1.0

# 5. Users update
DOCKER_USERNAME=yourusername VERSION=1.1.0 docker-compose pull
docker-compose up -d
```

---

## 📝 Environment Variables

```env
# For building/pushing
DOCKER_USERNAME=yourusername      # Your Docker Hub username
VERSION=1.0.0                      # Semantic version

# For .env file
DB_USER=flowa_user
DB_PASSWORD=your_password          # CHANGE THIS!
JWT_SECRET=your_secret             # CHANGE THIS!
API_URL=http://localhost:4000      # Change if not localhost
WS_URL=ws://localhost:4000         # Change if not localhost
```

---

## 🎯 3-File Strategy

| File | Purpose | When to Use |
|------|---------|------------|
| `docker-compose.yml` | Build from source | Development |
| `docker-compose.pull.yml` | Pull pre-built | For users |
| `docker-compose.prod.yml` | Production setup | Production |

---

## 📚 Documentation Map

| Document | When to Read |
|----------|-------------|
| QUICKSTART.md | First time setup |
| DOCKER.md | Detailed guide |
| DOCKER_HUB_DEPLOYMENT.md | Publishing to Docker Hub |
| DOCKER_COMPOSE_GUIDE.md | Choosing the right compose file |
| DOCKER_ISSUES.md | Troubleshooting problems |
| DOCKER_SETUP_COMPLETE.md | Current system status |

---

## ⚡ TL;DR - The Fast Track

```bash
# Step 1: Setup Docker Hub
docker login  # Use token from hub.docker.com/settings/security

# Step 2: Build & Push (per release)
./scripts/docker-build-hub.sh yourusername 1.0.0
./scripts/docker-push-hub.sh yourusername 1.0.0

# Step 3: Share with users (single command)
DOCKER_USERNAME=yourusername docker-compose -f docker-compose.pull.yml up -d
# App ready at http://localhost:4000
```

---

## 🆘 Need Help?

1. **Check logs**: `docker-compose logs backend`
2. **Check containers**: `docker-compose ps`
3. **Check images**: `docker images | grep flowa-`
4. **Read docs**: See DOCKER_ISSUES.md
5. **Reset**: `docker-compose down -v && docker-compose up -d`

---

## ✅ Success = Users Can Do This

```bash
mkdir my-app && cd my-app
DOCKER_USERNAME=yourusername docker-compose -f docker-compose.pull.yml up -d
# Opens http://localhost:4000
# Frontend loads
# API works
# Database initialized
# Everything working with single image!
```

---

**Print this → Keep it → Use it!** 🎉
