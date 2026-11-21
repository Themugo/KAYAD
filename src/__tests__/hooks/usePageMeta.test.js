import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import usePageMeta from '../../hooks/usePageMeta';

describe('usePageMeta', () => {
  afterEach(() => { cleanup(); });

  it('sets document title', () => {
    renderHook(() => usePageMeta('Test Page'));
    expect(document.title).toBe('Test Page | KAYARD KE');
  });

  it('uses default title when no title given', () => {
    renderHook(() => usePageMeta());
    expect(document.title).toContain("KAYARD KE");
  });

  it('sets meta description', () => {
    const meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
    renderHook(() => usePageMeta('Test', 'A test description'));
    expect(meta.getAttribute('content')).toBe('A test description');
    document.head.removeChild(meta);
  });

  it('restores previous title on cleanup', () => {
    document.title = 'Original Title';
    const { unmount } = renderHook(() => usePageMeta('New Title'));
    expect(document.title).toBe('New Title | KAYARD KE');
    unmount();
    expect(document.title).toBe('Original Title');
  });
});
