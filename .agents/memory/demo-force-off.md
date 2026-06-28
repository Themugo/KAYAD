---
name: Demo force-off pattern
description: How to implement a persistent admin "disable demo mode" toggle that survives reloads
---

## Rule
Writing `kayad_demo_force_off` to localStorage is not enough — api.ts must also READ the flag at every decision point where `__DEMO_MODE__` could be set to `true`.

**Why:** The demo fallback activates in three places: (1) the network error interceptor, (2) `withDemo()` on real-API failure, (3) `withDemo()` when already in demo mode. If any of these set `__DEMO_MODE__ = true` without checking the force-off flag, a page reload re-enables demo despite the admin's intent.

**How to apply:**
- Add `const _isDemoForceOff = () => { try { return !!localStorage.getItem('kayad_demo_force_off'); } catch { return false; } }` and `const _canActivateDemo = () => DEMO_MODE_ENABLED && !_isDemoForceOff()`.
- Replace every `__DEMO_MODE__ = true` assignment with `if (_canActivateDemo()) __DEMO_MODE__ = true`.
- `enableDemoMode()` (called on quick-login) must clear the force-off key so the admin can re-enable demo intentionally.
