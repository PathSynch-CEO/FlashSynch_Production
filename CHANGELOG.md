# FlashSynch Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### In Progress
- AWS Amplify custom domain SSL verification for www.flashsynch.com

---

## [1.5.0] - 2026-02-24

### Added
- Root-level `amplify.yml` for monorepo build configuration
- Amplify builds now correctly target `web/` directory with `appRoot: web`

### Fixed
- **Amplify Build Failure**: Previous builds failed because `amplify.yml` was in `web/` directory but Amplify expected it at repo root. Moved configuration to repo root with proper `appRoot` setting.

### Infrastructure
- **AWS Amplify**: Frontend deployed at `main.dos4r14t74stf.amplifyapp.com`
- **AWS EC2**: Backend API running at `api.flashsynch.com` (3.222.11.163)
- **MongoDB Atlas**: Connected and operational
- **Firebase Auth**: Configured with project `pathsynch1`

### DNS Configuration (IONOS)
- `www.flashsynch.com` → CNAME → `d1r22nwau5vovz.cloudfront.net` (Amplify/CloudFront)
- `api.flashsynch.com` → A → `3.222.11.163` (EC2)
- `flashsynch.com` → HTTP redirect → `https://www.flashsynch.com` (IONOS forwarding)
- SSL verification CNAME added for ACM certificate validation

### Notes
- Root domain (`flashsynch.com`) uses IONOS redirect because IONOS doesn't support ANAME/ALIAS records
- Amplify configured with `www.flashsynch.com` only (excluded root domain)
- SSL certificate issuance pending completion

---

## [1.4.0] - 2026-02-22

### Weekend 5: Production Readiness

#### Added
- AWS Amplify configuration (`web/amplify.yml`)
- PM2 ecosystem configuration for EC2 deployment
- Nginx reverse proxy configuration with SSL
- EC2 setup and deployment scripts
- SendGrid email integration for invitations and lead notifications
- Production environment files and CORS configuration
- `DEPLOYMENT.md` documentation

---

## [1.3.0] - 2026-02-15

### Weekend 4: Team Features

#### Added
- Organization API (`/api/orgs/*`)
- Invitation system with email notifications
- Member management (roles: owner, admin, member)
- Team dashboard with analytics and leaderboard
- Invitation acceptance flow

---

## [1.2.0] - 2026-02-08

### Weekend 3: Dashboard UI

#### Added
- Firebase Auth integration (email/password)
- Dashboard layout with responsive sidebar
- Card management (CRUD, search, filter)
- Card editor with tabs (Profile, Links, Theme)
- Contact management with pagination and CSV export
- Analytics dashboard with charts (Recharts)
- Settings page with profile and billing sections

---

## [1.1.0] - 2026-02-01

### Weekend 2: Public Card Page

#### Added
- React + Vite + Tailwind CSS frontend
- Mobile-optimized public card page (`/c/:slug`)
- Theme support (modern, classic, minimal, bold)
- Lead capture modal with form validation
- QR code display with download and share
- vCard generation and download
- Dynamic Open Graph meta tags

---

## [1.0.0] - 2026-01-25

### Weekend 1: Backend API

#### Added
- Express.js API with TypeScript
- MongoDB Atlas integration with Mongoose
- Firebase Admin SDK authentication
- User registration and profile management
- Card CRUD with auto-generated slugs
- Lead capture and contact management
- Analytics tracking (views, clicks, captures)
- RevenueCat webhook handling
- Zod request validation
- QRsynch service integration (pending API key)

---

## Infrastructure

### Production URLs
- **Frontend**: https://www.flashsynch.com (pending SSL)
- **Backend API**: https://api.flashsynch.com
- **Amplify Preview**: https://main.dos4r14t74stf.amplifyapp.com

### Services
- **Database**: MongoDB Atlas (cluster: PathConnect1, db: flashsynch)
- **Auth**: Firebase (project: pathsynch1)
- **Email**: SendGrid
- **Hosting**: AWS Amplify (frontend) + EC2 (backend)
