// KAYAD Mobile Components
// Premium mobile-first UI components for automotive marketplace

// Layout components
export { default as MobileBottomNav } from '../MobileBottomNav';
export { default as MobilePage, Page, Section, Tabs, StatsBar, MobileCarousel, Carousel, CarouselItem, usePullToRefresh } from './MobilePage';
export { default as MobileHeader, HeaderButton, MobileSearchHeader, MobileHeroHeader, MobileTabHeader, PRESET_HEADERS } from './MobileHeader';

// Input components
export { default as MobileSearchBar } from './MobileSearchBar';
export { default as MobileFilterDrawer } from './MobileFilterDrawer';
export { default as MobileForm, Input, Textarea, Select, Checkbox, RadioGroup, Toggle, Section as FormSection, PriceInput, PhoneInput } from './MobileForm';

// Display components
// STAGE 11 PHASE E: MobileCarCard.jsx (and its sole dependency,
// components/VehicleCard/VehicleCard.jsx, plus that directory's own now-
// orphaned index.js barrel) were removed as proven-dead code — this barrel
// was their only remaining import site, and this barrel itself has zero
// consumers anywhere in the app (every real card surface imports the
// canonical components/VehicleCard.tsx directly, which the bundler
// resolves in preference to this directory). See
// STAGE11_UX_HARDENING_AUDIT_20261008.md for the full trace proving this.
export { default as MobileEmptyState } from './MobileEmptyState';
export { default as MobileSkeleton, Card, List, Detail, Page as PageSkeleton, Text, Stat, StaggeredList, Block, MobileCardSkeleton } from './MobileSkeleton';

// Feedback components
export { ToastProvider, useToast } from './MobileToast';

// Re-export hooks (usePullToRefresh already exported above)
