import mongoose, { Schema, Document } from 'mongoose';
import type { User as UserType, PlanType } from '@flashsynch/shared';

export interface UserDocument extends Omit<UserType, '_id'>, Document {}

const userSchema = new Schema<UserDocument>(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    handle: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    avatarUrl: {
      type: String,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'team'] as PlanType[],
      default: 'free',
    },
    planExpiresAt: {
      type: Date,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Org',
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique handle from display name
export async function generateUniqueHandle(displayName: string): Promise<string> {
  const baseHandle = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);

  // Check if base handle is available
  const existingCount = await User.countDocuments({
    handle: { $regex: `^${baseHandle}(-\\d+)?$` },
  });

  if (existingCount === 0) {
    return baseHandle;
  }

  // Find next available number
  let suffix = 2;
  while (true) {
    const candidateHandle = `${baseHandle}-${suffix}`;
    const exists = await User.findOne({ handle: candidateHandle });
    if (!exists) {
      return candidateHandle;
    }
    suffix++;
    if (suffix > 1000) {
      // Fallback to random suffix
      return `${baseHandle}-${Date.now()}`;
    }
  }
}

export const User = mongoose.model<UserDocument>('User', userSchema);
