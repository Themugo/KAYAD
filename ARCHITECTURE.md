# KAYAD Frontend Architecture

**Version 1.0 | Enterprise Frontend Foundation**

This document describes the architectural foundation for the KAYAD automotive marketplace frontend. It provides guidelines for code organization, component ownership, and development standards.

---

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Feature Modules](#feature-modules)
4. [Shared Library](#shared-library)
5. [Routing Strategy](#routing-strategy)
6. [State Management](#state-management)
7. [API Layer](#api-layer)
8. [Design Tokens](#design-tokens)
9. [Code Standards](#code-standards)
10. [Component Ownership](#component-ownership)
11. [Getting Started](#getting-started)

---

## Overview

The KAYAD frontend follows a **feature-based architecture** with a **shared component library**. This ensures:

- Clear ownership of code
- Reusability of shared components
- Easy maintenance and testing
- Scalable codebase

### Design Principles

1. **Feature Isolation**: Each feature owns its components, hooks, and utilities
2. **Shared Components**: Generic UI components live in `shared/`
3. **Single Source of Truth**: No duplicate implementations
4. **Type Safety**: Full TypeScript coverage
5. **Accessibility**: All components follow WCAG 2.1 guidelines

---

## Directory Structure

```
src/
├── app/                    # Application entry points
│   ├── routes/            # Route definitions
│   ├── providers/         # Context providers
│   └── main.tsx           # App entry
│
├── shared/                 # Shared code across all features
│   ├── components/        # Reusable UI components
│   ├── hooks/            # Reusable hooks
│   ├── utils/            # Utility functions
│   ├── types/            # Shared type definitions
│   ├── tokens/           # Design tokens
│   └── styles/            # Global styles
│
├── features/              # Feature modules
│   ├── marketplace/       # Vehicle browsing & search
│   ├── dealer/           # Dealer management
│   ├── auction/          # Auction functionality
│   ├── escrow/           # Escrow payments
│   ├── inspection/       # Vehicle inspections
│   ├── finance/          # Finance & payments
│   ├── auth/             # Authentication
│   ├── dashboard/        # User dashboards
│   ├── admin/            # Admin panel
│   ├── notifications/   # Notifications
│   ├── chat/            # Messaging
│   ├── settings/         # User settings
│   └── support/          # Support & help
│
├── pages/                # Route pages (lazy loaded)
├── components/          # Legacy components (migration target)
├── api/                 # API client & endpoints
├── context/             # Global contexts
├── hooks/               # Global hooks
├── services/            # External services
├── types/               # Global types
├── utils/               # Global utilities
├── theme/               # Theme configuration
└── styles/              # Global styles
```

### Feature Module Structure

Each feature follows this pattern:

```
features/{feature-name}/
├── components/          # Feature-specific components
│   ├── {component-name}/
│   │   ├── {component-name}.tsx
│   │   └── {component-name}.test.tsx
│   └── index.ts
├── hooks/               # Feature-specific hooks
├── services/            # Feature-specific services
├── types/               # Feature-specific types
├── utils/              # Feature-specific utilities
└── pages/               # Feature page components (optional)
```

---

## Feature Modules

### Marketplace (`features/marketplace/`)

**Owner**: Frontend Team  
**Purpose**: Vehicle browsing, search, and comparison

**Components**:
- `VehicleCard` - Display vehicle listings
- `VehicleGrid` - Grid layout for vehicles
- `VehicleFilters` - Search filter panel
- `VehicleCompare` - Comparison feature
- `VehicleDetail` - Single vehicle view

**Routes**:
- `/vehicles` - Browse all vehicles
- `/vehicles/:id` - Vehicle detail
- `/search` - Search results
- `/compare` - Compare vehicles

### Dealer (`features/dealer/`)

**Owner**: Frontend Team  
**Purpose**: Dealer profiles and management

**Components**:
- `DealerCard` - Display dealer info
- `DealerProfile` - Dealer detail page
- `DealerInventory` - Dealer's vehicle list
- `DealerStats` - Dealer metrics

**Routes**:
- `/dealers` - Browse dealers
- `/dealers/:id` - Dealer profile
- `/dealer/dashboard` - Dealer dashboard

### Auction (`features/auction/`)

**Owner**: Frontend Team  
**Purpose**: Auction listings and bidding

**Components**:
- `AuctionCard` - Auction item display
- `AuctionTimer` - Countdown timer
- `BidForm` - Place bid form
- `AuctionLive` - Live auction view

**Routes**:
- `/auctions` - Browse auctions
- `/auctions/:id` - Auction detail
- `/auctions/:id/live` - Live bidding

### Escrow (`features/escrow/`)

**Owner**: Frontend Team  
**Purpose**: Secure payment escrow

**Components**:
- `EscrowCard` - Escrow status display
- `EscrowTimeline` - Payment timeline
- `EscrowActions` - Release/dispute actions

**Routes**:
- `/escrow` - User escrows
- `/escrow/:id` - Escrow detail

### Inspection (`features/inspection/`)

**Owner**: Frontend Team  
**Purpose**: Vehicle inspection management

**Components**:
- `InspectionCard` - Inspection summary
- `InspectionReport` - Detailed report
- `InspectionSchedule` - Schedule inspection

**Routes**:
- `/inspections` - Browse inspections
- `/inspections/:id` - Inspection report

### Finance (`features/finance/`)

**Owner**: Frontend Team  
**Purpose**: Payments and billing

**Components**:
- `PaymentForm` - Payment entry
- `PaymentHistory` - Transaction list
- `PaymentStatus` - Payment status

**Routes**:
- `/payments` - Payment history
- `/payments/:id` - Payment detail

### Auth (`features/auth/`)

**Owner**: Frontend Team  
**Purpose**: Authentication flows

**Components**:
- `LoginForm` - User login
- `RegisterForm` - User registration
- `PasswordReset` - Password recovery

**Routes**:
- `/login` - Login page
- `/register` - Registration
- `/forgot-password` - Password reset

### Dashboard (`features/dashboard/`)

**Owner**: Frontend Team  
**Purpose**: User dashboard views

**Components**:
- `DashboardLayout` - Dashboard wrapper
- `StatCard` - Metric display
- `ActivityFeed` - Recent activity

**Routes**:
- `/dashboard` - Main dashboard
- `/dashboard/buyer` - Buyer dashboard
- `/dashboard/seller` - Seller dashboard

### Admin (`features/admin/`)

**Owner**: Admin Team  
**Purpose**: Admin panel functionality

**Components**:
- `AdminLayout` - Admin wrapper
- `AdminTable` - Data tables
- `AdminWidgets` - Dashboard widgets

**Routes**:
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/listings` - Listing moderation

---

## Shared Library

The `shared/` directory contains code reusable across all features.

### Shared Components (`shared/components/`)

Generic UI components that don't contain business logic:

| Component | Purpose |
|-----------|---------|
| `Button` | Action triggers |
| `Input` | Form inputs |
| `Select` | Dropdown selection |
| `Modal` | Dialog overlays |
| `Card` | Container styling |
| `Badge` | Status labels |
| `Avatar` | User images |
| `Table` | Data tables |
| `Tabs` | Tabbed navigation |
| `Skeleton` | Loading placeholders |
| `Toast` | Notifications |

### Shared Hooks (`shared/hooks/`)

Generic hooks for common patterns:

- `useLocalStorage` - Persist to localStorage
- `useDebounce` - Debounce values
- `useMediaQuery` - Responsive hooks
- `useClickOutside` - Click detection
- `useKeyPress` - Keyboard shortcuts

### Shared Utils (`shared/utils/`)

Pure utility functions:

- `formatCurrency` - Format money values
- `formatDate` - Date formatting
- `validateEmail` - Email validation
- `cn` - Class name merging

### Design Tokens (`shared/tokens/`)

Centralized design values (see [Design Tokens](#design-tokens))

---

## Routing Strategy

### Route Organization

Routes are organized by feature ownership:

```
src/app/routes/
├── index.tsx              # Main route definitions
├── marketplace.routes.tsx
├── dealer.routes.tsx
├── auction.routes.tsx
├── escrow.routes.tsx
└── admin.routes.tsx
```

### Route Patterns

| Pattern | Example | Purpose |
|---------|---------|---------|
| `/{entity}` | `/vehicles` | List |
| `/{entity}/new` | `/vehicles/new` | Create |
| `/{entity}/:id` | `/vehicles/123` | Read |
| `/{entity}/:id/edit` | `/vehicles/123/edit` | Update |
| `/{entity}/:id/{action}` | `/vehicles/123/bid` | Actions |

### Navigation

- Use `react-router-dom` for routing
- Implement lazy loading for all pages
- Use route guards for authentication
- Document all route parameters

---

## State Management

### State Ownership

| State Type | Location | Example |
|------------|----------|---------|
| Server State | React Query/SWR | Vehicle list from API |
| Global UI | Context | Theme, Auth |
| Feature State | Feature hooks | Auction bid state |
| Local State | useState | Form inputs |
| URL State | React Router | Filters, pagination |

### Context Providers

Global contexts (kept minimal):

```typescript
// App-level providers
<AuthProvider>
  <ThemeProvider>
    <ToastProvider>
      {children}
    </ToastProvider>
  </ThemeProvider>
</AuthProvider>
```

### Feature State

Feature-specific state lives in feature hooks:

```typescript
// features/auction/hooks/use-auction.ts
export function useAuction(id: string) {
  const { data, isLoading } = useSWR(`/auctions/${id}`);
  const [bidAmount, setBidAmount] = useState(0);
  // ...
}
```

---

## API Layer

### API Organization

```
src/api/
├── client.ts              # Axios instance
├── endpoints/
│   ├── vehicles.ts        # Vehicle API
│   ├── dealers.ts         # Dealer API
│   ├── auctions.ts        # Auction API
│   ├── escrow.ts          # Escrow API
│   └── users.ts           # User API
└── types.ts               # API types
```

### API Client

Base client with common configuration:

```typescript
// Standard response handling
// Error transformation
// Authentication headers
// Request/response interceptors
```

### Usage Pattern

```typescript
import { vehiclesApi } from '@/api/endpoints/vehicles';

const vehicles = await vehiclesApi.list({ page: 1 });
```

---

## Design Tokens

Design tokens ensure visual consistency across the application.

### Token Categories

| Category | Purpose |
|----------|---------|
| `colors` | Color palette |
| `typography` | Font styles |
| `spacing` | Spacing scale |
| `borderRadius` | Corner radii |
| `elevation` | Shadow levels |
| `breakpoints` | Responsive breakpoints |
| `animation` | Motion timing |
| `zIndex` | Layer stacking |

### Token Usage

```tsx
import { tokens } from '@/shared/tokens';

<div style={{
  backgroundColor: tokens.colors.background.primary,
  padding: tokens.spacing[4],
  borderRadius: tokens.borderRadius.lg,
}} />
```

### CSS Variables

Tokens are also available as CSS variables for Tailwind:

```css
/* In index.css */
:root {
  --color-primary: #0070f3;
  --spacing-4: 1rem;
  --radius-lg: 0.5rem;
}
```

---

## Code Standards

### Single Responsibility

Each component/function should have one purpose:

```tsx
// Good - focused component
function VehicleImage({ src, alt }) {
  return <img src={src} alt={alt} className="..." />;
}

// Bad - too many responsibilities
function VehicleCard({ vehicle, onFavorite, onCompare, onBuy, showDealer }) {
  // ... 200 lines
}
```

### Component Structure

```tsx
interface VehicleCardProps {
  vehicle: Vehicle;
  onFavorite?: () => void;
  variant?: 'compact' | 'full';
}

export function VehicleCard({ 
  vehicle, 
  onFavorite,
  variant = 'full' 
}: VehicleCardProps) {
  return (
    <Card className={variant === 'compact' ? '...' : '...'}>
      <VehicleImage ... />
      <VehicleDetails ... />
      <VehicleActions ... />
    </Card>
  );
}
```

### TypeScript

- Use explicit types over `any`
- Export types from `types/index.ts`
- Use interfaces for object shapes
- Use type for unions and primitives

### Testing

- Test behavior, not implementation
- Co-locate tests with source
- Use meaningful test descriptions
- Aim for 80%+ coverage on critical paths

---

## Component Ownership

### Ownership Matrix

| Component | Owner | Location |
|-----------|-------|----------|
| VehicleCard | Marketplace | features/marketplace |
| DealerCard | Dealer | features/dealer |
| AuctionCard | Auction | features/auction |
| EscrowTimeline | Escrow | features/escrow |
| Button | Shared | shared/components |
| Modal | Shared | shared/components |
| Input | Shared | shared/components |

### Adding New Components

1. **Shared Component**: Add to `shared/components/`
2. **Feature Component**: Add to `features/{feature}/components/`
3. **Page Component**: Add to `pages/` with lazy loading

### Import Paths

Use path aliases for clean imports:

```typescript
// Instead of relative paths
import { Button } from '@/shared/components';
import { VehicleCard } from '@/features/marketplace/components';

// Use
import { Button } from 'shared/components';
import { VehicleCard } from 'features/marketplace/components';
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

### Development Workflow

1. **Create feature branch**: `git checkout -b feature/my-feature`
2. **Implement changes** following these guidelines
3. **Add tests** for new functionality
4. **Run linter**: `npm run lint`
5. **Run type check**: `npm run typecheck`
6. **Submit PR** for review

### Code Review Checklist

- [ ] Follows naming conventions
- [ ] Has proper TypeScript types
- [ ] Has tests for new code
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Imports are organized
- [ ] Component is accessible

---

## Appendix: Quick Reference

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase.tsx | `VehicleCard.tsx` |
| Hooks | useCamelCase.ts | `useVehicleFilter.ts` |
| Utils | kebab-case.ts | `format-currency.ts` |
| Types | PascalCase.ts | `vehicle.types.ts` |
| Tests | Match + .test | `vehicle-card.test.tsx` |

### Common Import Aliases

```typescript
// tsconfig.json paths
{
  "paths": {
    "@/*": ["src/*"],
    "@/shared/*": ["src/shared/*"],
    "@/features/*": ["src/features/*"],
    "@/components/*": ["src/components/*"]
  }
}
```

### Design Token Access

```typescript
// In components
import { tokens } from '@/shared/tokens';

// In CSS
var(--color-primary);
var(--spacing-4);
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-07-29  
**Next Review**: Before Phase 2 development
