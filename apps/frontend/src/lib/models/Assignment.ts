import type { Document, Types } from 'mongoose';

import mongoose, { Schema } from 'mongoose';

// ----------------------------------------------------------------------

export interface IAssignment extends Document {
  _id: Types.ObjectId;
  tenantId: string;
  workOrderId: string;
  technicianId: string;
  assignedBy: string; // User ID
  assignedAt: Date;
  status: 'assigned' | 'accepted' | 'in-progress' | 'completed' | 'rejected';
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
  rating?: number; // 1-5 rating of technician performance
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const AssignmentSchema = new Schema<IAssignment>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    workOrderId: {
      type: String,
      required: true,
      ref: 'WorkOrder',
    },
    technicianId: {
      type: String,
      required: true,
      ref: 'Technician',
    },
    assignedBy: {
      type: String,
      required: true,
      ref: 'User',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['assigned', 'accepted', 'in-progress', 'completed', 'rejected'],
      default: 'assigned',
    },
    scheduledStartDate: {
      type: Date,
    },
    scheduledEndDate: {
      type: Date,
    },
    actualStartDate: {
      type: Date,
    },
    actualEndDate: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
    },
    actualHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
AssignmentSchema.index({ tenantId: 1, workOrderId: 1 });
AssignmentSchema.index({ tenantId: 1, technicianId: 1 });
AssignmentSchema.index({ tenantId: 1, status: 1 });
AssignmentSchema.index({ tenantId: 1, assignedBy: 1 });

// Ensure one assignment per work order per technician
AssignmentSchema.index({ tenantId: 1, workOrderId: 1, technicianId: 1 }, { unique: true });

export const Assignment =
  mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);
