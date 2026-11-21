-- Support FAQ: give the help-centre list a real next-action per
-- question (reusable for other CMS lists later) and seed the table
-- with the same reviewed copy the frontend previously shipped as a
-- hardcoded array, so /api/cms/faqs (already public-read, already
-- staff-writable) becomes the live source for the Support page
-- instead of code the question/answer text was never database-driven.
--
-- Additive and idempotent: ADD COLUMN IF NOT EXISTS, and the seed
-- inserts use fixed ids with ON CONFLICT (id) DO NOTHING, so a
-- replay never duplicates rows or clobbers a later staff edit made
-- through the existing authenticated CMS endpoints.

alter table public.cms_faqs
  add column if not exists next_step varchar(40);

comment on column public.cms_faqs.next_step is
  'Primary call-to-action for this answer: one of Open Marketplace, Open Auction, '
  'Open Inspection, Open Escrow, Open Financing, Open a support case, Sign in, or null. '
  'An editorial choice per question (e.g. an auction result dispute still routes to a '
  'support case rather than back to the auction screen) - not reliably derivable from '
  '`category` alone, so it is its own column rather than inferred client-side.';

insert into public.cms_faqs (id, question, answer, category, "order", popularity, next_step)
values
  ('b6693030-11b3-4606-b7e1-85ff7ef58cd3', 'How do I buy a vehicle through KAYAD?',
   'Start with Marketplace discovery, review the listing information available for the vehicle, use the available inspection path when appropriate, and follow the purchase and protected-transaction steps presented for that vehicle. If you already have a deal reference, include it when contacting Support so the team can work from the correct case.',
   'marketplace', 1, 100, 'Open Marketplace'),
  ('fad30f4b-b4d8-4373-ace9-4088a399822e', 'How do I report a problem with a vehicle listing or seller?',
   'Do not rely on a public listing message for a formal resolution. Open a Support case and include the vehicle, seller or listing reference plus a clear description of the issue. The support case becomes the traceable route for follow-up.',
   'marketplace', 2, 0, 'Open a support case'),

  ('a1d117ef-2461-4ae3-b490-19048986415f', 'What happens after I win a KAYAD auction?',
   'A winning auction outcome moves into the transaction and settlement workflow available to the winning buyer. Follow the purchase instructions attached to the transaction rather than treating the auction screen itself as proof of payment or ownership transfer.',
   'auctions', 1, 100, 'Open Auction'),
  ('d2ece541-1d80-4df7-b05b-7f8bf4334de8', 'I have a problem with a bid or auction result. What should I do?',
   'Keep the auction or vehicle reference and open a Support case. Describe what you saw, when it happened, and what outcome you expected. This gives the resolution team a traceable case instead of an untracked message.',
   'auctions', 2, 0, 'Open a support case'),

  ('f6862b19-150a-499b-80d0-b782f7bd54b6', 'What is included in a KAYAD pre-purchase inspection?',
   'Inspections are performed by independent inspection providers. Checklist depth and pricing are provider-specific, so KAYAD does not present one fixed inspection point count as a universal standard. The inspection record and report shown for your order are the authoritative source for that inspection.',
   'inspections', 1, 100, 'Open Inspection'),
  ('f1dd2b76-20ec-4c95-b272-826c448c2dfe', 'What if the inspection finds a serious problem?',
   'Keep the inspection order and report reference. If the finding affects an active purchase or escrow case, open a Support case with the inspection reference and explain the issue. Refund, dispute and settlement outcomes are governed by the applicable transaction state and review process; the Support page does not promise an automatic refund.',
   'inspections', 2, 0, 'Open a support case'),
  ('fdf2308d-4ae6-4e66-8a20-17e5260923b7', 'Can I use my own mechanic?',
   'You can raise the request with the seller and KAYAD Support. If the inspection needs to be part of a KAYAD inspection order, use the inspection workflow so the applicable provider, scheduling and report records remain attached to the transaction.',
   'inspections', 3, 0, 'Open Inspection'),

  ('ce4303f7-7c05-4188-b0eb-0845acf9e79a', 'How does KAYAD Escrow protect a transaction?',
   'KAYAD Escrow is built around a controlled transaction lifecycle. When an escrow is funded, the transaction records the protected funds as held under the applicable custody process; buyer confirmation, delivery, release, dispute and refund states are recorded by the backend. Funds are released or refunded only through the authorized transaction state and financial controls, not simply because a page says they should be.',
   'escrow', 1, 100, 'Open Escrow'),
  ('4c91955f-8ff4-40b0-b98e-9cc294ca7817', 'How do I know where to send an escrow payment?',
   'Use the funding instructions returned for your actual escrow case. Do not use bank or payment details copied from a general FAQ or from another transaction. If the instructions are missing, unclear or appear inconsistent with your case, stop and open Support before sending funds.',
   'escrow', 2, 0, 'Open Escrow'),
  ('d393f9b7-b41e-4ee3-8af2-3cf3cf4f5438', 'What happens if an escrow transaction is disputed?',
   'A dispute becomes a controlled transaction state. Resolution can lead to the applicable release or refund path, with financial records and settlement controls kept separate. Open a Support case for a human-readable case trail, and include the escrow reference.',
   'escrow', 3, 0, 'Open a support case'),

  ('cbf735f2-84c6-4ec3-b496-6bf4c0a4b296', 'How does vehicle financing work through KAYAD?',
   'Financing is partner- and underwriting-dependent. Requirements, rates, approval decisions and final terms come from the applicable financing workflow and partner. Support can help explain where your application sits, but cannot substitute for the lender''s underwriting decision.',
   'financing', 1, 0, 'Open Financing'),
  ('0bcad1b3-873a-444a-962e-2da0184446f0', 'My financing application is delayed or unclear. What should I send Support?',
   'Include the application or vehicle reference, the stage you reached, and the specific information you need. Do not place bank statements, ID documents or other sensitive financial documents into a general support description unless the authenticated workflow explicitly requests them.',
   'financing', 2, 0, 'Open a support case'),

  ('3a209078-691c-4a6b-9c34-a4641b5fcad8', 'How do I get help with logbook or ownership transfer?',
   'Ownership transfer is a governed post-transaction fulfilment step. KAYAD Support can help you identify the correct transaction and current case state. The support page does not claim a live direct government-registry integration or automatic title clearance.',
   'transfer', 1, 100, 'Open a support case'),
  ('d62500e1-0192-4213-add1-65f48a52d9fd', 'I cannot access my account or a transaction.',
   'Use the sign-in flow first. If you can sign in but cannot see a transaction, inspection, escrow case or support case that should belong to you, open a Support case and provide the relevant reference. Support access is owner-scoped by the authenticated account.',
   'account', 1, 0, 'Sign in'),

  ('9e2a7f41-8c3d-4b77-9a0e-5d2c6f9b1a44', 'Can I reopen a case after it is marked resolved?',
   'Yes, within the reopen window shown on that case: reply to it and it moves back to open automatically. Outside that window, or on a case already closed, open a new case instead and mention the earlier reference. Submitting again never creates a duplicate case for the same attempt - each attempt carries its own idempotency key, so a dropped connection is safe to retry.',
   'account', 2, 0, null)
on conflict (id) do nothing;
