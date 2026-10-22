# KAYAD Stage 5F.10 — Input verification

Date: 2026-10-20 (Africa/Nairobi). Environment treated as UNKNOWN / production-sensitive. Nothing was committed, pushed, deployed or migrated on any hosted system.

| Input | File | Bytes | SHA-256 expected | SHA-256 computed | Result |
|---|---|---:|---|---|---|
| A (private-seller gate, partial) | `KAYAD-STAGE5F9-PRIVATE-SELLER-AUCTION-ELIGIBILITY-GATE-PARTIAL-FULL-PROJECT-20261020.zip` | 57,297,264 | `4aa39fb76bbf598a266953b47f8c08eb7cd99ff41fb6bac7aa9e82d16bfd737d` | `4aa39fb76bbf598a266953b47f8c08eb7cd99ff41fb6bac7aa9e82d16bfd737d` | MATCH |
| B (admin / superadmin governance) | `KAYAD-STAGE5F5-ADMIN-SUPERADMIN-GOVERNANCE-COMPLETION-FULL-PROJECT-20261020.zip` | 56,098,631 | `a6796fa6fd0fa12419358ebf2baa9a36764c5666c9ca7b54e2a2d36eb4427d1b` | `a6796fa6fd0fa12419358ebf2baa9a36764c5666c9ca7b54e2a2d36eb4427d1b` | MATCH |

Both ZIPs live in the read-only upload area and were never modified; all work happened in a separate workspace (`/home/claude/s10/work`).

## Contents mapped

| Input | Files in archive (uncompressed 100.5 MB / 99.2 MB) | Integrity manifest |
|---|---:|---|
| A (5F.9) | 6,454 | Its own 5F.7 SHA-256 manifest verifies on the extracted tree except for exactly 3 files that 5F.9 itself modified (`bidController.js`, `auctionLifecycle.service.js`, `auctionSetup.service.js`) — expected, not corruption. |
| B (5F.5) | 5,992 | Its 5F.5 manifest verifies clean. |

## Lineage

Both inputs descend from the Stage 5F.4 project (owner-role governance). A common 5F.4 base was reconstructed from the 5F.4 ZIP in the upload area and used for a three-way file comparison (see the merge ledger).

## Statements about the inputs that were checked rather than assumed

* 5F.9 is explicitly "PARTIAL": its eligibility evaluator treated a vehicle with **no proposal as eligible**, was a read-then-decide check in the application layer (not atomic with bids), and its validator only compared source strings. Those facts were re-verified (see the defect register D-18…D-22).
* 5F.5's own report documents seven open owner decisions (OD-1…OD-7). They are carried forward unchanged.
