import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { RootState } from 'store/store';
import { hideSnackbar, SnackbarItem } from 'store/snackbar.slice';

const SNACKBAR_SPACING = 60;
const SNACKBAR_DURATION = 6000;

const CustomSnackbar: React.FC = () => {
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.snackbar.items);
  const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const handleClose =
    (id: number) => (_event: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === 'clickaway') {
        return;
      }
      // Clear the timeout if it exists
      const timeout = timeoutsRef.current.get(id);
      if (timeout) {
        clearTimeout(timeout);
        timeoutsRef.current.delete(id);
      }
      dispatch(hideSnackbar(id));
    };

  useEffect(() => {
    // Set up auto-hide timers for each item
    items.forEach((item) => {
      // Only set timeout if not already set
      if (!timeoutsRef.current.has(item.id)) {
        const timeout = setTimeout(() => {
          dispatch(hideSnackbar(item.id));
          timeoutsRef.current.delete(item.id);
        }, SNACKBAR_DURATION);
        timeoutsRef.current.set(item.id, timeout);
      }
    });

    // Cleanup function
    const timeouts = timeoutsRef.current;
    return () => {
      // Clear any timeouts for removed items
      const currentIds = new Set(items.map((item) => item.id));
      for (const [id, timeout] of timeouts.entries()) {
        if (!currentIds.has(id)) {
          clearTimeout(timeout);
          timeouts.delete(id);
        }
      }
    };
  }, [items, dispatch]);

  return (
    <>
      {items.map((item: SnackbarItem, index: number) => (
        <Snackbar
          key={item.id}
          open
          onClose={handleClose(item.id)}
          style={{ bottom: 24 + (items.length - 1 - index) * SNACKBAR_SPACING }}
        >
          <Alert
            onClose={handleClose(item.id)}
            severity={item.severity}
            icon={item.icon}
          >
            {item.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

export default CustomSnackbar;
