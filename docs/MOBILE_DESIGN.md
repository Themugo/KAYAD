# KAYAD Mobile Design System

## Overview

This document outlines the premium mobile automotive marketplace design system for KAYAD. The mobile experience is designed to feel like a native application with exceptional attention to touch interaction, performance, and visual polish.

---

## Mobile Architecture

### Responsive Detection

The app automatically detects mobile devices (< 768px) and serves optimized mobile routes:

```jsx
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}
```

### Route Structure

```
/           → MobileHomePage (mobile) / HomePage (desktop)
/browse     → MobileBrowsePage (mobile) / BrowsePage (desktop)
/gallery   → SharedGalleryPage
/auctions   → SharedAuctionPage
/cars/:id   → CarDetailPage
```

---

## Design Tokens

### Mobile-Specific Variables

```css
:root {
  /* Touch target minimum (44px per Apple HIG & WCAG) */
  --touch-target-min: 44px;
  --touch-target-comfortable: 48px;
  --touch-target-spacious: 56px;
  
  /* Safe area insets */
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  
  /* Bottom nav height */
  --bottom-nav-height: 72px;
  --header-height: 56px;
  
  /* Mobile typography scale */
  --mobile-text-xs: 0.6875rem;    /* 11px */
  --mobile-text-sm: 0.8125rem;    /* 13px */
  --mobile-text-base: 0.9375rem;  /* 15px */
  --mobile-text-lg: 1.0625rem;    /* 17px */
  --mobile-text-xl: 1.25rem;      /* 20px */
  
  /* Mobile animation durations */
  --mobile-duration-instant: 100ms;
  --mobile-duration-fast: 200ms;
  --mobile-duration-normal: 300ms;
}
```

---

## Components

### MobileBottomNav

Premium bottom navigation with:
- **Haptic-style feedback** via scale animations
- **Active indicator** with animated gold bar
- **Floating Action Button (FAB)** for primary action (Sell)
- **Safe area padding** for notched devices

```jsx
import { MobileBottomNav } from './components/mobile';

<MobileBottomNav />
```

### MobileSearchBar

Enhanced search with:
- Voice search support (Web Speech API)
- Recent searches (localStorage)
- Trending searches
- Real-time suggestions
- Animated focus states

```jsx
import { MobileSearchBar } from './components/mobile';

<MobileSearchBar
  value={query}
  onChange={setQuery}
  onSubmit={handleSearch}
  onVoiceSearch={handleVoiceSearch}
  placeholder="Search cars, brands, or models..."
/>
```

### MobileFilterDrawer

Native-feeling filter panel with:
- **Bottom sheet animation** (slides up from bottom)
- **Scrollable content** with overscroll containment
- **Haptic-style chip toggles** (min 44px touch targets)
- **Range sliders** with custom thumb styling
- **Quick filter toggles** for common filters

```jsx
import { MobileFilterDrawer } from './components/mobile';

<MobileFilterDrawer
  open={isOpen}
  onClose={() => setIsOpen(false)}
  filters={filters}
  onFilterChange={setFilters}
  onApply={handleApply}
  onReset={handleReset}
/>
```

### MobileCarCard

Swipeable card with:
- **Gesture support** (swipe to favorite)
- **Image skeleton** loading state
- **Live badge** with pulsing animation
- **Verified/Inspected badges**
- **Favorite button** with heart animation

```jsx
import { MobileCarCard, MobileCarCardSkeleton } from './components/mobile';

// Card
<MobileCarCard 
  car={vehicleData} 
  onFavorite={handleFavorite}
/>

// Loading skeleton
<MobileCarCardSkeleton />
```

### MobileForm Components

Touch-optimized form inputs:
- **44px minimum touch targets**
- **Large, clear labels**
- **Inline validation** with error messages
- **Haptic-style checkbox/radio animations**

```jsx
import { Input, Textarea, Select, Checkbox, Toggle } from './components/mobile';

<Input 
  label="Vehicle Title"
  required
  error={errors.title}
  placeholder="e.g., Toyota Land Cruiser V8"
/>

<Toggle 
  label="Featured Listing"
  description="Appear at top of search results"
  checked={isFeatured}
  onChange={setIsFeatured}
/>
```

### MobileEmptyState

Beautiful empty states with:
- **Animated floating icon**
- **Helpful description**
- **Action button**

```jsx
import { MobileEmptyState } from './components/mobile';

// Template-based
<MobileEmptyState template="search" onAction={handleClear} />

// Custom
<MobileEmptyState
  icon="🚗"
  title="No cars found"
  description="Try adjusting your filters"
  actionLabel="Clear Filters"
  onAction={handleClear}
/>
```

### MobileSkeleton

Premium loading skeletons:
- **Shimmer animation** for visual appeal
- **Staggered entrance** for list items
- **Multiple skeleton types** (card, list, detail, page)

```jsx
import { MobileCardSkeleton, MobileStaggeredList } from './components/mobile';

// Grid skeleton
<div className="mobile-card-grid">
  {[1, 2, 3, 4].map(i => <MobileCardSkeleton key={i} />)}
</div>

// Staggered list
<MobileStaggeredList count={5} />
```

### MobileToast

Native-feeling notifications:
- **Swipe to dismiss**
- **Auto-dismiss with progress**
- **Success/Error/Info variants**
- **Action buttons**

```jsx
import { useToast } from './components/mobile';

const { success, error } = useToast();

success('Vehicle saved to favorites!');
error('Failed to load vehicles. Please try again.');
```

---

## Performance Optimizations

### Lazy Loading
- Images use `loading="lazy"` and Intersection Observer
- Skeleton placeholders while loading
- Progressive image reveal on load

### Infinite Scroll
```jsx
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && hasMore) {
      loadMore();
    }
  },
  { threshold: 0.1 }
);
```

### Service Worker Caching

| Cache | Strategy | TTL |
|-------|----------|-----|
| Static assets | Cache-first | Permanent |
| Images | Cache-first + background refresh | 7 days |
| API responses | Network-first | Session |
| Navigation | Network, fallback to cache | - |

---

## Accessibility

### Touch Targets
All interactive elements are minimum 44x44px per WCAG 2.1 Level AA and Apple Human Interface Guidelines.

### Focus Management
- Clear focus states with gold outline
- Skip links for keyboard navigation
- ARIA labels on all interactive elements

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## PWA Features

### Manifest
- App shortcuts (Browse, Auctions, Sell)
- Standalone display mode
- Portrait orientation lock
- Custom theme colors

### Service Worker
- Offline fallback pages
- Background sync for favorites
- Push notification support

### Installation Prompt
The app shows an install banner when:
- Service worker is ready
- User hasn't already installed
- User has engaged with the app

---

## Animation Guidelines

### Durations
- **Instant**: 100ms (micro-interactions)
- **Fast**: 200ms (hover states)
- **Normal**: 300ms (page transitions)
- **Slow**: 400ms (modals, drawers)

### Easing
```css
--mobile-ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--mobile-ease-in-out: cubic-bezier(0.42, 0, 0.58, 1);
--mobile-ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Key Animations
- **List stagger**: 50ms delay between items
- **Card entrance**: Fade + translateY
- **Drawer slide**: Transform from bottom
- **Button press**: Scale to 0.97

---

## File Structure

```
src/
├── components/
│   └── mobile/
│       ├── index.js              # Exports
│       ├── MobileBottomNav.jsx    # Bottom navigation
│       ├── MobileSearchBar.jsx    # Search with voice
│       ├── MobileFilterDrawer.jsx # Filter panel
│       ├── MobileCarCard.jsx      # Vehicle cards
│       ├── MobileEmptyState.jsx   # Empty states
│       ├── MobileSkeleton.jsx     # Loading skeletons
│       ├── MobilePage.jsx         # Layout components
│       ├── MobileForm.jsx         # Form components
│       ├── MobileToast.jsx        # Notifications
│       └── MobileHeader.jsx       # Header variants
├── pages/
│   └── mobile/
│       ├── MobileHomePage.jsx     # Home screen
│       └── MobileBrowsePage.jsx   # Browse screen
└── styles/
    └── mobile.css                 # Mobile design tokens
```

---

## Testing Checklist

### Touch Interactions
- [ ] All buttons respond to tap (min 44px)
- [ ] Swipe gestures work on cards
- [ ] Pull-to-refresh triggers
- [ ] Bottom drawer dismisses with swipe

### Performance
- [ ] First contentful paint < 1.5s
- [ ] Time to interactive < 3s
- [ ] No layout shift during load
- [ ] Images lazy load correctly

### Offline
- [ ] Service worker registers
- [ ] Cached pages load offline
- [ ] Offline indicator shows
- [ ] Forms queue for sync

### Accessibility
- [ ] VoiceOver reads all elements
- [ ] Touch targets are visible
- [ ] Focus order is logical
- [ ] Animations respect reduced-motion
