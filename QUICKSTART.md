# Fluxion Docker Quickstart

Get Fluxion running in 5 minutes!

## Prerequisites

- Docker Desktop installed
- Docker Hub account (free)

## Quick Setup

### 1. Clone & Setup (2 minutes)

```bash
git clone https://github.com/yourusername/fluxion-automation-platform.git
cd fluxion-automation-platform
cp .env.example .env
```

### 2. Build Images (3 minutes)

```bash
DOCKER_USERNAME=yourusername VERSION=1.0.0 ./scripts/docker-build.sh
```

### 3. Run Locally (instant)

```bash
docker-compose up -d
```

**Done!** Access at http://localhost:3000

### 4. Push to Docker Hub (optional)

```bash
DOCKER_USERNAME=yourusername VERSION=1.0.0 ./scripts/docker-push.sh
```

## What's Running

- Frontend: http://localhost:3000 (React)
- Backend: http://localhost:4000 (Node.js API)
- Database: PostgreSQL on port 5432
- Cache: Redis on port 6379

## Stop Everything

```bash
docker-compose down
```

## Next Steps

- See DOCKER.md for detailed documentation
- Configure .env for your setup
- Deploy to production with docker-compose.prod.yml

## Troubleshooting

```bash
# View logs
docker-compose logs -f backend

# Reset database
docker-compose down -v && docker-compose up -d

# Check containers
docker-compose ps
```

For more help, see DOCKER.md or contact us at github.com/yourusername/fluxion
