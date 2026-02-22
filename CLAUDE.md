# FlashSynch Project Context

## Overview
FlashSynch is a mobile-first digital business card platform designed as a PLG (Product-Led Growth) entry point for the PathSynch B2B ecosystem.

## Tech Stack

### Backend (server/)
- **Runtime**: Node.js 20+
- **Framework**: Express.js 4.x
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Auth**: Firebase Admin SDK (verify ID tokens)
- **Validation**: Zod
- **Short Links**: QRsynch API integration
- **Payments**: RevenueCat webhooks

### Shared Package (packages/shared/)
- TypeScript types shared between frontend and backend
- Constants (plan tiers, link types, theme presets)
- Utils (vCard generator)

## MongoDB Schema

### User Collection
```javascript
{
  _id: ObjectId,
  firebaseUid: String (unique, indexed),
  email: String (unique),
  displayName: String,
  handle: String (unique, indexed), // e.g., "john-doe", "john-doe-2"
  avatarUrl: String?,
  plan: "free" | "pro" | "team",
  planExpiresAt: Date?,
  orgId: ObjectId?, // ref: Org
  createdAt: Date,
  updatedAt: Date
}
```

### Card Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (indexed), // ref: User
  orgId: ObjectId?, // ref: Org (for team cards)
  slug: String (unique, indexed), // e.g., "charles-berry"
  mode: "business" | "landing" | "lead" | "link",
  status: "active" | "archived",

  profile: {
    firstName: String,
    lastName: String,
    displayName: String?,
    title: String?,
    company: String?,
    headline: String?,
    bio: String?,
    prefix: String?, // Dr., Mr., etc.
    accreditations: String?, // MBA, PhD, etc.
    department: String?,
    avatarUrl: String?,
    coverUrl: String?
  },

  links: [{
    _id: ObjectId,
    type: String, // email, phone, linkedin, twitter, website, custom, etc.
    label: String,
    value: String, // URL or contact info
    icon: String,
    visible: Boolean,
    order: Number,
    qrsynchShortUrl: String?, // Generated short URL
    qrsynchLinkId: String? // QRsynch link ID for analytics
  }],

  theme: {
    template: "modern" | "classic" | "minimal" | "bold",
    primaryColor: String, // hex
    accentColor: String?, // hex
    fontFamily: "sans" | "serif" | "mono",
    darkMode: Boolean,
    layout: "vertical" | "horizontal"
  },

  settings: {
    leadCaptureEnabled: Boolean,
    showEmail: Boolean,
    showPhone: Boolean,
    scheduleLink: String?, // Calendly/Cal.com URL
    embedSchedule: Boolean
  },

  // Card-level QRsynch tracking
  qrsynchShortUrl: String?, // Short URL for the card page itself
  qrsynchLinkId: String?,

  analytics: {
    totalViews: Number,
    totalClicks: Number,
    totalCaptures: Number
  },

  createdAt: Date,
  updatedAt: Date
}
```

### Contact Collection (Captured Leads)
```javascript
{
  _id: ObjectId,
  cardId: ObjectId (indexed), // ref: Card
  cardOwnerId: ObjectId (indexed), // ref: User (denormalized for faster queries)

  lead: {
    name: String,
    email: String,
    phone: String?,
    company: String?,
    notes: String?
  },

  source: {
    channel: "nfc_tap" | "qr_scan" | "link_share" | "embed",
    referrer: String?,
    ip: String?,
    userAgent: String?
  },

  consent: Boolean, // GDPR/privacy consent
  status: "new" | "contacted" | "won" | "lost",
  tags: [String],

  syncedToPathSynch: Boolean,
  pathSynchLeadId: String?, // If synced

  createdAt: Date,
  updatedAt: Date
}
```

### Scan Collection (Analytics Events)
```javascript
{
  _id: ObjectId,
  cardId: ObjectId (indexed),
  linkId: ObjectId?, // If click on specific link

  eventType: "view" | "click" | "save_contact" | "share",

  metadata: {
    ip: String?,
    userAgent: String?,
    referrer: String?,
    deviceType: "mobile" | "tablet" | "desktop"?,
    browser: String?,
    os: String?
  },

  timestamp: Date (indexed)
}
```

### Org Collection (Teams/Organizations)
```javascript
{
  _id: ObjectId,
  name: String,
  slug: String (unique),
  ownerId: ObjectId, // ref: User
  members: [{
    userId: ObjectId,
    role: "owner" | "admin" | "member",
    joinedAt: Date
  }],
  settings: {
    maxCards: Number,
    maxMembers: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

## QRsynch API Integration

Base URL: `https://api.qrsynch.com/v1`

### Create Short Link
```http
POST /links
Authorization: Bearer {QRSYNCH_API_KEY}
Content-Type: application/json

{
  "url": "https://flashsynch.com/c/charles-berry",
  "utmSource": "flashsynch",
  "utmMedium": "nfc",
  "utmCampaign": "charles-card"
}

Response:
{
  "id": "link_abc123",
  "shortUrl": "https://qrsyn.ch/abc123",
  "originalUrl": "https://flashsynch.com/c/charles-berry"
}
```

### Get Link Analytics
```http
GET /links/{linkId}/analytics
Authorization: Bearer {QRSYNCH_API_KEY}

Response:
{
  "clicks": 150,
  "uniqueClicks": 120,
  "topReferrers": [...],
  "clicksByDay": [...]
}
```

## RevenueCat Plan Mapping

| Entitlement ID | FlashSynch Plan |
|----------------|-----------------|
| `flashsynch_pro` | `pro` |
| `flashsynch_team` | `team` |
| (none) | `free` |

## API Response Format

### Success Response
```json
{
  "data": { ... }
}
```

### Success Response (List)
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

## Code Conventions

1. **TypeScript strict mode** - No `any` types
2. **Async/await** - No callbacks, no `.then()` chains
3. **Error handling** - Try/catch with proper error responses
4. **Validation** - Zod schemas for all request bodies
5. **Naming**:
   - Files: kebab-case (e.g., `auth-routes.ts`)
   - Variables/functions: camelCase
   - Types/interfaces: PascalCase
   - Constants: UPPER_SNAKE_CASE

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://...

# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY=./firebase-service-account.json

# QRsynch
QRSYNCH_API_KEY=qrs_...
QRSYNCH_API_URL=https://api.qrsynch.com/v1

# RevenueCat
REVENUECAT_API_KEY=...
REVENUECAT_WEBHOOK_SECRET=...
```

## Directory Structure

```
flashsynch/
├── CLAUDE.md                 # This file
├── packages/
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── types/
│           │   └── index.ts  # Shared TypeScript types
│           ├── constants/
│           │   └── index.ts  # Plan tiers, link types, themes
│           └── utils/
│               └── vcard.ts  # vCard generator
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts          # Entry point
│       ├── config/
│       │   ├── mongodb.ts    # MongoDB connection
│       │   └── firebase.ts   # Firebase Admin init
│       ├── middleware/
│       │   └── auth.ts       # Firebase auth middleware
│       ├── models/
│       │   ├── User.ts
│       │   ├── Card.ts
│       │   ├── Contact.ts
│       │   ├── Scan.ts
│       │   └── Org.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── cards.ts
│       │   ├── contacts.ts
│       │   ├── analytics.ts
│       │   └── webhooks.ts
│       ├── services/
│       │   └── qrsynch.ts    # QRsynch API client
│       └── validation/
│           └── schemas.ts    # Zod schemas
```
