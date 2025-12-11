'use client';

import type { Dayjs } from 'dayjs';
import type { PaperProps } from '@mui/material/Paper';
import type { DialogProps } from '@mui/material/Dialog';
import type { UseDateRangePickerReturn } from './use-date-range-picker';

import dayjs from 'dayjs';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import FormHelperText from '@mui/material/FormHelperText';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DateCalendar, dateCalendarClasses } from '@mui/x-date-pickers/DateCalendar';

import { useTranslate } from 'src/locales/use-locales';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type TimeSelectorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  timeOptions: string[];
};

function TimeSelector({ label, value, onChange, timeOptions }: TimeSelectorProps) {
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      slotProps={{
        select: {
          native: true,
        },
      }}
      sx={{ minWidth: 100 }}
    >
      {timeOptions.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </TextField>
  );
}

// ----------------------------------------------------------------------

export type RepeatSettings = {
  enabled: boolean;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customType?: 'weeks' | 'months';
  frequency?: number;
};

export type ReminderSettings = {
  enabled: boolean;
  type: '1hour' | '1day' | '1week' | '1month';
};

export type CustomDateRangePickerProps = DialogProps &
  UseDateRangePickerReturn & {
    onSubmit?: (data?: { repeat?: RepeatSettings; reminder?: ReminderSettings }) => void;
    enableTime?: boolean;
    enableRepeat?: boolean;
    enableReminder?: boolean;
    existingRepeat?: RepeatSettings;
    existingReminder?: ReminderSettings;
  };

export function CustomDateRangePicker({
  open,
  error,
  onClose,
  onSubmit,
  /********/
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  /********/
  slotProps,
  variant = 'input',
  title = 'Select date range',
  enableTime = false,
  enableRepeat = false,
  enableReminder = false,
  existingRepeat,
  existingReminder,
  ...other
}: CustomDateRangePickerProps) {
  const { t } = useTranslate();
  const mdUp = useMediaQuery((theme) => theme.breakpoints.up('md'));

  const isCalendarView = mdUp && variant === 'calendar';

  // State for repeat and reminder settings
  const [repeatSettings, setRepeatSettings] = useState<RepeatSettings>(
    existingRepeat || {
      enabled: false,
      type: 'daily',
      customType: 'weeks',
      frequency: 1,
    }
  );

  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(
    existingReminder || {
      enabled: false,
      type: '1hour',
    }
  );

  const handleSubmit = useCallback(() => {
    const data = {
      ...(enableRepeat && { repeat: repeatSettings }),
      ...(enableReminder && { reminder: reminderSettings }),
    };
    onClose();
    onSubmit?.(Object.keys(data).length > 0 ? data : undefined);
  }, [onClose, onSubmit, enableRepeat, enableReminder, repeatSettings, reminderSettings]);

  // Update state when existing data changes
  useEffect(() => {
    if (existingRepeat) {
      setRepeatSettings(existingRepeat);
    } else {
      // Reset to default when no existing data
      setRepeatSettings({
        enabled: false,
        type: 'daily',
        customType: 'weeks',
        frequency: 1,
      });
    }
  }, [existingRepeat]);

  useEffect(() => {
    if (existingReminder) {
      setReminderSettings(existingReminder);
    } else {
      // Reset to default when no existing data
      setReminderSettings({
        enabled: false,
        type: '1hour',
      });
    }
  }, [existingReminder]);

  // Helper functions for time handling
  const handleStartTimeChange = useCallback(
    (newTime: string) => {
      if (startDate && newTime) {
        const [hours, minutes] = newTime.split(':').map(Number);
        const newStartDate = startDate.hour(hours).minute(minutes);
        onChangeStartDate(newStartDate);
      }
    },
    [startDate, onChangeStartDate]
  );

  const handleEndTimeChange = useCallback(
    (newTime: string) => {
      if (endDate && newTime) {
        const [hours, minutes] = newTime.split(':').map(Number);
        const newEndDate = endDate.hour(hours).minute(minutes);
        onChangeEndDate(newEndDate);
      }
    },
    [endDate, onChangeEndDate]
  );

  // Preserve time when date changes
  const handleStartDateChange = useCallback(
    (newDate: Dayjs | null) => {
      if (newDate) {
        if (startDate) {
          // Preserve the existing time
          const preservedStartDate = newDate.hour(startDate.hour()).minute(startDate.minute());
          onChangeStartDate(preservedStartDate);
        } else {
          // No previous date - set a sensible default time
          // Use current time if today, or 9:00 AM if future date
          const isToday = newDate.isSame(dayjs(), 'day');
          const defaultTime = isToday
            ? dayjs() // Use current time for today
            : newDate.hour(9).minute(0); // Use 9:00 AM for future dates
          onChangeStartDate(defaultTime);
        }
      } else {
        onChangeStartDate(newDate);
      }
    },
    [startDate, onChangeStartDate]
  );

  const handleEndDateChange = useCallback(
    (newDate: Dayjs | null) => {
      if (newDate) {
        if (endDate) {
          // Preserve the existing time
          const preservedEndDate = newDate.hour(endDate.hour()).minute(endDate.minute());
          onChangeEndDate(preservedEndDate);
        } else {
          // No previous date - set a sensible default time
          // Use current time + 1 hour if today, or start time + 1 hour if we have start date, or 10:00 AM
          const isToday = newDate.isSame(dayjs(), 'day');
          let defaultTime;

          if (startDate) {
            // If we have a start date, make end date 1 hour later
            defaultTime = newDate.hour(startDate.hour()).minute(startDate.minute()).add(1, 'hour');
          } else if (isToday) {
            // Use current time + 1 hour for today
            defaultTime = dayjs().add(1, 'hour');
          } else {
            // Use 10:00 AM for future dates
            defaultTime = newDate.hour(10).minute(0);
          }

          onChangeEndDate(defaultTime);
        }
      } else {
        onChangeEndDate(newDate);
      }
    },
    [endDate, startDate, onChangeEndDate]
  );

  const getTimeString = useCallback((date: Dayjs | null) => {
    if (!date) {
      // Default to current hour with 00 minutes
      const currentHour = dayjs().format('HH:00');
      return currentHour;
    }
    return date.format('HH:mm');
  }, []);

  // Generate time options in 15-minute intervals
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  }, []);

  const dialogPaperSx = (slotProps?.paper as PaperProps)?.sx;

  return (
    <Dialog
      fullWidth
      open={open}
      onClose={onClose}
      maxWidth={isCalendarView ? false : 'xs'}
      slotProps={{
        ...slotProps,
        paper: {
          ...slotProps?.paper,
          sx: [
            { ...(isCalendarView && { maxWidth: 720 }) },
            ...(Array.isArray(dialogPaperSx) ? dialogPaperSx : [dialogPaperSx]),
          ],
        },
      }}
      {...other}
    >
      <DialogTitle>{title}</DialogTitle>

      <DialogContent
        sx={[
          (theme) => ({
            gap: 3,
            display: 'flex',
            overflow: 'unset',
            flexDirection: isCalendarView ? 'row' : 'column',
            [`& .${dateCalendarClasses.root}`]: {
              borderRadius: 2,
              border: `dashed 1px ${theme.vars?.palette.divider}`,
            },
          }),
        ]}
      >
        {isCalendarView ? (
          <>
            <div>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('startDay', { defaultValue: 'Start day' })}
              </Typography>
              <DateCalendar value={startDate} onChange={handleStartDateChange} />
              {enableTime && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, px: 1 }}>
                  <TimeSelector
                    label={t('startTime', { defaultValue: 'Start time' })}
                    value={getTimeString(startDate)}
                    onChange={handleStartTimeChange}
                    timeOptions={timeOptions}
                  />
                </Stack>
              )}
            </div>

            <div>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t('endDay', { defaultValue: 'End day' })}
              </Typography>
              <DateCalendar value={endDate} onChange={handleEndDateChange} />
              {enableTime && (
                <Stack direction="row" spacing={1} sx={{ mt: 2, px: 1 }}>
                  <TimeSelector
                    label={t('endTime', { defaultValue: 'End time' })}
                    value={getTimeString(endDate)}
                    onChange={handleEndTimeChange}
                    timeOptions={timeOptions}
                  />
                </Stack>
              )}
            </div>
          </>
        ) : (
          <>
            {enableTime ? (
              <>
                <DateTimePicker
                  label={t('startDateTime', { defaultValue: 'Start date & time' })}
                  value={startDate}
                  onChange={onChangeStartDate}
                  minutesStep={30}
                  ampm={false}
                />
                <DateTimePicker
                  label={t('endDateTime', { defaultValue: 'End date & time' })}
                  value={endDate}
                  onChange={onChangeEndDate}
                  minutesStep={30}
                  ampm={false}
                />
              </>
            ) : (
              <Stack direction="column" spacing={1}>
                <Stack direction="row" spacing={1}>
                  <DatePicker
                    label={t('startDate', { defaultValue: 'Start date' })}
                    value={startDate}
                    onChange={onChangeStartDate}
                  />
                  <DatePicker
                    label={t('endDate', { defaultValue: 'End date' })}
                    value={endDate}
                    onChange={onChangeEndDate}
                  />
                </Stack>
              </Stack>
            )}
          </>
        )}
      </DialogContent>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mt: 2 }}
        alignItems="flex-start"
        justifyContent="center"
      >
        {/* Repeat Options */}
        {enableRepeat && (
          <>
            <Divider sx={{ my: 3 }} />
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="center">
                <Switch
                  checked={repeatSettings.enabled}
                  onChange={(e) =>
                    setRepeatSettings((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                />
                <Iconify icon="solar:refresh-square-bold" width={18} />
              </Stack>

              {repeatSettings.enabled && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                  {t('repeat.helpText', {
                    defaultValue:
                      'Create recurring tasks automatically based on the schedule below',
                  })}
                </Typography>
              )}

              {repeatSettings.enabled && (
                <Stack spacing={2} sx={{ width: '100%' }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('repeat.type', { defaultValue: 'Repeat Type' })}</InputLabel>
                    <Select
                      value={repeatSettings.type || 'daily'}
                      label={t('repeat.type', { defaultValue: 'Repeat Type' })}
                      onChange={(e) =>
                        setRepeatSettings((prev) => ({
                          ...prev,
                          type: e.target.value as RepeatSettings['type'],
                        }))
                      }
                    >
                      <MenuItem value="daily">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Iconify icon="solar:calendar-date-bold" width={16} />
                          <span>Daily</span>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="weekly">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Iconify icon="solar:calendar-bold" width={16} />
                          <span>Weekly</span>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="monthly">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Iconify icon="solar:calendar-minimalistic-bold" width={16} />
                          <span>Monthly</span>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="yearly">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Iconify icon="solar:calendar-mark-bold" width={16} />
                          <span>Yearly</span>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="custom">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Iconify icon="solar:settings-bold" width={16} />
                          <span>Custom</span>
                        </Stack>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {repeatSettings.type === 'custom' && (
                    <Stack spacing={2} sx={{ width: '100%' }}>
                      <Stack
                        direction={mdUp ? 'row' : 'column'}
                        spacing={2}
                        alignItems={mdUp ? 'center' : 'stretch'}
                        sx={{ width: '100%' }}
                      >
                        <Typography variant="body2">
                          {t('repeat.every', { defaultValue: 'Every' })}
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          sx={{ width: 96 }}
                          value={repeatSettings.frequency || 1}
                          slotProps={{
                            htmlInput: { min: 1, max: 26 },
                          }}
                          onChange={(e) =>
                            setRepeatSettings((prev) => ({
                              ...prev,
                              frequency: parseInt(e.target.value, 10),
                            }))
                          }
                        />
                        <FormControl
                          size="small"
                          sx={{ minWidth: mdUp ? 120 : '100%' }}
                          fullWidth={!mdUp}
                        >
                          <Select
                            value={repeatSettings.customType || 'weeks'}
                            onChange={(e) =>
                              setRepeatSettings((prev) => ({
                                ...prev,
                                customType: e.target.value as RepeatSettings['customType'],
                              }))
                            }
                          >
                            <MenuItem value="weeks">
                              {t('repeat.weeks', { defaultValue: 'Week(s)' })}
                            </MenuItem>
                            <MenuItem value="months">
                              {t('repeat.months', { defaultValue: 'Month(s)' })}
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {t('repeat.frequencyHint', {
                          defaultValue: 'Frequency can be set from 1 to 26',
                        })}{' '}
                        {repeatSettings.customType || t('repeat.weeks', { defaultValue: 'weeks' })}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              )}
              {/* Summary of repeat settings */}
              {enableRepeat && repeatSettings.enabled && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    alignItems: 'center',
                    mt: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    <span
                      style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}
                    >
                      <Iconify icon="solar:refresh-square-bold" width={16} />
                    </span>
                    {t('repeat.summaryPrefix', { defaultValue: 'Task will repeat' })}{' '}
                    {repeatSettings.type === 'daily' &&
                      t('repeat.everyDay', { defaultValue: 'every day' })}
                    {repeatSettings.type === 'weekly' &&
                      t('repeat.everyWeek', { defaultValue: 'every week' })}
                    {repeatSettings.type === 'monthly' &&
                      t('repeat.everyMonth', { defaultValue: 'every month' })}
                    {repeatSettings.type === 'yearly' &&
                      t('repeat.everyYear', { defaultValue: 'every year' })}
                    {repeatSettings.type === 'custom' &&
                      t('repeat.everyCustom', {
                        defaultValue: 'every {{count}} {{unit}}',
                        count: repeatSettings.frequency,
                        unit: repeatSettings.customType,
                      })}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </>
        )}

        {/* Reminder Options */}
        {enableReminder && (
          <>
            <Divider sx={{ my: 3 }} />
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="center">
                <Switch
                  checked={reminderSettings.enabled}
                  onChange={(e) =>
                    setReminderSettings((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                />
                <Iconify icon="solar:bell-bold" width={18} />
              </Stack>

              {reminderSettings.enabled && (
                <FormControl fullWidth size="small">
                  <InputLabel>{t('reminder.time', { defaultValue: 'Reminder Time' })}</InputLabel>
                  <Select
                    value={reminderSettings.type || '1hour'}
                    label={t('reminder.time', { defaultValue: 'Reminder Time' })}
                    onChange={(e) =>
                      setReminderSettings((prev) => ({
                        ...prev,
                        type: e.target.value as ReminderSettings['type'],
                      }))
                    }
                  >
                    <MenuItem value="1hour">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:clock-circle-bold" width={16} />
                        <span>{t('reminder.1hour', { defaultValue: '1 Hour Before' })}</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="1day">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:calendar-date-bold" width={16} />
                        <span>{t('reminder.1day', { defaultValue: '1 Day Before' })}</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="1week">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:calendar-bold" width={16} />
                        <span>{t('reminder.1week', { defaultValue: '1 Week Before' })}</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="1month">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:calendar-minimalistic-bold" width={16} />
                        <span>{t('reminder.1month', { defaultValue: '1 Month Before' })}</span>
                      </Stack>
                    </MenuItem>
                  </Select>
                </FormControl>
              )}

              {/* Summary of reminder settings */}
              {reminderSettings.enabled && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    <span
                      style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}
                    >
                      <Iconify icon="solar:mailbox-bold" width={16} />
                    </span>
                    {t('reminder.summaryPrefix', { defaultValue: 'Email reminder will be sent' })}{' '}
                    {reminderSettings.type === '1hour' &&
                      t('reminder.in1hour', { defaultValue: '1 hour' })}
                    {reminderSettings.type === '1day' &&
                      t('reminder.in1day', { defaultValue: '1 day' })}
                    {reminderSettings.type === '1week' &&
                      t('reminder.in1week', { defaultValue: '1 week' })}
                    {reminderSettings.type === '1month' &&
                      t('reminder.in1month', { defaultValue: '1 month' })}{' '}
                    {t('reminder.beforeTaskDue', { defaultValue: 'before the task is due' })}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </>
        )}
      </Stack>
      <DialogActions>
        {error && (
          <FormHelperText error sx={{ px: 2 }}>
            End date must be later than start date
          </FormHelperText>
        )}
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={error} variant="contained" onClick={handleSubmit}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
