// src/context/SocketContext.tsx
// Socket.io client — skipped in demo mode, wrapped in error handling for environments
// where the WebSocket server is unavailable (Replit preview, Vercel, etc.)
import {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState, ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { isDemoMode } from '../api/api';

type AnySocket = import('socket.io-client').Socket;

interface SocketContextValue {
  connected: boolean;
  joinAuction: (carId: string) => void;
  joinAdmin: () => void;
  joinShowroom: () => void;
  leaveShowroom: () => void;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  emit: (event: string, data?: any) => void;
  socket: React.MutableRefObject<AnySocket | null>;
}

const NOOP = () => {};
const NOOP_UNSUB = () => {};

const NULL_CTX: SocketContextValue = {
  connected: false,
  joinAuction: NOOP,
  joinAdmin: NOOP,
  joinShowroom: NOOP,
  leaveShowroom: NOOP,
  on: () => NOOP_UNSUB,
  emit: NOOP,
  socket: { current: null },
};

const SocketCtx = createContext<SocketContextValue>(NULL_CTX);

interface SocketProviderProps { children: ReactNode; }

export function SocketProvider({ children }: SocketProviderProps) {
  const { isAuth } = useAuth();
  const socketRef  = useRef<AnySocket | null>(null);
  const [connected, setConnected] = useState(false);
  // Track when the dynamic import has resolved so the effect can retry
  const [ioReady, setIoReady] = useState(false);
  const ioRef = useRef<typeof import('socket.io-client').io | null>(null);

  // Load socket.io-client once — avoid module-level import so build never crashes
  useEffect(() => {
    import('socket.io-client').then((mod) => {
      ioRef.current = mod.io;
      setIoReady(true);
    }).catch((err) => {
      console.warn('[Socket] socket.io-client unavailable:', err);
    });
  }, []);

  useEffect(() => {
    // Skip: not authenticated, demo mode, or io not yet imported
    if (!isAuth || isDemoMode() || !ioReady || !ioRef.current) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';
    let socket: AnySocket;
    try {
      socket = ioRef.current(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnectionDelay: 2000,
        reconnectionAttempts: 3,
        timeout: 8000,
      });
    } catch (err) {
      console.warn('[Socket] Failed to initialize:', err);
      return;
    }

    socketRef.current = socket;
    socket.on('connect',       () => setConnected(true));
    socket.on('disconnect',    () => setConnected(false));
    socket.on('connect_error', (err: Error) => {
      console.warn('[Socket] Connection error:', err?.message || err);
    });
    socket.on('error', (err: Error) => {
      console.warn('[Socket] Error:', err?.message || err);
    });

    return () => {
      try { socket.disconnect(); } catch { /* ignore */ }
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuth, ioReady]);

  const joinAuction   = useCallback((carId: string) => { socketRef.current?.emit('joinAuction', carId); }, []);
  const joinAdmin     = useCallback(() => { socketRef.current?.emit('joinAdmin'); }, []);
  const joinShowroom  = useCallback(() => { socketRef.current?.emit('joinShowroom'); }, []);
  const leaveShowroom = useCallback(() => { socketRef.current?.emit('leaveShowroom'); }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const s = socketRef.current;
    if (!s) return NOOP_UNSUB;
    s.on(event, handler);
    return () => { try { s.off(event, handler); } catch { /* ignore */ } };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const value = useMemo(() => ({
    connected, joinAuction, joinAdmin, joinShowroom, leaveShowroom, on, emit,
    socket: socketRef,
  }), [connected, joinAuction, joinAdmin, joinShowroom, leaveShowroom, on, emit]);

  return <SocketCtx.Provider value={value}>{children}</SocketCtx.Provider>;
}

/** Returns no-op context gracefully if called outside SocketProvider */
export const useSocket = (): SocketContextValue => useContext(SocketCtx);
