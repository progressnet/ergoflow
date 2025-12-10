import type { Document, Types } from 'mongoose';

import mongoose, { Schema } from 'mongoose';

// ----------------------------------------------------------------------

export interface IProject extends Document {
  _id: Types.ObjectId;
  tenantId: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: Date;
  endDate?: Date;
  clientId: string;
  managerId: string; // User ID of project manager
  budget?: number;
  actualCost?: number;
  progress: number; // 0-100
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const ProjectSchema = new Schema<IProject>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    clientId: {
      type: String,
      required: true,
      ref: 'Client',
    },
    managerId: {
      type: String,
      required: true,
      ref: 'User',
    },
    budget: {
      type: Number,
      min: 0,
    },
    actualCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProjectSchema.index({ tenantId: 1, clientId: 1 });
ProjectSchema.index({ tenantId: 1, managerId: 1 });
ProjectSchema.index({ tenantId: 1, status: 1 });
ProjectSchema.index({ tenantId: 1, priority: 1 });

export const Project =
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
