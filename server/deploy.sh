#!/bin/bash
# FlashSynch API Deployment Script for EC2
# Run this on your EC2 instance

set -e

echo "🚀 FlashSynch API Deployment"
echo "============================"

# Configuration
APP_DIR="/home/ubuntu/flashsynch/server"
REPO_URL="your-git-repo-url"  # Update this

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as correct user
if [ "$EUID" -eq 0 ]; then
    print_error "Don't run as root. Run as ubuntu user."
    exit 1
fi

# Navigate to app directory
cd $APP_DIR

# Pull latest code
print_status "Pulling latest code..."
git pull origin main

# Install dependencies
print_status "Installing dependencies..."
npm ci --production=false

# Build TypeScript
print_status "Building TypeScript..."
npm run build

# Create logs directory
mkdir -p logs

# Copy production env if needed
if [ ! -f .env ]; then
    if [ -f .env.production ]; then
        cp .env.production .env
        print_warning "Copied .env.production to .env - please verify settings"
    else
        print_error "No .env file found! Create one from .env.example"
        exit 1
    fi
fi

# Restart with PM2
print_status "Restarting application with PM2..."
pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production

# Save PM2 configuration
pm2 save

print_status "Deployment complete!"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs            - View logs"
echo "  pm2 monit           - Monitor resources"
echo "  pm2 restart all     - Restart all apps"
