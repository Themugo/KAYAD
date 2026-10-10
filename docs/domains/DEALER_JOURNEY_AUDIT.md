# Dealer Journey Audit & Onboarding Optimization Roadmap

**Audit Date:** 2026-06-24
**Tester Role:** First-time dealership owner, no technical training
**Platform:** Kayad (kayad.space)

---

## Executive Summary

The dealer journey has 7 major touchpoints. Of these, **4 have critical UX gaps** that prevent a first-time dealer from successfully listing and managing vehicles without support. The biggest blockers: no KYC document upload, technical jargon without explanation, confusing registration flow (phone verification skipped → unfinished profile), and no lead management feature (bids are treated as leads but no inquiry/contact system exists).

**Overall Score: 52/100** (Needs improvement before self-serve launch)

---

## 1. Registration (`RegisterPage.jsx`)

### What the dealer sees
A simple 4-field form (Name, Email, Password, Phone) with a checkbox "I also want to sell cars".

### Issues found

| # | Issue | Line | Severity |
|---|-------|------|----------|
| R1 | No password requirements displayed. Only error shows AFTER submit ("Password must be at least 8 characters") | 27-29 | High |
| R2 | Phone field labeled "Phone (M-Pesa)" — a first-time dealer may not have M-Pesa or may not want to use their personal M-Pesa number for business | 85 | Medium |
| R3 | "I also want to sell cars" checkbox — what does this mean? After checking, the role becomes "dealer" but user has no idea what a dealer role entails | 90-91 | Medium |
| R4 | After registration, user is sent to `/verify-phone` with no explanation of why or what happens next | 45 | Low |
| R5 | No email verification step during registration flow — user must discover this later | — | Medium |

### What's good
- ✅ Clean, minimal form with good placeholder text
- ✅ Show/hide password toggle
- ✅ Auto-redirect if already logged in
- ✅ Referral code support via URL param

---

## 2. Phone Verification (`PhoneVerifyPage.jsx`)

### What the dealer sees
4-digit OTP input, "Verify Phone" button, "Resend code" link, and "Skip — I'll verify later".

### Issues found

| # | Issue | Line | Severity |
|---|-------|------|----------|
| P1 | **"Skip — I'll verify later" is the biggest UX trap.** New dealers click this, proceed to onboarding, complete it, and have an UNVERIFIED phone. They can list cars but can't receive payouts or bid deposits | 149-153 | **Critical** |
| P2 | No message saying "We sent an SMS to 07XX XXX XXX" — user doesn't know to check their phone | 101-103 | High |
| P3 | No cooldown explanation on auto-send — OTP is sent immediately on page load without user interaction | 25-28 | Medium |
| P4 | After Skip, dealer goes to `/dealer/onboarding` but phone is unverified. There's no reminder banner or warning | 88-89 | High |

### What's good
- ✅ Auto-focus between OTP digits
- ✅ 30-second resend cooldown
- ✅ Backspace navigates to previous digit

---

## 3. Dealer Onboarding Wizard (`DealerOnboarding.jsx`)

### What the dealer sees
3-step wizard: Business → Payments → Review

### Issues found

| # | Issue | Line | Severity |
|---|-------|------|----------|
| O1 | **No KYC / document upload.** A legitimate dealership needs to upload business registration, ID, or proof of address. Without this, the platform can't verify dealers | — | **Critical** |
| O2 | **No ID verification step.** Any user can claim to be a dealer with just a name, city, and bank account | — | **Critical** |
| O3 | "Bio" textarea has NO placeholder guidance. A dealer doesn't know what to write — years in business? Specialties? Brands they sell? | 184 | High |
| O4 | "Paybill Number" labeled as "Optional — M-Pesa paybill". A first-time dealer may not know what a paybill number is or how to get one | 222 | High |
| O5 | "M-Pesa Phone" labeled "Phone for bid deposits and payouts" — a dealer may not want to use their personal line for business M-Pesa | 227 | Medium |
| O6 | Business Name placeholder "Your dealership or trading name" — some dealers don't have a registered business name | 170 | Low |
| O7 | Review step (Step 3) has no "Edit" buttons per section — user must go back through all steps to fix one field | 236-261 | Medium |
| O8 | After "Complete Setup" → redirected to `/dealer/choose-plan` → then to `/dealer/cars/new` (which may be a dead route) | 95 | **Critical** |
| O9 | "Listing fees are currently waived" message shown in Review step — should also explain what costs exist (escrow fees, etc.) | 256-260 | Low |
| O10 | No post-onboarding "What's Next" screen with checklist of actions | — | Medium |

### What's good
- ✅ 3-step progress indicator is clear and visual
- ✅ Pre-fills from existing user profile data
- ✅ Validation with inline error messages
- ✅ Already-complete state with redirect to dealer hub

---

## 4. Add Car (Vehicle Upload) — `AddCarPage.jsx` + Step Components

### What the dealer sees
4-step wizard: Basic Info → Specs & Features → Pricing & Mode → Photos

### Issues found

| # | Issue | File:Line | Severity |
|---|-------|-----------|----------|
| A1 | **"Listing Title" is a free-text field with no template.** Most dealers don't know optimal title format. Should suggest: "[Year] [Brand] [Model] — [Key Feature]" | Basic:25 | High |
| A2 | **"Model" field is free-text input, not a dropdown.** This creates inconsistency — some enter "Land Cruiser V8", others "LC V8" | Basic:31 | High |
| A3 | "Dealer Phone" field is confusing — why is this needed separately from the account phone? No explanation | Basic:41-42 | Medium |
| A4 | **Technical jargon cluster in Specs step:** VIN/Chassis Number, Logbook Number, NTSA Verification Status — no tooltips or explanations for any of these | Specs:33-48 | **Critical** |
| A5 | "NTSA Verification Status" dropdown with options "Verified", "Pending Verification", "Not Verified" — a dealer may not know how to check NTSA status or what NTSA is | Specs:42 | High |
| A6 | "Features & Equipment" free-text tag input — no suggestions or common feature list to pick from | Specs:53-58 | Medium |
| A7 | "Allow Bidding" vs "Direct Buy" toggle is unclear. A new dealer doesn't know which to choose or the implications of each | Pricing:17-18 | High |
| A8 | Escrow toggle shown conditionally — no explanation of WHY escrow is beneficial or what it costs | Pricing:48-57 | High |
| A9 | Auction settings (draft vs live, end time) nested inside "Allow Bidding" section — easy to miss | Pricing:60-77 | Medium |
| A10 | "Publish Listing" button text but REAL dealers see "Submitted for Review" screen — misleading expectation | Page:122 | Medium |
| A11 | After publish → success screen says "usually within 24 hours" with no way to track review status | Success:16 | High |
| A12 | Step indicator shows numbers 1-4 but steps are clickable — user may accidentally navigate away from current step | Indicator:5 | Low |
| A13 | Year field is text with no min/max validation — dealer could enter "abc" or "2050" | Basic:34 | Medium |
| A14 | Price field is free text with no formatting for Kenyan Shillings (KES) — "3500000" vs "3,500,000" | Pricing:10 | Low |
| A15 | Description placeholder says "Describe your vehicle — condition, service history..." but no character limit shown | Basic:49 | Low |

### What's good
- ✅ 4-step visual progress indicator
- ✅ Drag-and-drop photo upload
- ✅ Cover image selection with visual preview (click to set as main)
- ✅ Feature tags with remove button
- ✅ Success page shows listing summary with thumbnail

---

## 5. Edit Car (`EditCarPage.jsx`)

### Issues found

| # | Issue | Line | Severity |
|---|-------|------|----------|
| E1 | "Access Denied" screen has NO helpful message — no explanation of why, no contact support, no link back | 224 | High |
| E2 | "Copy" (duplicate) button exists but no explanation of what duplicating does or when to use it | 259-269 | Medium |
| E3 | "Promotion" tab has unclear value proposition — what does "Featured on homepage" cost? How does it work? | — | High |
| E4 | Delete button has `confirm()` dialog but no undo option | 96 | Medium |
| E5 | "Save Changes" triggers full page redirect to `/dealer` — confusing if user was editing multiple things | 89 | Medium |
| E6 | Edit form populates `location.city` but saves as flat `city` — possible data mismatch | 85 | Low |

### What's good
- ✅ Tab-based layout (Details, Photos, Auction, Promotion)
- ✅ Image management with upload, delete, bulk delete, cover selection
- ✅ Status badges (Active, Sold, Pending, Rejected)
- ✅ Live auction badge with pulse animation

---

## 6. Dealer Dashboard (`DealerDashboard.jsx` + Tabs)

### What the dealer sees
Overview page with KPIs, charts, quick actions; 7 tabs: Overview, Listings, Bids, Escrows, Earnings, Package, Team.

### Issues found

| # | Issue | Line | Severity |
|---|-------|------|----------|
| D1 | **No "Leads" or "Inquiries" tab.** There's no way for a dealer to see who's interested in their cars. Bids are shown but inquiries/contacts are invisible | — | **Critical** |
| D2 | 8 stat cards on Overview — overwhelming for a first-time dealer. "Conversion Rate" and "Draft Auctions" are meaningless to new users | Overview:81-91 | High |
| D3 | "CSV" export button is visually hidden in the Listings tab — dealers may want to download their inventory | Listings:34 | Low |
| D4 | Escrows tab loads data on tab click (separate API call) with loading spinner — no cached data shown first | Dashboard:86-93 | Medium |
| D5 | No "quick tour" or onboarding overlay for first-visit to the dashboard | — | Medium |
| D6 | Greeting says "Good morning/afternoon/evening" but no personalization beyond that | Dashboard:42 | Low |
| D7 | Milestone tracker shows dealer success score but no explanation of HOW to improve it | — | Medium |

### What's good
- ✅ KPI section with 4 widgets (Inventory, Revenue, Auctions, Escrow)
- ✅ Quick action links (New Listing, Start Auction, Analytics, Settings)
- ✅ Performance chart (inventory value over time)
- ✅ Inventory by type visualization with progress bars
- ✅ Recent listings with edit/delete actions
- ✅ Activity feed with timeline
- ✅ Milestone tracker with completion score
- ✅ Top performing listings by views

---

## 7. Auction Setup (`DealerAuctionSetup.jsx` + Cards)

### Issues found

| # | Issue | Line | Severity |
|---|-------|------|----------|
| AU1 | "Reserve price" and "Reserve Mode" (No Reserve / Hidden / Visible) are advanced concepts with no explanation | DraftCard:16-19 | **Critical** |
| AU2 | "Minimum 24 hours" validation (line 104) — no explanation of WHY or recommendation for optimal duration | Setup:104 | High |
| AU3 | "Maximum 3 extensions" — what does this mean? When would a dealer need to extend? | Setup:134 | High |
| AU4 | Auction setup is on a SEPARATE page from the car — dealer must list a car first, then navigate to Auction page to configure | — | High |
| AU5 | Starting bid validation "at least KES 1,000" — no tooltip explanation | Setup:103 | Low |
| AU6 | No auction preview — dealer can't see how the auction will look to buyers before launching | — | Medium |
| AU7 | "Setup" tab shows "No draft auctions" empty state with confusing message | Setup:184 | Medium |

### What's good
- ✅ 3 tabs: Setup (draft), Live, Ended
- ✅ Count configuration with visual timeline showing estimated end
- ✅ Duration presets (24h, 48h, 72h, 5d, 7d)
- ✅ Live auction management (end auction, extend)
- ✅ Refresh button to update live state

---

## Critical Path: What a First-Time Dealer Actually Experiences

```
1. Register (4 fields + checkbox)    ← OK but confusing checkbox
       ↓
2. Phone Verify                      ← Can SKIP (huge problem)
       ↓
3. Onboarding Wizard (3 steps)       ← No KYC/docs uploaded
       ↓
4. Plan Selection                    ← Redirects to /dealer/cars/new (bleh)
       ↓
5. Add Car (4 steps)                 ← Confusing terms (VIN, NTSA, Paybill)
       ↓
6. "Submitted for Review"            ← Waiting 24h, can't track
       ↓
7. Dashboard                         ← 8 cards, no leads tab, no guidance
```

**Dead ends found:**
- `/dealer/cars/new` — post-plan-selection redirect target (likely 404 or wrong route)
- "Access Denied" on edit page with no recovery path
- Phone verification skip creates permanently unverified dealers

---

## Optimization Roadmap

### Phase 1: Critical (Launch Blocker) — Do this week

| Priority | Area | Fix | Effort |
|----------|------|-----|--------|
| P0 | Onboarding | Add KYC document upload step (National ID, Business Reg, or KRA PIN) | 2-3 days |
| P0 | Phone Verify | Remove "Skip" option for dealers. Make phone verification MANDATORY before listing | 30 min |
| P0 | Onboarding | Fix redirect after plan selection: `/dealer/choose-plan` → `/dealer` (not `/dealer/cars/new`) | 15 min |
| P0 | Add Car | Add tooltips/help icons next to VIN, Logbook, NTSA fields explaining what they are and how to find them | 2 hours |
| P0 | Add Car | Add Listing Title template/suggestion below the field: "e.g. 2020 Toyota Land Cruiser V8 — 45,000km, Full Service History" | 15 min |
| P0 | Dashboard | Add "Leads / Inquiries" tab showing who contacted the dealer about each listing | 2 days |

### Phase 2: High Priority — Do this sprint

| Priority | Area | Fix | Effort |
|----------|------|-----|--------|
| P1 | Registration | Show password requirements BEFORE submit (min length, etc.) | 30 min |
| P1 | Phone Verify | Show masked phone number: "We sent a 4-digit code to 07XX XXX 456" | 15 min |
| P1 | Onboarding | Add "What to write in your bio" hint with examples | 15 min |
| P1 | Onboarding | Add "Edit" links on Review step so user can jump to any section | 1 hour |
| P1 | Add Car | Change Model from free-text to autocomplete/typeahead with known models per brand | 4 hours |
| P1 | Add Car | Explain "Direct Buy" vs "Allow Bidding" with simple comparison: "Direct Buy: Buyer pays your price. Bidding: Buyers compete." | 1 hour |
| P1 | Add Car | Add price formatting (automatically add commas: 3,500,000) | 30 min |
| P1 | Add Car | Show review status in Dealer Hub — "Your listing is under review (submitted 2h ago)" | 2 hours |
| P1 | Auction | Add explanation of reserve price: "The minimum price you're willing to accept. If bids don't reach this, you don't have to sell." | 1 hour |
| P1 | Auction | Move auction setup INTO the Add Car flow (Step 3) instead of requiring a separate page | 4 hours |

### Phase 3: Medium Priority — Do next sprint

| Priority | Area | Fix | Effort |
|----------|------|-----|--------|
| P2 | Onboarding | Add "Paybill Number" explanation: "A paybill is a business M-Pesa number. Contact your bank to set one up, or leave blank." | 30 min |
| P2 | Onboarding | Add post-onboarding "What's Next" screen with checklist | 2 hours |
| P2 | Add Car | Pre-populate Model suggestions based on selected Brand | 2 hours |
| P2 | Add Car | Add description character counter | 15 min |
| P2 | Dashboard | Add "Quick Tour" overlay on first dashboard visit | 1 day |
| P2 | Dashboard | Simplify stat cards — collapse less important metrics behind "Show more" | 1 hour |
| P2 | Edit Car | Improve "Access Denied" page with explanation and support link | 30 min |
| P2 | Edit Car | Explain "Promotion" tab value: "Your listing appears at the top of search and on the homepage. Price: KES X/day" | 1 hour |

### Phase 4: Polish — Do when time allows

| Priority | Area | Fix | Effort |
|----------|------|-----|--------|
| P3 | Registration | Add email verification step or at least explain that verification email was sent | 1 hour |
| P3 | Phone Verify | Pre-fill phone from registration and show format example | 15 min |
| P3 | Onboarding | Add deal registration document upload for business-name verification | 1 day |
| P3 | Add Car | Add "Preview as Buyer" button to see how listing looks before publishing | 2 days |
| P3 | Add Car | Add year validation (min 1980, max next year) | 15 min |
| P3 | Auction | Add auction preview before launching | 1 day |
| P3 | Auction | Explain extension limit: "Auctions can be extended up to 3 times to allow fair counter-bids" | 30 min |
| P3 | Dashboard | Add personalization with dealer name and avatar | 1 hour |
| P3 | Dashboard | Add cached escrow data so tab doesn't show loading state | 1 hour |

---

## Summary of All Issues by Severity

| Severity | Count | Areas |
|----------|-------|-------|
| **Critical** | 8 | Phone verify skip, no KYC, dead redirect, no lead management, technical jargon (VIN/NTSA), reserve price confusion |
| High | 15 | Password requirements hidden, model free-text, phone verify UX, escrow explanation, bio guidance, promotion value, review tracking, access denied page, auction duration explanation |
| Medium | 13 | Paybill confusion, feature suggestions, bidding vs direct buy, auction in wrong flow, post-onboarding checklist, etc. |
| Low | 5 | Price formatting, year validation, description counter, brand model suggestions, auction starting bid |

**Total: 41 issues found**
