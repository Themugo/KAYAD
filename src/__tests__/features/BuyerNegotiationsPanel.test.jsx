import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ myNegotiations: vi.fn() }));
vi.mock('../../services/leadApi', () => ({ default: { myNegotiations: mocks.myNegotiations } }));
vi.mock('../../components/offers/MarketplaceOfferPanel', () => ({ default: () => <div data-testid="offers-panel" /> }));

import BuyerNegotiationsPanel from '../../pages/buyer/components/BuyerNegotiationsPanel';

describe('BuyerNegotiationsPanel conversation navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.myNegotiations.mockResolvedValue({ leads: [
      { id: 'lead-chat', stage: 'new', chatId: 'chat-123' },
      { id: 'lead-form', stage: 'new', chatId: null },
    ] });
  });

  it('opens only the linked chat conversation', async () => {
    const onOpenConversation = vi.fn();
    render(<BuyerNegotiationsPanel onOpenConversation={onOpenConversation} />);
    const buttons = await screen.findAllByRole('button', { name: 'Open conversation' });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onOpenConversation).toHaveBeenCalledWith('chat-123');
  });
});
