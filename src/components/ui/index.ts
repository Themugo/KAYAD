// UI Component Library
// KAYAD Design System 2.0
// A unified visual system for consistent UI across the application

// ============================================================
// CORE COMPONENTS
// ============================================================

// Button - Primary interaction element
export { Button, type ButtonProps } from './Button';

// Input - Form input with label, hint, error states
export { Input, type InputProps } from './Input';

// Card - Container with header, body, footer
export { Card, CardHeader, CardFooter, type CardProps, type CardHeaderProps, type CardFooterProps } from './Card';

// Badge - Status labels and tags
export { Badge, StatusBadge, type BadgeProps, type BadgeVariant, type StatusBadgeProps } from './Badge';

// Modal - Dialog overlay
export { Modal, type ModalProps } from './Modal';

// Table - Data table with sorting and loading
export { Table, TableHeaderCell, type TableColumn, type TableProps, type TableHeaderCellProps } from './Table';

// Tabs - Tab navigation
export { Tabs, TabList, Tab, TabPanel, type TabsProps, type TabListProps, type TabProps, type TabPanelProps, useTabs } from './Tabs';

// ============================================================
// FORM COMPONENTS
// ============================================================

// FormField - Accessible input with label, error, hint
export { FormField, FormTextarea, FormSelect } from './FormField';

// ============================================================
// FEEDBACK COMPONENTS
// ============================================================

// Alert - Inline alerts and notifications
export { Alert, type AlertProps } from './Alert';

// Progress - Progress bars and spinners
export { Progress, type ProgressProps } from './Progress';

// Skeleton - Loading placeholders
export { 
  Skeleton, 
  CardSkeleton, 
  ListItemSkeleton, 
  TableSkeleton, 
  ProfileSkeleton, 
  PageSkeleton, 
  ChatSkeleton,
  EmptyState 
} from './Skeleton';

// ============================================================
// LAYOUT COMPONENTS
// ============================================================

// Avatar - User avatars with fallback
export { Avatar, type AvatarProps } from './Avatar';

// Tooltip - Hover information
export { Tooltip, type TooltipProps } from './Tooltip';

// Dropdown - Dropdown menus
export { Dropdown, type DropdownProps } from './Dropdown';

// GlassPanel - Stitch design glass effect
export { GlassPanel, type GlassPanelProps } from './GlassPanel';

// ============================================================
// NAVIGATION COMPONENTS
// ============================================================

// SkipLink - Accessibility navigation
export { default as SkipLink, LiveRegion, VisuallyHidden, ExternalLink } from './SkipLink';

// ============================================================
// ERROR HANDLING
// ============================================================

// ErrorBoundary - React error boundary
export { ErrorBoundary, SectionErrorBoundary, withErrorBoundary } from './ErrorBoundary';

// ============================================================
// THEME
// ============================================================

// ThemeProvider - Dark/light mode
export { ThemeProvider, useTheme, type Theme, type ThemeContextValue } from './ThemeContext';

// ThemeToggle - Theme switcher button
export { ThemeToggle, type ThemeToggleProps } from './ThemeToggle';

// ============================================================
// DESIGN TOKENS
// ============================================================

// Re-export design system tokens
export { tokens } from './tokens';
