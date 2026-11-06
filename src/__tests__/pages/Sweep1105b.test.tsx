import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { titleForRoute } from '../../utils/pageTitle';

describe('1105b sweep', () => {
  it('titles the dealer/auth routes that previously fell back to the default', () => {
    for (const [p, t] of [['/dealer/auction-setup','Set up an auction'],['/dealer/auction-operations','Auction operations'],['/dealer/onboarding','Dealer application'],['/dealer/setup','Join a dealer team'],['/force-password-change','Change your password'],['/verify-email','Verify your email']]) {
      expect(titleForRoute(p, '')).toContain(t);
    }
  });
  it('dealer mobile nav scrolls inside itself and is the positioning context', () => {
    const s = fs.readFileSync('src/pages/dealer/dashboard/DealerDashboard.tsx', 'utf8');
    expect(s).toMatch(/<nav[^>]*relative flex-1[^>]*overflow-x-auto lg:overflow-x-visible/);
  });
  it('FAQ answers cover commitments, refunds and winning', () => {
    const s = fs.readFileSync('src/features/SupportFAQ.tsx', 'utf8');
    for (const id of ['faq-auctions-1','faq-auctions-3','faq-auctions-4']) expect(s).toContain(id);
  });
  it('admin screens tolerate missing data from the API', () => {
    const a = fs.readFileSync('src/pages/admin/AdminCars.jsx', 'utf8');
    expect(a).toContain("typeof res.policy !== 'object'");
    const d = fs.readFileSync('src/pages/admin/AdminSiteDesigns.jsx', 'utf8');
    expect(d).toContain('Array.isArray(o?.designs)');
  });
});
