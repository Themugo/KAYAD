/**
 * KAYAD Naming Conventions
 * 
 * This document defines the naming conventions used throughout the frontend.
 * Consistency in naming improves code readability and maintainability.
 * 
 * ## Table of Contents
 * 
 * 1. Files and Folders
 * 2. Components
 * 3. Hooks
 * 4. Utilities
 * 5. Types and Interfaces
 * 6. Constants and Enums
 * 7. Routes
 * 8. CSS Classes
 * 9. Test Files
 * 
 * ============================================================================
 * 1. FILES AND FOLDERS
 * ============================================================================
 * 
 * - Use kebab-case for all file and folder names
 * - Components: `vehicle-card.tsx`, `dealer-profile.tsx`
 * - Hooks: `use-vehicle-filter.ts`, `use-auth-state.ts`
 * - Utils: `format-currency.ts`, `validate-email.ts`
 * - Tests: `vehicle-card.test.tsx`, `use-auth.test.ts`
 * - Styles: `vehicle-card.css`, `auth-form.module.css`
 * 
 * ## Folder Naming
 * 
 * - Features: `marketplace/`, `dealer/`, `auction/`
 * - Components: `components/vehicle/`, `components/ui/`
 * - Utils: `utils/formatting/`, `utils/validation/`
 * 
 * Example:
 * ```
 * src/features/marketplace/
 * ├── components/
 * │   ├── vehicle-card/
 * │   │   ├── vehicle-card.tsx
 * │   │   └── vehicle-card.test.tsx
 * │   └── filter-panel/
 * ├── hooks/
 * │   └── use-marketplace-filter.ts
 * └── types/
 *     └── marketplace.types.ts
 * ```
 * 
 * ============================================================================
 * 2. COMPONENTS
 * ============================================================================
 * 
 * - Use PascalCase for component names
 * - One component per file (co-located tests allowed)
 * - File name matches component name
 * 
 * ```tsx
 * // VehicleCard.tsx
 * export function VehicleCard() { ... }
 * 
 * // DealerBadge.tsx
 * export function DealerBadge() { ... }
 * ```
 * 
 * ## Component Naming Patterns
 * 
 * | Pattern | Example | Usage |
 * |---------|---------|-------|
 * | `{Feature}{Type}` | `VehicleCard`, `AuctionItem` | Main feature components |
 * | `{Type}List` | `VehicleList`, `DealerGrid` | List/grid containers |
 * | `{Type}Form` | `LoginForm`, `VehicleForm` | Form components |
 * | `{Type}Modal` | `ConfirmModal`, `FilterModal` | Modal dialogs |
 * | `{Type}Row` | `TableRow`, `ListRow` | Row items |
 * | `{Type}Cell` | `TableCell`, `GridCell` | Cell items |
 * | `{Type}Skeleton` | `CardSkeleton`, `TableSkeleton` | Loading states |
 * | `use{Feature}` | `EmptyState`, `ErrorState` | State displays |
 * | `{Feature}Layout` | `AdminLayout`, `AuthLayout` | Layout wrappers |
 * 
 * ============================================================================
 * 3. HOOKS
 * ============================================================================
 * 
 * - Prefix with `use`
 * - Use camelCase
 * - Name describes the behavior, not the implementation
 * 
 * ```typescript
 * // Good
 * useVehicleFilter()
 * useAuthState()
 * useAuctionTimer()
 * 
 * // Bad
 * useGetVehicleData()
 * useAxiosCall()
 * ```
 * 
 * ## Hook Naming Patterns
 * 
 * | Pattern | Example | Purpose |
 * |---------|---------|---------|
 * | `use{Entity}` | `useVehicle()`, `useUser()` | Entity data management |
 * | `use{Entity}List` | `useVehicleList()` | List/collection management |
 * | `use{Action}` | `useSubmit()`, `useCreate()` | Action handlers |
 * | `use{State}` | `useModalState()` | State management |
 * | `use{Feature}Filter` | `useVehicleFilter()` | Feature-specific filters |
 * | `useIs{Condition}` | `useIsAuthenticated()` | Boolean state |
 * 
 * ============================================================================
 * 4. UTILITIES
 * ============================================================================
 * 
 * - Use camelCase for function names
 * - Use descriptive names that explain the action
 * 
 * ```typescript
 * // Good
 * formatCurrency(amount: number): string
 * validateEmail(email: string): boolean
 * calculateDiscount(price: number, percent: number): number
 * 
 * // Bad
 * fmtCurr(amount: number): string
 * isEmailValid(email: string): boolean
 * disc(price: number, pct: number): number
 * ```
 * 
 * ## Utility File Organization
 * 
 * ```
 * utils/
 * ├── formatting/
 * │   ├── format-currency.ts
 * │   ├── format-date.ts
 * │   └── format-phone.ts
 * ├── validation/
 * │   ├── validate-email.ts
 * │   └── validate-password.ts
 * └── helpers/
 *     ├── debounce.ts
 *     └── throttle.ts
 * ```
 * 
 * ============================================================================
 * 5. TYPES AND INTERFACES
 * ============================================================================
 * 
 * - Use PascalCase for type names
 * - Prefix interfaces with `I` only when necessary for disambiguation
 * - Use descriptive names that explain the data structure
 * 
 * ```typescript
 * // Good
 * interface Vehicle {
 *   id: string;
 *   make: string;
 *   model: string;
 * }
 * 
 * type VehicleStatus = 'active' | 'sold' | 'pending';
 * 
 * // Bad
 * interface V { ... }
 * type status = string;
 * ```
 * 
 * ## Type Naming Patterns
 * 
 * | Pattern | Example | Usage |
 * |---------|---------|-------|
 * | `{Entity}` | `Vehicle`, `Dealer` | Data models |
 * | `{Entity}{State}` | `VehicleFilter`, `UserSettings` | Configuration |
 * | `{Entity}{Event}` | `VehicleCreated`, `AuctionEnded` | Events |
 * | `{Action}{Payload}` | `CreateVehicleInput` | Input types |
 * | `{Action}{Response}` | `LoginResponse` | Response types |
 * | `{Entity}List` | `Vehicle[]` or `VehicleList` | Collections |
 * | `On{Action}` | `OnSubmit`, `OnChange` | Callbacks |
 * 
 * ============================================================================
 * 6. CONSTANTS AND ENUMS
 * ============================================================================
 * 
 * - Use UPPER_SNAKE_CASE for constants
 * - Use PascalCase for enum values
 * - Group related constants in objects or enums
 * 
 * ```typescript
 * // Constants
 * const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
 * const API_BASE_URL = process.env.VITE_API_URL;
 * 
 * // Enums
 * enum VehicleType {
 *   Sedan = 'sedan',
 *   SUV = 'suv',
 *   Truck = 'truck',
 * }
 * 
 * enum AuctionStatus {
 *   Pending = 'pending',
 *   Active = 'active',
 *   Ended = 'ended',
 * }
 * ```
 * 
 * ============================================================================
 * 7. ROUTES
 * ============================================================================
 * 
 * - Use lowercase kebab-case
 * - Be descriptive but concise
 * - Use plural nouns for collections
 * 
 * ```
 * /vehicles              # List vehicles
 * /vehicles/:id          # Single vehicle
 * /dealers               # List dealers
 * /dealers/:id           # Single dealer
 * /auctions              # List auctions
 * /auctions/:id/bid      # Place bid
 * ```
 * 
 * ## Route Naming Patterns
 * 
 * | Pattern | Example | Purpose |
 * |---------|---------|---------|
 * | `/{entity}` | `/vehicles` | List page |
 * | `/{entity}/new` | `/vehicles/new` | Create page |
 * | `/{entity}/:id` | `/vehicles/123` | Detail page |
 * | `/{entity}/:id/edit` | `/vehicles/123/edit` | Edit page |
 * | `/{entity}/:id/{action}` | `/vehicles/123/bid` | Action page |
 * | `/{area}/{entity}` | `/admin/users` | Area-specific |
 * 
 * ============================================================================
 * 8. CSS CLASSES (Tailwind)
 * ============================================================================
 * 
 * - Use Tailwind utility classes directly
 * - Create custom classes only for complex patterns
 * - Use CSS modules for component-specific styles
 * 
 * ```tsx
 * // Inline utility classes
 * <div className="flex items-center justify-between p-4">
 *   <span className="text-lg font-semibold">Title</span>
 *   <Button variant="primary">Action</Button>
 * </div>
 * 
 * // CSS Module for complex styles
 * // component.module.css
 * .wrapper { ... }
 * .header { ... }
 * ```
 * 
 * ============================================================================
 * 9. TEST FILES
 * ============================================================================
 * 
 * - Co-locate tests with source files
 * - Use `.test.ts` or `.spec.ts` extension
 * - Name matches the file being tested
 * 
 * ```
 * components/
 * ├── vehicle-card/
 * │   ├── vehicle-card.tsx
 * │   └── vehicle-card.test.tsx
 * └── vehicle-card.module.css
 * ```
 * 
 * ## Test Naming
 * 
 * - Describe the function: `{functionName}`
 * - Describe the scenario: `{scenario}`
 * - Describe the expected: `{expectedBehavior}`
 * 
 * ```typescript
 * describe('VehicleCard', () => {
 *   it('renders vehicle details correctly', () => { ... });
 *   it('shows saved state when favorited', () => { ... });
 *   it('calls onClick when card is clicked', () => { ... });
 * });
 * ```
 * 
 * ============================================================================
 * SUMMARY TABLE
 * ============================================================================
 * 
 * | Type | Convention | Example |
 * |------|-----------|---------|
 * | Files | kebab-case | `vehicle-card.tsx` |
 * | Folders | kebab-case | `vehicle-card/` |
 * | Components | PascalCase | `VehicleCard` |
 * | Hooks | camelCase, use prefix | `useVehicleFilter` |
 * | Utils | camelCase | `formatCurrency` |
 * | Types | PascalCase | `Vehicle`, `VehicleStatus` |
 * | Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
 * | Enums | PascalCase values | `VehicleType.Sedan` |
 * | Routes | kebab-case | `/vehicle/:id` |
 * | CSS Classes | Tailwind utilities | `className="p-4"` |
 * | Tests | Match source + `.test` | `vehicle-card.test.tsx` |
 */
