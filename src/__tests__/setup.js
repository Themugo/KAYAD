import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

globalThis.React = React;

// Mock @sentry/react for tests - this must be before any imports of sentry.ts
vi.mock('@sentry/react', () => ({
  default: {
    init: vi.fn(),
    withScope: vi.fn(),
    captureException: vi.fn(),
    setUser: vi.fn(),
  },
  init: vi.fn(),
  withScope: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

const createStorageMock = () => {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
};

const localStorageMock = createStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

// Mock sessionStorage
const sessionStorageMock = createStorageMock();
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  configurable: true,
});

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  configurable: true,
});

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  configurable: true,
  writable: true,
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback, options = {}) {
    this.callback = callback;
    this.options = options;
    this.thresholds = options.threshold || [];
    this.root = options.root || null;
    this.rootMargin = options.rootMargin || '';
  }

  observe(element) {
    // Simulate immediate intersection for testing
    const entry = {
      target: element,
      isIntersecting: true,
      intersectionRatio: 1,
      boundingClientRect: {},
      intersectionRect: {},
      rootBounds: this.root?.getBoundingClientRect() || null,
      time: Date.now(),
    };
    this.callback([entry], this);
  }

  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

globalThis.IntersectionObserver = IntersectionObserverMock;
window.IntersectionObserver = IntersectionObserverMock;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: () => 'blob:test-url',
  writable: true,
});
Object.defineProperty(URL, 'revokeObjectURL', {
  value: () => {},
  writable: true,
});
