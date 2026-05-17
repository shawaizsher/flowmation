#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOCKER_USERNAME="${DOCKER_USERNAME:-yourdockerusername}"
VERSION="${VERSION:-latest}"

if [ "$DOCKER_USERNAME" = "yourdockerusername" ]; then
  echo -e "${RED}Error: Set DOCKER_USERNAME environment variable${NC}"
  exit 1
fi

echo -e "${YELLOW}Building Flowa images...${NC}"
docker build -t $DOCKER_USERNAME/flowa-backend:$VERSION -t $DOCKER_USERNAME/flowa-backend:latest -f backend/Dockerfile ./backend
echo -e "${GREEN}Backend built${NC}"

docker build -t $DOCKER_USERNAME/flowa-frontend:$VERSION -t $DOCKER_USERNAME/flowa-frontend:latest -f frontend/Dockerfile ./frontend
echo -e "${GREEN}Frontend built${NC}"

echo -e "${GREEN}Done! Images ready${NC}"
docker images | grep flowa-
