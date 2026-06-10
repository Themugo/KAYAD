import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatPage from '../../pages/ChatPage';

vi.mock('../../api/api', () => ({
  chatAPI: {
    inbox: vi.fn().mockResolvedValue({ chats: [] }),
    start: vi.fn(),
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u1', name: 'TestUser' }, isAuth: true }),
}));
vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({ on: vi.fn(() => vi.fn()), emit: vi.fn(), connected: true, socket: { current: { on: vi.fn(), emit: vi.fn(), off: vi.fn(), connected: true } } }),
}));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('ChatPage', () => {
  afterEach(() => { cleanup(); });

  it('renders messages heading', async () => {
    render(<MemoryRouter><ChatPage /></MemoryRouter>);
    expect(await screen.findByText('💬 Messages')).toBeInTheDocument();
  });

  it('renders search placeholder', async () => {
    render(<MemoryRouter><ChatPage /></MemoryRouter>);
    expect(await screen.findByPlaceholderText('Search conversations...')).toBeInTheDocument();
  });

  it('shows empty state when no conversations', async () => {
    render(<MemoryRouter><ChatPage /></MemoryRouter>);
    expect(await screen.findByText('No conversations yet')).toBeInTheDocument();
  });

  it('shows empty state prompt', async () => {
    render(<MemoryRouter><ChatPage /></MemoryRouter>);
    expect(await screen.findByText(/Choose from your existing chats/)).toBeInTheDocument();
  });
});
