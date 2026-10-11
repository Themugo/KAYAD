import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ isAuth: true }) }));
import { SocketProvider, useSocket } from '../../context/SocketContext';

// Regression (D-RT-1): the server only keeps a socket in chat_<id> for the lifetime of that connection.
// After a transport reconnect the client must re-emit joinChat or it silently stops receiving newMessage.
describe('SocketContext joinMessages reconnect', () => {
  let handlers: Record<string, Array<(...a: any[]) => void>>;
  let emitted: any[][];
  beforeEach(() => {
    handlers = {}; emitted = [];
    (window as any).io = () => ({
      connected: false,
      on: (e: string, h: any) => { (handlers[e] ||= []).push(h); },
      off: (e: string, h: any) => { handlers[e] = (handlers[e] || []).filter((x) => x !== h); },
      emit: (...a: any[]) => { emitted.push(a); },
      disconnect: () => undefined, connect: () => undefined,
    });
  });
  it('re-emits joinChat on every connect and stops after leaveChannel', async () => {
    const wrapper = ({ children }: any) => <SocketProvider>{children}</SocketProvider>;
    const { result } = renderHook(() => useSocket(), { wrapper });
    await waitFor(() => expect(handlers.connect?.length).toBeGreaterThan(0));
    let ch: any;
    act(() => { ch = result.current.joinMessages('chat-1', { onMessage: () => undefined }); });
    const joins = () => emitted.filter((e) => e[0] === 'joinChat' && e[1] === 'chat-1').length;
    expect(joins()).toBe(1);
    act(() => { handlers.connect.forEach((h) => h()); });
    expect(joins()).toBe(2);
    act(() => { handlers.connect.forEach((h) => h()); });
    expect(joins()).toBe(3);
    act(() => { result.current.leaveChannel(ch); });
    const before = joins();
    act(() => { (handlers.connect || []).forEach((h) => h()); });
    expect(joins()).toBe(before);
  });
});
