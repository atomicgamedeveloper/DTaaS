import '@testing-library/jest-dom';
import 'test/__mocks__/integration/module_mocks';
import 'test/preview/__mocks__/global_mocks';
import 'test/__mocks__/global_mocks';

// Polyfills for Node.js test environment
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

beforeEach(() => {
  jest.resetAllMocks();
});
