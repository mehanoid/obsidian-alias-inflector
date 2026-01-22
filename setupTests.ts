import {enableFetchMocks} from 'jest-fetch-mock';

enableFetchMocks();

// Mock localStorage for Node.js environment
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    length: 0,
  } as any;
}

