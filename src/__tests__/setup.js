import '@testing-library/jest-dom';
import React from 'react';

globalThis.React = React;

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
