#!/bin/bash

# Comprehensive cleanup script for E2E test artifacts

set -e

echo "Cleaning up all E2E test artifacts..."

# Stop and remove containers
CONTAINERS=$(docker ps -a --filter "name=3proxy-ui-e2e" --format "{{.Names}}")
if [ -n "$CONTAINERS" ]; then
    echo "Stopping and removing containers:"
    echo "$CONTAINERS"
    docker rm -f $CONTAINERS 2>/dev/null || true
fi

# Remove test images
IMAGES=$(docker images --filter "reference=3proxy-ui:e2e*" --format "{{.Repository}}:{{.Tag}}")
if [ -n "$IMAGES" ]; then
    echo "Removing test images:"
    echo "$IMAGES"
    docker rmi -f $IMAGES 2>/dev/null || true
fi

# Remove volumes
VOLUMES=$(docker volume ls --filter "name=e2e*" --format "{{.Name}}")
if [ -n "$VOLUMES" ]; then
    echo "Removing volumes:"
    echo "$VOLUMES"
    docker volume rm -f $VOLUMES 2>/dev/null || true
fi

# Clean up test database files
echo "Cleaning up test database files..."
rm -f data/test*.db 2>/dev/null || true
rm -rf dist/tests/e2e 2>/dev/null || true

echo "✅ Cleanup complete"
