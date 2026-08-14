import { Landmark, ShieldCheck, Wrench, Award } from 'lucide-react';
import { MarketingCardData } from '../components/MarketingCard';

// Realistic sponsor/partner set for the marketplace grid. Draws on
// partner names already established elsewhere in the app (NCBA Bank,
// AutoSure EA - was listed as an "Inspection Partner" in KAYADLive's
// mock data before that page was confirmed orphaned and deleted in a
// later frontend-cleanup pass; kept as a naming-continuity note, not a
// pointer to a file that still exists), used here as a motor insurance
// angle instead since 150-point
// inspection is already KAYAD's own core service) rather than inventing
// unrelated placeholder brands, so this reads as part of the same
// marketplace rather than disconnected filler content. The featured-
// dealer slot uses "Crown Motors Kenya" - a real seller name already
// present in mockVehicles.ts, not a new fictional dealer.
export const MOCK_SPONSOR_CARDS: MarketingCardData[] = [
  {
    id: 'sponsor-ncba',
    label: 'Partner',
    category: 'Finance Partner',
    name: 'NCBA Bank Kenya',
    tagline: 'Get pre-approved for auto financing in as little as 24 hours.',
    ctaLabel: 'Check Your Rate',
    icon: Landmark,
    accentColor: '#1E3063',
  },
  {
    id: 'sponsor-autosure',
    label: 'Partner',
    category: 'Motor Insurance Partner',
    name: 'AutoSure EA',
    tagline: 'Comprehensive motor cover from Ksh 15,000/year, arranged in minutes.',
    ctaLabel: 'Get a Quote',
    icon: ShieldCheck,
    accentColor: '#059669',
  },
  {
    id: 'sponsor-service',
    label: 'Sponsored',
    category: 'Service & Maintenance',
    name: 'RoadReady Auto Care',
    tagline: 'Certified service centres in Nairobi, Mombasa & Kisumu - book online.',
    ctaLabel: 'Book a Service',
    icon: Wrench,
    accentColor: '#C85A32',
  },
  {
    id: 'sponsor-featured-dealer',
    label: 'Featured Dealer',
    category: 'Verified Dealer Spotlight',
    name: 'Crown Motors Kenya',
    tagline: 'Westlands, Nairobi - 40+ certified vehicles in stock this week.',
    ctaLabel: 'View Dealer Inventory',
    icon: Award,
    accentColor: '#D4AF37',
  },
];
