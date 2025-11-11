import type { FileMetadata, FilesUploadType } from '../types';
import type { FileThumbnailProps } from '../../file-thumbnail';

import React from 'react';
import { varAlpha, mergeClasses } from 'minimal-shared/utils';

import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { generateSignedUrlOnce } from 'src/hooks/use-signed-url';

import { fData } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';

import { Iconify } from '../../iconify';
import { uploadClasses } from '../classes';
import { getFileMeta, FileThumbnail } from '../../file-thumbnail';

// ----------------------------------------------------------------------

export type PreviewOrientation = 'horizontal' | 'vertical';

/**
 * Helper to add JWT token to uploads URLs for backward compatibility
 */
function addJwtTokenToUploadsUrl(url: string): string {
  try {
    // Check if it's an uploads route without a token
    const isUploads = /\/api\/v1\/uploads\//.test(url);
    const hasToken = /[?&]token=/.test(url);

    if (isUploads && !hasToken && typeof window !== 'undefined') {
      const token = window.sessionStorage.getItem('jwt_access_token');
      if (token) {
        return url + (url.includes('?') ? '&' : '?') + `token=${token}`;
      }
    }
  } catch {
    // Ignore errors
  }
  return url;
}

/**
 * Custom hook to handle file previews for FilesUploadType (includes FileMetadata)
 */
function useFilesPreviewExtended(files: FilesUploadType) {
  const [filesPreview, setFilesPreview] = React.useState<
    Array<{
      file: File | string | FileMetadata;
      previewUrl: string;
    }>
  >([]);

  React.useEffect(() => {
    const previews = files.map((file) => {
      let previewUrl = '';

      if (file instanceof File) {
        previewUrl = URL.createObjectURL(file);
      } else if (typeof file === 'string') {
        const isAbsolute = /^https?:\/\//i.test(file);
        const url = isAbsolute ? file : `${CONFIG.serverUrl}${file}`;
        // Add JWT token for backward compatibility with migrated URLs
        previewUrl = addJwtTokenToUploadsUrl(url);
      } else if (file && typeof file === 'object') {
        // FileMetadata object
        const metadata = file as FileMetadata;
        if (metadata.signedUrl) {
          previewUrl = metadata.signedUrl.startsWith('http')
            ? metadata.signedUrl
            : `${CONFIG.serverUrl}${metadata.signedUrl}`;
        } else if (metadata.url) {
          const url = metadata.url.startsWith('http')
            ? metadata.url
            : `${CONFIG.serverUrl}${metadata.url}`;
          // Add JWT token for backward compatibility with migrated URLs
          previewUrl = addJwtTokenToUploadsUrl(url);
        }
      }

      return {
        file,
        previewUrl,
      };
    });

    setFilesPreview(previews);

    // Cleanup object URLs on unmount
    return () => {
      previews.forEach(({ file, previewUrl }) => {
        if (file instanceof File && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
      });
    };
  }, [files]);

  return { filesPreview };
}

export type MultiFilePreviewProps = React.ComponentProps<typeof PreviewList> & {
  files: FilesUploadType;
  startNode?: React.ReactNode;
  endNode?: React.ReactNode;
  orientation?: PreviewOrientation;
  thumbnail?: Omit<FileThumbnailProps, 'file'>;
  onRemove?: (file: File | string | FileMetadata) => void;
};

/**
 * Helper function to extract file URL from various formats
 */
function getFileUrl(file: File | string | FileMetadata): string | null {
  if (typeof file === 'string') {
    return file;
  }
  if (file instanceof File) {
    return null; // Will use blob URL from useFilesPreview
  }
  // FileMetadata object - prefer signedUrl over url
  return file.signedUrl || file.url || null;
}

/**
 * Helper function to get file metadata for signed URL generation
 */
function getFileMetadata(file: File | string | FileMetadata): FileMetadata | null {
  if (typeof file === 'object' && !(file instanceof File)) {
    return file as FileMetadata;
  }
  return null;
}

/**
 * Helper function to convert FileMetadata to a format that FileThumbnail can handle
 */
function getFileThumbnailFile(file: File | string | FileMetadata): File | string | null {
  if (file instanceof File || typeof file === 'string') {
    return file;
  }
  // Map FileMetadata to a string that preserves type/format detection in FileThumbnail
  const metadata = file as FileMetadata;
  return metadata.mimetype || metadata.filename || metadata.url || null;
}

export function MultiFilePreview({
  sx,
  onRemove,
  className,
  endNode,
  startNode,
  files = [],
  orientation = 'horizontal',
  thumbnail: thumbnailProps,
  ...other
}: MultiFilePreviewProps) {
  const { filesPreview } = useFilesPreviewExtended(files);
  const [signedUrls, setSignedUrls] = React.useState<Map<number, string>>(new Map());
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    file: File | string | FileMetadata | null;
    fileName: string;
  }>({
    open: false,
    file: null,
    fileName: '',
  });

  // Generate signed URLs for FileMetadata objects that need them
  React.useEffect(() => {
    const generateUrls = async () => {
      const newSignedUrls = new Map<number, string>();

      await Promise.all(
        files.map(async (file, index) => {
          // Skip if already has a URL
          const existingUrl = getFileUrl(file);
          if (existingUrl && (existingUrl.startsWith('http') || existingUrl.startsWith('blob:'))) {
            return;
          }

          // Check if it's FileMetadata with required fields
          const metadata = getFileMetadata(file);
          if (metadata && metadata.filename && metadata.scope && metadata.ownerId) {
            try {
              const signedUrl = await generateSignedUrlOnce(
                {
                  filename: metadata.filename,
                  scope: metadata.scope,
                  ownerId: metadata.ownerId,
                  tenantId: metadata.tenantId,
                },
                { action: 'view', expiresInMinutes: 60 }
              );
              // Add server URL if it's a relative path
              const fullUrl = signedUrl.startsWith('http')
                ? signedUrl
                : `${CONFIG.serverUrl}${signedUrl}`;
              newSignedUrls.set(index, fullUrl);
            } catch (error) {
              console.error('Failed to generate signed URL:', error);
            }
          }
        })
      );

      if (newSignedUrls.size > 0) {
        setSignedUrls(newSignedUrls);
      }
    };

    generateUrls();
  }, [files]);

  const handleOpenInNewTab = async (file: File | string | FileMetadata) => {
    try {
      // Get the URL
      let fileUrl = getFileUrl(file);

      // If it's a FileMetadata object with metadata but no URL, generate one
      const metadata = getFileMetadata(file);
      if (metadata && metadata.filename && metadata.scope && metadata.ownerId && !fileUrl) {
        try {
          const signedUrl = await generateSignedUrlOnce(
            {
              filename: metadata.filename,
              scope: metadata.scope,
              ownerId: metadata.ownerId,
              tenantId: metadata.tenantId,
            },
            { action: 'view', expiresInMinutes: 60 }
          );
          fileUrl = `${CONFIG.serverUrl}${signedUrl}`;
        } catch (error) {
          console.error('Failed to generate signed URL:', error);
        }
      }

      if (!fileUrl) {
        console.error('No URL available');
        return;
      }

      // Add full URL if relative
      if (!fileUrl.startsWith('http')) {
        fileUrl = `${CONFIG.serverUrl}${fileUrl}`;
      }

      // Add JWT token for backward compatibility with migrated URLs
      fileUrl = addJwtTokenToUploadsUrl(fileUrl);

      // Open in new tab
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const handleRemoveClick = (file: File | string | FileMetadata, fileMeta: any) => {
    if (!onRemove) return;

    setConfirmDialog({
      open: true,
      file,
      fileName: fileMeta.name,
    });
  };

  const handleConfirmRemove = () => {
    if (confirmDialog.file && onRemove) {
      onRemove(confirmDialog.file);
    }
    setConfirmDialog({ open: false, file: null, fileName: '' });
  };

  const handleCancelRemove = () => {
    setConfirmDialog({ open: false, file: null, fileName: '' });
  };

  const renderList = () =>
    filesPreview.map(({ file, previewUrl }, index) => {
      const fileMeta = getFileMeta(file);

      // Priority: 1) Generated signed URL, 2) Existing URL, 3) Blob preview
      const generatedSignedUrl = signedUrls.get(index);
      const fileUrl = getFileUrl(file);
      const displayUrl = generatedSignedUrl || fileUrl || previewUrl;

      // Generate unique key for each file
      const getUniqueKey = () => {
        if (typeof file === 'string') {
          return `file-url-${index}-${file}`;
        }
        if (file instanceof File) {
          return `file-obj-${index}-${file.name}-${file.size}-${file.lastModified}`;
        }
        // FileMetadata object
        const metadata = file as FileMetadata;
        return `file-meta-${index}-${metadata.filename || metadata.originalName || ''}-${metadata.size || 0}`;
      };

      const uniqueKey = getUniqueKey();

      const commonProps: FileThumbnailProps = {
        file: getFileThumbnailFile(file),
        previewUrl: displayUrl,
        ...thumbnailProps,
      };

      if (orientation === 'horizontal') {
        return (
          <PreviewItem key={uniqueKey} orientation="horizontal">
            <ClickableWrapper
              onClick={(e) => {
                // Don't open if clicking on a button (remove button)
                if ((e.target as HTMLElement).closest('button')) {
                  return;
                }
                handleOpenInNewTab(file);
              }}
            >
              <FileThumbnail
                tooltip
                showImage
                onRemove={onRemove ? () => handleRemoveClick(file, fileMeta) : undefined}
                {...commonProps}
                sx={[
                  (theme) => ({
                    width: 120,
                    height: 120,
                    border: `solid 1px ${varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.16)}`,
                    cursor: 'pointer',
                  }),
                  ...(Array.isArray(thumbnailProps?.sx) ? thumbnailProps.sx : [thumbnailProps?.sx]),
                ]}
                slotProps={{
                  icon: { sx: { width: 36, height: 36 } },
                  ...thumbnailProps?.slotProps,
                }}
              />
            </ClickableWrapper>
          </PreviewItem>
        );
      }

      return (
        <PreviewItem key={uniqueKey} orientation="vertical">
          <ClickableWrapper
            onClick={(e) => {
              // Don't open if clicking on a button (remove button)
              if ((e.target as HTMLElement).closest('button')) {
                return;
              }
              handleOpenInNewTab(file);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
              cursor: 'pointer',
            }}
          >
            <FileThumbnail {...commonProps} />

            <ListItemText
              primary={fileMeta.name}
              secondary={fileMeta.size ? fData(fileMeta.size) : ''}
              slotProps={{
                secondary: { sx: { typography: 'caption' } },
              }}
            />
          </ClickableWrapper>

          {onRemove && (
            <IconButton
              size="medium"
              sx={{
                width: 20,
                height: 20,
                color: 'error.main',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveClick(file, fileMeta);
              }}
            >
              <Iconify width={20} icon="mingcute:close-line" />
            </IconButton>
          )}
        </PreviewItem>
      );
    });

  return (
    <>
      <PreviewList
        orientation={orientation}
        className={mergeClasses([uploadClasses.preview.multi, className])}
        sx={sx}
        {...other}
      >
        {startNode && <SlotNode orientation={orientation}>{startNode}</SlotNode>}
        {renderList()}
        {endNode && <SlotNode orientation={orientation}>{endNode}</SlotNode>}
      </PreviewList>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDialog.open} onClose={handleCancelRemove} maxWidth="xs" fullWidth>
        <DialogTitle>Delete File?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{confirmDialog.fileName}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemove} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmRemove} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ----------------------------------------------------------------------

export const PreviewList = styled('ul', {
  shouldForwardProp: (prop: string) => !['orientation', 'sx'].includes(prop),
})<{ orientation?: PreviewOrientation }>(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  variants: [
    {
      props: (props) => props.orientation === 'horizontal',
      style: {
        flexWrap: 'wrap',
        flexDirection: 'row',
      },
    },
  ],
}));

const PreviewItem = styled('li', {
  shouldForwardProp: (prop: string) => !['orientation', 'sx'].includes(prop),
})<{ orientation?: PreviewOrientation }>({
  display: 'inline-flex',
  variants: [
    {
      props: (props) => props.orientation === 'vertical',
      style: ({ theme }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing(1.5),
        padding: theme.spacing(1, 1, 1, 1.5),
        borderRadius: theme.shape.borderRadius,
        border: `solid 1px ${varAlpha(theme.vars?.palette.grey['500Channel'] || '0 0 0', 0.16)}`,
      }),
    },
  ],
});

const SlotNode = styled('li', {
  shouldForwardProp: (prop: string) => !['orientation', 'sx'].includes(prop),
})<{ orientation?: PreviewOrientation }>({
  variants: [
    {
      props: (props) => props.orientation === 'horizontal',
      style: {
        width: 'auto',
        display: 'inline-flex',
      },
    },
  ],
});

const ClickableWrapper = styled('div')({
  display: 'inline-flex',
  position: 'relative',
  cursor: 'pointer',
  '&:hover': {
    opacity: 0.85,
  },
});
