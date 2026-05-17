#!/bin/bash
set -e

# Script to build Flowa Docker image (consolidated - backend + frontend)
# Usage: ./scripts/docker-build-hub.sh yourusername 1.0.0

DOCKER_USERNAME=${1:-yourusername}
VERSION=${2:-latest}

echo "════════════════════════════════════════════════════════════"
echo "🔨 Building Flowa Docker Image (Backend + Frontend)"
echo "════════════════════════════════════════════════════════════"
echo "Username: $DOCKER_USERNAME"
echo "Version: $VERSION"
echo ""

# Verify Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Verify we're in the right directory
if [ ! -f "Dockerfile" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Must run from project root directory"
    echo "   (Dockerfile, backend/, and frontend/ not found)"
    exit 1
fi

echo "✅ Found project structure"
echo ""

# Build consolidated image
echo "────────────────────────────────────────────────────────────"
echo "📦 Building Consolidated Image"
echo "────────────────────────────────────────────────────────────"
echo "Building ${DOCKER_USERNAME}/flowa:${VERSION}..."
echo ""

docker build \
    --tag ${DOCKER_USERNAME}/flowa:${VERSION} \
    --tag ${DOCKER_USERNAME}/flowa:latest \
    --file Dockerfile \
    .

if [ $? -eq 0 ]; then
    echo "✅ Image built successfully"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Build Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Image created:"
docker images | grep ${DOCKER_USERNAME}/flowa: || true
echo ""
echo "Next steps:"
echo "  1. Test locally (optional):"
echo "     docker-compose up -d"
echo "  2. Push to Docker Hub:"
echo "     ./scripts/docker-push-hub.sh ${DOCKER_USERNAME} ${VERSION}"
echo "  3. Verify on Docker Hub:"
echo "     https://hub.docker.com/r/${DOCKER_USERNAME}/flowa"
echo ""
