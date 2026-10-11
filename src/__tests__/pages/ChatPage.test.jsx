import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

const CurrentLocation = () => {
  const location = useLocation();
  return <output data-testid="current-location">{location.pathname}{location.search}</output>;
};

describe('Canonical ChatView', () => {
  afterEach(() => cleanup());
  it('renders the unified communication surface', async () => {
    render(<MemoryRouter><ChatView user={{ id: 'u1', name: 'Test User', role: 'buyer' }} /></MemoryRouter>);
    // "Unified Operations Communication Center" never existed in the actual
    // component (UnifiedCommunicationHub renders a "KAYAD MESSAGES" eyebrow
    // and a "Your conversations" <h1 id="messages-heading">) - this
    // assertion was stale from an earlier draft and always failed. Assert
    // the real, current heading instead.
    expect(await screen.findByText(/Your conversations/i)).toBeInTheDocument();
  });

  it('shows a private sign-in gate without empty inbox counts to signed-out visitors', () => {
    render(<MemoryRouter initialEntries={['/?nav=chat']}><ChatView user={null} /><CurrentLocation /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Your conversations, kept private/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in to Messages/i })).toBeInTheDocument();
    expect(screen.queryByText('Conversations')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sign in to Messages/i }));
    expect(screen.getByTestId('current-location').textContent).toBe('/login?next=%2F%3Fnav%3Dchat');
  });
});
