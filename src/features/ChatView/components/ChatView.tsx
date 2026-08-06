import React from 'react';
import { ChatMessage, Vehicle } from '../../../types';
import UnifiedCommunicationHub from './UnifiedCommunicationHub';

interface ChatViewProps {
  messages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  selectedVehicle?: Vehicle | null;
  onQuickViewVehicle?: (vehicleOrId: Vehicle | string) => void;
  onNavigateToEscrow?: () => void;
  onNavigateToInspections?: () => void;
  onNavigateToFinancing?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = (props) => {
  return (
    <UnifiedCommunicationHub
      onQuickViewVehicle={props.onQuickViewVehicle}
      onNavigateToEscrow={props.onNavigateToEscrow}
      onNavigateToInspections={props.onNavigateToInspections}
      onNavigateToFinancing={props.onNavigateToFinancing}
    />
  );
};

export default ChatView;
