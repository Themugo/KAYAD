// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketCtx = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuth } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuth) return;

    // In production, connect directly to the backend (Vercel doesn't proxy WebSockets)
    // In development, use the Vite proxy (defaults to '/')
    const isProduction = import.meta.env.PROD;
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
      || (isProduction ? 'https://kayad-backend.onrender.com' : '/');

    const socket = io(SOCKET_URL, {
      auth: { token },
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
  }, [isAuth, token]);

  const joinAuction = (carId) => {
    socketRef.current?.emit('joinAuction', carId);
  };

  const joinAdmin = () => {
    socketRef.current?.emit('joinAdmin');
  };

  const joinShowroom = () => {
    socketRef.current?.emit('joinShowroom');
  };

  const leaveShowroom = () => {
    socketRef.current?.emit('leaveShowroom');
  };

  const on = (event, handler) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
  };

  const emit = (event, data) => {
    socketRef.current?.emit(event, data);
  };

  return (
    <SocketCtx.Provider value={{ connected, joinAuction, joinAdmin, joinShowroom, leaveShowroom, on, emit }}>
      {children}
    </SocketCtx.Provider>
  );
}

export const useSocket = () => useContext(SocketCtx);
