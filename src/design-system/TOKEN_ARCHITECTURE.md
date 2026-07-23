# KAYAD Design System 2.0 - Token Architecture

## Philosophy

Design tokens are the atomic values that define the visual language of KAYAD. They ensure consistency across all UI elements and enable theme customization.

**Key Principles:**
1. **Semantic naming** - Tokens describe purpose, not value
2. **Cascading values** - Base tokens → Semantic tokens → Component tokens
3. **Single source of truth** - One change propagates everywhere
4. **Theme-ready** - Easy to create alternate themes

---

## Token Categories

### 1. Typography Tokens

#### Font Families
| Token | Value | Usage |
|-------|-------|-------|
| `--font-display` | Playfair Display | Headlines, hero text |
| `--font-sans` | Inter | Body, UI elements |
| `--font-mono` | JetBrains Mono | Code, technical data |

#### Type Scale
| Token | Size | Usage |
|-------|------|-------|
| `--text-display-xl` | clamp(3rem, 6vw, 4.5rem) | Hero headlines |
| `--text-display-l` | clamp(2.25rem, 4vw, 3rem) | Section headlines |
| `--text-h1` | clamp(1.75rem, 3vw, 2.25rem) | Page titles |
| `--text-h2` | clamp(1.375rem, 2vw, 1.75rem) | Section headers |
| `--text-h3` | clamp(1.125rem, 1.5vw, 1.375rem) | Card titles |
| `--text-h4` | 1rem | Labels, labels |
| `--text-body-lg` | 1.125rem | Lead paragraphs |
| `--text-body` | 1rem | Default body text |
| `--text-body-sm` | 0.875rem | Secondary text |
| `--text-caption` | 0.75rem | Hints, timestamps |
| `--text-button` | 0.875rem | Button text |
| `--text-overline` | 0.6875rem | Eyebrow text |

---

### 2. Color Tokens

#### Semantic Color System

```
┌─────────────────────────────────────────────────────────┐
│                    COLOR LAYERS                          │
├─────────────────────────────────────────────────────────┤
│  BRAND PALETTE                                          │
│  ├── color-brand (Primary action)                       │
│  ├── color-brand-light (Hover state)                   │
│  ├── color-brand-dark (Active state)                   │
│  └── color-brand-glow (Effects)                        │
├─────────────────────────────────────────────────────────┤
│  SURFACE (Dark theme elements)                          │
│  ├── color-surface-900 (Deepest)                       │
│  ├── color-surface-850 (Scrolled nav)                 │
│  ├── color-surface-800 (Sidebar)                       │
│  └── color-surface-700 (Elevated dark)                 │
├─────────────────────────────────────────────────────────┤
│  BACKGROUND (Light theme elements)                      │
│  ├── color-bg-base (Page background)                   │
│  ├── color-bg-primary (Content area)                    │
│  ├── color-bg-secondary (Subtle sections)               │
│  ├── color-bg-elevated (Cards, modals)                 │
│  └── color-bg-muted (Disabled, inactive)                │
├─────────────────────────────────────────────────────────┤
│  TEXT                                                   │
│  ├── color-text-primary (Headlines, body)              │
│  ├── color-text-secondary (Supporting text)              │
│  ├── color-text-muted (Hints, captions)                │
│  └── color-text-dim (Placeholders)                     │
├─────────────────────────────────────────────────────────┤
│  STATUS                                                 │
│  ├── color-success (Positive actions)                   │
│  ├── color-danger (Errors, destructive)                │
│  ├── color-warning (Cautions, pending)                 │
│  └── color-info (Informational)                        │
└─────────────────────────────────────────────────────────┘
```

#### Brand Colors (Green Theme)
```css
--color-brand: #16C4A4;           /* Primary green */
--color-brand-light: #2DD9BE;    /* Light variant */
--color-brand-dark: #0C7B68;     /* Dark variant */
--color-brand-glow: rgba(22, 196, 164, 0.25);
--color-brand-subtle: rgba(22, 196, 164, 0.1);
```

---

### 3. Spacing Tokens

#### Base Unit: 4px

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `--space-1` | 4px | 4px | Tight gaps |
| `--space-2` | 8px | 8px | Icon gaps |
| `--space-3` | 12px | 12px | Input padding |
| `--space-4` | 16px | 16px | Default gap |
| `--space-5` | 20px | 20px | Section gaps |
| `--space-6` | 24px | 24px | Card padding |
| `--space-8` | 32px | 32px | Section gaps |
| `--space-10` | 40px | 40px | Large gaps |
| `--space-12` | 48px | 48px | Major sections |
| `--space-16` | 64px | 64px | Page sections |
| `--space-20` | 80px | 80px | Hero spacing |
| `--space-24` | 96px | 96px | Maximum spacing |

#### Component-Specific Spacing
```css
--space-input-y: var(--space-3);
--space-input-x: var(--space-4);
--space-button-y: var(--space-3);
--space-button-x: var(--space-6);
--space-card-padding: var(--space-6);
--space-section-gap: var(--space-16);
--space-page-padding-x: var(--space-6);
--space-page-padding-y: var(--space-8);
```

---

### 4. Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small elements, inputs |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 12px | Cards, panels |
| `--radius-xl` | 16px | Large cards |
| `--radius-2xl` | 20px | Modals |
| `--radius-3xl` | 28px | Large containers |
| `--radius-full` | 9999px | Pills, avatars |

---

### 5. Elevation Tokens (Shadows)

| Token | Usage |
|-------|-------|
| `--shadow-none` | No shadow |
| `--shadow-sm` | Cards at rest, inputs |
| `--shadow-md` | Cards on hover, dropdowns |
| `--shadow-lg` | Modals, popovers |
| `--shadow-xl` | Floating elements |
| `--shadow-2xl` | Maximum elevation |
| `--shadow-brand` | Brand-colored glow |
| `--shadow-brand-lg` | Strong brand glow |

#### Shadow Formula
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04), 
              0 1px 3px rgba(0, 0, 0, 0.06);

--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 
             0 2px 4px -2px rgba(0, 0, 0, 0.04);

--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 
             0 4px 6px -4px rgba(0, 0, 0, 0.04);
```

---

### 6. Motion Tokens

#### Duration Scale
| Token | Value | Usage |
|-------|-------|-------|
| `--duration-instant` | 50ms | Micro-interactions |
| `--duration-fast` | 100ms | Hover states |
| `--duration-normal` | 150ms | Default transitions |
| `--duration-slow` | 200ms | Complex animations |
| `--duration-slower` | 250ms | Page transitions |
| `--duration-slowest` | 350ms | Modals, drawers |

#### Easing Curves
```css
/* Primary easing - Natural deceleration */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);

/* For elements entering */
--ease-in: cubic-bezier(0.7, 0, 0.84, 0);

/* Symmetric animations */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

/* Bouncy feedback */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

#### Transition Shorthands
```css
--transition-fast: var(--duration-fast) var(--ease-out);
--transition-normal: var(--duration-normal) var(--ease-out);
--transition-slow: var(--duration-slow) var(--ease-out);
--transition-spring: var(--duration-slow) var(--ease-spring);
```

---

### 7. Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-dropdown` | 100 | Dropdown menus |
| `--z-sticky` | 200 | Sticky headers |
| `--z-fixed` | 300 | Fixed elements |
| `--z-modal-backdrop` | 400 | Modal overlays |
| `--z-modal` | 500 | Modal dialogs |
| `--z-popover` | 600 | Popovers |
| `--z-tooltip` | 700 | Tooltips |
| `--z-toast` | 800 | Toast notifications |

---

### 8. Icon Tokens

#### Sizes
| Token | Value |
|-------|-------|
| `--icon-xs` | 12px |
| `--icon-sm` | 14px |
| `--icon-md` | 16px |
| `--icon-lg` | 18px |
| `--icon-xl` | 20px |
| `--icon-2xl` | 24px |
| `--icon-3xl` | 28px |

#### Stroke
| Token | Value |
|-------|-------|
| `--icon-stroke` | 1.5px |
| `--icon-stroke-bold` | 2px |

---

## Token Usage Examples

### Button Component
```css
.button {
  /* Use spacing tokens */
  padding: var(--space-3) var(--space-6);
  
  /* Use typography tokens */
  font-size: var(--text-button);
  font-weight: 600;
  
  /* Use border radius tokens */
  border-radius: var(--radius-md);
  
  /* Use color tokens */
  background: var(--color-brand);
  color: var(--color-text-inverse);
  
  /* Use motion tokens */
  transition: all var(--transition-normal);
  
  /* Use shadow tokens */
  box-shadow: var(--shadow-brand);
}
```

### Card Component
```css
.card {
  /* Spacing */
  padding: var(--space-card-padding);
  
  /* Colors */
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  
  /* Border radius */
  border-radius: var(--radius-xl);
  
  /* Shadow */
  box-shadow: var(--shadow-sm);
  
  /* Motion */
  transition: box-shadow var(--transition-normal), 
              transform var(--transition-normal);
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

---

## Legacy Aliases

For backward compatibility, legacy tokens map to semantic tokens:

```css
/* Colors */
--gold: var(--color-brand);
--gold-light: var(--color-brand-light);
--gold-dark: var(--color-brand-dark);
--gold-glow: var(--color-brand-glow);

--text: var(--color-text-primary);
--bg: var(--color-bg-primary);
--surface: var(--color-bg-surface);
--card: var(--color-bg-elevated);
--border: var(--color-border);

--success: var(--color-success);
--danger: var(--color-danger);
--warning: var(--color-warning);
--info: var(--color-info);

/* Spacing */
--space-1: 4px;  /* (kept for reference) */

/* Shadows */
--shadow-sm: var(--shadow-sm-legacy);
--shadow-md: var(--shadow-md-legacy);
--shadow-lg: var(--shadow-lg-legacy);
```

---

## Migration Checklist

When refactoring components:

- [ ] Replace all hardcoded colors with semantic tokens
- [ ] Replace pixel values with spacing tokens
- [ ] Use typography scale instead of arbitrary font sizes
- [ ] Replace custom shadows with elevation tokens
- [ ] Use motion tokens for all transitions
- [ ] Remove inline styles where possible
- [ ] Test at all breakpoints
- [ ] Verify accessibility (contrast, focus states)
