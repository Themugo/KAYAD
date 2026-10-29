# Known gaps and recommended next actions

1. **Other sign-out entry points are unchanged.** Navbar, Profile and the inspector page still use `useAuth().logout()`, which clears the client even if the backend call fails. Only the admin menu uses the new server-confirmed `signOut()`. Next action: migrate them (small, same pattern) in a separate change.
2. **Dashboard data is refetched on return** (state is restored, data is not cached). Scroll restoration waits up to ~2 s for the page to become tall enough; on a very slow API the position may not be reached.
3. **Scroll/context restoration is implemented for the admin shell and the Command Centre only.** Other admin listings (Users, Listings, etc.) keep their own existing filter/pagination behaviour; they were not audited one by one. Listings that hold filters in component state still reset on Back.
4. **Hosted state unverified.** The maintenance flag was last read earlier in this engagement (enabled). The hosted warning will persist until Operation A or B is separately approved. Hosted owner recognition, PostgREST compare-and-swap, and hosted logout were not tested.
5. **Technical-recovery staff still have no MFA** (condition from the previous round; unchanged).
6. **Active Staff KPI** shows a "View staff" link rather than a count, because no verified staff-count source is wired; it was left as is rather than inventing a figure.
7. **Tablet (768px)** was verified by screenshot and overflow checks, not by a dedicated drawer-interaction test; the mobile drawer behaviour is covered by the existing AdminShell tests.
8. Validator count: 143 `validate:*` scripts enumerated now (141 pass); the same two fail only for missing credentials (`validate:communications:providers`, `validate:live-runtime`).
9. Node 22.23.4 used locally vs pinned 22.22.2.

Recommended order: (a) decide Operation A/B (explicit approval phrase required); (b) migrate remaining logout callers; (c) add filter persistence per listing page if wanted.
