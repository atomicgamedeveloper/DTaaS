import { render, screen, fireEvent } from '@testing-library/react';
import Iframe from 'components/Iframe';
import { log } from 'util/logger/logger';

jest.mock('util/logger/logger', () => ({
  log: jest.fn(),
}));

describe('Iframe', () => {
  let iframe: HTMLIFrameElement;

  beforeEach(() => {
    render(<Iframe url="https://example.com/" title="Example" />);
    iframe = screen.getByTitle('Example');
  });

  it('renders an iframe element with the correct src and title', () => {
    expect(iframe.src).toBe('https://example.com/');
  });

  describe('Iframe fullsize', () => {
    it('will grow in horizontal direction', () => {
      expect(iframe.width).toBe('100%');
    });

    it('will grow in vertical direction', () => {
      expect(iframe.style.flexGrow).toBe('1');
      expect(iframe.style.height).toBe('');
    });
  });

  describe('focus logging', () => {
    const setActiveElement = (element: Element) => {
      Object.defineProperty(document, 'activeElement', {
        configurable: true,
        get: () => element,
      });
    };

    afterEach(() => {
      Reflect.deleteProperty(document, 'activeElement');
    });

    it('logs a single click when focus moves into the iframe', () => {
      setActiveElement(iframe);

      fireEvent.blur(globalThis.window);
      fireEvent.blur(globalThis.window);

      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith({
        event: 'click',
        page: globalThis.location.pathname,
        element: 'iframe',
        label: 'Example',
      });
    });

    it('logs again after a click on the parent page', () => {
      setActiveElement(iframe);

      fireEvent.blur(globalThis.window);
      fireEvent.click(document);
      fireEvent.blur(globalThis.window);

      expect(log).toHaveBeenCalledTimes(2);
    });
  });
});
