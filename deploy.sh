#!/bin/bash
# Production deployment script for servers without npm/node
# Requires: docker, docker-compose (or docker compose), git

set -e

echo "=== Repan Production Deployment ==="
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

# Pull latest code
echo "Pulling latest code from GitHub..."
if [ -d ".git" ]; then
    git pull origin main
else
    echo "Error: Not a git repository. Please clone the repo first:"
    echo "  git clone https://github.com/tmhoule/repan.git"
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created. Please review and update if needed."
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
    
    # Try to get server IP
    SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -n "$SERVER_IP" ]; then
        echo "  http://${SERVER_IP}:3000"
    fi
    
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
