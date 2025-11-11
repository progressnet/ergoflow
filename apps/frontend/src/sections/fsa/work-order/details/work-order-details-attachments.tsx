'use client';

import type {FileMetadata} from 'src/components/upload/types';

import useSWR from 'swr';
import {useMemo, useState, useEffect} from 'react';

import {Box, Card, Chip, Stack, Avatar, Collapse, IconButton, Typography} from '@mui/material';

import {extractFileMetadataFromUrl} from 'src/utils/file-url-converter';

import {useTranslate} from 'src/locales/use-locales';
import axiosInstance, {endpoints} from 'src/lib/axios';

import {Iconify} from 'src/components/iconify';
import {MultiFilePreview} from 'src/components/upload';

import {useAuthContext} from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

type Attachment = {
  name: string;
  url: string;
  mimetype: string; // Changed from 'type' to 'mimetype' for consistency with FileMetadata
  size: number;
  filename?: string; // Backend filename for signed URL generation
};

type GroupedAttachment = {
  source: 'workOrder' | 'task' | 'subtask';
  sourceName: string;
  sourceId: string;
  taskTitle?: string;
  subtaskTitle?: string;
  attachment: Attachment;
};

type Props = {
  attachments: Attachment[];
  workOrderId: string;
  onChangeAction?: (attachments: Attachment[]) => void;
};

export function WorkOrderDetailsAttachments({ attachments, workOrderId }: Props) {
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>(attachments);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    workOrder: true,
    tasks: true,
    subtasks: true,
  });
  const { t } = useTranslate('common');
  const { tenant } = useAuthContext();
  const tenantId = tenant?._id;

  // Fetch all tasks for this work order
  const { data: tasksResponse } = useSWR(
    `${endpoints.kanban}?workOrderId=${workOrderId}`,
    (url: string) => axiosInstance.get(url).then((r) => r.data),
    { revalidateOnFocus: true }
  );

  // Memoize tasks to prevent unnecessary re-renders
  const tasks = useMemo(() => tasksResponse?.data?.board?.tasks || [], [tasksResponse]);

  // Update uploadedAttachments when props change (e.g., from SWR refresh)
  useEffect(() => {
    setUploadedAttachments(attachments);
  }, [attachments]);

  // Group all attachments by source (computed with useMemo)


  // Group by source type
  // Note: MultiFilePreview will handle signed URL generation automatically
  const groupedAttachments = useMemo(() => {
    const grouped: GroupedAttachment[] = [];

    // 1. Work order attachments
    uploadedAttachments.forEach((att) => {
      const fileUrl = att.url;

      grouped.push({
        source: 'workOrder',
        sourceName: t('workOrder', {defaultValue: 'Work Order'}),
        sourceId: workOrderId,
        attachment: {
          ...att,
          url: fileUrl,
        },
      });
    });

    // 2. Task and subtask attachments
    tasks.forEach((task: any) => {
      // Task attachments (stored as string URLs, not objects)
      if (task.attachments && Array.isArray(task.attachments)) {
        task.attachments.forEach((taskAtt: any) => {
          // Task attachments are strings (URLs), not objects
          if (typeof taskAtt === 'string') {
            // Try to extract metadata from URL (includes scope)
            const extracted = extractFileMetadataFromUrl(taskAtt);
            const filename = extracted?.filename || decodeURIComponent(taskAtt.split('/').pop()?.split('?')[0] || '');

            // Guess mime type from file extension
            const ext = filename.split('.').pop()?.toLowerCase() || '';
            let mimetype = 'application/octet-stream';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
              mimetype = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            else if (ext === 'pdf') mimetype = 'application/pdf';
            else if (['doc', 'docx'].includes(ext)) mimetype = 'application/msword';
            else if (['xls', 'xlsx'].includes(ext)) mimetype = 'application/vnd.ms-excel';
            else if (['zip', 'rar'].includes(ext)) mimetype = 'application/zip';

            grouped.push({
              source: 'task',
              sourceName: t('task', {defaultValue: 'Task'}),
              sourceId: extracted?.ownerId || task._id,
              taskTitle: task.name || task.title,
              attachment: {
                name: filename,
                url: taskAtt,
                mimetype, // Use 'mimetype' instead of 'type' for consistency
                size: 0, // Size not available for task attachments
                filename: extracted?.filename, // Add filename for signed URL generation
              },
            });
          } else if (taskAtt && typeof taskAtt === 'object') {
            // In case task attachments are objects (future compatibility)
            grouped.push({
              source: 'task',
              sourceName: t('task', {defaultValue: 'Task'}),
              sourceId: task._id,
              taskTitle: task.name || task.title,
              attachment: {
                name: taskAtt.originalName || taskAtt.name || taskAtt.filename,
                url: taskAtt.url,
                mimetype: taskAtt.mimetype || taskAtt.type || 'application/octet-stream', // Use 'mimetype' consistently
                size: taskAtt.size || 0,
              },
            });
          }
        });
      }

      // Subtask attachments (stored as objects with metadata)
      if (task.subtasks && Array.isArray(task.subtasks)) {
        task.subtasks.forEach((subtask: any) => {
          if (subtask.attachments && Array.isArray(subtask.attachments)) {
            subtask.attachments.forEach((subtaskAtt: any) => {
              // Subtask attachments are objects with full metadata
              const url = subtaskAtt.url || `/api/v1/uploads/${subtaskAtt.filename}`;
              grouped.push({
                source: 'subtask',
                sourceName: t('subtask', {defaultValue: 'Subtask'}),
                sourceId: subtask._id,
                taskTitle: task.name || task.title,
                subtaskTitle: subtask.title,
                attachment: {
                  name: subtaskAtt.originalName || subtaskAtt.filename || subtaskAtt.name,
                  url,
                  mimetype: subtaskAtt.mimetype || subtaskAtt.type || 'application/octet-stream', // Use 'mimetype' consistently
                  size: subtaskAtt.size || 0,
                },
              });
            });
          }
        });
      }
    });

    return grouped;
  }, [uploadedAttachments, tasks, workOrderId, t]);
  const workOrderAttachments = groupedAttachments.filter((g) => g.source === 'workOrder');
  const taskAttachments = groupedAttachments.filter((g) => g.source === 'task');
  const subtaskAttachments = groupedAttachments.filter((g) => g.source === 'subtask');

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Convert grouped attachments to FileMetadata for MultiFilePreview
  const convertGroupToFileMetadata = (groupAttachments: GroupedAttachment[]): FileMetadata[] =>
    groupAttachments.map((item) => {
      // Try to extract metadata from URL (includes scope, ownerId, etc.)
      const extracted = item.attachment.url ? extractFileMetadataFromUrl(item.attachment.url) : null;

      // Use extracted scope if available, otherwise use default based on source
      const scope = extracted?.scope || (
        item.source === 'workOrder' ? 'work_orders' :
        item.source === 'task' ? 'tasks' :
        'subtasks'
      );

      const ownerId = extracted?.ownerId || item.sourceId;
      const filename = extracted?.filename || item.attachment.filename || item.attachment.name;

      return {
        filename,
        originalName: item.attachment.name,
        url: item.attachment.url,
        size: item.attachment.size,
        mimetype: item.attachment.mimetype, // Use mimetype consistently
        scope,
        ownerId,
        tenantId: extracted?.tenantId || tenantId, // Use extracted tenantId if available
      };
    });

  const renderAttachmentGroup = (
    groupTitle: string,
    groupKey: string,
    groupAttachments: GroupedAttachment[],
    icon: string,
    color: string
  ) => {
    if (groupAttachments.length === 0) return null;

    // Convert to FileMetadata for MultiFilePreview
    const groupFiles = convertGroupToFileMetadata(groupAttachments);

    return (
      <Card sx={{ mb: 2 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            p: 2,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => toggleGroup(groupKey)}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              sx={{
                bgcolor: `${color}.lighter`,
                color: `${color}.main`,
                width: 40,
                height: 40,
              }}
            >
              <Iconify icon={icon} width={24} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1">{groupTitle}</Typography>
              <Typography variant="caption" color="text.secondary">
                {groupAttachments.length} {groupAttachments.length === 1 ? 'file' : 'files'}
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small">
            <Iconify
              icon={
                expandedGroups[groupKey]
                  ? 'solar:alt-arrow-up-linear'
                  : 'solar:alt-arrow-down-linear'
              }
            />
          </IconButton>
        </Stack>

        <Collapse in={expandedGroups[groupKey]}>
          <Box sx={{ p: 2, pt: 0 }}>
            <MultiFilePreview
              files={groupFiles}
              thumbnail={{ sx: { width: 80, height: 80 } }}
              onRemove={undefined} // Read-only for grouped attachments
            />
          </Box>
        </Collapse>
      </Card>
    );
  };

  const totalFiles = groupedAttachments.length;

  return (
    <Stack spacing={3}>
      {/* Summary */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={2}>
          <Iconify icon="solar:file-bold-duotone" width={24} />
          <Typography variant="h6">
            {t('allAttachments', { defaultValue: 'All Attachments' })}
          </Typography>
          <Chip label={`${totalFiles} ${totalFiles === 1 ? 'file' : 'files'}`} size="small" />
        </Stack>
      </Stack>

      {/* Grouped Attachments */}
      {totalFiles === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'background.neutral' }}>
              <Iconify icon="solar:file-text-broken" width={32} />
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {t('noAttachments', { defaultValue: 'No attachments yet' })}
            </Typography>
          </Stack>
        </Card>
      ) : (
        <>
          {renderAttachmentGroup(
            t('workOrderAttachments', { defaultValue: 'Work Order Files' }),
            'workOrder',
            workOrderAttachments,
            'solar:document-bold-duotone',
            'primary'
          )}

          {renderAttachmentGroup(
            t('taskAttachments', { defaultValue: 'Task Files' }),
            'tasks',
            taskAttachments,
            'solar:checklist-bold-duotone',
            'info'
          )}

          {renderAttachmentGroup(
            t('subtaskAttachments', { defaultValue: 'Subtask Files' }),
            'subtasks',
            subtaskAttachments,
            'solar:list-check-bold-duotone',
            'success'
          )}
        </>
      )}
    </Stack>
  );
}
