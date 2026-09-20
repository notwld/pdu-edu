#!/bin/bash

# Portal PDU Docker Production Deployment Script
# This script handles containerized deployment with zero-downtime

set -e

echo "🐳 Starting Portal PDU Docker Production Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed."
    exit 1
fi

# Generate a unique tag for this deployment
TAG=$(date +%Y%m%d_%H%M%S)
IMAGE_NAME="portal-pdu:$TAG"

print_step "Building Docker image: $IMAGE_NAME"
docker build -t $IMAGE_NAME .

print_step "Tagging as latest"
docker tag $IMAGE_NAME portal-pdu:latest

print_status "Docker image built successfully!"

# Check if there's an existing container running
if docker ps -q -f name=portal-pdu-app | grep -q .; then
    print_step "Performing zero-downtime deployment..."

    # Start new container
    print_status "Starting new container..."
    docker run -d --name portal-pdu-app-new \
        --env-file .env \
        -p 3001:3000 \
        --network portal-pdu_app-network \
        $IMAGE_NAME

    # Wait for new container to be ready
    print_status "Waiting for new container to be ready..."
    sleep 30

    # Check if new container is healthy
    if docker ps -q -f name=portal-pdu-app-new | grep -q .; then
        print_status "New container is running. Switching traffic..."

        # Stop old container
        docker stop portal-pdu-app
        docker rm portal-pdu-app

        # Rename new container
        docker rename portal-pdu-app-new portal-pdu-app

        print_status "Traffic switched successfully!"
    else
        print_error "New container failed to start properly"
        docker stop portal-pdu-app-new
        docker rm portal-pdu-app-new
        exit 1
    fi
else
    print_step "Starting initial deployment..."

    # Start the application
    docker run -d --name portal-pdu-app \
        --env-file .env \
        -p 3000:3000 \
        --network portal-pdu_app-network \
        $IMAGE_NAME

    print_status "Application started successfully!"
fi

print_status "Cleaning up old Docker images..."
docker image prune -f

print_status "Deployment completed successfully! 🎉"
print_status "Application is running with PM2 in Docker container."

echo ""
print_status "Useful Docker commands:"
echo "  docker ps                    - Check container status"
echo "  docker logs portal-pdu-app   - View application logs"
echo "  docker exec -it portal-pdu-app pm2 monit - Monitor application"
echo "  docker restart portal-pdu-app - Restart container"
echo "  docker stop portal-pdu-app   - Stop container"
