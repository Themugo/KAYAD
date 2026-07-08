// src/context/SocketContext.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  connected: boolean;
  onlineUsers: string[];
  joinAuction: (carId: string) => void;
  joinAdmin: () => void;
  joinShowroom: () => void;
  leaveShowroom: () => void;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  emit: (event: string, data?: any) => void;
  socket: React.MutableRefObject<Socket | null>;
}

const SocketCtx = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { isAuth } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuth) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('onlineUsers', (users: string[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setOnlineUsers([]);
    };
  }, [isAuth]);

  const joinAuction = useCallback((carId: string) => {
    socketRef.current?.emit('joinAuction', carId);
  }, []);

  const joinAdmin = useCallback(() => {
    socketRef.current?.emit('joinAdmin');
  }, []);

  const joinShowroom = useCallback(() => {
    socketRef.current?.emit('joinShowroom');
  }, []);

  const leaveShowroom = useCallback(() => {
    socketRef.current?.emit('leaveShowroom');
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const value = useMemo(() => ({
    connected, onlineUsers, joinAuction, joinAdmin, joinShowroom, leaveShowroom, on, emit,
    socket: socketRef,
  }), [connected, onlineUsers, joinAuction, joinAdmin, joinShowroom, leaveShowroom, on, emit]);

  return (
    <SocketCtx.Provider value={value}>
      {children}
    </SocketCtx.Provider>
  );
}

export const useSocket = (): SocketContextValue => {
  const ctx = useContext(SocketCtx);
  if (!ctx) {
    return {
      connected: false,
      onlineUsers: [],
      joinAuction: () => {},
      joinAdmin: () => {},
      joinShowroom: () => {},
      leaveShowroom: () => {},
      on: () => () => {},
      emit: () => {},
      socket: { current: null },
    };
  }
  return ctx;
};
