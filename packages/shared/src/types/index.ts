// User types
export interface User {
  _id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  plan: PlanType;
  planExpiresAt?: Date;
  orgId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PlanType = 'free' | 'pro' | 'team';

// Card types
export interface CardProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  title?: string;
  company?: string;
  headline?: string;
  bio?: string;
  prefix?: string;
  accreditations?: string;
  department?: string;
  avatarUrl?: string;
  coverUrl?: string;
}

export interface CardLink {
  _id?: string;
  type: LinkType;
  label: string;
  value: string;
  icon: string;
  visible: boolean;
  order: number;
  qrsynchShortUrl?: string;
  qrsynchLinkId?: string;
}

export type LinkType =
  | 'email'
  | 'phone'
  | 'linkedin'
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'github'
  | 'website'
  | 'calendly'
  | 'custom';

export interface CardTheme {
  template: ThemeTemplate;
  primaryColor: string;
  accentColor?: string;
  fontFamily: FontFamily;
  darkMode: boolean;
  layout: CardLayout;
}

export type ThemeTemplate = 'modern' | 'classic' | 'minimal' | 'bold';
export type FontFamily = 'sans' | 'serif' | 'mono';
export type CardLayout = 'vertical' | 'horizontal';

export interface CardSettings {
  leadCaptureEnabled: boolean;
  showEmail: boolean;
  showPhone: boolean;
  scheduleLink?: string;
  embedSchedule: boolean;
}

export interface CardAnalytics {
  totalViews: number;
  totalClicks: number;
  totalCaptures: number;
}

export type CardMode = 'business' | 'landing' | 'lead' | 'link';
export type CardStatus = 'active' | 'archived';

export interface Card {
  _id: string;
  userId: string;
  orgId?: string;
  slug: string;
  mode: CardMode;
  status: CardStatus;
  profile: CardProfile;
  links: CardLink[];
  theme: CardTheme;
  settings: CardSettings;
  qrsynchShortUrl?: string;
  qrsynchLinkId?: string;
  analytics: CardAnalytics;
  createdAt: Date;
  updatedAt: Date;
}

// Contact types
export interface ContactLead {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
}

export interface ContactSource {
  channel: ContactChannel;
  referrer?: string;
  ip?: string;
  userAgent?: string;
}

export type ContactChannel = 'nfc_tap' | 'qr_scan' | 'link_share' | 'embed';
export type ContactStatus = 'new' | 'contacted' | 'won' | 'lost';

export interface Contact {
  _id: string;
  cardId: string;
  cardOwnerId: string;
  lead: ContactLead;
  source: ContactSource;
  consent: boolean;
  status: ContactStatus;
  tags: string[];
  syncedToPathSynch: boolean;
  pathSynchLeadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Scan types
export type ScanEventType = 'view' | 'click' | 'save_contact' | 'share';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface ScanMetadata {
  ip?: string;
  userAgent?: string;
  referrer?: string;
  deviceType?: DeviceType;
  browser?: string;
  os?: string;
}

export interface Scan {
  _id: string;
  cardId: string;
  linkId?: string;
  eventType: ScanEventType;
  metadata: ScanMetadata;
  timestamp: Date;
}

// Org types
export type OrgMemberRole = 'owner' | 'admin' | 'member';

export interface OrgMember {
  userId: string;
  role: OrgMemberRole;
  joinedAt: Date;
}

export interface OrgSettings {
  maxCards: number;
  maxMembers: number;
}

export interface Org {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: OrgMember[];
  settings: OrgSettings;
  createdAt: Date;
  updatedAt: Date;
}

// API types
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  code?: string;
}

// Request types
export interface CreateCardRequest {
  profile: CardProfile;
  links?: CardLink[];
  theme?: Partial<CardTheme>;
  settings?: Partial<CardSettings>;
  mode?: CardMode;
}

export interface UpdateCardRequest {
  profile?: Partial<CardProfile>;
  links?: CardLink[];
  theme?: Partial<CardTheme>;
  settings?: Partial<CardSettings>;
  mode?: CardMode;
}

export interface LeadCaptureRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  consent: boolean;
  channel?: ContactChannel;
}

export interface TrackScanRequest {
  eventType: ScanEventType;
  linkId?: string;
  referrer?: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  handle?: string;
  avatarUrl?: string;
}
