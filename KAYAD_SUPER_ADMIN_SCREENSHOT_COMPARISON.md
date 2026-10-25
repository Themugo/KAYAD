# KAYAD Super Admin — Screenshot Comparison (baseline vs final)

**All screenshots are browser captures of the built frontend answered by labelled test fixtures (`@fixture.invalid`, "Fixture …"). None is a production screenshot.**

* Baseline: `evidence/super-admin-completion-20261025/screenshots-before/` — unmodified Phase 12 foundation, 1440×900, populated fixtures, 49 routes (47 mounted + alias + unknown route).
* Final: `evidence/super-admin-completion-20261025/screenshots-after/final/` — final build, same scenario and viewport (tag `fin-a`), plus 11 further scenario/viewport sets (588 captures in total).
* Side-by-side pairs for 12 representative routes: `evidence/super-admin-completion-20261025/comparison/pair-*.png` (left = before, right = after).

"Content luminance" is the mean greyscale value (0 = black, 255 = white) of the area right of the sidebar and below the header. It is a crude, reproducible indicator: the legacy dark/low-contrast pages scored low, the light KAYAD canvas scores high. It does not replace looking at the pictures.

| Route | Baseline h1 | Final h1 | Content luminance before → after | Console errors before | Error boundary after | axe violations after |
|---|---|---|---:|---:|---|---:|
| `/admin` | Welcome back, Test Administrator | Welcome back, Test Administrator | 217.6 → 190.8 | 4 | no | 0 |
| `/admin/ads` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 24.3 → 247.5 | 3 | no | 0 |
| `/admin/ai` | Something went wrong | AI Platform Builder | 242.7 → 244.2 | 5 | no | 0 |
| `/admin/auctions` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 40.6 → 248.6 | 3 | no | 0 |
| `/admin/automation` | Automation Studio | Automation Studio | 244.9 → 243.4 | 3 | no | 0 |
| `/admin/bids` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 40.9 → 249.2 | 3 | no | 0 |
| `/admin/broadcast` | Broadcast Message | Broadcast Message | 40.2 → 248.9 | 3 | no | 0 |
| `/admin/cars` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 42.4 → 247.6 | 3 | no | 0 |
| `/admin/chats` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 248.5 → 247.7 | 3 | no | 0 |
| `/admin/cms` | Content Studio | Content Studio | 244.9 → 244.2 | 3 | no | 0 |
| `/admin/command-center` | Command Center | Command Center | 177.5 → 215.8 | 3 | no | 0 |
| `/admin/communications` | Something went wrong | Messaging Operations | 242.6 → 245.2 | 5 | no | 0 |
| `/admin/config` | Configuration Center | Configuration Center | 246.7 → 245.2 | 3 | no | 0 |
| `/admin/control-center` | Enterprise Control Center | Enterprise Control Center | 245.6 → 244.8 | 3 | no | 0 |
| `/admin/control-room` | Operations Control Room | Operations Control Room | 73.2 → 246.6 | 3 | no | 0 |
| `/admin/dealer-verifications` | Dealer Verifications | Dealer Verifications | 94.4 → 248.7 | 3 | no | 0 |
| `/admin/digital-twin` | Digital Twin Center | Digital Twin Center | 211.8 → 224.6 | 3 | no | 0 |
| `/admin/does-not-exist` | — | — | capture missing | | | |
| `/admin/escrows` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 43.3 → 247.3 | 3 | no | 0 |
| `/admin/feedback` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 40.2 → 249.4 | 3 | no | 0 |
| `/admin/governance` | Governance Studio | Governance Studio | 244.4 → 243.7 | 3 | no | 0 |
| `/admin/improvement` | Continuous Improvement | Continuous Improvement | 109.4 → 248.8 | 3 | no | 0 |
| `/admin/inspections` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 41.2 → 248.7 | 3 | no | 0 |
| `/admin/inspector-applications` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 78.5 → 248.7 | 3 | no | 0 |
| `/admin/integration` | Integration Studio | Integration Studio | 140.2 → 248.7 | 3 | no | 0 |
| `/admin/intelligence` | Something went wrong | Executive Intelligence | 242.6 → 248.7 | 5 | no | 0 |
| `/admin/lowcode` | Business Object Studio | Business Object Studio | 242.7 → 242.5 | 3 | no | 0 |
| `/admin/market-data` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 248.7 → 247.6 | 3 | no | 0 |
| `/admin/moderation` | Car Moderation Queue | Car Moderation Queue | 43.9 → 246.6 | 3 | no | 0 |
| `/admin/ntsa-queue` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 41.0 → 248.2 | 3 | no | 0 |
| `/admin/owners` | Something went wrong | (no h1: page uses a section heading) | 242.6 → 247.8 | 5 | no | 0 |
| `/admin/panic-room` | Panic Room | Panic Room | 232.7 → 230.5 | 3 | no | 0 |
| `/admin/platform-factory` | Platform Factory | Platform Factory | 243.6 → 243.6 | 3 | no | 0 |
| `/admin/provider-governance` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 95.1 → 248.7 | 3 | no | 0 |
| `/admin/referrals` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 248.9 → 247.3 | 3 | no | 0 |
| `/admin/reports` | Reports | Reports | 40.1 → 248.8 | 3 | no | 0 |
| `/admin/reviews` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 248.6 → 247.8 | 3 | no | 0 |
| `/admin/security-log` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 119.8 → 248.4 | 3 | no | 0 |
| `/admin/sellers` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 42.5 → 246.4 | 3 | no | 0 |
| `/admin/settings` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 42.4 → 248.2 | 3 | no | 0 |
| `/admin/staff` | Staff directory & access | Staff directory & access | 67.1 → 245.3 | 3 | no | 0 |
| `/admin/staff-permissions` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 42.7 → 247.4 | 3 | no | 0 |
| `/admin/support` | Something went wrong | (no h1: page uses a section heading) | 242.6 → 249.6 | 4 | no | 0 |
| `/admin/support-tickets` | Something went wrong | (no h1: page uses a section heading) | 242.6 → 249.6 | 5 | no | 0 |
| `/admin/transactions` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 40.5 → 248.7 | 3 | no | 0 |
| `/admin/users` | **none (error boundary or no h1)** | (no h1: page uses a section heading) | 44.3 → 247.5 | 3 | no | 0 |
| `/admin/vxp` | Something went wrong | Visual Experience Studio | 242.6 → 245.2 | 5 | no | 0 |
| `/admin/webhoist` | System Overview | System Overview | 167.3 → 247.0 | 3 | no | 0 |
| `/admin/xos` | Experience Studio | Experience Studio | 234.1 → 232.8 | 3 | no | 0 |

Routes compared: 48. Content luminance increased on 34 of them. Console errors before are the sandbox network blocks (Google Fonts, Socket.IO CDN) plus the intentionally unreachable fixture image; the same environmental errors remain after and are not application defects.

## What changed visibly
* Dashboard: canonical hero, six KPIs, quick actions, approvals, system health with real response data, recent activity, governance rail.
* Legacy dark-theme pages (Webhoist, Panic Room, Users, Listings, Reviews, Chats, studios) now sit on the light KAYAD canvas with readable tables and visible action buttons.
* The seven routes that crashed into the application error boundary at baseline (six distinct failures: Support and Support Tickets share a component; VXP, AI builder, Intelligence, Owners, Communications) now render.
* Missing data is shown as "Unavailable" with neutral styling instead of invented numbers or reassuring green status.
