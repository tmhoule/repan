#!/bin/bash
# Production deployment script for rsync'd directories
# Requires: docker, docker-compose (or docker compose)

set -e

echo "=== Repan Production Deployment (rsync mode) ==="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose or docker compose is available
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose -f docker-compose.yml -f docker-compose.prod.yml"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
else
    echo "Error: docker-compose is not available. Please install docker-compose."
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created. Please review and update if needed."
    echo ""
    echo "IMPORTANT: Review .env settings before continuing!"
    echo "Press Enter to continue after reviewing .env, or Ctrl+C to exit."
    read -r
fi

# Stop existing containers
echo "Stopping existing containers..."
$DOCKER_COMPOSE down

# Build and start containers
echo "Building and starting containers..."
$DOCKER_COMPOSE up -d --build

# Wait for application to be ready
echo "Waiting for application to start..."
sleep 5

# Check if containers are running
if $DOCKER_COMPOSE ps | grep -q "Up"; then
    echo ""
    echo "✓ Deployment successful!"
    echo ""
    echo "Application is running at:"
    echo "  http://localhost:3000"
    echo ""
    echo "Note: App binds to localhost only for security."
    echo "Use SSH tunnel or reverse proxy for external access."
    echo "See DEPLOYMENT.md for details."
    echo ""
    echo "To view logs:"
    echo "  $DOCKER_COMPOSE logs -f"
    echo ""
    echo "To stop:"
    echo "  $DOCKER_COMPOSE down"
else
    echo ""
    echo "✗ Deployment may have failed. Check logs:"
    echo "  $DOCKER_COMPOSE logs"
    exit 1
fi
