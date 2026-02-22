import mongoose, { Schema, Document } from 'mongoose';
import type {
  Card as CardType,
  CardProfile,
  CardLink,
  CardTheme,
  CardSettings,
  CardAnalytics,
  CardMode,
  CardStatus,
} from '@flashsynch/shared';
import { DEFAULT_THEME, DEFAULT_SETTINGS, DEFAULT_ANALYTICS } from '@flashsynch/shared';

export interface CardDocument extends Omit<CardType, '_id'>, Document {}

const cardLinkSchema = new Schema<CardLink>(
  {
    type: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, required: true },
    icon: { type: String, required: true },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    qrsynchShortUrl: { type: String },
    qrsynchLinkId: { type: String },
  },
  { _id: true }
);

const cardProfileSchema = new Schema<CardProfile>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    displayName: { type: String },
    title: { type: String },
    company: { type: String },
    headline: { type: String },
    bio: { type: String },
    prefix: { type: String },
    accreditations: { type: String },
    department: { type: String },
    avatarUrl: { type: String },
    coverUrl: { type: String },
  },
  { _id: false }
);

const cardThemeSchema = new Schema<CardTheme>(
  {
    template: { type: String, default: DEFAULT_THEME.template },
    primaryColor: { type: String, default: DEFAULT_THEME.primaryColor },
    accentColor: { type: String, default: DEFAULT_THEME.accentColor },
    fontFamily: { type: String, default: DEFAULT_THEME.fontFamily },
    darkMode: { type: Boolean, default: DEFAULT_THEME.darkMode },
    layout: { type: String, default: DEFAULT_THEME.layout },
  },
  { _id: false }
);

const cardSettingsSchema = new Schema<CardSettings>(
  {
    leadCaptureEnabled: { type: Boolean, default: DEFAULT_SETTINGS.leadCaptureEnabled },
    showEmail: { type: Boolean, default: DEFAULT_SETTINGS.showEmail },
    showPhone: { type: Boolean, default: DEFAULT_SETTINGS.showPhone },
    scheduleLink: { type: String },
    embedSchedule: { type: Boolean, default: DEFAULT_SETTINGS.embedSchedule },
  },
  { _id: false }
);

const cardAnalyticsSchema = new Schema<CardAnalytics>(
  {
    totalViews: { type: Number, default: DEFAULT_ANALYTICS.totalViews },
    totalClicks: { type: Number, default: DEFAULT_ANALYTICS.totalClicks },
    totalCaptures: { type: Number, default: DEFAULT_ANALYTICS.totalCaptures },
  },
  { _id: false }
);

const cardSchema = new Schema<CardDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Org',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ['business', 'landing', 'lead', 'link'] as CardMode[],
      default: 'business',
    },
    status: {
      type: String,
      enum: ['active', 'archived'] as CardStatus[],
      default: 'active',
    },
    profile: {
      type: cardProfileSchema,
      required: true,
    },
    links: [cardLinkSchema],
    theme: {
      type: cardThemeSchema,
      default: () => ({ ...DEFAULT_THEME }),
    },
    settings: {
      type: cardSettingsSchema,
      default: () => ({ ...DEFAULT_SETTINGS }),
    },
    qrsynchShortUrl: { type: String },
    qrsynchLinkId: { type: String },
    analytics: {
      type: cardAnalyticsSchema,
      default: () => ({ ...DEFAULT_ANALYTICS }),
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique slug from name
export async function generateUniqueSlug(firstName: string, lastName: string): Promise<string> {
  const baseSlug = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  // Check if base slug is available
  const existingCount = await Card.countDocuments({
    slug: { $regex: `^${baseSlug}(-\\d+)?$` },
  });

  if (existingCount === 0) {
    return baseSlug;
  }

  // Find next available number
  let suffix = 2;
  while (true) {
    const candidateSlug = `${baseSlug}-${suffix}`;
    const exists = await Card.findOne({ slug: candidateSlug });
    if (!exists) {
      return candidateSlug;
    }
    suffix++;
    if (suffix > 1000) {
      // Fallback to random suffix
      return `${baseSlug}-${Date.now()}`;
    }
  }
}

export const Card = mongoose.model<CardDocument>('Card', cardSchema);
