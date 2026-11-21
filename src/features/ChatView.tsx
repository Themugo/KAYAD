import React from 'react';
import { ChatMessage, Vehicle, UserProfile } from '../types';
import UnifiedCommunicationHub from './UnifiedCommunicationHub';

interface ChatViewProps {
  messages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  selectedVehicle?: Vehicle | null;
  user?: UserProfile | null;
  onQuickViewVehicle?: (vehicleOrId: Vehicle | string) => void;
  onNavigateToEscrow?: () => void;
  onNavigateToInspections?: () => void;
  onNavigateToFinancing?: () => void;
  /** True when this chat surface is embedded inside DashboardHub, which owns the page H1. */
  embedded?: boolean;
  initialThreadId?: string | null;
}

export const ChatView: React.FC<ChatViewProps> = (props) => {
  return (
    <UnifiedCommunicationHub
      user={props.user}
      onQuickViewVehicle={props.onQuickViewVehicle}
      onNavigateToEscrow={props.onNavigateToEscrow}
      onNavigateToInspections={props.onNavigateToInspections}
      onNavigateToFinancing={props.onNavigateToFinancing}
      embedded={props.embedded}
      initialThreadId={props.initialThreadId}
    />
  );
};

export default ChatView;
