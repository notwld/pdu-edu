#!/bin/bash

# Portal PDU Production Deployment Script
# This script handles zero-downtime deployment using PM2

set -e

echo "🚀 Starting Portal PDU Production Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed. Please install it first:"
    echo "npm install -g pm2"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed."
    exit 1
fi

# Check if production environment file exists
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Using production.env.example as template."
    if [ -f "production.env.example" ]; then
        cp production.env.example .env
        print_warning "Please update the .env file with your production values before running this script again."
        exit 1
    else
        print_error "No environment file found. Please create a .env file."
        exit 1
    fi
fi

print_status "Installing dependencies..."
npm ci

print_status "Building application..."
npm run build

print_status "Running database migrations..."
npx prisma db push

print_status "Starting application with PM2..."
if pm2 describe portal-pdu > /dev/null 2>&1; then
    print_status "Reloading existing application (zero-downtime)..."
    pm2 reload ecosystem.config.js --env production
else
    print_status "Starting new application..."
    pm2 start ecosystem.config.js --env production
fi

print_status "Saving PM2 configuration..."
pm2 save

print_status "Deployment completed successfully! 🎉"
print_status "Application is running with zero-downtime deployment and auto-restart enabled."

echo ""
print_status "Useful PM2 commands:"
echo "  pm2 status                 - Check application status"
echo "  pm2 logs                    - View application logs"
echo "  pm2 monit                   - Monitor application"
echo "  pm2 restart portal-pdu      - Restart application"
echo "  pm2 stop portal-pdu         - Stop application"
echo "  pm2 delete portal-pdu       - Delete application from PM2"
