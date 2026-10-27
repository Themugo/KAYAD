# 13 Known gaps and release decision
## Release decision: B (partial) - not A
Everything achievable without live infrastructure is done and verified; A is not claimable because live staging is BLOCKED (report 12).
Tiers: [U] unit and [B] real bundle with mocked API are complete. [L] live backend: none run, ever.
## Calendar
Re-inspected source: the only calendar is the CMS publishing calendar (GET /api/cms/calendar, admin ContentStudio). There is no dealer or business calendar API, route or table; appointment fields appear only in chat message types. The dashboard keeps showing no calendar. Future requirement: a business-calendar domain (appointments, test drives, inspections) with its own API.
## Open items
1. Live staging verification (blocked).
2. Server-side auction/bid guard on DELETE /api/cars/:id (auction domain).
3. Team policy gaps in report 08 (peer removal, multi-org membership, GET /team exposure).
4. Validators: communications:providers and live-runtime need an environment; brand-palette, stage24, stage5f7 need an admin visual fix or restored documents (report 06).
5. eslint . 2,286 legacy errors in tooling folders (report 04); needs a config override.
6. Cloud photo upload depends on Cloudinary configuration, unverifiable here.
