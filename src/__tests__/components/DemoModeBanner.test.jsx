import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import DemoModeBanner from '../../components/DemoModeBanner';

vi.mock('../../api/api', () => ({
  checkBackendAvailability: vi.fn().mockResolvedValue(false),
  isDemoMode: vi.fn(() => true),
}));

describe('DemoModeBanner', () => {
  afterEach(() => { cleanup(); });

  it('renders preview mode banner', async () => {
    render(<DemoModeBanner />);
    expect(await screen.findByText(/preview mode/i)).toBeInTheDocument();
  });
});
