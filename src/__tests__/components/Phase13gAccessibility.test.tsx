// Phase 13G (Defect C) — focused accessibility regressions. EVIDENCE TIER: component tests. The browser-level axe results
// (real Chromium, wcag2a/2aa) are in runbooks/phase13g-20261026/ui/phase13g_ui_journeys.result.txt.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { AuctionExperienceRail } from '../../components/auction/AuctionExperienceRail';

afterEach(() => cleanup());

describe('auction journey rail', () => {
  it('exposes its horizontally scrolling step strip as a labelled, keyboard-focusable group', () => {
    render(<AuctionExperienceRail current="live" />);
    const strip = screen.getByRole('group', { name: 'Auction journey steps' });
    expect(strip.getAttribute('tabindex')).toBe('0');
  });
});

describe('source contracts for the Phase 13F accessibility findings', () => {
  const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), 'src', p), 'utf8');
  it('the Dealer dashboard notification icon button has an accessible name and a focus indicator', () => {
    const src = read('pages/dealer/dashboard/DealerDashboard.tsx');
    expect(src).toMatch(/<button type="button" aria-label="Notifications"[^>]*focus-visible:outline/);
    expect(src).toMatch(/<Bell [^>]*aria-hidden="true"/);
  });
  it('low-contrast greys were removed from the buyer dashboard cards and the auction overline', () => {
    expect(read('components/DashboardHub.tsx')).not.toContain('text-[#94A3B8]');
    expect(read('styles/auction-experience-2.css')).not.toContain('#789097');
  });
  it('the admin Approve button and the Seller Studio Create Listing button use a text-contrast-safe background', () => {
    expect(read('pages/admin/AdminPrivateSellerApplications.tsx')).not.toContain('bg-emerald-700'); // renders as #16a34a (3.29:1 with white) in this theme
    expect(read('features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx')).toContain("backgroundColor: '#0F766E'");
  });
});
