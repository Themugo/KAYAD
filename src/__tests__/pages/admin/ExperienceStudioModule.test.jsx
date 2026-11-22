import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Regression: /admin/xos crashed into the error boundary with
// "ReferenceError: Cannot access 'ShoppingCart' before initialization" because three helper icons were
// `const` arrow functions declared after module-level arrays that reference them (temporal dead zone).
vi.mock('../../../api/api', () => new Proxy({}, { get: () => new Proxy(() => Promise.resolve({ data: {} }), { get: () => () => Promise.resolve({ data: {} }) }) }));

describe('Experience Studio module', () => {
  it('evaluates without a temporal-dead-zone error and renders', async () => {
    const mod = await import('../../../pages/admin/xos/ExperienceStudio.jsx');
    const Studio = mod.default;
    expect(typeof Studio).toBe('function');
    const { container } = render(<Studio />);
    expect(container.firstChild).not.toBeNull();
  });
});
