import { Box, Button, Divider, FormControlLabel, Switch } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import DataObjectIcon from '@mui/icons-material/DataObject';

interface LogViewerControlsProps {
  downloadLabel: string;
  onDownload: () => void;
  downloadDisabled: boolean;
  onClearClick: () => void;
  clearDisabled: boolean;
  onRefresh: () => void;
  rawView: boolean;
  onToggleRawView: () => void;
  liveUpdate: boolean;
  onLiveUpdateChange: (checked: boolean) => void;
}

function LogViewerControls({
  downloadLabel,
  onDownload,
  downloadDisabled,
  onClearClick,
  clearDisabled,
  onRefresh,
  rawView,
  onToggleRawView,
  liveUpdate,
  onLiveUpdateChange,
}: Readonly<LogViewerControlsProps>) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={onDownload}
          disabled={downloadDisabled}
          data-testid="download-logs"
          data-logger-element="button"
          data-logger-label="Download Logs"
        >
          {downloadLabel}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlinedIcon />}
          onClick={onClearClick}
          disabled={clearDisabled}
          data-testid="clear-logs"
          data-logger-element="button"
          data-logger-label="Clear Logs"
        >
          Clear Logs
        </Button>
      </Box>
      <Divider orientation="vertical" flexItem />
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          data-testid="refresh-logs"
          data-logger-element="button"
          data-logger-label="Refresh Logs"
        >
          Refresh
        </Button>
        <Button
          variant={rawView ? 'contained' : 'outlined'}
          startIcon={<DataObjectIcon />}
          onClick={onToggleRawView}
          aria-pressed={rawView}
          data-testid="raw-view-toggle"
          data-logger-element="button"
          data-logger-label="Toggle Raw Logs"
        >
          Raw view
        </Button>
      </Box>
      <FormControlLabel
        sx={{ marginLeft: 'auto', marginRight: 0 }}
        control={
          <Switch
            checked={liveUpdate}
            onChange={(event) => onLiveUpdateChange(event.target.checked)}
            slotProps={{ input: { 'aria-label': 'Live update logs' } }}
            data-testid="live-update-logs"
            data-logger-element="switch"
            data-logger-label="Live Update Logs"
          />
        }
        label="Live update"
      />
    </Box>
  );
}

export default LogViewerControls;
