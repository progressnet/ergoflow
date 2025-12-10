import type { Types, Document } from 'mongoose';

import mongoose, { Schema } from 'mongoose';

export interface ISkill extends Document {
  _id: Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SkillSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

SkillSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Skill = mongoose.models.Skill || mongoose.model<ISkill>('Skill', SkillSchema);
