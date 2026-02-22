import { z } from 'zod';

// Common schemas
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

// User schemas
export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Handle must be lowercase alphanumeric with hyphens only')
    .optional(),
  avatarUrl: z.string().url().optional(),
});

// Card schemas
export const cardLinkSchema = z.object({
  type: z.enum([
    'email',
    'phone',
    'linkedin',
    'twitter',
    'instagram',
    'facebook',
    'youtube',
    'tiktok',
    'github',
    'website',
    'calendly',
    'custom',
  ]),
  label: z.string().min(1).max(50),
  value: z.string().min(1).max(500),
  icon: z.string().min(1).max(50),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export const cardProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  displayName: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  headline: z.string().max(200).optional(),
  bio: z.string().max(1000).optional(),
  prefix: z.string().max(20).optional(),
  accreditations: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
});

export const cardThemeSchema = z.object({
  template: z.enum(['modern', 'classic', 'minimal', 'bold']).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  fontFamily: z.enum(['sans', 'serif', 'mono']).optional(),
  darkMode: z.boolean().optional(),
  layout: z.enum(['vertical', 'horizontal']).optional(),
});

export const cardSettingsSchema = z.object({
  leadCaptureEnabled: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  scheduleLink: z.string().url().optional().or(z.literal('')),
  embedSchedule: z.boolean().optional(),
});

export const createCardSchema = z.object({
  profile: cardProfileSchema,
  links: z.array(cardLinkSchema).optional().default([]),
  theme: cardThemeSchema.optional(),
  settings: cardSettingsSchema.optional(),
  mode: z.enum(['business', 'landing', 'lead', 'link']).optional().default('business'),
});

export const updateCardSchema = z.object({
  profile: cardProfileSchema.partial().optional(),
  links: z.array(cardLinkSchema).optional(),
  theme: cardThemeSchema.optional(),
  settings: cardSettingsSchema.optional(),
  mode: z.enum(['business', 'landing', 'lead', 'link']).optional(),
});

// Contact schemas
export const leadCaptureSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
  company: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Consent is required' }),
  }),
  channel: z.enum(['nfc_tap', 'qr_scan', 'link_share', 'embed']).optional(),
});

export const updateContactSchema = z.object({
  status: z.enum(['new', 'contacted', 'won', 'lost']).optional(),
  tags: z.array(z.string().max(50)).optional(),
});

// Analytics schemas
export const trackScanSchema = z.object({
  eventType: z.enum(['view', 'click', 'save_contact', 'share']),
  linkId: z.string().optional(),
  referrer: z.string().max(500).optional(),
});

// Query schemas
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const contactsQuerySchema = paginationQuerySchema.extend({
  cardId: z.string().optional(),
  status: z.enum(['new', 'contacted', 'won', 'lost']).optional(),
});

// RevenueCat webhook schema
export const revenueCatWebhookSchema = z.object({
  event: z.object({
    type: z.enum([
      'INITIAL_PURCHASE',
      'RENEWAL',
      'CANCELLATION',
      'EXPIRATION',
      'BILLING_ISSUE',
      'PRODUCT_CHANGE',
    ]),
    app_user_id: z.string(),
    entitlement_ids: z.array(z.string()).optional(),
    expiration_at_ms: z.number().optional(),
  }),
});

// Type exports
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type TrackScanInput = z.infer<typeof trackScanSchema>;
export type ContactsQueryInput = z.infer<typeof contactsQuerySchema>;
export type RevenueCatWebhookInput = z.infer<typeof revenueCatWebhookSchema>;
