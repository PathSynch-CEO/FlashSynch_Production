import mongoose, { Schema, Document } from 'mongoose';
import type {
  Contact as ContactType,
  ContactLead,
  ContactSource,
  ContactChannel,
  ContactStatus,
} from '@flashsynch/shared';

export interface ContactDocument extends Omit<ContactType, '_id'>, Document {}

const contactLeadSchema = new Schema<ContactLead>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    company: { type: String },
    notes: { type: String },
  },
  { _id: false }
);

const contactSourceSchema = new Schema<ContactSource>(
  {
    channel: {
      type: String,
      enum: ['nfc_tap', 'qr_scan', 'link_share', 'embed'] as ContactChannel[],
      default: 'link_share',
    },
    referrer: { type: String },
    ip: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
);

const contactSchema = new Schema<ContactDocument>(
  {
    cardId: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
      index: true,
    },
    cardOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lead: {
      type: contactLeadSchema,
      required: true,
    },
    source: {
      type: contactSourceSchema,
      default: () => ({}),
    },
    consent: {
      type: Boolean,
      required: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'won', 'lost'] as ContactStatus[],
      default: 'new',
    },
    tags: [{ type: String }],
    syncedToPathSynch: {
      type: Boolean,
      default: false,
    },
    pathSynchLeadId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
contactSchema.index({ cardOwnerId: 1, status: 1 });
contactSchema.index({ cardId: 1, createdAt: -1 });

export const Contact = mongoose.model<ContactDocument>('Contact', contactSchema);
