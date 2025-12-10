'use client';

import type { IMaterial, UpdateMaterialData } from 'src/lib/models/Material';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';

import {
  Box,
  Chip,
  Paper,
  Stack,
  Button,
  Drawer,
  Switch,
  TextField,
  IconButton,
  Typography,
  Autocomplete,
  FormControlLabel,
} from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';
import { MaterialService } from 'src/lib/services/material-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmationDialog } from 'src/components/confirmation-dialog';

// ----------------------------------------------------------------------

interface MaterialsQuickEditFormProps {
  open: boolean;
  onClose: () => void;
  material: IMaterial;
}

interface FormData extends UpdateMaterialData {
  customFieldKey?: string;
  customFieldValue?: string;
  isActive?: boolean;
}

// ----------------------------------------------------------------------

export function MaterialsQuickEditForm({ open, onClose, material }: MaterialsQuickEditFormProps) {
  const { t } = useTranslate('dashboard');
  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, any>>(
    material.customFields || {}
  );
  const [categories, setCategories] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      name: material.name,
      description: material.description || '',
      category: material.category || '',
      sku: material.sku || '',
      barcode: material.barcode || '',
      unit: material.unit,
      unitCost: material.unitCost,
      quantity: material.quantity,
      minimumStock: material.minimumStock || 0,
      location: material.location || '',
      supplier: material.supplier || '',
      isActive: material.isActive,
      customFieldKey: '',
      customFieldValue: '',
    },
  });

  const customFieldKey = watch('customFieldKey');
  const customFieldValue = watch('customFieldValue');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await MaterialService.getCategories();
        if (result.success) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    if (open) {
      reset({
        name: material.name,
        description: material.description || '',
        category: material.category || '',
        sku: material.sku || '',
        barcode: material.barcode || '',
        unit: material.unit,
        unitCost: material.unitCost,
        quantity: material.quantity,
        minimumStock: material.minimumStock || 0,
        location: material.location || '',
        supplier: material.supplier || '',
        isActive: material.isActive,
        customFieldKey: '',
        customFieldValue: '',
      });
      setCustomFields(material.customFields || {});
      loadCategories();
    }
  }, [open, material, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { customFieldKey: _key, customFieldValue: _value, ...updateData } = data;
      updateData.customFields = customFields;

      await MaterialService.updateMaterial(String(material._id), updateData);
      toast.success(t('materials.materialUpdated'));
      onClose();
      // You might want to trigger a refresh of the materials list here
    } catch (error) {
      console.error('Failed to update material:', error);
      toast.error(t('materials.failedToUpdate'));
    }
    setLoading(false);
  };

  const handleAddCustomField = () => {
    if (!customFieldKey?.trim() || !customFieldValue?.trim()) {
      toast.error('Please enter both field name and value');
      return;
    }

    setCustomFields((prev) => ({
      ...prev,
      [customFieldKey.trim()]: customFieldValue.trim(),
    }));

    setValue('customFieldKey', '');
    setValue('customFieldValue', '');
  };

  const handleRemoveCustomField = (key: string) => {
    setCustomFields((prev) => {
      const newFields = { ...prev };
      delete newFields[key];
      return newFields;
    });
  };

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      await MaterialService.toggleMaterialActive(String(material._id));
      toast.success(t(`materials.material${material.isActive ? 'Deactivated' : 'Activated'}`));
      onClose();
    } catch (error) {
      console.error('Failed to toggle material status:', error);
      toast.error(t('materials.failedToUpdate'));
    }
    setLoading(false);
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      await MaterialService.deleteMaterial(String(material._id));
      toast.success(t('materials.materialDeleted'));
      setDeleteConfirmOpen(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete material:', error);
      toast.error(t('materials.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:package-bold" />
          <Typography variant="h6">{t('materials.editMaterial')}</Typography>
        </Stack>
        <IconButton onClick={onClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Stack>
    </Box>
  );

  const renderActions = () => (
    <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1} justifyContent="space-between">
        <Button
          variant="outlined"
          color="error"
          onClick={handleDelete}
          disabled={loading}
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
        >
          {t('materials.delete')}
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={loading}>
            {t('materials.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !isDirty}
            onClick={handleSubmit(onSubmit)}
          >
            {t('materials.update')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor="right"
      slotProps={{
        backdrop: { invisible: true },
        paper: { sx: { width: { xs: 1, sm: 480 } } },
      }}
    >
      {renderHeader()}

      <Scrollbar fillContent sx={{ py: 3, px: 2.5 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Material name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('materials.form.name')}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  fullWidth
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('materials.form.description')}
                  multiline
                  rows={2}
                  fullWidth
                />
              )}
            />

            <Stack direction="row" spacing={2}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    fullWidth
                    options={categories}
                    freeSolo
                    value={field.value || ''}
                    onChange={(_, newValue) => field.onChange(newValue || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('materials.form.category')}
                        placeholder="Select or enter category"
                        fullWidth
                      />
                    )}
                    filterOptions={(options, params) => {
                      const filtered = options.filter((option) =>
                        option.toLowerCase().includes(params.inputValue.toLowerCase())
                      );

                      const { inputValue } = params;
                      const isExisting = options.some((option) => inputValue === option);
                      if (inputValue !== '' && !isExisting) {
                        filtered.push(`Add "${inputValue}"`);
                      }

                      return filtered;
                    }}
                    getOptionLabel={(option) => {
                      if (option.startsWith('Add "')) {
                        return option.replace('Add "', '').replace('"', '');
                      }
                      return option;
                    }}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      const isAddOption = option.startsWith('Add "');

                      return (
                        <li key={key} {...optionProps}>
                          {isAddOption ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Iconify icon="solar:add-circle-bold" />
                              <span>{option}</span>
                            </Stack>
                          ) : (
                            option
                          )}
                        </li>
                      );
                    }}
                  />
                )}
              />
            </Stack>
            <Controller
              name="sku"
              control={control}
              render={({ field }) => (
                <TextField {...field} label={t('materials.form.sku')} fullWidth />
              )}
            />
            <Stack direction="row" spacing={2}>
              <Controller
                name="unit"
                control={control}
                rules={{ required: 'Unit is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('materials.form.unit')}
                    error={!!errors.unit}
                    helperText={errors.unit?.message}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="unitCost"
                control={control}
                rules={{
                  required: 'Unit cost is required',
                  min: { value: 0, message: 'Unit cost must be positive' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('materials.form.unitCost')}
                    type="number"
                    inputProps={{ step: '0.01', min: 0 }}
                    error={!!errors.unitCost}
                    helperText={errors.unitCost?.message}
                    fullWidth
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <Controller
                name="quantity"
                control={control}
                rules={{
                  required: 'Quantity is required',
                  min: { value: 0, message: 'Quantity must be positive' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('materials.form.quantity')}
                    type="number"
                    inputProps={{ min: 0 }}
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
                    fullWidth
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                )}
              />

              <Controller
                name="minimumStock"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('materials.form.minimumStock')}
                    type="number"
                    inputProps={{ min: 0 }}
                    fullWidth
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                )}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label={t('materials.form.location')} fullWidth />
                )}
              />

              <Controller
                name="supplier"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label={t('materials.form.supplier')} fullWidth />
                )}
              />
            </Stack>

            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch checked={field.value} onChange={field.onChange} color="primary" />
                  }
                  label={t('materials.form.activeMaterial')}
                  sx={{ ml: 0 }}
                />
              )}
            />

            {/* Custom Fields Section */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('materials.form.customFields')}
              </Typography>

              {Object.keys(customFields).length > 0 && (
                <Stack spacing={1} sx={{ mb: 2 }}>
                  {Object.entries(customFields).map(([key, value]) => (
                    <Stack key={key} direction="row" alignItems="center" spacing={1}>
                      <Chip
                        label={`${key}: ${value}`}
                        size="small"
                        onDelete={() => handleRemoveCustomField(key)}
                        deleteIcon={<Iconify icon="solar:close-circle-bold" />}
                      />
                    </Stack>
                  ))}
                </Stack>
              )}

              <Stack direction="row" spacing={1} alignItems="flex-end">
                <Controller
                  name="customFieldKey"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('materials.form.fieldName')}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                  )}
                />
                <Controller
                  name="customFieldValue"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={t('materials.form.fieldValue')}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                  )}
                />
                <IconButton
                  onClick={handleAddCustomField}
                  disabled={!customFieldKey?.trim() || !customFieldValue?.trim()}
                  color="primary"
                >
                  <Iconify icon="solar:add-circle-bold" />
                </IconButton>
              </Stack>
            </Paper>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color={material.isActive ? 'warning' : 'success'}
                onClick={handleToggleActive}
                disabled={loading}
                startIcon={
                  <Iconify
                    icon={material.isActive ? 'solar:pause-circle-bold' : 'solar:play-circle-bold'}
                  />
                }
              >
                {material.isActive ? t('materials.form.deactivate') : t('materials.form.activate')}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Scrollbar>

      {renderActions()}

      <ConfirmationDialog
        open={deleteConfirmOpen}
        title={t('materials.deleteMaterial')}
        message={t('materials.deleteConfirmMessage')}
        confirmText={t('materials.delete')}
        cancelText={t('materials.cancel')}
        confirmColor="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        loading={loading}
        icon="solar:trash-bin-trash-bold"
      />
    </Drawer>
  );
}
