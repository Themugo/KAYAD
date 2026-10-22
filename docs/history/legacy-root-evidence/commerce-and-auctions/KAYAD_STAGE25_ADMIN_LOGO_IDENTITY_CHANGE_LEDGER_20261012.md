# Stage 25 Change Ledger

| File | Change | Reason |
|---|---|---|
| `src/components/layout/Footer.tsx` | Reads canonical BrandingContext; renders configured logo in centered and column footer layouts with contain sizing | Navbar/footer share the same admin-managed identity |
| `src/components/Navbar.tsx` | Explicit contain bounds and async decoding on uploaded logo | Keep uploaded logo within navbar logo slot without cropping |
| `src/pages/admin/AdminSettingsBranding.jsx` | Wide contain preview, supported image types, 5 MB client-side size check, better guidance and logoType update | Admin can preview a usable navbar/footer logo shape |
| `package.json` | Adds `validate:admin-logo-identity` | Repeatable source contract validation |
| `scripts/validate-stage25-admin-logo-identity-20261012.mjs` | Adds 12 source checks | Guard upload, persistence, shared identity and fit behavior |
| `KAYAD_STAGE25_ADMIN_LOGO_IDENTITY_AUDIT_20261012.md` | Adds audit and limitations | Record scope and honest validation status |
| `KAYAD_STAGE25_ADMIN_LOGO_IDENTITY_CHANGE_LEDGER_20261012.md` | Adds this ledger | File-level traceability |
| `KAYAD_STAGE25_ADMIN_LOGO_IDENTITY_VALIDATION_MATRIX_20261012.tsv` | Adds validation matrix | Record checks and results |
| `KAYAD_STAGE25_ADMIN_LOGO_IDENTITY_EXECUTION_LOG_20261012.txt` | Adds execution log | Record environment and constraints |
| `KAYAD_STAGE25_SHA256_MANIFEST_20261012.txt` | Adds changed-file checksums | Integrity traceability |
