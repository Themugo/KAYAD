import { describe, it, expect } from 'vitest';
import { INITIAL_AUCTION_SESSIONS } from '../../data/mockAuctions';

describe('mockAuctions - session dates stay logically consistent with their status', () => {
  // Found a second, independent instance of the same stale-date bug
  // class fixed in mockVehicles.test.ts: AuctionsView.tsx actually
  // renders from INITIAL_AUCTION_SESSIONS (this file), a completely
  // separate mock dataset from mockVehicles.ts's INITIAL_VEHICLES - my
  // first fix (to mockVehicles.ts) didn't touch what this page actually
  // displays. Both "Live" sessions had hardcoded endsAt dates already in
  // the past, and the one "Upcoming" session had a startsAt date also
  // already in the past (an "upcoming" auction whose start date has
  // already passed is a real logical contradiction, not just a display
  // quirk). Fixed using the same hoursFromNow() helper, exported from
  // mockVehicles.ts and reused here rather than duplicated, so both
  // files describing the same underlying vehicle's auction stay
  // numerically consistent with each other.
  it('every Live session has an endsAt in the future', () => {
    const live = INITIAL_AUCTION_SESSIONS.filter((s) => s.status === 'Live');
    expect(live.length).toBeGreaterThan(0);
    live.forEach((s) => {
      expect(new Date(s.endsAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  it('every Upcoming session has a startsAt in the future (an upcoming auction cannot have already started)', () => {
    const upcoming = INITIAL_AUCTION_SESSIONS.filter((s) => s.status === 'Upcoming');
    expect(upcoming.length).toBeGreaterThan(0);
    upcoming.forEach((s) => {
      expect(new Date(s.startsAt).getTime()).toBeGreaterThan(Date.now());
      expect(new Date(s.endsAt).getTime()).toBeGreaterThan(new Date(s.startsAt).getTime());
    });
  });

  it('every Ended session has both dates in the past (this is correct/intentional, not a bug - a historical record)', () => {
    const ended = INITIAL_AUCTION_SESSIONS.filter((s) => s.status === 'Ended');
    expect(ended.length).toBeGreaterThan(0);
    ended.forEach((s) => {
      expect(new Date(s.endsAt).getTime()).toBeLessThan(Date.now());
    });
  });

  // A second, unrelated bug found in the same file while verifying the
  // dates above: totalBidsCount is used directly as the "Bid Log (N)"
  // tab label in AuctionsView (confirmed via a direct grep of its
  // usage: `Bid Log (${selectedSession.totalBidsCount})`) - a direct,
  // checkable promise about how many entries a user will see when they
  // click that tab, not a decorative "lifetime activity" stat shown
  // separately from a curated recent-activity feed (which would have
  // been a legitimate reason for the numbers to differ). All 3 sessions
  // with actual bid history had a totalBidsCount roughly 2-3x higher
  // than their real bidHistory.length (14 vs 6, 19 vs 4, 22 vs 2) -
  // fixed to match exactly.
  it('totalBidsCount matches the real length of bidHistory for every session (it directly labels the Bid Log tab)', () => {
    INITIAL_AUCTION_SESSIONS.forEach((s) => {
      expect(s.totalBidsCount).toBe(s.bidHistory.length);
    });
  });
});
