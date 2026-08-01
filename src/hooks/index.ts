// Hooks barrel export
export { useApi } from './useApi';
export { useAbortController } from './useAbortController';
export { useCountdown } from './useCountdown';
export { default as useDebouncedValue } from './useDebouncedValue';
export { useFocusManagement } from './useFocusManagement';
export { useInfiniteScroll } from './useInfiniteScroll';
export { default as useIntersectionObserver } from './useIntersectionObserver';
export { useLocalization } from './useLocalization';
export { default as useMediaQuery, useIsMobile, useIsTablet, useIsDesktop, usePrefersDarkMode } from './useMediaQuery';
export { default as usePageMeta } from './usePageMeta';
export { default as useSwipeBack } from './useSwipeBack';

// Accessibility hooks
export {
  useFocusTrap,
  useKeyboardNavigation,
  useAnnounce,
  useSkipLink,
  useReducedMotion,
  getAnimationClass,
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
