# 02 — Old logo replacement register
| Location | Before | After |
|---|---|---|
| `src/App.tsx` `FooterLogo` fallback | `/branding/kayard-k-mark.png` | `DEFAULT_LOGO_DARK_URL` (approved lockup, dark variant) |
| `index.html` favicon | `kayard-k-mark.png` | `kayard-ke-favicon-32/64.png` |
| `index.html` apple-touch, `manifest.webmanifest`, `sw.js` icon/badge | K-mark `icons/icon-192/512/badge-72.png` | same paths, regenerated from approved lockup |
| `backend/mediaEventEngine/adapters/outputAdapters.js` | nonexistent `/icons/icon-192x192.png` | `/icons/icon-192.png` |
| Test mocks (App, AppDealerRouting, Navbar, NavbarStaffMenu) | `DEFAULT_LOGO_URL: kayard-k-mark.png` | approved logo + `DEFAULT_LOGO_DARK_URL` (needed for the new footer import; not an assertion weakening) |
## Retained legacy references (deliberate)
`BrandingContext.tsx:227` migration list of legacy marks; legacy asset files on disk; `kayad-*` CSS class names, DB/technical identifiers, `kayad.space` domain in meta tags. Header/auth/admin/dealer/legal/404 already render via `BrandMark` (approved logo).
Validators `validate-kayard-brand-identity-phase2`, `validate-kayad-navbar-branding`, `validate-pwa-mobile-contract` still PASS unchanged.
