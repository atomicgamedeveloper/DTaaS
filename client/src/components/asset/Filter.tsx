import { TextField, Box, IconButton, InputAdornment } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import type { LogContext } from 'util/logger/logEvent';

interface FilterProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  loggerLabel?: string;
  loggerContext?: LogContext;
  sx?: SxProps<Theme>;
}

const Filter: React.FC<FilterProps> = ({
  placeholder = 'Search by name',
  value,
  onChange,
  loggerLabel = 'Asset filter',
  loggerContext = {},
  sx,
}) => {
  const handleClear = () => onChange('');
  const context = JSON.stringify(loggerContext);

  return (
    <Box
      sx={[
        { marginTop: 2, display: 'flex', alignItems: 'center', gap: 1 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        sx={{ maxWidth: 300 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
          htmlInput: {
            'data-logger-element': 'input',
            'data-logger-label': loggerLabel,
            'data-logger-context': context,
            'data-logger-capture-value': 'true',
          },
        }}
      />
      {value && (
        <IconButton
          onClick={handleClear}
          aria-label="Clear search"
          data-logger-element="button"
          data-logger-label="Clear search"
          data-logger-context={context}
        >
          <ClearIcon />
        </IconButton>
      )}
    </Box>
  );
};

export default Filter;
