import '@testing-library/jest-dom';
import 'test/preview/__mocks__/global_mocks';
import 'test/__mocks__/global_mocks';
import 'test/__mocks__/unit/page_mocks';
import 'test/__mocks__/unit/component_mocks';
import 'test/__mocks__/unit/module_mocks';

// We don't need to clear all mocks in each test suite as this is done here
beforeEach(() => {
  jest.clearAllMocks();
});
