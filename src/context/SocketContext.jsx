// src/context/SocketContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const SocketCtx = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const channelsRef = useRef([]);

  useEffect(() => {
    if (user) {
      setConnected(true);
    } else {
      setConnected(false);
    }

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [user]);

  const joinAuction = useCallback((carId, handlers = {}) => {
    const channel = supabase
      .channel(`auction-${carId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `car_id=eq.${carId}` },
        (payload) => handlers.onBid?.(payload.new)
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cars', filter: `id=eq.${carId}` },
        (payload) => handlers.onCarUpdate?.(payload.new)
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  }, []);

  const joinNotifications = useCallback((handlers = {}) => {
    if (!user) return null;
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => handlers.onNotification?.(payload.new)
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  }, [user]);

  const joinMessages = useCallback((conversationId, handlers = {}) => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => handlers.onMessage?.(payload.new)
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  }, []);

  const leaveChannel = useCallback((channel) => {
    if (channel) {
      supabase.removeChannel(channel);
      channelsRef.current = channelsRef.current.filter(ch => ch !== channel);
    }
  }, []);

  return (
    <SocketCtx.Provider value={{
      connected,
      joinAuction,
      joinNotifications,
      joinMessages,
      leaveChannel,
    }}>
      {children}
    </SocketCtx.Provider>
  );
}

export const useSocket = () => useContext(SocketCtx);
