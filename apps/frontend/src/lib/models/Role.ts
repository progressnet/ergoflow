import type { Types, Document } from 'mongoose';
import type { ITenant } from './Tenant';

import mongoose, { Schema } from 'mongoose';

// ----------------------------------------------------------------------

export interface IRole extends Document {
  _id: Types.ObjectId;
  tenantId: mongoose.Types.ObjectId | ITenant;
  name: string;
  description?: string;
  color: string;
  permissions: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------

const RoleSchema: Schema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      required: [true, 'Role color is required'],
      default: '#2196f3',
      validate: {
        validator(v: string) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Color must be a valid hex color code',
      },
    },
    permissions: [
      {
        type: String,
        enum: [
          'view_work_orders',
          'create_work_orders',
          'edit_work_orders',
          'delete_work_orders',
          'view_projects',
          'create_projects',
          'edit_projects',
          'delete_projects',
          'view_tasks',
          'create_tasks',
          'edit_tasks',
          'delete_tasks',
          'view_customers',
          'create_customers',
          'edit_customers',
          'delete_customers',
          'view_personnel',
          'create_personnel',
          'edit_personnel',
          'delete_personnel',
          'view_reports',
          'manage_roles',
          'manage_statuses',
          'admin_access',
        ],
      },
    ],
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

// Ensure unique role names per tenant
RoleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Role = mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);
