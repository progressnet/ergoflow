'use client';

import useSWR from 'swr';
import { useEffect, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemButton from '@mui/material/ListItemButton';

import { useTranslate } from 'src/locales/use-locales';
import axiosInstance, { endpoints } from 'src/lib/axios';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { SearchNotFound } from 'src/components/search-not-found';

// ----------------------------------------------------------------------

const ITEM_HEIGHT = 64;

type Personnel = {
  _id: string;
  employeeId: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  role?: {
    name: string;
  };
};

type Props = {
  open: boolean;
  onCloseAction: () => void;
  selectedPersonnel?: Personnel[];
  onAssignAction?: (personnel: Personnel[]) => void;
};

export function WorkOrderPersonnelDialog({
  selectedPersonnel = [],
  open,
  onCloseAction,
  onAssignAction,
}: Props) {
  const [searchContact, setSearchContact] = useState('');
  const [selected, setSelected] = useState<Personnel[]>(selectedPersonnel);
  const { t } = useTranslate('common');

  const axiosFetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);
  const { data: personnelResp } = useSWR(endpoints.fsa.personnel.list, axiosFetcher);
  const personnel: Personnel[] = personnelResp?.data || [];

  const handleSearchContacts = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchContact(event.target.value);
  }, []);

  const dataFiltered = applyFilter({ inputData: personnel, query: searchContact });

  const notFound = !dataFiltered.length && !!searchContact;

  const handleSelectContact = useCallback(
    (contact: Personnel) => {
      const alreadySelected = selected.find((person) => person._id === contact._id);

      if (alreadySelected) {
        setSelected(selected.filter((person) => person._id !== contact._id));
      } else {
        setSelected([...selected, contact]);
      }
    },
    [selected]
  );

  const handleAssign = () => {
    if (onAssignAction) {
      onAssignAction(selected);
    }
    onCloseAction();
  };

  // Update selected when selectedPersonnel prop changes
  useEffect(() => {
    setSelected(selectedPersonnel);
  }, [selectedPersonnel]);

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onCloseAction}>
      <DialogTitle sx={{ pb: 0 }}>
        {t('assignPersonnel', { defaultValue: 'Assign Personnel' })}
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {t('assignPersonnelSubheader', {
            defaultValue: 'Select personnel to assign to this work order',
          })}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ overflow: 'unset' }}>
        <TextField
          fullWidth
          value={searchContact}
          onChange={handleSearchContacts}
          placeholder={t('searchPersonnelPlaceholder', { defaultValue: 'Search personnel...' })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {notFound ? (
          <SearchNotFound query={searchContact} sx={{ mt: 3, mb: 10 }} />
        ) : (
          <Scrollbar sx={{ height: ITEM_HEIGHT * 6 }}>
            {dataFiltered.map((person) => {
              const checked = selected.some((selectedPerson) => selectedPerson._id === person._id);

              return (
                <ListItemButton
                  key={person._id}
                  onClick={() => handleSelectContact(person)}
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    ...(checked && {
                      bgcolor: 'action.selected',
                    }),
                  }}
                >
                  <Avatar sx={{ mr: 2, width: 40, height: 40 }}>
                    {person.user?.name
                      ?.split(' ')
                      .map((n: string) => n.charAt(0))
                      .join('')
                      .toUpperCase() ||
                      person.employeeId?.charAt(0)?.toUpperCase() ||
                      'P'}
                  </Avatar>

                  <ListItemText
                    primary={person.user?.name || person.employeeId}
                    secondary={
                      <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                        {person.role?.name && `${person.role.name}`}
                        {person.user?.email && person.role?.name && ' • '}
                        {person.user?.email}
                      </Box>
                    }
                  />

                  <Iconify
                    icon={checked ? 'eva:checkmark-fill' : 'eva:plus-fill'}
                    sx={{
                      mr: 1,
                      color: checked ? 'primary.main' : 'text.disabled',
                    }}
                  />
                </ListItemButton>
              );
            })}
          </Scrollbar>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          <Button variant="outlined" onClick={onCloseAction} fullWidth>
            {t('cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button variant="contained" onClick={handleAssign} fullWidth>
            {t('assignCount', { defaultValue: 'Assign ({{count}})', count: selected.length })}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, query }: { inputData: Personnel[]; query: string }) {
  if (!query) return inputData;

  const queryLower = query.toLowerCase();

  return inputData.filter((person) => {
    const name = person.user?.name?.toLowerCase() || '';
    const email = person.user?.email?.toLowerCase() || '';
    const employeeId = person.employeeId?.toLowerCase() || '';
    const role = person.role?.name?.toLowerCase() || '';

    return (
      name.includes(queryLower) ||
      email.includes(queryLower) ||
      employeeId.includes(queryLower) ||
      role.includes(queryLower)
    );
  });
}
