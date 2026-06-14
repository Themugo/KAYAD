// src/context/SocketContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketCtx = createContext(null);

export function SocketProvider({ children }) {
  const { isAuth } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

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

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuth]);

  const joinAuction = useCallback((carId) => {
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

  const on = useCallback((event, handler) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const value = useMemo(() => ({
    connected, joinAuction, joinAdmin, joinShowroom, leaveShowroom, on, emit,
    socket: socketRef,
  }), [connected, joinAuction, joinAdmin, joinShowroom, leaveShowroom, on, emit]);

  return (
    <SocketCtx.Provider value={value}>
      {children}
    </SocketCtx.Provider>
  );
}

export const useSocket = () => useContext(SocketCtx);
