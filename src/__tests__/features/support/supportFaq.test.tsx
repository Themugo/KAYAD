import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const cmsFaqApi = vi.hoisted(() => ({
  getCMSFaqs: vi.fn(),
  trackFaqOpened: vi.fn(),
}));

vi.mock('../../../services/cmsFaqApi', () => cmsFaqApi);

import SupportFAQ, { FAQ_DATA } from '../../../features/SupportFAQ';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupportFAQ - backend-sourced content', () => {
  it('renders the bundled default content immediately, before any fetch resolves', () => {
    cmsFaqApi.getCMSFaqs.mockReturnValue(new Promise(() => {})); // never resolves
    render(<SupportFAQ />);
    expect(screen.getByText(FAQ_DATA[0].question)).toBeTruthy();
  });

  it('keeps the default content when the backend returns no rows', async () => {
    cmsFaqApi.getCMSFaqs.mockResolvedValue([]);
    render(<SupportFAQ />);
    await waitFor(() => expect(cmsFaqApi.getCMSFaqs).toHaveBeenCalledTimes(1));
    expect(screen.getByText(FAQ_DATA[0].question)).toBeTruthy();
  });

  it('switches to live backend content once /api/cms/faqs answers with rows', async () => {
    cmsFaqApi.getCMSFaqs.mockResolvedValue([
      {
        id: 'live-1', question: 'A live question only the backend has', answer: 'A live answer.',
        category: 'escrow', order: 1, popularity: 100, relatedQuestions: [], nextStep: 'Open Escrow',
        createdAt: '', updatedAt: '',
      },
    ]);
    render(<SupportFAQ />);
    await screen.findByText('A live question only the backend has');
    // The bundled fallback copy is no longer shown once live rows replace it.
    expect(screen.queryByText(FAQ_DATA[0].question)).toBeNull();
  });

  it('puts bundled account-access help in the Account & access filter and includes the reopen guidance', async () => {
    cmsFaqApi.getCMSFaqs.mockResolvedValue([]);
    render(<SupportFAQ />);
    fireEvent.click(screen.getByRole('button', { name: /Account & access/i }));
    expect(await screen.findByText('I cannot access my account or a transaction.')).toBeTruthy();
    expect(screen.getByText('Can I reopen a case after it is marked resolved?')).toBeTruthy();
  });

  it('normalizes legacy CMS category spellings so account help does not disappear from its filter', async () => {
    cmsFaqApi.getCMSFaqs.mockResolvedValue([{
      id: 'legacy-account', question: 'Legacy account access question', answer: 'Answer.',
      category: 'account_access', order: 1, popularity: 0, relatedQuestions: [], nextStep: null,
      createdAt: '', updatedAt: '',
    }]);
    render(<SupportFAQ />);
    fireEvent.click(screen.getByRole('button', { name: /Account & access/i }));
    expect(await screen.findByText('Legacy account access question')).toBeTruthy();
  });

  it('reports a live FAQ as opened (feeds the real popularity ranking), but never a bundled fallback one', async () => {
    cmsFaqApi.getCMSFaqs.mockResolvedValue([
      {
        id: 'live-2', question: 'Another live question', answer: 'Answer.',
        category: 'marketplace', order: 1, popularity: 0, relatedQuestions: [], nextStep: null,
        createdAt: '', updatedAt: '',
      },
    ]);
    render(<SupportFAQ />);
    const liveQuestion = await screen.findByText('Another live question');
    fireEvent.click(liveQuestion);
    await waitFor(() => expect(cmsFaqApi.trackFaqOpened).toHaveBeenCalledWith('live-2'));
  });

  it('does not call trackFaqOpened for the bundled fallback content (not a real backend row)', async () => {
    cmsFaqApi.getCMSFaqs.mockResolvedValue([]);
    render(<SupportFAQ />);
    await waitFor(() => expect(cmsFaqApi.getCMSFaqs).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText(FAQ_DATA[1].question));
    expect(cmsFaqApi.trackFaqOpened).not.toHaveBeenCalled();
  });
});
