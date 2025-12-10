import type { Types, Document } from 'mongoose';

import mongoose, { Schema } from 'mongoose';

// ----------------------------------------------------------------------

export interface ITask extends Document {
  _id: Types.ObjectId;
  tenantId: string;
  title: string;
  description?: string;
  columnId?: string; // Reference to Status (column) _id
  status?: 'todo' | 'in-progress' | 'review' | 'done'; // Legacy field
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectId?: string;
  workOrderId?: string;
  assignedTo?: string; // Technician ID
  createdBy: string; // User ID
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  attachments: string[];
  notes?: string;
  // Client information (optional)
  clientId?: string; // Reference to Client
  clientName?: string; // Cached client name for display
  clientCompany?: string; // Cached client company for display
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const TaskSchema = new Schema<ITask>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
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
      enum: ['todo', 'in-progress', 'review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    projectId: {
      type: String,
      ref: 'Project',
    },
    workOrderId: {
      type: String,
      ref: 'WorkOrder',
    },
    assignedTo: {
      type: String,
      ref: 'Technician',
    },
    createdBy: {
      type: String,
      required: true,
      ref: 'User',
    },
    dueDate: {
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
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        type: String,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    // Client information (optional)
    clientId: {
      type: String,
      ref: 'Client',
    },
    clientName: {
      type: String,
      trim: true,
    },
    clientCompany: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TaskSchema.index({ tenantId: 1, projectId: 1 });
TaskSchema.index({ tenantId: 1, workOrderId: 1 });
TaskSchema.index({ tenantId: 1, assignedTo: 1 });
TaskSchema.index({ tenantId: 1, status: 1 });
TaskSchema.index({ tenantId: 1, priority: 1 });
TaskSchema.index({ tenantId: 1, clientId: 1 });

export const Task = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
