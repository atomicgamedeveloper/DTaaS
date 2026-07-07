import { ReactNode, useState } from 'react';
import { Box, Collapse, IconButton, Tooltip, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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
}: CollapsibleSectionHeaderProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
            sx={{
              color: 'text.secondary',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={expanded}>{children}</Collapse>
    </Box>
  );
}

export default CollapsibleSectionHeader;
