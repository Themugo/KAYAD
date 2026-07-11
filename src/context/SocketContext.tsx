// src/context/SocketContext.tsx
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase, RealtimeChannel } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

interface BidPayload {
  id: string;
  car_id: string;
  amount: number;
  user_id: string;
  created_at: string;
}

interface CarPayload {
  id: string;
  current_bid?: number;
  bids_count?: number;
  auction_status?: string;
}

interface NotificationPayload {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface MessagePayload {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface AuctionHandlers {
  onBid?: (bid: BidPayload) => void;
  onCarUpdate?: (car: CarPayload) => void;
}

interface NotificationHandlers {
  onNotification?: (notification: NotificationPayload) => void;
}

interface MessageHandlers {
  onMessage?: (message: MessagePayload) => void;
}

interface SocketContextValue {
  connected: boolean;
  joinAuction: (carId: string, handlers?: AuctionHandlers) => RealtimeChannel | undefined;
  joinNotifications: (handlers?: NotificationHandlers) => RealtimeChannel | null;
  joinMessages: (conversationId: string, handlers?: MessageHandlers) => RealtimeChannel | undefined;
  leaveChannel: (channel: RealtimeChannel) => void;
}

const SocketCtx = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const channelsRef = useRef<RealtimeChannel[]>([]);

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

  const joinAuction = useCallback((carId: string, handlers: AuctionHandlers = {}): RealtimeChannel | undefined => {
    const channel = supabase
      .channel(`auction-${carId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `car_id=eq.${carId}` },
        (payload) => {
          if (handlers.onBid && payload.new) {
            handlers.onBid(payload.new as BidPayload);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cars', filter: `id=eq.${carId}` },
        (payload) => {
          if (handlers.onCarUpdate && payload.new) {
            handlers.onCarUpdate(payload.new as CarPayload);
          }
        }
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  }, []);

  const joinNotifications = useCallback((handlers: NotificationHandlers = {}): RealtimeChannel | null => {
    if (!user) return null;
    
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (handlers.onNotification && payload.new) {
            handlers.onNotification(payload.new as NotificationPayload);
          }
        }
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  }, [user]);

  const joinMessages = useCallback((conversationId: string, handlers: MessageHandlers = {}): RealtimeChannel | undefined => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (handlers.onMessage && payload.new) {
            handlers.onMessage(payload.new as MessagePayload);
          }
        }
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  }, []);

  const leaveChannel = useCallback((channel: RealtimeChannel) => {
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

export const useSocket = () => {
  const context = useContext(SocketCtx);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
