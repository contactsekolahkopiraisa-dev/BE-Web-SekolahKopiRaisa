// __tests__/setup.js
// Global test setup and utilities

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.EMAIL_USER = 'test@raisa.com';
process.env.SMTP_USER = 'test@raisa.com';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(), // Keep error for debugging
};

// Common test utilities
global.testUtils = {
  // Create mock request with user
  createMockRequest: (user, body = {}, params = {}, query = {}) => ({
    user,
    body,
    params,
    query,
    headers: {},
    cookies: {},
  }),

  // Create mock response
  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  },

  // Create mock next function
  createMockNext: () => jest.fn(),

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock date for consistent testing
  freezeTime: (date = '2025-01-01T00:00:00.000Z') => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  },

  unfreezeTime: () => {
    jest.useRealTimers();
  },
};

// Mock fetch globally if needed
global.fetch = jest.fn();

module.exports = {};