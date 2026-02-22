import mongoose, { Schema, Document } from 'mongoose';
import type { Org as OrgType, OrgMember, OrgSettings, OrgMemberRole } from '@flashsynch/shared';

export interface OrgDocument extends Omit<OrgType, '_id'>, Document {}

const orgMemberSchema = new Schema<OrgMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'] as OrgMemberRole[],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const orgSettingsSchema = new Schema<OrgSettings>(
  {
    maxCards: { type: Number, default: 10 },
    maxMembers: { type: Number, default: 5 },
  },
  { _id: false }
);

const orgSchema = new Schema<OrgDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [orgMemberSchema],
    settings: {
      type: orgSettingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

export const Org = mongoose.model<OrgDocument>('Org', orgSchema);
