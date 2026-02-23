#!/bin/bash
# FlashSynch EC2 Initial Setup Script
# Run this once on a fresh Ubuntu EC2 instance

set -e

echo "🚀 FlashSynch EC2 Setup"
echo "======================="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node installation
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install PM2 globally
echo "Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "Installing Nginx..."
sudo apt install -y nginx

# Install Certbot for SSL
echo "Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create app directory
echo "Creating app directory..."
sudo mkdir -p /home/ubuntu/flashsynch
sudo chown -R ubuntu:ubuntu /home/ubuntu/flashsynch

# Install Git
sudo apt install -y git

# Configure firewall
echo "Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Setup PM2 to start on boot
echo "Configuring PM2 startup..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "✅ EC2 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Clone your repo to /home/ubuntu/flashsynch"
echo "2. Copy firebase-service-account.json to server/"
echo "3. Copy .env.production to .env and verify settings"
echo "4. Run: cd server && npm ci && npm run build"
echo "5. Run: pm2 start ecosystem.config.cjs --env production"
echo "6. Setup Nginx: sudo cp nginx.conf /etc/nginx/sites-available/flashsynch-api"
echo "7. Enable site: sudo ln -s /etc/nginx/sites-available/flashsynch-api /etc/nginx/sites-enabled/"
echo "8. Get SSL cert: sudo certbot --nginx -d api.flashsynch.com"
echo "9. Reload Nginx: sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "DNS Setup Required:"
echo "  - A record: api.flashsynch.com -> [Your EC2 Elastic IP]"
