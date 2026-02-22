import mongoose, { Schema, Document } from 'mongoose';
import type { Scan as ScanType, ScanMetadata, ScanEventType, DeviceType } from '@flashsynch/shared';

export interface ScanDocument extends Omit<ScanType, '_id'>, Document {}

const scanMetadataSchema = new Schema<ScanMetadata>(
  {
    ip: { type: String },
    userAgent: { type: String },
    referrer: { type: String },
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop'] as DeviceType[],
    },
    browser: { type: String },
    os: { type: String },
  },
  { _id: false }
);

const scanSchema = new Schema<ScanDocument>(
  {
    cardId: {
      type: Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
      index: true,
    },
    linkId: {
      type: Schema.Types.ObjectId,
    },
    eventType: {
      type: String,
      enum: ['view', 'click', 'save_contact', 'share'] as ScanEventType[],
      required: true,
    },
    metadata: {
      type: scanMetadataSchema,
      default: () => ({}),
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // We use custom timestamp field
  }
);

// Compound indexes for analytics queries
scanSchema.index({ cardId: 1, timestamp: -1 });
scanSchema.index({ cardId: 1, eventType: 1, timestamp: -1 });

export const Scan = mongoose.model<ScanDocument>('Scan', scanSchema);
