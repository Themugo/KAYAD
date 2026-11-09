# KAYAD Phase 9 — Admin Color and Style Token Map

Tokens are defined in the existing `src/styles/kayad-admin-shell.css` under `.kayad-admin-shell`; they do not affect the public marketplace outside that wrapper. Values below are the actual implemented values.

## Brand and shell
| Token | Value | Intended use |
|---|---|---|
| `--admin-shell-bg` | `#0A3340` | Admin outer shell |
| `--admin-sidebar-bg` | `#092F3B` | Sidebar surface |
| `--admin-header-bg` | `#0E4655` | Header surface |
| `--admin-accent` | `#13B8A6` | Brand accent and active navigation |
| `--admin-accent-strong` / `--admin-accent-text` | `#0B756E` | Stronger readable accent text |
| `--admin-accent-bright` | `#72E2D4` | Accent on dark shell |
| `--admin-accent-muted` | `#347E78` | Muted accent text/borders |
| `--admin-brand` | `#176B87` | Primary content action/link |
| `--admin-brand-dark` | `#12576D` | Strong secondary brand surface |
| `--admin-brand-deep` | `#0A3340` | Deep brand/hero surface |
| `--admin-brand-soft` | `#DDF4F0` | Soft branded surface |

## Content surfaces and text
| Token | Value | Intended use |
|---|---|---|
| `--admin-canvas` | `#F6FAF9` | Admin page canvas |
| `--admin-surface` | `#FFFFFF` | Cards and panels |
| `--admin-surface-soft` | `#EEF7F5` | Secondary panels and controls |
| `--admin-surface-muted` | `#F3FAF9` | Muted surface |
| `--admin-surface-hover` | `#E6F6F3` | Hover surface |
| `--admin-ink` | `#0A3340` | Primary content text |
| `--admin-body` | `#334155` | Body text |
| `--admin-muted-content` | `#64748B` | Muted content text |
| `--admin-muted-on-dark` | `#94A3B8` | Muted text on dark panels |
| `--admin-border` | `#D7E7E4` | Default border |
| `--admin-border-soft` | `#E3EFEC` | Soft border |
| `--admin-divider` | `#E7EFED` | Divider |
| `--admin-focus-ring` | `rgba(19, 184, 166, 0.72)` | Focus ring |

## Semantic statuses
| Token | Value | Meaning |
|---|---|---|
| `--admin-status-success` | `#15803D` | Success text |
| `--admin-status-success-bright` | `#16A34A` | Success indicator |
| `--admin-status-success-bg` | `#DCFCE7` | Success background |
| `--admin-status-warning` | `rgb(146, 64, 14)` | Warning text |
| `--admin-status-warning-bright` | `rgb(217, 119, 6)` | Warning indicator |
| `--admin-status-warning-bg` | `#FEF3C7` | Warning background |
| `--admin-status-danger` | `#B91C1C` | Error/destructive text |
| `--admin-status-danger-bg` | `#FEE2E2` | Error background |
| `--admin-status-info` | `#0E7490` | Informational text |
| `--admin-status-info-bg` | `#E0F2FE` | Informational background |
| `--admin-status-neutral` | `#475569` | Neutral status |
| `--admin-status-neutral-bg` | `#F1F5F9` | Neutral background |

## Typography, shape and elevation
- `--admin-font-sans`: existing Plus Jakarta Sans stack through `--font-sans`.
- `--admin-font-display`: existing Outfit/Plus Jakarta Sans stack through `--font-display`.
- `--admin-type-xs`, `--admin-type-sm`, `--admin-type-base`, `--admin-type-title`: 10px, 12px, 14px, 18px reference sizes.
- `--admin-radius-sm`, `--admin-radius-md`, `--admin-radius-lg`: 6px, 9px, 12px.
- `--admin-shadow-card`: restrained teal-tinted card shadow.
- `--admin-shadow-hover`: restrained elevated hover shadow.

## Intentional exclusions
- The global `:root` brand variables remain untouched to avoid changing public marketplace pages.
- Public vehicle paint swatches, saved branding data, hero photography and business-status semantics are not treated as admin theme values.
- Some legacy components retain Tailwind status utility names; the existing admin wrapper maps the repeated success/error/status utility classes to the semantic admin token family.
