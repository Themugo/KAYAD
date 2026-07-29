// Hooks barrel export
export { useApi } from './useApi';
export { useDebouncedValue } from './useDebouncedValue';
export { useFocusManagement } from './useFocusManagement';
export { useInfiniteScroll } from './useInfiniteScroll';
export { useLocalization } from './useLocalization';
export { useMediaQuery } from './useMediaQuery';

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
