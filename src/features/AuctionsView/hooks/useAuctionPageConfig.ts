import { useState, useCallback } from 'react';
import { appendLogEntry } from '../../Admin/hooks/adminAuditLog';

/**
 * Admin-editable configuration for the auction ecosystem page. Same
 * scope philosophy as useHomePageConfig.ts (see that file's own top
 * comment for the full reasoning): section visibility toggles, editable
 * hero text, and one advert/sponsor card slot - not a general page
 * builder with arbitrary components or free-form layout. Persisted to
 * localStorage for the same reason as every other config in this
 * project: no connected backend to persist to yet, and this stays
 * purely presentational, never touching auction/bidding business logic.
 *
 * Every write is logged to the same shared, immutable admin audit log
 * used by escrowRulesConfig.ts (adminAuditLog.ts) - one log, not a
 * separate one per config surface, so an admin reviewing "what changed
 * and when" doesn't have to check multiple places.
 */
export interface AuctionPageConfig {
  heroTitle: string;
  heroDescription: string;
  sectionVisibility: {
    searchFilters: boolean;
    categories: boolean;
    liveBidding: boolean;
    endingSoon: boolean;
    upcoming: boolean;
    recentlySold: boolean;
    howItWorks: boolean;
    advertCard: boolean;
  };
  advertCard: {
    label: string;
    name: string;
    tagline: string;
    ctaLabel: string;
  };
}

export const DEFAULT_AUCTION_PAGE_CONFIG: AuctionPageConfig = {
  heroTitle: 'KAYAD Vehicle Auctions',
  heroDescription: 'Discover active vehicle auctions, compare listings, place real-time bids, and track ending times. Escrow Vault protection is available on eligible listings - look for the badge on each auction.',
  sectionVisibility: {
    searchFilters: true,
    categories: true,
    liveBidding: true,
    endingSoon: true,
    upcoming: true,
    recentlySold: true,
    howItWorks: true,
    advertCard: false, // off by default - an empty/placeholder advert would look worse than no advert at all until an admin fills in real content
  },
  advertCard: {
    label: 'Partner',
    name: 'NCBA Bank Kenya',
    tagline: 'Auction financing pre-approval in 24 hours - bid with confidence.',
    ctaLabel: 'Check Your Rate',
  },
};

const STORAGE_KEY = 'kayad_auction_page_config_v1';

function loadConfig(): AuctionPageConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AUCTION_PAGE_CONFIG;
    const parsed = JSON.parse(raw);
    // Shallow-merge over defaults, same reasoning as useHomePageConfig's
    // loadConfig - an older saved config missing a newly-added field
    // (e.g. advertCard, added after someone already customized their
    // config) shouldn't silently break rendering.
    return {
      ...DEFAULT_AUCTION_PAGE_CONFIG,
      ...parsed,
      sectionVisibility: { ...DEFAULT_AUCTION_PAGE_CONFIG.sectionVisibility, ...parsed.sectionVisibility },
      advertCard: { ...DEFAULT_AUCTION_PAGE_CONFIG.advertCard, ...parsed.advertCard },
    };
  } catch {
    return DEFAULT_AUCTION_PAGE_CONFIG;
  }
}

function summarizeChange(prev: AuctionPageConfig, next: AuctionPageConfig): string {
  const changes: string[] = [];
  if (prev.heroTitle !== next.heroTitle) changes.push('Hero title changed');
  if (prev.heroDescription !== next.heroDescription) changes.push('Hero description changed');
  (Object.keys(next.sectionVisibility) as (keyof AuctionPageConfig['sectionVisibility'])[]).forEach((key) => {
    if (prev.sectionVisibility[key] !== next.sectionVisibility[key]) {
      changes.push(`${key}: ${prev.sectionVisibility[key] ? 'shown' : 'hidden'} -> ${next.sectionVisibility[key] ? 'shown' : 'hidden'}`);
    }
  });
  if (JSON.stringify(prev.advertCard) !== JSON.stringify(next.advertCard)) {
    changes.push('Advert card content changed');
  }
  return changes.join('; ') || 'No fields changed';
}

export function useAuctionPageConfig(admin: { id: string; name: string } | null) {
  const [config, setConfig] = useState<AuctionPageConfig>(loadConfig);

  const updateConfig = useCallback((updater: (prev: AuctionPageConfig) => AuctionPageConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Config still applies in-memory even if persistence fails.
      }
      if (admin) {
        appendLogEntry({
          adminId: admin.id,
          adminName: admin.name,
          area: 'auction-page',
          summary: summarizeChange(prev, next),
        });
      }
      return next;
    });
  }, [admin]);

  const resetConfig = useCallback(() => {
    updateConfig(() => DEFAULT_AUCTION_PAGE_CONFIG);
  }, [updateConfig]);

  return { config, updateConfig, resetConfig };
}
