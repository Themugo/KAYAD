import React, { useState } from 'react';
import { ChatMessage, Vehicle } from '../types';
import { Send, ShieldCheck, Lock, Paperclip } from 'lucide-react';
import { Card, Badge, Button } from '../components/ui';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  selectedVehicle?: Vehicle | null;
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, onSendMessage, selectedVehicle }) => {
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="bg-[#1E3063] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-400 text-[#17244B] font-black flex items-center justify-center">
            CM
          </div>
          <div>
            <p className="font-bold text-sm">Crown Motors Kenya (Verified Dealer)</p>
            <p className="text-[11px] text-emerald-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> KAYAD Verified Seller • Escrow Ready
            </p>
          </div>
        </div>

        <Badge variant="escrow" size="sm">
          <Lock className="w-3 h-3 text-amber-400" /> End-to-End Encryption
        </Badge>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 text-xs">
        {selectedVehicle && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-3">
            <img src={selectedVehicle.image} alt={selectedVehicle.title} className="w-14 h-12 object-cover rounded-lg" />
            <div>
              <p className="text-[10px] text-amber-800 font-bold uppercase">Inquiring About:</p>
              <p className="font-bold text-[#1E3063]">{selectedVehicle.title}</p>
              <p className="font-extrabold text-[#1E3063]">Ksh {selectedVehicle.price.toLocaleString()}</p>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3.5 rounded-2xl ${
                isUser 
                  ? 'bg-[#1E3063] text-white rounded-br-none' 
                  : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-none'
              }`}>
                <p className="leading-relaxed font-medium">{m.text}</p>
                <span className={`text-[9px] block text-right mt-1.5 font-bold ${isUser ? 'text-slate-300' : 'text-slate-400'}`}>
                  {m.timestamp}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <button type="button" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about NTSA inspection, test drives or escrow deposit..."
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
        >
          <Send className="w-3.5 h-3.5" /> Send
        </Button>
      </form>
    </Card>
  );
};

export default ChatView;
