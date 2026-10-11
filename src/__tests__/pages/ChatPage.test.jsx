import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ChatView from '../../features/ChatView';

vi.mock('../../services/chatApi', () => ({
  getMyChats: vi.fn().mockResolvedValue([]),
  getChatMessages: vi.fn().mockResolvedValue([]),
  sendChatMessage: vi.fn(),
  markChatSeen: vi.fn(),
  mapBackendChatToThread: vi.fn(),
  mapBackendMessagesToUnified: vi.fn(),
  ChatApiError: class ChatApiError extends Error {},
}));

describe('Canonical ChatView', () => {
  afterEach(() => cleanup());
  it('renders the unified communication surface', async () => {
    render(<ChatView user={{ id: 'u1', name: 'Test User', role: 'buyer' }} />);
    // "Unified Operations Communication Center" never existed in the actual
    // component (UnifiedCommunicationHub renders a "KAYAD MESSAGES" eyebrow
    // and a "Your conversations" <h1 id="messages-heading">) - this
    // assertion was stale from an earlier draft and always failed. Assert
    // the real, current heading instead.
    expect(await screen.findByText(/Your conversations/i)).toBeInTheDocument();
  });
});
