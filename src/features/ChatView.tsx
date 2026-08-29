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
}

export const ChatView: React.FC<ChatViewProps> = (props) => {
  return (
    <UnifiedCommunicationHub
      user={props.user}
      onQuickViewVehicle={props.onQuickViewVehicle}
      onNavigateToEscrow={props.onNavigateToEscrow}
      onNavigateToInspections={props.onNavigateToInspections}
      onNavigateToFinancing={props.onNavigateToFinancing}
    />
  );
};

export default ChatView;
