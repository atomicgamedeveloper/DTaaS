import { ReactNode, useState } from 'react';
import { Box, Collapse, IconButton, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface CollapsibleSectionHeaderProps {
  title: string;
  toggleAriaLabel: string;
  toggleLoggerLabel: string;
  children: ReactNode;
}

function CollapsibleSectionHeader({
  title,
  toggleAriaLabel,
  toggleLoggerLabel,
  children,
}: Readonly<CollapsibleSectionHeaderProps>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 1,
        }}
      >
        <Typography variant="h5">{title}</Typography>
        <Tooltip title={expanded ? 'Hide description' : 'Show description'}>
          <IconButton
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={toggleAriaLabel}
            data-logger-element="button"
            data-logger-label={toggleLoggerLabel}
            sx={{ color: 'text.secondary' }}
          >
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={expanded}>{children}</Collapse>
    </Box>
  );
}

export default CollapsibleSectionHeader;
