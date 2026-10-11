#!/bin/bash

# Comprehensive cleanup script for E2E test artifacts

set -e

echo "Cleaning up all E2E test artifacts..."

# Stop and remove containers
CONTAINERS=$(docker ps -a --filter "name=3proxy-e2e" --filter "name=3proxy-ui-e2e" --format "{{.Names}}")
if [ -n "$CONTAINERS" ]; then
    echo "Stopping and removing containers:"
    echo "$CONTAINERS"
    docker rm -f $CONTAINERS 2>/dev/null || true
fi

# Remove compose project (covers containers, networks and named volumes)
docker compose -p 3proxy-e2e-test -f "$(dirname "$0")/docker-compose.e2e.yml" down -v --remove-orphans 2>/dev/null || true

# Remove volumes left from older compose layouts
VOLUMES=$(docker volume ls --filter "name=e2e" --format "{{.Name}}")
if [ -n "$VOLUMES" ]; then
    echo "Removing volumes:"
    echo "$VOLUMES"
    docker volume rm -f $VOLUMES 2>/dev/null || true
fi

# Clean up test database files
echo "Cleaning up test database files..."
rm -f data/test*.db 2>/dev/null || true
rm -rf dist/tests/e2e 2>/dev/null || true

# Runtime logs and credentials written into the 3proxy fixture
rm -f test-fixtures/3proxy/logs/*.log 2>/dev/null || true
rm -f test-fixtures/3proxy/users/.proxyauth 2>/dev/null || true

echo "✅ Cleanup complete"
