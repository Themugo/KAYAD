# KAYAD Routing Strategy

**Document Version**: 1.0 | **Last Updated**: 2026-07-29

This document defines the routing strategy for the KAYAD frontend application.

---

## Overview

The application uses **React Router v6** with the following patterns:

- Lazy loading for all page components
- Protected routes with authentication guards
- Nested layouts for feature areas
- Type-safe route parameters

---

## Route Structure

```
/                           # Public
├── /login                  # Authentication
├── /register
├── /forgot-password
│
├── /vehicles               # Marketplace (Public)
│   ├── /vehicles/:id
│   ├── /search
│   └── /compare
│
├── /dealers                # Dealer (Public)
│   ├── /dealers/:id
│   └── /dealers/:id/inventory
│
├── /auctions               # Auctions (Public)
│   ├── /auctions/:id
│   ├── /auctions/:id/live
│   └── /auctions/calendar
│
├── /inspections            # Inspections (Public info)
│   └── /inspections/:id
│
├── /escrow                 # Escrow (Protected)
│   ├── /escrow/:id
│   └── /escrow/vault
│
├── /dashboard              # Dashboard (Protected)
│   ├── /dashboard/buyer
│   ├── /dashboard/seller
│   └── /dashboard/dealer
│
├── /profile                # Profile (Protected)
│   ├── /profile/edit
│   ├── /profile/settings
│   └── /profile/favorites
│
├── /notifications          # Notifications (Protected)
│
├── /chat                   # Chat (Protected)
│
├── /admin                  # Admin (Admin only)
│   ├── /admin/dashboard
│   ├── /admin/users
│   ├── /admin/listings
│   ├── /admin/escrows
│   ├── /admin/auctions
│   ├── /admin/inspections
│   ├── /admin/reports
│   └── /admin/settings
│
├── /settings               # Settings (Protected)
│
├── /support               # Support (Protected)
│   ├── /support/tickets
│   └── /support/tickets/:id
│
└── /*                     # 404 Not Found
```

---

## Route Categories

### Public Routes

Accessible without authentication:

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page |
| `/login` | Login | User login |
| `/register` | Register | User registration |
| `/vehicles` | Browse | Browse all vehicles |
| `/vehicles/:id` | VehicleDetail | Vehicle details |
| `/dealers` | Dealers | Browse dealers |
| `/dealers/:id` | DealerProfile | Dealer profile |
| `/auctions` | Auctions | Browse auctions |
| `/auctions/:id` | AuctionDetail | Auction details |

### Protected Routes

Require authentication:

| Route | Page | Description |
|-------|------|-------------|
| `/escrow` | Escrow | Escrow dashboard |
| `/dashboard` | Dashboard | Main dashboard |
| `/profile` | Profile | User profile |
| `/notifications` | Notifications | Notification center |
| `/chat` | Chat | Messaging |
| `/support` | Support | Support center |

### Admin Routes

Require admin role:

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | AdminDashboard | Admin overview |
| `/admin/users` | AdminUsers | User management |
| `/admin/listings` | AdminListings | Listing moderation |
| `/admin/escrows` | AdminEscrows | Escrow management |
| `/admin/auctions` | AdminAuctions | Auction management |
| `/admin/settings` | AdminSettings | System settings |

---

## Route File Organization

```
src/
├── app/
│   └── routes/
│       ├── index.tsx              # Root routes
│       ├── public.routes.tsx      # Public routes
│       ├── protected.routes.tsx   # Protected routes
│       ├── admin.routes.tsx       # Admin routes
│       └── auth.routes.tsx        # Auth routes
```

---

## Route Definitions

### Main Route File

```tsx
// src/app/routes/index.tsx
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AuthGuard } from '@/shared/components';
import { AdminGuard } from '@/shared/components';
import { AppLayout } from '@/components/layout';
import { AdminLayout } from '@/components/layout';
import { PublicLayout } from '@/components/layout';

// Lazy-loaded pages
const HomePage = lazy(() => import('@/pages/Home'));
const LoginPage = lazy(() => import('@/pages/auth/Login'));
const RegisterPage = lazy(() => import('@/pages/auth/Register'));
const VehiclesPage = lazy(() => import('@/pages/marketplace/Vehicles'));
const VehicleDetailPage = lazy(() => import('@/pages/marketplace/VehicleDetail'));
const DealersPage = lazy(() => import('@/pages/dealer/Dealers'));
const DealerProfilePage = lazy(() => import('@/pages/dealer/DealerProfile'));
const AuctionsPage = lazy(() => import('@/pages/auction/Auctions'));
const AuctionDetailPage = lazy(() => import('@/pages/auction/AuctionDetail'));
const DashboardPage = lazy(() => import('@/pages/dashboard/Dashboard'));
const EscrowPage = lazy(() => import('@/pages/escrow/Escrow'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/Dashboard'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

export const router = createBrowserRouter([
  // Public routes with public layout
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'vehicles', element: <VehiclesPage /> },
      { path: 'vehicles/:id', element: <VehicleDetailPage /> },
      { path: 'dealers', element: <DealersPage /> },
      { path: 'dealers/:id', element: <DealerProfilePage /> },
      { path: 'auctions', element: <AuctionsPage /> },
      { path: 'auctions/:id', element: <AuctionDetailPage /> },
    ],
  },
  
  // Protected routes with app layout
  {
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'escrow', element: <EscrowPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'chat/*', element: <ChatPage /> },
    ],
  },
  
  // Admin routes with admin layout
  {
    path: 'admin',
    element: <AdminGuard><AdminLayout /></AdminGuard>,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'listings', element: <AdminListingsPage /> },
      { path: 'escrows', element: <AdminEscrowsPage /> },
    ],
  },
  
  // 404
  { path: '*', element: <NotFoundPage /> },
]);
```

---

## Route Guards

### Auth Guard

Redirects to login if not authenticated:

```tsx
// src/shared/components/auth-guard.tsx
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}
```

### Admin Guard

Redirects to dashboard if not admin:

```tsx
// src/shared/components/admin-guard.tsx
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
```

---

## Route Parameters

### Type-Safe Parameters

Use TypeScript for route params:

```tsx
// src/types/routes.ts
export interface VehicleRouteParams {
  id: string;
}

export interface AuctionRouteParams {
  id: string;
  action?: 'bid' | 'watch' | 'cancel';
}

// Usage in page component
export function VehicleDetailPage() {
  const { id } = useParams<VehicleRouteParams>();
  const { data } = useVehicle(id);
  // ...
}
```

---

## Nested Routes

### Dashboard Example

```tsx
// Dashboard routes with tab navigation
{
  path: 'dashboard',
  element: <DashboardLayout />,
  children: [
    { index: true, element: <Navigate to="overview" replace /> },
    { path: 'overview', element: <DashboardOverview /> },
    { path: 'buyer', element: <BuyerDashboard /> },
    { path: 'seller', element: <SellerDashboard /> },
    { path: 'dealer', element: <DealerDashboard /> },
  ],
}
```

### Tab Navigation

```tsx
// DashboardLayout.tsx
export function DashboardLayout() {
  return (
    <div>
      <DashboardTabs />
      <Outlet />
    </div>
  );
}

// DashboardTabs.tsx
export function DashboardTabs() {
  const location = useLocation();
  const tabs = [
    { path: 'overview', label: 'Overview' },
    { path: 'buyer', label: 'Buyer' },
    { path: 'seller', label: 'Seller' },
    { path: 'dealer', label: 'Dealer' },
  ];
  
  return (
    <Tabs activeKey={location.pathname.split('/').pop()}>
      {tabs.map(tab => (
        <Tab key={tab.path} tab={<Link to={tab.path}>{tab.label}</Link>} />
      ))}
    </Tabs>
  );
}
```

---

## Programmatic Navigation

### Using useNavigate

```tsx
const navigate = useNavigate();

// Navigate to path
navigate('/vehicles');

// Navigate with state
navigate('/vehicles/123', { state: { from: '/search' } });

// Navigate back
navigate(-1);

// Replace instead of push
navigate('/login', { replace: true });
```

### Using Link

```tsx
import { Link, useLocation } from 'react-router-dom';

// Basic link
<Link to="/vehicles">Browse Vehicles</Link>

// With active state
<NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
  Dashboard
</NavLink>

// Preserve search params
<Link to={{ pathname: '/vehicles', search: location.search }}>
  Vehicles
</Link>
```

---

## Search Params Management

### Reading Params

```tsx
const [searchParams] = useSearchParams();
const page = searchParams.get('page') || '1';
const sort = searchParams.get('sort') || 'newest';
```

### Updating Params

```tsx
const navigate = useNavigate();
const location = useLocation();

function updateFilter(key: string, value: string) {
  const params = new URLSearchParams(location.search);
  params.set(key, value);
  navigate(`${location.pathname}?${params.toString()}`);
}
```

---

## Route Transitions

### Page Transitions

```tsx
// Wrap routes with transition
<Suspense fallback={<PageLoader />}>
  <AnimatedRoutes>
    <Routes>{children}</Routes>
  </AnimatedRoutes>
</Suspense>
```

---

## SEO Routes

### Meta Tags

```tsx
// Per-route meta configuration
<Route 
  path="/vehicles/:id"
  element={
    <>
      <SEO 
        title="[vehicleName] - KAYAD"
        description="[vehicleDescription]"
        image="[vehicleImage]"
      />
      <VehicleDetailPage />
    </>
  }
/>
```

---

## Error Handling

### Route Errors

```tsx
// Error boundary for routes
<Route
  errorElement={<ErrorBoundary />}
>
  {/* routes */}
</Route>
```

### 404 Handling

```tsx
// Always last route
{ path: '*', element: <NotFoundPage /> }

// With data
{ 
  path: '*', 
  element: <NotFoundPage />,
  action: () => { throw new Response("Not Found", { status: 404 }); }
}
```

---

## Performance

### Code Splitting

Lazy load all pages:

```tsx
// Good
const VehiclesPage = lazy(() => import('@/pages/marketplace/Vehicles'));

// Bad
import { VehiclesPage } from '@/pages/marketplace/Vehicles';
```

### Preloading

Preload likely next pages:

```tsx
// On hover over link
const VehiclesPage = lazy(() => import('@/pages/marketplace/Vehicles'));
const Link = ({ to, children, ...props }) => {
  const preload = () => {
    if (to === '/vehicles') VehiclesPage.preload();
  };
  return <a href={to} onMouseEnter={preload} {...props}>{children}</a>;
};
```

---

## Testing Routes

### Unit Testing

```tsx
// vehicle-detail.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VehicleDetailPage } from './VehicleDetailPage';

test('displays vehicle details', async () => {
  render(
    <MemoryRouter initialEntries={['/vehicles/123']}>
      <Routes>
        <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
  
  expect(await screen.findByText('Toyota Camry')).toBeInTheDocument();
});
```

---

## Migration Notes

### From React Router v5

- Routes use `element` prop instead of `component`
- `Switch` is now `Routes`
- `useHistory` is now `useNavigate`
- `Redirect` is now `Navigate`

### Path Aliases

Ensure `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

**End of Routing Strategy Document**
