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

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Re-join admin room if needed
    });

    socket.on('disconnect', () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuth, token]);

  // Join an auction room for a specific car
  const joinAuction = (carId) => {
    socketRef.current?.emit('joinAuction', carId);
  };

  // Join admin broadcast room
  const joinAdmin = () => {
    socketRef.current?.emit('joinAdmin');
  };

  // Join showroom room for live listing updates
  const joinShowroom = () => {
    socketRef.current?.emit('joinShowroom');
  };

  // Leave showroom room
  const leaveShowroom = () => {
    socketRef.current?.emit('leaveShowroom');
  };

  // Subscribe to a socket event, auto-cleanup
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
