import type { Types, Document } from 'mongoose';

import mongoose, { Schema } from 'mongoose';

export interface ICertification extends Document {
  _id: Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CertificationSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

CertificationSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Certification =
  mongoose.models.Certification ||
  mongoose.model<ICertification>('Certification', CertificationSchema);
