#!/bin/bash
# Clean deployment script for repanttt.llan.ll.mit.edu
# Run this after rsync'ing the code to /home/to26409/repan

set -e

echo "=== Repan Clean Deployment ==="
echo ""

# Navigate to project directory
cd /home/to26409/repan

# Clean up any old Docker volumes and images
echo "Cleaning up old Docker resources..."
docker volume prune -f
docker image prune -f

# Create .env from example if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi

# Build and start containers
echo ""
echo "Building and starting containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Wait for containers to start
echo ""
echo "Waiting for containers to start..."
sleep 10

# Check status
echo ""
echo "Checking container status..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Show logs
echo ""
echo "Recent logs:"
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=20

echo ""
echo "==================================="
echo "✓ Deployment complete!"
echo ""
echo "Application running at: http://localhost:3000"
echo ""
echo "To view live logs:"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo ""
echo "To stop:"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml down"
echo "==================================="
