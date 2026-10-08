// Hooks barrel export
export { useApi } from './useApi';
export { useAbortController } from './useAbortController';
export { useCountdown } from './useCountdown';
export { default as useDebouncedValue } from './useDebouncedValue';
export { useFocusManagement } from './useFocusManagement';
export { useInfiniteScroll } from './useInfiniteScroll';
export { default as useIntersectionObserver } from './useIntersectionObserver';
export { useLocalization } from './useLocalization';
export { default as useMediaQuery, useIsMobile, useIsTablet, useIsDesktop, usePrefersDarkMode, usePrefersReducedMotion } from './useMediaQuery';
export { default as usePageMeta } from './usePageMeta';
export { default as useSwipeBack } from './useSwipeBack';

// Accessibility hooks
// STAGE 11 REDUCED-MOTION CONVERGENCE: useAccessibility.tsx's own
// useReducedMotion()/getAnimationClass() duplicate of the canonical
// usePrefersReducedMotion() hook (above) were proven to have zero callers
// anywhere in the codebase (confirmed via grep before removal) and have
// been removed from both this barrel and useAccessibility.tsx itself, so
// there is now exactly one reduced-motion hook to import.
export {
  useFocusTrap,
  useKeyboardNavigation,
  useAnnounce,
  useSkipLink,
  useEscapeKey,
  useScrollLock,
  generateId,
  mergeAriaProps,
} from './useAccessibility';

// Form validation
export { useFormValidation, validators } from './useFormValidation';

// Performance optimization
export {
  useStableCallback,
  useMemoized,
  useStableRef,
  useBatchedUpdates,
  useThrottledCallback,
  useDebouncedCallback,
  useVirtualList,
  useWindowedList,
  useStableComparator,
  useRenderCount,
  usePerformanceMark,
} from './useOptimizedCallback';
