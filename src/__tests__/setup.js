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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => React.createElement('div', p, children),
    button: ({ children, ...p }) => React.createElement('button', p, children),
    span: ({ children, ...p }) => React.createElement('span', p, children),
    img: (p) => React.createElement('img', p),
    section: ({ children, ...p }) => React.createElement('section', p, children),
    article: ({ children, ...p }) => React.createElement('article', p, children),
    nav: ({ children, ...p }) => React.createElement('nav', p, children),
    header: ({ children, ...p }) => React.createElement('header', p, children),
    footer: ({ children, ...p }) => React.createElement('footer', p, children),
    ul: ({ children, ...p }) => React.createElement('ul', p, children),
    li: ({ children, ...p }) => React.createElement('li', p, children),
    p: ({ children, ...p }) => React.createElement('p', p, children),
    h1: ({ children, ...p }) => React.createElement('h1', p, children),
    h2: ({ children, ...p }) => React.createElement('h2', p, children),
    h3: ({ children, ...p }) => React.createElement('h3', p, children),
    a: ({ children, ...p }) => React.createElement('a', p, children),
    form: ({ children, ...p }) => React.createElement('form', p, children),
    input: (p) => React.createElement('input', p),
    label: ({ children, ...p }) => React.createElement('label', p, children),
    svg: ({ children, ...p }) => React.createElement('svg', p, children),
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({ start: () => {} }),
  useInView: () => true,
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => 0,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icons = ['Gauge', 'MapPin', 'ArrowRight', 'Search', 'X', 'ChevronLeft', 'ChevronRight', 
    'Star', 'Heart', 'Filter', 'User', 'Settings', 'Menu', 'Close', 'Phone', 'Mail',
    'Calendar', 'Clock', 'Car', 'Home', 'MessageCircle', 'Bell', 'Check', 'AlertCircle',
    'Eye', 'EyeOff', 'Trash', 'Edit', 'Plus', 'Minus', 'ExternalLink', 'Upload', 'Download',
    'RefreshCw', 'Zap', 'Shield', 'CreditCard', 'Truck', 'Package', 'DollarSign', 'LogOut',
    'Users', 'Briefcase', 'BarChart', 'PieChart', 'TrendingUp', 'TrendingDown', 'Activity',
    'DollarSign', 'FileText', 'Image', 'Camera', 'Send', 'MessageSquare', 'Info',
    'HelpCircle', 'AlertTriangle', 'CheckCircle', 'XCircle', 'ChevronDown', 'ChevronUp',
    'MoreHorizontal', 'MoreVertical', 'Link', 'Copy', 'Maximize', 'Minimize', 'Play',
    'Pause', 'SkipBack', 'SkipForward', 'Volume', 'Volume1', 'Volume2', 'VolumeX',
    'Facebook', 'Twitter', 'Instagram', 'Linkedin', 'Youtube', 'Globe', 'Map',
    'Navigation', 'Compass', 'Target', 'Award', 'Gift', 'Tag', 'ShoppingCart',
    'Wallet', 'Percent', 'Repeat', 'RotateCcw', 'RotateCw', 'Sun', 'Moon', 'Cloud',
    'CloudRain', 'Wind', 'Thermometer', 'Droplet', 'Umbrella', 'Sprout', 'Leaf'];
  return icons.reduce((acc, icon) => {
    acc[icon] = () => React.createElement('span', { 'data-testid': `icon-${icon.toLowerCase()}` }, icon);
    return acc;
  }, {});
});

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

// Use Object.defineProperty to allow tests to override
Object.defineProperty(globalThis, 'IntersectionObserver', {
  value: IntersectionObserverMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'IntersectionObserver', {
  value: IntersectionObserverMock,
  writable: true,
  configurable: true,
});

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
