import '@testing-library/jest-dom';
import 'test/__mocks__/global_mocks';
import 'test/__mocks__/unit/page_mocks';
import 'test/__mocks__/unit/component_mocks';
import 'test/__mocks__/unit/module_mocks';

// Polyfills for Node.js test environment
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

beforeEach(() => {
  jest.resetAllMocks();
});
