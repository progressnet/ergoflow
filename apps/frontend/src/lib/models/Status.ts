import type { Types, Document } from 'mongoose';
import type { ITenant } from './Tenant';

import mongoose, { Schema } from 'mongoose';

// ----------------------------------------------------------------------

export interface IStatus extends Document {
  _id: Types.ObjectId;
  tenantId: mongoose.Types.ObjectId | ITenant;
  name: string;
  description?: string;
  color: string;
  order: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const StatusSchema: Schema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Status name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      required: [true, 'Status color is required'],
      default: '#2196f3',
      validate: {
        validator(v: string) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Color must be a valid hex color code',
      },
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique status names per tenant
StatusSchema.index({ tenantId: 1, name: 1 }, { unique: true });

// Index for ordering
StatusSchema.index({ tenantId: 1, order: 1 });

export const Status = mongoose.models.Status || mongoose.model<IStatus>('Status', StatusSchema);
