# KAYAD — DESIGN SYSTEM V2

> **Aesthetic:** Luxury Automotive | Obsidian Black + Warm Gold
> **Framework:** Tailwind CSS v4 + CSS Custom Properties
> **Base:** React 19 + Vite 7

---

## 1. DESIGN PHILOSOPHY

KAYAD is East Africa's premium automotive marketplace. The design must convey:

- **Trust** — Secure escrow, verified dealers, buyer protection
- **Luxury** — Premium vehicles deserve premium presentation
- **Motion** — Automotive heritage demands smooth transitions
- **Clarity** — Complex transactions made simple

---

## 2. COLOR SYSTEM

### Core Palette

```
--bg:          #050505  (Obsidian Black - deepest background)
--surface:     #0A0A0A  (Elevated surface)
--card:        #111111  (Card background)
--card-hover:  #1A1A1A  (Card hover state)

--gold:        #D4C4A8  (Primary accent - warm gold)
--gold-light:  #E3D5C0  (Gold highlight)
--gold-dark:   #BFA88A  (Gold shadow)
--gold-muted:  #A89278  (Muted gold)
```

### Semantic Colors

```css
--success: #22C55E   /* Green - bids, escrow confirmed */
--danger:  #EF4444   /* Red - ended auctions, errors */
--warning: #F59E0B   /* Amber - ending soon */
--info:    #60A5FA   /* Blue - information */

--text:        #F0EDE6  /* Primary text */
--text-muted:  #8A8A8A  /* Secondary text */
--text-dim:    #555555  /* Tertiary / disabled */
```

### Color Usage Rules

| Element | Token | Notes |
|---------|-------|-------|
| Page background | `--bg` or `var(--bg)` | Use exclusively |
| Card surfaces | `--card` | All content cards |
| Elevated surfaces | `--surface` | Sidebars, nav, modals |
| Primary CTAs | `--gold` background + black text |
| Secondary CTAs | `--gold` border on transparent |
| Links | `rgba(212,196,168,0.7)` → `--gold` on hover |
| Badges | Use semantic colors with 0.16 alpha bg |
| Live indicators | `--success` green dot + pulse |
| Danger/Ended | `--danger` red |
| Text hierarchy | `--text` → `--text-muted` → `--text-dim` |

---

## 3. TYPOGRAPHY SYSTEM

### Font Stack

```css
--font-display: 'Cormorant Garamond', Georgia, serif;
--font-body:    'Inter', system-ui, -apple-system, sans-serif;
```

### Type Scale

| Level | Size | Weight | Font | Use |
|-------|------|--------|------|-----|
| Hero h1 | `clamp(2rem,5vw,4rem)` | 900 italic | Display | Hero headlines |
| Section h2 | `clamp(1.3rem,2.8vw,2.2rem)` | 900 italic | Display | Section titles |
| Card h3 | `clamp(1.1rem,2vw,1.5rem)` | 700 | Display | Card titles |
| Subtitle | 14px | 600 | Body | Section subtitles |
| Body | 15-17px | 400 | Body | Paragraphs |
| Caption | 11-12px | 500 | Body | Metadata, badges |
| Micro | 8-9px | 700 | Body | Labels, tags |
| Price large | `clamp(1.3rem,2.5vw,2rem)` | 800 | Body | Price display |

### Typography Rules

- All headings use `--font-display` with `--gold` accent spans
- Section labels use 8px uppercase with 0.14em tracking
- Prices always use `--gold` color + font-weight 700+
- Body text uses `--text-muted` for secondary content
- Never use font-weight < 400 for body text on dark backgrounds

---

## 4. SPACING SYSTEM

### Base Unit: 8px

```
--space-1:  8px
--space-2:  16px
--space-3:  24px
--space-4:  32px
--space-5:  48px
--space-6:  64px
```

### Section Spacing

| Context | Top/Bottom Padding |
|---------|-------------------|
| Page sections | `--space-5` (48px) desktop, `--space-4` (32px) mobile |
| Component groups | `--space-4` (32px) |
| Card padding | `--space-2` to `--space-3` (16-24px) |
| Inline elements | `--space-1` (8px) |
| Grid gaps | 16px desktop, 10px mobile |

### Whitespace Rules

- Hero: 70vh desktop, 50vh mobile (no reduction in quality)
- Between sections: 48px (use `section-spacing` class)
- Card grids: 16px gap, 24px container padding
- Container max-width: 1320px (use `.container`)
- Never use margins < 8px between block elements

---

## 5. CARD HIERARCHY

### Card Types

| Type | Use Case | Border | Hover |
|------|----------|--------|-------|
| Default card | Content blocks | `1px solid var(--border)` | `border-color: var(--gold-muted)` + `translateY(-4px)` + `shadow-md` |
| Glass card | Overlays, nav | `1px solid rgba(192,192,192,0.12)` + blur | Same pattern |
| Premium card | Featured vehicles, dealer showcase | `1px solid var(--border)` + gold accent | Gold border + gold shadow |
| Interactive card | Clickable items | Same as default + cursor pointer | Plus scale(1.02) on image |
| Dashboard card | KPIs, metrics | `1px solid var(--border)` | No hover transform |

### Card Image Rules

- Aspect ratio: 16/9 for vehicles, 1/1 for dealers
- Hover: scale(1.06) on image inside card
- Overlay: gradient from transparent to black/80 on bottom 40%
- Loading: `animate-pulse` with `rgba(255,255,255,0.03)` background

### Premium Showcase Card (Featured Inventory)

```css
.premium-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.4s var(--ease);
}
.premium-card:hover {
  border-color: var(--gold-muted);
  transform: translateY(-6px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px var(--gold-glow);
}
```

---

## 6. SHADOW SYSTEM

| Level | Token | Usage |
|-------|-------|-------|
| Subtle | `0 4px 20px rgba(0,0,0,0.3)` | Cards |
| Medium | `0 10px 30px rgba(0,0,0,0.4)` | Modals, dropdowns |
| Strong | `0 20px 60px rgba(0,0,0,0.55)` | Modals, sidebars |
| Gold glow | `0 0 25px var(--gold-glow)` | CTAs, premium cards |
| Gold strong | `0 0 40px var(--gold-glow-strong)` | Hero CTAs, featured |

---

## 7. BORDER RADIUS SYSTEM

| Level | Token | Value | Usage |
|-------|-------|-------|-------|
| Small | `--radius-sm` | 8px | Buttons, inputs, badges |
| Default | `--radius` | 12px | Cards, containers |
| Large | `--radius-lg` | 16px | Modals, premium cards |
| XL | `--radius-xl` | 24px | Hero sections, dialogs |
| Full | | 9999px | Pills, avatars |

---

## 8. TRANSITION SYSTEM

### Easing Curves

```css
--ease:        cubic-bezier(0.25, 0.46, 0.45, 0.94);  /* Standard */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);     /* Spring */
```

### Duration Scale

| Duration | Usage |
|----------|-------|
| 150ms | Micro-interactions, hovers |
| 200ms | Button states, toggles |
| 300ms | Card hover, panel slides |
| 400ms | Page transitions |
| 500ms | Hero slide transitions |
| 800ms | Hero text entrance |

### Animation Patterns

- **Fade In:** `opacity: 0 → 1` + `translateY(8px)` over 0.4s
- **Slide Up:** `translateY(20px) → 0` + fade over 0.6s
- **Scale In:** `scale(1.1) → 1` + fade for hero images
- **Gold Pulse:** Box-shadow pulse for live indicators
- **Price Flash:** Scale bounce on price updates

---

## 9. RESPONSIVE BREAKPOINTS

```
/* Mobile first */
< 420px   — Small phones
< 480px   — Large phones  
< 640px   — Phablets
< 768px   — Tablets
< 860px   — Small desktop
< 920px   — Dashboard break
< 1024px  — Tablet landscape
< 1280px  — Standard desktop
> 1280px  — Wide desktop
```

### Grid Behavior

| Grid | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| 6-col | 6 | 3 | 2 → 1 |
| 4-col | 4 | 3 | 2 → 1 |
| 3-col | 3 | 2 | 1 |
| 2-col | 2 | 1 | 1 |

---

## 10. COMPONENT SPECIFICATIONS

### Buttons

| Variant | BG | Text | Border | Shadow |
|---------|-----|------|--------|--------|
| `.btn-gold` | Gold gradient | Black #0A0A0A | None | Gold glow |
| `.btn-outline` | Transparent | White | Border-soft (→ gold) | None |
| `.btn-ghost` | Transparent | Text-muted (→ text) | None | None |
| `.btn-danger` | Red 0.12 alpha | Danger | Red 0.25 alpha | None |

### Badges

- Pill shape (9999px)
- 4px 12px padding
- 11.5px font, 700 weight, 0.06em tracking
- Semantic background colors at 0.16 alpha

### Inputs

- BG: `var(--surface)`
- Border: `var(--border)` → gold on focus
- Focus ring: `0 0 0 4px var(--gold-glow)`
- Radius: `--radius` (12px)
- Padding: 12px 16px

### Tabs

- Horizontal scroll on mobile (no scrollbar)
- Active: gold border-bottom + gold text
- Inactive: 0.4 alpha white text
- 8px gap between tabs
- Padding: 10px 18px

---

## 11. LAYOUT TEMPLATES

### Page Layout
```html
<div class="page" style="background: var(--bg)">
  <section class="section-spacing">
    <div class="container">
      <!-- Content -->
    </div>
  </section>
</div>
```

### Section Header
```html
<div class="flex items-end justify-between mb-6">
  <div>
    <div class="flex items-center gap-1.5 mb-1">
      <span class="badge badge-gold">Featured</span>
      <span class="text-[8px] text-white/20 font-semibold tracking-[0.14em] uppercase">Label</span>
    </div>
    <h2 class="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
      Title <span class="text-gold">Accent</span>
    </h2>
  </div>
  <Link to="/link" class="section-link">View All →</Link>
</div>
```

### Card Grid
```html
<div class="grid gap-4 rgrid rgrid-4">
  <!-- Cards -->
</div>
```

---

## 12. DESIGN TOKENS — USAGE ENFORCEMENT

### DO:
- Use `var(--bg)` for all page backgrounds
- Use `var(--card)` for all card surfaces
- Use `var(--gold)` for all accent colors
- Use `.btn-gold`, `.btn-outline` for all buttons
- Use `.card` class for all cards
- Use `.container` for page width constraint
- Use `section-spacing` for consistent vertical rhythm
- Use `font-display` class for all headings
- Use lucide-react for all icons (no emoji)

### DO NOT:
- Use raw hex colors in JSX inline styles
- Use emoji for UI icons
- Create custom button styles
- Use margins < 8px between sections
- Use fixed widths for responsive containers
- Load images without LazyImage component

---

*Design System v2.0 — Last updated: 2026-06-30*
