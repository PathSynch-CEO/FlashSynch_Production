# FlashSynch Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PRODUCTION                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────┐         ┌──────────────────┐         │
│   │  AWS Amplify     │         │  AWS EC2         │         │
│   │  (Frontend)      │  ─────> │  (Backend API)   │         │
│   │                  │         │                  │         │
│   │ flashsynch.com   │         │ api.flashsynch.com│        │
│   └──────────────────┘         └──────────────────┘         │
│                                        │                     │
│                                        ▼                     │
│                              ┌──────────────────┐            │
│                              │  MongoDB Atlas   │            │
│                              │  (Database)      │            │
│                              └──────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- AWS Account with Amplify and EC2 access
- Domain: flashsynch.com (configured in Route 53 or your DNS provider)
- MongoDB Atlas account (already configured)
- SendGrid account (already configured)
- Firebase project (already configured)

---

## Part 1: Backend Deployment (AWS EC2)

### Step 1: Launch EC2 Instance

1. Go to AWS EC2 Console
2. Launch instance:
   - **AMI**: Ubuntu 22.04 LTS
   - **Instance type**: t3.small (or t3.micro for testing)
   - **Storage**: 20GB gp3
   - **Security Group**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

3. Create/assign an Elastic IP to your instance

### Step 2: Configure DNS

Add these DNS records for flashsynch.com:
```
A    api.flashsynch.com    →  [Your EC2 Elastic IP]
```

### Step 3: SSH into EC2 and Setup

```bash
ssh -i your-key.pem ubuntu@[EC2-IP]

# Clone the repo
git clone [your-repo-url] /home/ubuntu/flashsynch
cd /home/ubuntu/flashsynch/server

# Run setup script
chmod +x ec2-setup.sh
./ec2-setup.sh
```

### Step 4: Configure Application

```bash
cd /home/ubuntu/flashsynch/server

# Copy environment file
cp .env.production .env

# Copy Firebase credentials
# Upload your firebase-service-account.json to this directory

# Install dependencies
npm ci

# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs --env production
pm2 save
```

### Step 5: Configure Nginx & SSL

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/flashsynch-api
sudo ln -s /etc/nginx/sites-available/flashsynch-api /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Get SSL certificate
sudo certbot --nginx -d api.flashsynch.com

# Reload nginx
sudo systemctl reload nginx
```

### Step 6: Verify Backend

```bash
curl https://api.flashsynch.com/api/health
# Should return: {"status":"ok","timestamp":"...","dbConnected":true}
```

---

## Part 2: Frontend Deployment (AWS Amplify)

### Step 1: Create Amplify App

1. Go to AWS Amplify Console
2. Click "Create new app"
3. Choose "Host web app"
4. Connect your Git repository (GitHub, GitLab, etc.)
5. Select the repository and branch (main)

### Step 2: Configure Build Settings

Amplify should auto-detect the `amplify.yml` file. If not, use:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd web
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: web/dist
    files:
      - '**/*'
  cache:
    paths:
      - web/node_modules/**/*
```

### Step 3: Configure Environment Variables

In Amplify Console → App Settings → Environment Variables:

```
VITE_API_URL = https://api.flashsynch.com/api
VITE_FIREBASE_API_KEY = AIzaSyBYHbfPJdQP3x4MBG8X7T755cQDoqhLdC0
VITE_FIREBASE_AUTH_DOMAIN = pathsynch1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = pathsynch1
```

### Step 4: Configure Domain

1. Go to Amplify → Domain management
2. Add domain: flashsynch.com
3. Configure subdomains:
   - `flashsynch.com` → main branch
   - `www.flashsynch.com` → redirect to flashsynch.com

4. Amplify will provide DNS records to add to your domain registrar

### Step 5: Deploy

Push to your main branch - Amplify will auto-deploy.

---

## Part 3: Post-Deployment Checklist

### SendGrid Domain Verification

1. Go to SendGrid → Settings → Sender Authentication
2. Authenticate your domain: flashsynch.com
3. Add the DNS records SendGrid provides

### Firebase Auth Domain

1. Go to Firebase Console → Authentication → Settings
2. Add authorized domain: flashsynch.com

### MongoDB Atlas IP Whitelist

1. Go to MongoDB Atlas → Network Access
2. Add your EC2 Elastic IP to the whitelist
   (Or use 0.0.0.0/0 for any IP - less secure)

---

## Maintenance Commands

### Backend (EC2)

```bash
# View logs
pm2 logs flashsynch-api

# Restart app
pm2 restart flashsynch-api

# Update deployment
cd /home/ubuntu/flashsynch/server
git pull
npm ci
npm run build
pm2 reload flashsynch-api

# View nginx logs
sudo tail -f /var/log/nginx/flashsynch-api.error.log
```

### Frontend (Amplify)

- Push to main branch to trigger deploy
- Or manually redeploy from Amplify Console

---

## Troubleshooting

### Backend not responding
```bash
pm2 status
pm2 logs flashsynch-api --lines 50
```

### SSL certificate issues
```bash
sudo certbot renew --dry-run
```

### MongoDB connection issues
- Check EC2 security group allows outbound
- Verify IP is whitelisted in MongoDB Atlas
- Check connection string in .env

### CORS errors
- Verify FRONTEND_URL in server .env
- Check Nginx headers
- Clear browser cache
