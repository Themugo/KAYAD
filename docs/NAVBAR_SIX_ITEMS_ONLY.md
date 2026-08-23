# NAVBAR REDUCED TO EXACTLY 6 ITEMS

Per explicit direction: "i only need 6 pages on the navbar. Marketplace, Auctions, Pre-Purchase Inspection, Support, Sell Vehicle, Sign In. everything else lives inside those pages in related operations."

## What was removed

- **"Finance"** - a 4th content destination alongside Marketplace/Auctions/Pre-Purchase Inspection/Support that wasn't in the named 6. Removed from the desktop main nav, the mobile menu's own separate copy, and the account dropdown's bank-officer section ("Underwriting Desk"/"Applications Intake") - all 3 locations pointed to the same removed destination, kept consistent.
- **The "Communication Hub" (chat) icon** - a visible, always-present navbar element beyond the named 6. Also carried a real bug worth noting in passing: its unread-count badge was hardcoded to the literal number "3" for every user, not bound to any real count - moot now that the icon itself is removed, but confirms this wasn't a loss of meaningfully-working functionality.
- **The "Favorites" (saved) icon** - same reasoning: a 7th always-visible navbar element not in the named list.

## What now makes up the main navbar, confirmed directly

Marketplace, Auctions, Pre-Purchase Inspection, Support (the 4 content destinations) - Sell Vehicle and Sign In (the 2 action buttons on the right) were already separate, existing elements, not changed structurally, just left as the only two remaining alongside the 4 content links.

## What was deliberately left alone, and why

The account dropdown's remaining role-specific entries (Dealer Dashboard, Mechanic/Inspection Dashboard, Admin Panel) were kept. These are not part of "the navbar" in the sense the request describes - they only appear for a genuinely signed-in user of that specific role, and are each role's only way to reach their own dashboard (not a duplicate of one of the 6 named destinations). Removing them would mean a dealer or admin has no way to reach their own account tools at all, not "living inside" one of the 6 pages some other way.

## Verification

| Check | Result |
|---|---|
| Frontend TypeScript | 0 errors |
| Frontend lint | Clean |
| Frontend unit test suite (Vitest) | 317/318 passing, unchanged - no regression |
| Frontend production build | Succeeds |
