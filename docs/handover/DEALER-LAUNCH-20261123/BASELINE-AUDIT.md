# Baseline audit — dealer launch (2026-11-23)

Baseline = GitHub `Themugo/KAYAD` main `ab75588`, byte-identical to the working checkout before this change (verified by clone + `diff -rq`).
Labels: VERIFIED (executed, evidence), NOT VERIFIED (cannot be established from here), POLICY (owner decision overrides the prompt).

## 1. v5 invitation-first onboarding and Team & Employment
| Item | Status |
|---|---|
| Invitation lifecycle, wrong-account rejection, Basic Staff Access default, staff numbers, employment events, `X-Dealer-Org` | VERIFIED locally (journeys 17, 21, 22; Jest; Vitest; browser). Hosted migration applied by the owner and read-back verified by the owner. |
| Live end-to-end invitation on the hosted app (fresh invite → accept → staff number) | NOT VERIFIED — owner has not reported it. |
| PR 266 status | NOT VERIFIED — not queried; keep open. |

The three v5 limitations in the prompt, classified:
1. *Replaced link and unknown link look identical* — by design (no existence oracle). A neutral message is correct security behaviour; unchanged.
2. *Invited e-mail not prefilled on the login page* — usability gap, not a defect; sign-in still rejects a wrong identity. Unchanged.
3. *Acceptance notification goes to the dealership account, not each delegated inviter* — unchanged; the dealership owner is notified and the acceptance is in the Team activity feed.

## 2. Defects found by this audit and fixed
| # | Defect (evidence) | Fix |
|---|---|---|
| D1 | **One lead per chat message.** `kayad_create_lead_atomic` used `INSERT … ON CONFLICT DO NOTHING`, but `idx_leads_business_identity` is a plain index, so nothing ever conflicted. A disposable-DB run produced 5 leads for one conversation; "New enquiries" and the lead list were inflated. | Forward migration `20261123210000_lead_create_find_before_insert.sql` (find before insert, same advisory lock, same signature/return). Historic duplicates are not touched. |
| D2 | **A dealer's reply never moved a new lead to "contacted".** `sendMessage` compared the sender with *the other participant* (the buyer). | Compare with the lead's dealership. |
| D3 | **Leads table showed "Unknown" / "Vehicle" for every real lead** — the API returned ids only. | `GET /dealer-platform/leads` and `PUT …/leads/:id` now include buyer name/e-mail and vehicle title. |
| D4 | **No way for a dealer or staff member to reply to a buyer from the dealer workspace.** | `GET/POST /dealer-platform/leads/:leadId/messages` (permission `canChatBuyers`, lead must belong to the caller's dealership and be chat-sourced; reuses the canonical chat send path: participant check, UUID idempotency key, notification, lead activity). Covered by the **messaging feature freeze**. Staff replies are audited with the acting member. |
| D5 | **No path for vehicle-specific requests to KAYARD administration.** | `GET/POST /dealer-platform/vehicle-requests` on the existing support-case system (category `seller`, linked to the vehicle, ownership checked; no status/priority/price accepted; admin handles it in the existing support queue). |
| D6 | **Listings held as `pending` were never released when the dealer was approved** (per-listing review is retired, so nothing else releases them). | `approveDealer` releases the dealer's `pending` listings after the atomic approval (best effort, reported, audited, cache invalidated; failure never undoes the approval). |
| D7 | Dashboard labels contradicted policy ("Pending approval" tile). | Renamed "Under review"; every inventory row now explains what its status means for buyers. |

## 3. Policy conflicts with the prompt (not reinstated)
* **Per-listing admin approval before publication is retired** by owner policy (`listingModeration: auto_publish`). The prompt's "submit for approval / request corrections / resubmit / reject" lifecycle is therefore **not implemented**: the database allows only `available/sold/pending/reserved/hidden/draft`, and adding "changes requested" would need a migration and an owner decision. What exists: auto-publish for eligible dealers, post-publication admin moderation (approve / hide with a note, dealer notified, audited), dealer-visible status with next action.
* Gate C items "listing reaches administration review", "administration can reject or request corrections" are marked **POLICY — not applicable**, not passed.

## 4. Not changed (by instruction)
Escrow, payment, payout, refund, commission, ledger, auction and settlement logic and RPCs; hosted data; secrets.
