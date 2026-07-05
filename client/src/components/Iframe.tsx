import { useEffect } from 'react';
import IframeReact from 'react-iframe';
import { log } from 'util/logger/logger';

interface IFrameProps {
  readonly url: string;
  readonly title: string;
}

// Clicks inside an iframe never reach the parent document, so the DOM
// logger cannot see them. Clicking into an iframe moves focus to it and
// blurs the parent window; log that transition once per entry.
function useIframeFocusLogger(title: string): void {
  useEffect(() => {
    let focusLogged = false;
    const handleWindowBlur = () => {
      const active = document.activeElement;
      if (
        active instanceof HTMLIFrameElement &&
        active.title === title &&
        !focusLogged
      ) {
        focusLogged = true;
        log({
          event: 'click',
          page: globalThis.location.pathname,
          element: 'iframe',
          label: title,
        });
      }
    };
    // A click on the parent page means focus left the iframe; the next
    // focus into it is a new interaction.
    const handleParentClick = () => {
      focusLogged = false;
    };
    globalThis.addEventListener('blur', handleWindowBlur);
    document.addEventListener('click', handleParentClick, true);
    return () => {
      globalThis.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('click', handleParentClick, true);
    };
  }, [title]);
}

function Iframe({ url, title }: IFrameProps) {
  useIframeFocusLogger(title);
  // Be aware sandbox is not supported by current JupyterLight implementation.
  return (
    <IframeReact
      title={title}
      url={url}
      width="100%"
      styles={{ flexGrow: '1', minHeight: '25rem' }}
    />
  );
}

export default Iframe;
