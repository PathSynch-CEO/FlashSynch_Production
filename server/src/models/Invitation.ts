import mongoose, { Schema, Document } from 'mongoose';

export interface InvitationDocument extends Document {
  orgId: mongoose.Types.ObjectId;
  email: string;
  role: 'admin' | 'member';
  invitedBy: mongoose.Types.ObjectId;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<InvitationDocument>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Org',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
  }
);

// Index for looking up invitations by email
invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ token: 1 });
invitationSchema.index({ orgId: 1 });

export const Invitation = mongoose.model<InvitationDocument>('Invitation', invitationSchema);
