import type { IMaterial } from 'src/lib/models/Material';

import useSWR, { mutate } from 'swr';
import { useState, useEffect, useCallback } from 'react';

import {
  Box,
  Card,
  Chip,
  Table,
  Button,
  Avatar,
  Dialog,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  TextField,
  IconButton,
  Typography,
  DialogTitle,
  Autocomplete,
  DialogActions,
  DialogContent,
  TableContainer,
  InputAdornment,
} from '@mui/material';

import axiosInstance, { endpoints } from 'src/lib/axios';
import { MaterialService } from 'src/lib/services/material-service';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

interface TaskMaterial {
  _id: string;
  materialId: string;
  material: IMaterial;
  quantity: number;
  unitCost: number;
  totalCost: number;
  addedBy: {
    _id: string;
    name: string;
    email?: string;
  };
  addedAt: string;
}

interface KanbanDetailsMaterialsProps {
  taskId: string;
}

interface AddMaterialDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (materialId: string, quantity: number) => void;
}

// ----------------------------------------------------------------------

function AddMaterialDialog({ open, onClose, onAdd }: AddMaterialDialogProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<IMaterial | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [materials, setMaterials] = useState<IMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMaterials = useCallback(async (search: string = '') => {
    setLoading(true);
    try {
      const response = await MaterialService.getAllMaterials({
        name: search,
        category: '',
        status: 'active',
        limit: 20,
      });

      if (response.success) {
        setMaterials(response.data);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch materials when dialog opens
  useEffect(() => {
    if (open) {
      fetchMaterials('');
    }
  }, [open, fetchMaterials]);

  const handleAdd = () => {
    if (selectedMaterial && quantity > 0) {
      onAdd(String(selectedMaterial._id), quantity);
      setSelectedMaterial(null);
      setQuantity(1);
      setSearchTerm('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedMaterial(null);
    setQuantity(1);
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Material to Task</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <Autocomplete
            options={materials}
            value={selectedMaterial}
            onChange={(_, newValue) => setSelectedMaterial(newValue)}
            onInputChange={(_, newValue) => {
              setSearchTerm(newValue);
              fetchMaterials(newValue);
            }}
            openOnFocus
            getOptionLabel={(option) => `${option.name} (${option.sku || 'No SKU'})`}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Materials"
                placeholder="Search or select a material..."
                slotProps={{
                  input: {
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify icon="eva:search-fill" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <Box component="li" key={key} {...otherProps}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.light' }}>
                      <Iconify icon="solar:box-bold" />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">{option.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {option.sku && <Chip label={option.sku} size="small" />}
                        {option.category && (
                          <Chip label={option.category} size="small" variant="outlined" />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {option.unitCost}€ per {option.unit} • Stock: {option.quantity}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            }}
            loading={loading}
            noOptionsText={searchTerm ? 'No materials found' : 'No materials available'}
          />

          {selectedMaterial && (
            <Card sx={{ p: 2, bgcolor: 'background.neutral' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <Iconify icon="solar:box-bold" />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2">{selectedMaterial.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedMaterial.unitCost}€ per {selectedMaterial.unit}
                  </Typography>
                </Box>
              </Box>
            </Card>
          )}

          <TextField
            type="number"
            label="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            inputProps={{ min: 1, step: 1 }}
            disabled={!selectedMaterial}
            slotProps={{
              input: {
                endAdornment: selectedMaterial && (
                  <InputAdornment position="end">{selectedMaterial.unit}</InputAdornment>
                ),
              },
            }}
          />

          {selectedMaterial && quantity > 0 && (
            <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
              <Typography variant="body2" color="success.darker">
                Total Cost: {(selectedMaterial.unitCost * quantity).toFixed(2)}€
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={!selectedMaterial || quantity <= 0}
        >
          Add Material
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

export function KanbanDetailsMaterials({ taskId }: KanbanDetailsMaterialsProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Fetch task materials
  const { data: materialsData, error } = useSWR(
    taskId ? endpoints.fsa.tasks.materials.list(taskId) : null,
    async (url) => {
      const response = await axiosInstance.get(url);
      return response.data;
    }
  );

  const taskMaterials: TaskMaterial[] = materialsData?.data || [];

  const handleAddMaterial = useCallback(
    async (materialId: string, quantity: number) => {
      try {
        await axiosInstance.post(endpoints.fsa.tasks.materials.add(taskId), {
          materialId,
          quantity,
        });

        // Refresh the materials data
        await mutate(endpoints.fsa.tasks.materials.list(taskId));
        toast.success('Material added to task');
      } catch (err) {
        console.error('Failed to add material:', err);
        toast.error('Failed to add material');
      }
    },
    [taskId]
  );

  const handleRemoveMaterial = useCallback(
    async (taskMaterialId: string) => {
      try {
        await axiosInstance.delete(endpoints.fsa.tasks.materials.remove(taskId, taskMaterialId));

        // Refresh the materials data
        await mutate(endpoints.fsa.tasks.materials.list(taskId));
        toast.success('Material removed from task');
      } catch (err) {
        console.error('Failed to remove material:', err);
        toast.error('Failed to remove material');
      }
    },
    [taskId]
  );

  const handleUpdateQuantity = useCallback(
    async (taskMaterialId: string, newQuantity: number) => {
      if (newQuantity <= 0) return;

      try {
        await axiosInstance.put(endpoints.fsa.tasks.materials.update(taskId, taskMaterialId), {
          quantity: newQuantity,
        });

        // Refresh the materials data
        await mutate(endpoints.fsa.tasks.materials.list(taskId));
        toast.success('Material quantity updated');
      } catch (err) {
        console.error('Failed to update material quantity:', err);
        toast.error('Failed to update material quantity');
      }
    },
    [taskId]
  );

  const totalCost = taskMaterials.reduce((sum, item) => sum + item.totalCost, 0);

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">Failed to load materials</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      {/* Header with Add button and total cost */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Materials ({taskMaterials.length})</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {taskMaterials.length > 0 && (
            <Chip label={`Total: ${totalCost.toFixed(2)}€`} color="primary" variant="outlined" />
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Material
          </Button>
        </Box>
      </Box>

      {/* Materials Table */}
      {taskMaterials.length > 0 ? (
        <TableContainer component={Card}>
          <Scrollbar>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="right">Unit Cost</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {taskMaterials.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.lighter' }}>
                          <Iconify icon="solar:box-bold" width={16} />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{item.material.name}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            {item.material.sku && <Chip label={item.material.sku} size="small" />}
                            {item.material.category && (
                              <Chip
                                label={item.material.category}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(e) => {
                          const newQuantity = Number(e.target.value);
                          if (newQuantity > 0) {
                            handleUpdateQuantity(item._id, newQuantity);
                          }
                        }}
                        inputProps={{ min: 1, step: 1 }}
                        sx={{ width: 80 }}
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <Typography variant="caption">{item.material.unit}</Typography>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{item.unitCost.toFixed(2)}€</Typography>
                      <Typography variant="caption" color="text.secondary">
                        per {item.material.unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" color="primary">
                        {item.totalCost.toFixed(2)}€
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveMaterial(item._id)}
                      >
                        <Iconify icon="mingcute:delete-2-line" width={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>
      ) : (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.neutral',
          }}
        >
          <Iconify icon="solar:box-outline" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No materials added
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            Add materials to track resources needed for this task
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add First Material
          </Button>
        </Box>
      )}

      {/* Add Material Dialog */}
      <AddMaterialDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddMaterial}
      />
    </Box>
  );
}
