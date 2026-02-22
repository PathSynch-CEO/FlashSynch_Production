import type { PlanType, LinkType, ThemeTemplate, FontFamily, CardLayout } from '../types';

// Plan tiers and limits
export const PLAN_LIMITS = {
  free: {
    maxCards: 1,
    maxContacts: 50,
    maxLinks: 5,
    analytics: false,
    customDomain: false,
    teamMembers: 0,
  },
  pro: {
    maxCards: 5,
    maxContacts: -1, // unlimited
    maxLinks: -1, // unlimited
    analytics: true,
    customDomain: false,
    teamMembers: 0,
  },
  team: {
    maxCards: -1, // unlimited
    maxContacts: -1, // unlimited
    maxLinks: -1, // unlimited
    analytics: true,
    customDomain: true,
    teamMembers: 10,
  },
} as const satisfies Record<PlanType, {
  maxCards: number;
  maxContacts: number;
  maxLinks: number;
  analytics: boolean;
  customDomain: boolean;
  teamMembers: number;
}>;

// Link type definitions
export const LINK_TYPES: Record<LinkType, { label: string; icon: string; placeholder: string }> = {
  email: { label: 'Email', icon: 'mail', placeholder: 'your@email.com' },
  phone: { label: 'Phone', icon: 'phone', placeholder: '+1 (555) 123-4567' },
  linkedin: { label: 'LinkedIn', icon: 'linkedin', placeholder: 'https://linkedin.com/in/username' },
  twitter: { label: 'Twitter/X', icon: 'twitter', placeholder: 'https://twitter.com/username' },
  instagram: { label: 'Instagram', icon: 'instagram', placeholder: 'https://instagram.com/username' },
  facebook: { label: 'Facebook', icon: 'facebook', placeholder: 'https://facebook.com/username' },
  youtube: { label: 'YouTube', icon: 'youtube', placeholder: 'https://youtube.com/@channel' },
  tiktok: { label: 'TikTok', icon: 'tiktok', placeholder: 'https://tiktok.com/@username' },
  github: { label: 'GitHub', icon: 'github', placeholder: 'https://github.com/username' },
  website: { label: 'Website', icon: 'globe', placeholder: 'https://yourwebsite.com' },
  calendly: { label: 'Calendly', icon: 'calendar', placeholder: 'https://calendly.com/username' },
  custom: { label: 'Custom Link', icon: 'link', placeholder: 'https://...' },
};

// Theme presets
export const THEME_PRESETS: Record<ThemeTemplate, {
  name: string;
  description: string;
  defaultPrimaryColor: string;
  defaultAccentColor: string;
}> = {
  modern: {
    name: 'Modern',
    description: 'Clean and contemporary design',
    defaultPrimaryColor: '#2563EB',
    defaultAccentColor: '#7C3AED',
  },
  classic: {
    name: 'Classic',
    description: 'Timeless professional look',
    defaultPrimaryColor: '#1F2937',
    defaultAccentColor: '#4B5563',
  },
  minimal: {
    name: 'Minimal',
    description: 'Simple and elegant',
    defaultPrimaryColor: '#000000',
    defaultAccentColor: '#6B7280',
  },
  bold: {
    name: 'Bold',
    description: 'Vibrant and eye-catching',
    defaultPrimaryColor: '#DC2626',
    defaultAccentColor: '#F97316',
  },
};

export const FONT_FAMILIES: Record<FontFamily, { name: string; cssFamily: string }> = {
  sans: { name: 'Sans Serif', cssFamily: 'Inter, system-ui, sans-serif' },
  serif: { name: 'Serif', cssFamily: 'Georgia, serif' },
  mono: { name: 'Monospace', cssFamily: 'JetBrains Mono, monospace' },
};

export const CARD_LAYOUTS: Record<CardLayout, { name: string; description: string }> = {
  vertical: { name: 'Vertical', description: 'Stack elements vertically' },
  horizontal: { name: 'Horizontal', description: 'Side-by-side layout' },
};

// RevenueCat entitlement mapping
export const REVENUECAT_ENTITLEMENTS: Record<string, PlanType> = {
  flashsynch_pro: 'pro',
  flashsynch_team: 'team',
};

// Default values
export const DEFAULT_THEME = {
  template: 'modern' as ThemeTemplate,
  primaryColor: '#2563EB',
  accentColor: '#7C3AED',
  fontFamily: 'sans' as FontFamily,
  darkMode: false,
  layout: 'vertical' as CardLayout,
};

export const DEFAULT_SETTINGS = {
  leadCaptureEnabled: true,
  showEmail: true,
  showPhone: true,
  embedSchedule: false,
};

export const DEFAULT_ANALYTICS = {
  totalViews: 0,
  totalClicks: 0,
  totalCaptures: 0,
};
