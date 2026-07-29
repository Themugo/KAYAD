/**
 * Shared Component Library
 * 
 * This directory contains reusable UI components that can be used across
 * all features. Components here should be:
 * 
 * - Generic and not tied to specific business logic
 * - Well-documented with props interfaces
 * - Accessible (ARIA labels, keyboard navigation)
 * - Themable via design tokens
 * 
 * ## Component Categories
 * 
 * ### Layout Components
 * - Box - Base container with styling props
 * - Container - Responsive container with max-width
 * - Stack - Vertical or horizontal stacking
 * - Grid - CSS Grid layout helper
 * - Flex - Flexbox layout helper
 * 
 * ### Typography Components
 * - Heading - Styled heading (h1-h6)
 * - Text - Styled text with variants
 * - Link - Styled anchor element
 * - Code - Inline code styling
 * - Label - Form label styling
 * 
 * ### Form Components
 * - Button - Clickable action trigger
 * - Input - Text input field
 * - Textarea - Multi-line text input
 * - Select - Dropdown select
 * - Checkbox - Boolean checkbox
 * - Radio - Radio button group
 * - Switch - Toggle switch
 * - Slider - Range slider
 * - FormField - Label + input wrapper
 * - FormError - Error message display
 * 
 * ### Display Components
 * - Badge - Status/category label
 * - Avatar - User/ entity image
 * - Card - Container with padding/border
 * - Image - Optimized image component
 * - Skeleton - Loading placeholder
 * - Progress - Progress indicator
 * - Stat - Statistics display
 * 
 * ### Feedback Components
 * - Alert - Alert/notification banner
 * - Toast - Temporary notification
 * - Modal - Dialog overlay
 * - Drawer - Slide-out panel
 * - Tooltip - Hover information
 * - Spinner - Loading indicator
 * 
 * ### Navigation Components
 * - Tabs - Tabbed navigation
 * - Breadcrumb - Path navigation
 * - Pagination - Page navigation
 * - Menu - Dropdown menu
 * - Sidebar - Side navigation
 * 
 * ### Data Display
 * - Table - Tabular data display
 * - List - List of items
 * - DescriptionList - Key-value pairs
 * - Timeline - Chronological events
 * 
 * ## Usage Example
 * 
 * ```tsx
 * import { Button, Card, Badge } from '@/shared/components';
 * 
 * function Example() {
 *   return (
 *     <Card>
 *       <Badge variant="success">Active</Badge>
 *       <Button variant="primary">Submit</Button>
 *     </Card>
 *   );
 * }
 * ```
 * 
 * ## Component Props Pattern
 * 
 * All components should follow this pattern:
 * 
 * ```tsx
 * interface ComponentProps {
 *   className?: string;
 *   variant?: 'default' | 'primary' | 'secondary';
 *   size?: 'sm' | 'md' | 'lg';
 *   // Component-specific props...
 * }
 * ```
 * 
 * ## Theming
 * 
 * Components use design tokens from `@/shared/tokens`:
 * 
 * ```tsx
 * import { tokens } from '@/shared/tokens';
 * 
 * const styles = {
 *   backgroundColor: tokens.colors.background.primary,
 *   borderRadius: tokens.borderRadius.lg,
 * };
 * ```
 */
