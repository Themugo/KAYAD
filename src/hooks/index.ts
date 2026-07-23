// Hooks barrel export
export { useApi } from './useApi';
export { useAbortController } from './useAbortController';
export { useCountdown } from './useCountdown';
export { useDebouncedValue } from './useDebouncedValue';
export { useFocusManagement } from './useFocusManagement';
export { useInfiniteScroll } from './useInfiniteScroll';
export { useIntersectionObserver } from './useIntersectionObserver';
export { useLocalization } from './useLocalization';
export { useMediaQuery } from './useMediaQuery';
export { usePageMeta } from './usePageMeta';
export { useSwipeBack } from './useSwipeBack';

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
