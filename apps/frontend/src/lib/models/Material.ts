import type { Types, Document } from 'mongoose';

// ----------------------------------------------------------------------

export interface IMaterial extends Document {
  _id: Types.ObjectId;
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  unitCost: number;
  quantity: number;
  minimumStock?: number;
  location?: string;
  supplier?: string;
  customFields: Record<string, any>;
  isActive: boolean;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialFilters {
  name: string;
  category: string;
  status: string;
  location?: string;
  supplier?: string;
}

export interface MaterialSearchParams extends MaterialFilters {
  q?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateMaterialData {
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  unitCost: number;
  quantity: number;
  minimumStock?: number;
  location?: string;
  supplier?: string;
  customFields?: Record<string, any>;
  status?: 'active' | 'inactive' | 'discontinued';
}

export interface UpdateMaterialData extends Partial<CreateMaterialData> {}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
  created: IMaterial[];
}
