// Mock for @sentry/react
export default {
  init: vi.fn(),
  withScope: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
};

export const init = vi.fn();
export const withScope = vi.fn();
export const captureException = vi.fn();
export const setUser = vi.fn();
