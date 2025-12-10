'use client';

import type { IMaterial, MaterialFilters } from 'src/lib/models/Material';

import { useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Table,
  Alert,
  TableBody,
  TableContainer,
  TablePagination,
  CircularProgress,
} from '@mui/material';

import { useTranslate } from 'src/locales/use-locales';
import { MaterialService } from 'src/lib/services/material-service';

import { useTable } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmationDialog } from 'src/components/confirmation-dialog';

import { MaterialsTableRow } from './materials-table-row';
import { MaterialsTableHead } from './materials-table-head';
import { MaterialsTableToolbar } from './materials-table-toolbar';
import { MaterialsQuickEditForm } from './materials-quick-edit-form';

// ----------------------------------------------------------------------

interface MaterialsListProps {
  filters: MaterialFilters;
  onFilters: (name: string, value: string) => void;
  onImport?: () => void;
  onCreate?: () => void;
}

// ----------------------------------------------------------------------

export function MaterialsList({ filters, onFilters, onImport, onCreate }: MaterialsListProps) {
  const { t } = useTranslate('dashboard');
  const table = useTable();
  const [materials, setMaterials] = useState<IMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<IMaterial | null>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await MaterialService.getAllMaterials({
        ...filters,
        q: filters.name, // Map name filter to q parameter for backend
        limit: table.rowsPerPage,
        offset: table.page * table.rowsPerPage,
        sortBy: table.orderBy,
        sortOrder: table.order,
      });

      if (response.success) {
        setMaterials(response.data);
        setTotalCount(response.pagination.total);
      } else {
        setError(t('materials.failedToLoad'));
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError(t('materials.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [filters, table.page, table.rowsPerPage, table.orderBy, table.order, t]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    table.setPage(0);
  }, [filters, table]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await MaterialService.getCategories();
        if (result.success) {
          setCategories(result.data);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };

    loadCategories();
  }, []);

  const handleSelectRow = useCallback(
    (id: string) => {
      table.onSelectRow(id);
    },
    [table]
  );

  const handleEditMaterial = useCallback((material: IMaterial) => {
    setSelectedMaterial(material);
    setEditFormOpen(true);
  }, []);

  const handleCloseEditForm = useCallback(() => {
    setEditFormOpen(false);
    setSelectedMaterial(null);
    fetchMaterials(); // Refresh the materials list
  }, [fetchMaterials]);

  const handleBulkDelete = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmBulkDelete = useCallback(async () => {
    setDeleteLoading(true);
    try {
      await Promise.all(table.selected.map((id) => MaterialService.deleteMaterial(id)));
      await fetchMaterials();
      table.onSelectAllRows(false, []);
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error('Error deleting materials:', err);
      setError(t('materials.failedToDelete'));
    } finally {
      setDeleteLoading(false);
    }
  }, [fetchMaterials, table, t]);

  const handleExport = useCallback(() => {
    // Convert materials to CSV
    if (materials.length === 0) return;

    const headers = [
      t('materials.table.name'),
      t('materials.form.description'),
      t('materials.table.category'),
      t('materials.table.sku'),
      'Barcode',
      t('materials.form.unit'),
      t('materials.table.unitCost'),
      t('materials.table.quantity'),
      t('materials.form.minimumStock'),
      t('materials.table.location'),
      t('materials.form.supplier'),
      t('materials.table.status'),
    ];

    const csvContent = [
      headers.join(','),
      ...materials.map((material) =>
        [
          `"${material.name}"`,
          `"${material.description || ''}"`,
          `"${material.category || ''}"`,
          `"${material.sku || ''}"`,
          `"${material.barcode || ''}"`,
          `"${material.unit}"`,
          material.unitCost,
          material.quantity,
          material.minimumStock || 0,
          `"${material.location || ''}"`,
          `"${material.supplier || ''}"`,
          material.status,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `materials_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [materials, t]);

  const dataFiltered = materials;

  // const notFound = !loading && !materials.length;

  return (
    <Card>
      <MaterialsTableToolbar
        filters={filters}
        onFilters={onFilters}
        numSelected={table.selected.length}
        categories={categories}
        onBulkDelete={handleBulkDelete}
        onExport={handleExport}
        onImport={onImport}
        onCreate={onCreate}
      />

      <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
        <Scrollbar>
          <Table size="medium" sx={{ minWidth: 800 }}>
            <MaterialsTableHead
              order={table.order}
              orderBy={table.orderBy}
              rowCount={dataFiltered.length}
              numSelected={table.selected.length}
              onSort={table.onSort}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  dataFiltered.map((row) => String(row._id))
                )
              }
            />

            <TableBody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9}>
                    <Alert severity="error" sx={{ m: 2 }}>
                      {error}
                    </Alert>
                  </td>
                </tr>
              ) : (
                dataFiltered.map((row) => (
                  <MaterialsTableRow
                    key={String(row._id)}
                    row={row}
                    selected={table.selected.includes(String(row._id))}
                    onSelectRow={() => handleSelectRow(String(row._id))}
                    onEdit={() => handleEditMaterial(row)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </TableContainer>

      <TablePagination
        component="div"
        page={table.page}
        count={totalCount}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.onChangePage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        onRowsPerPageChange={table.onChangeRowsPerPage}
      />

      <ConfirmationDialog
        open={deleteConfirmOpen}
        title={t('materials.deleteMaterial')}
        message={t('materials.deleteConfirmMessage')}
        confirmText={t('materials.delete')}
        cancelText={t('materials.cancel')}
        confirmColor="error"
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        loading={deleteLoading}
        icon="solar:trash-bin-trash-bold"
      />

      {selectedMaterial && (
        <MaterialsQuickEditForm
          open={editFormOpen}
          onClose={handleCloseEditForm}
          material={selectedMaterial}
        />
      )}
    </Card>
  );
}
