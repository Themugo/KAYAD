import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

// MOCKED unit test (window.io and the HTTP layer are stubs). The real end-to-end proof of RT-3 is the harness test
// m14-realtime-socket-ticket and the real-Chromium probe browser/realtime-host-probe.mjs.
const auth = vi.hoisted(() => ({ isAuth: true }));
const requestMock = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ isAuth: auth.isAuth }) }));
vi.mock('../../api/httpRequest', () => ({ request: requestMock }));
import { SocketProvider, useSocket } from '../../context/SocketContext';

describe('SocketContext socket ticket (RT-3)', () => {
  let calls: Array<{ url: string; options: Record<string, any> }>;
  let handlers: Record<string, Array<(...a: any[]) => void>>;
  let reconnects: number;
  beforeEach(() => {
    calls = []; handlers = {}; reconnects = 0; requestMock.mockReset();
    (window as any).io = (url: string, options: Record<string, any>) => {
      calls.push({ url, options });
      return {
        connected: false,
        on: (e: string, h: any) => { (handlers[e] ||= []).push(h); },
        off: () => undefined, emit: () => undefined,
        disconnect: () => undefined, connect: () => { reconnects += 1; },
      };
    };
  });
  const mount = () => renderHook(() => useSocket(), { wrapper: ({ children }: any) => <SocketProvider>{children}</SocketProvider> });

  it('signed-in: fetches a ticket by POST before connecting and sends it in the CONNECT auth payload, never in the URL', async () => {
    auth.isAuth = true;
    requestMock.mockResolvedValue({ success: true, ticket: 'tkt-123', expiresIn: 60 });
    mount();
    await waitFor(() => expect(calls.length).toBe(1));
    const { url, options } = calls[0];
    expect(url).not.toMatch(/ticket/);
    expect(options.withCredentials).toBe(true);
    expect(typeof options.auth).toBe('function');
    const payload = await new Promise((resolve) => options.auth(resolve));
    expect(payload).toEqual({ ticket: 'tkt-123' });
    expect(requestMock).toHaveBeenCalledWith('/realtime/socket-ticket', expect.objectContaining({ method: 'POST' }));
  });

  it('ticket unavailable: connects anonymously (public rooms) and retries authentication when told it is anonymous', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    auth.isAuth = true;
    requestMock.mockRejectedValue(new Error('503'));
    mount();
    await waitFor(() => expect(calls.length).toBe(1));
    const payload = await new Promise((resolve) => calls[0].options.auth(resolve));
    expect(payload).toEqual({});
    handlers.authState.forEach((h) => h({ authenticated: false }));
    vi.advanceTimersByTime(15000);
    expect(reconnects).toBe(1);
    vi.useRealTimers();
  });

  it('signed-out visitors connect without any auth payload and never request a ticket', async () => {
    auth.isAuth = false;
    mount();
    await waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0].options.auth).toBeUndefined();
    expect(requestMock).not.toHaveBeenCalled();
  });
});
