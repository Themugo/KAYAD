// src/config/roleDefinitions.js
// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for what each seller role *is* and *can do*.
// Used by registration, dashboards, and listing forms so the distinction
// between a dealer, a broker, and a private seller is consistent everywhere.
//
//   DEALER  — a registered business with a physical showroom and a customer
//             base. Lists inventory at scale (tens of vehicles), can take
//             cars on consignment from private owners to sell on their
//             behalf, may list brand-new and used stock, and can run auctions.
//
//   BROKER  — a middleman / reseller with NO showroom and NO new stock.
//             Works on commission, helping private owners move their used
//             vehicles. Same selling concept as a dealer but smaller scale
//             and resale-only. Can run auctions on consigned vehicles.
//
//   PRIVATE SELLER (individual_seller)
//           — a casual owner selling their own vehicle(s). The kind of
//             seller who'd otherwise rely on a WhatsApp status or an
//             "On Sale" sticker on the windscreen. Minimal listings.
// ─────────────────────────────────────────────────────────────────────────

export const ROLE_DEFINITIONS = {
  dealer: {
    role: 'dealer',
    label: 'Car Dealer',
    short: 'Dealership',
    icon: '🏪',
    tagline: 'A showroom business selling at scale.',
    description:
      'Registered dealership with a physical showroom and an existing customer base. List your full inventory, take vehicles on consignment from private owners, and run live auctions.',
    capabilities: {
      hasShowroom:     true,
      canListNew:      true,   // brand-new stock allowed
      canConsign:      true,   // sell on behalf of private owners
      canRunAuctions:  true,
      commissionBased: false,
      defaultListingCap: 30,   // scales with package
      teamMembers:     true,
    },
    highlights: [
      'Physical showroom & storefront page',
      'List tens of vehicles (new & used)',
      'Sell on behalf of private owners (consignment)',
      'Run live auctions',
      'Team accounts for your sales staff',
    ],
    badge: 'Business',
  },

  broker: {
    role: 'broker',
    label: 'Broker',
    short: 'Broker',
    icon: '🤝',
    tagline: 'A middleman moving used cars on commission.',
    description:
      'Independent middleman with no showroom. You help private owners sell their used vehicles and earn a commission on each sale. Resale stock only — the dealer concept, without the storefront.',
    capabilities: {
      hasShowroom:     false,
      canListNew:      false,  // resale / used only
      canConsign:      true,   // brokering on behalf of owners is the whole point
      canRunAuctions:  true,
      commissionBased: true,
      defaultListingCap: 10,
      teamMembers:     false,
    },
    highlights: [
      'No showroom needed — work from anywhere',
      'Broker used vehicles for private owners',
      'Earn commission on every sale',
      'List & auction on behalf of owners',
    ],
    badge: 'Commission',
  },

  individual_seller: {
    role: 'individual_seller',
    label: 'Private Seller',
    short: 'Private Seller',
    icon: '🚗',
    tagline: 'Selling your own car, the smart way.',
    description:
      "Selling your own vehicle? Skip the WhatsApp status and windscreen sticker. List it properly with photos, verification and escrow-backed payment — your first listing is free.",
    capabilities: {
      hasShowroom:     false,
      canListNew:      false,
      canConsign:      false,  // you only sell what you own
      canRunAuctions:  false,
      commissionBased: false,
      defaultListingCap: 1,
      teamMembers:     false,
    },
    highlights: [
      'List your own vehicle in minutes',
      'First listing free',
      'Escrow-backed, secure payment',
      'No business account needed',
    ],
    badge: 'Free',
  },
};

export const getRoleDefinition = (role) => ROLE_DEFINITIONS[role] || null;
export const roleHasShowroom    = (role) => !!ROLE_DEFINITIONS[role]?.capabilities.hasShowroom;
export const roleCanListNew     = (role) => !!ROLE_DEFINITIONS[role]?.capabilities.canListNew;
export const roleCanConsign     = (role) => !!ROLE_DEFINITIONS[role]?.capabilities.canConsign;
export const roleCanRunAuctions = (role) => !!ROLE_DEFINITIONS[role]?.capabilities.canRunAuctions;
export const roleIsCommission   = (role) => !!ROLE_DEFINITIONS[role]?.capabilities.commissionBased;
