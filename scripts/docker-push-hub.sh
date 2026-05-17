#!/bin/bash
set -e

# Script to push Flowa Docker image to Docker Hub
# Usage: ./scripts/docker-push-hub.sh yourusername 1.0.0

DOCKER_USERNAME=${1:-yourusername}
VERSION=${2:-latest}

echo "════════════════════════════════════════════════════════════"
echo "🚀 Pushing Flowa Docker Image to Docker Hub"
echo "════════════════════════════════════════════════════════════"
echo "Username: $DOCKER_USERNAME"
echo "Version: $VERSION"
echo ""

# Verify Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Check if user is logged in
if ! docker info > /dev/null 2>&1; then
    echo "❌ Not logged into Docker Hub"
    echo "   Run: docker login"
    exit 1
fi

echo "✅ Docker authenticated"
echo ""

# Verify image exists locally
echo "Checking if image exists locally..."
if ! docker images | grep -q "${DOCKER_USERNAME}/flowa"; then
    echo "❌ Image not found: ${DOCKER_USERNAME}/flowa"
    echo "   Run first: ./scripts/docker-build-hub.sh ${DOCKER_USERNAME} ${VERSION}"
    exit 1
fi

echo "✅ Found image"
echo ""

# Push image
echo "────────────────────────────────────────────────────────────"
echo "📤 Pushing Image to Docker Hub"
echo "────────────────────────────────────────────────────────────"

echo "Pushing ${DOCKER_USERNAME}/flowa:${VERSION}..."
docker push ${DOCKER_USERNAME}/flowa:${VERSION}

echo ""
echo "Pushing ${DOCKER_USERNAME}/flowa:latest..."
docker push ${DOCKER_USERNAME}/flowa:latest

echo "✅ Image pushed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "✅ Push Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Image now available at Docker Hub:"
echo "  https://hub.docker.com/r/${DOCKER_USERNAME}/flowa"
echo ""
echo "For others to use this image:"
echo "  DOCKER_USERNAME=${DOCKER_USERNAME} VERSION=${VERSION} docker-compose -f docker-compose.pull.yml up -d"
echo ""
