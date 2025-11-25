import * as React from 'react';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
  v5: jest.fn(() => 'test-uuid-5678'),
  validate: jest.fn(() => true),
  version: jest.fn(() => 4),
}));

jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => (
    <div data-testid="syntax-highlighter">{children}</div>
  ),
  Light: ({ children }: { children: string }) => (
    <div data-testid="syntax-highlighter">{children}</div>
  ),
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  materialDark: {},
}));
