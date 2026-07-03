#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOCKER_USERNAME="${DOCKER_USERNAME:-yourdockerusername}"
VERSION="${VERSION:-latest}"

if [ "$DOCKER_USERNAME" = "yourdockerusername" ]; then
  echo -e "${RED}Error: Set DOCKER_USERNAME${NC}"
  exit 1
fi

echo -e "${YELLOW}Login to Docker Hub...${NC}"
docker login

echo -e "${YELLOW}Pushing images...${NC}"
docker push $DOCKER_USERNAME/fluxion-backend:$VERSION
docker push $DOCKER_USERNAME/fluxion-backend:latest
docker push $DOCKER_USERNAME/fluxion-frontend:$VERSION
docker push $DOCKER_USERNAME/fluxion-frontend:latest

echo -e "${GREEN}Images pushed!${NC}"
echo "Visit: https://hub.docker.com/r/$DOCKER_USERNAME"
