# KAYAD State Management Strategy

**Document Version**: 1.0 | **Last Updated**: 2026-07-29

This document defines how state is managed in the KAYAD frontend application.

---

## Overview

State management in KAYAD follows a **layered approach**:

1. **Server State**: React Query / SWR
2. **Global UI State**: React Context
3. **Feature State**: Custom hooks
4. **Local State**: useState

---

## State Hierarchy

```
┌─────────────────────────────────────────────┐
│           Server State (React Query)         │
│  - API data, caching, synchronization        │
├─────────────────────────────────────────────┤
│          Global UI State (Context)          │
│  - Auth, Theme, Toast, Modals                │
├─────────────────────────────────────────────┤
│           Feature State (Hooks)              │
│  - Feature-specific logic and state          │
├─────────────────────────────────────────────┤
│            Local State (useState)            │
│  - Form inputs, toggles, UI state            │
└─────────────────────────────────────────────┘
```

---

## Server State (React Query)

### Why React Query?

- Automatic caching
- Background refetching
- Optimistic updates
- Pagination support
- Prefetching

### Configuration

```tsx
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes
      gcTime: 10 * 60 * 1000,      // 10 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: true,
    },
  },
});
```

### Query Keys

Use consistent query keys:

```tsx
// src/lib/query-keys.ts
export const queryKeys = {
  // Vehicles
  vehicles: {
    all: ['vehicles'] as const,
    list: (filters) => [...queryKeys.vehicles.all, 'list', filters] as const,
    detail: (id) => [...queryKeys.vehicles.all, 'detail', id] as const,
  },
  
  // Dealers
  dealers: {
    all: ['dealers'] as const,
    list: (filters) => [...queryKeys.dealers.all, 'list', filters] as const,
    detail: (id) => [...queryKeys.dealers.all, 'detail', id] as const,
  },
  
  // Auctions
  auctions: {
    all: ['auctions'] as const,
    list: (filters) => [...queryKeys.auctions.all, 'list', filters] as const,
    detail: (id) => [...queryKeys.auctions.all, 'detail', id] as const,
  },
  
  // User
  user: {
    me: ['user', 'me'] as const,
    profile: (id) => ['user', 'profile', id] as const,
  },
} as const;
```

### Usage Pattern

```tsx
// Basic query
function VehicleList() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.vehicles.list({ page: 1 }),
    queryFn: () => vehiclesApi.list({ page: 1 }),
  });
}

// Query with params
function VehicleDetail({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.vehicles.detail(id),
    queryFn: () => vehiclesApi.get(id),
  });
}

// Mutation
function useCreateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: vehiclesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
  });
}
```

### Optimistic Updates

```tsx
function useFavoriteVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: vehiclesApi.toggleFavorite,
    onMutate: async (vehicleId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.vehicles.all 
      });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(
        queryKeys.vehicles.all
      );
      
      // Optimistically update
      queryClient.setQueryData(
        queryKeys.vehicles.all,
        (old) => ({
          ...old,
          vehicles: old.vehicles.map(v => 
            v.id === vehicleId 
              ? { ...v, isFavorite: !v.isFavorite }
              : v
          ),
        })
      );
      
      return { previous };
    },
    onError: (err, vehicleId, context) => {
      // Rollback on error
      queryClient.setQueryData(
        queryKeys.vehicles.all,
        context.previous
      );
    },
  });
}
```

---

## Global UI State (Context)

### When to Use Context

Use context only for truly global state:

- Authentication state
- Theme settings
- Toast notifications
- Global modals

### Context Pattern

```tsx
// src/context/theme-context.tsx
interface ThemeContextValue {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Minimal Global Contexts

```tsx
// src/app/providers.tsx
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

---

## Feature State (Hooks)

### Feature Hook Pattern

```tsx
// src/features/marketplace/hooks/use-vehicle-filter.ts
interface VehicleFilters {
  make?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  year?: number;
  fuelType?: string[];
  transmission?: string[];
}

interface UseVehicleFilterReturn {
  filters: VehicleFilters;
  setFilter: <K extends keyof VehicleFilters>(
    key: K, 
    value: VehicleFilters[K]
  ) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

export function useVehicleFilter(): UseVehicleFilterReturn {
  const [filters, setFilters] = useState<VehicleFilters>({});
  
  const setFilter = <K extends keyof VehicleFilters>(
    key: K,
    value: VehicleFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  const resetFilters = () => {
    setFilters({});
  };
  
  const hasActiveFilters = Object.keys(filters).length > 0;
  
  return {
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters,
  };
}
```

### Auction State Hook

```tsx
// src/features/auction/hooks/use-auction-bid.ts
interface UseAuctionBidProps {
  auctionId: string;
  initialBid: number;
}

interface UseAuctionBidReturn {
  bidAmount: number;
  setBidAmount: (amount: number) => void;
  isBidding: boolean;
  placeBid: () => Promise<void>;
  error: string | null;
}

export function useAuctionBid({ auctionId, initialBid }: UseAuctionBidProps): UseAuctionBidReturn {
  const [bidAmount, setBidAmount] = useState(initialBid);
  const [isBidding, setIsBidding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const placeBid = async () => {
    setIsBidding(true);
    setError(null);
    
    try {
      await auctionApi.placeBid(auctionId, bidAmount);
      // Invalidate auction query
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBidding(false);
    }
  };
  
  return {
    bidAmount,
    setBidAmount,
    isBidding,
    placeBid,
    error,
  };
}
```

---

## Local State (useState)

### When to Use useState

- Form input values
- Toggle states (modals, dropdowns)
- UI state not shared elsewhere
- Temporary state during interactions

### Form State Pattern

```tsx
// Use controlled inputs
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Submit form
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Checkbox
        checked={remember}
        onChange={(e) => setRemember(e.target.checked)}
      />
    </form>
  );
}
```

### Complex Local State

```tsx
// Use useReducer for complex state
type State = {
  step: number;
  values: {
    make: string;
    model: string;
    year: number;
  };
  errors: Record<string, string>;
};

type Action =
  | { type: 'SET_FIELD'; field: keyof State['values']; value: string | number }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
      };
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}
```

---

## URL State

### Search Params

```tsx
// Filters in URL
function VehicleFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const make = searchParams.get('make') || '';
  const minPrice = searchParams.get('minPrice') || '';
  
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };
  
  return (
    <div>
      <Select
        value={make}
        onChange={(v) => updateFilter('make', v)}
      />
      <Input
        value={minPrice}
        onChange={(v) => updateFilter('minPrice', v)}
      />
    </div>
  );
}
```

---

## State Colocation

### Colocation Principle

Keep state as close to where it's used as possible:

```tsx
// Bad - lifted too high
<Parent>
  <ChildA>
    <ChildB />  // uses showModal
  </ChildA>
</Parent>

// Good - lifted only as high as needed
<Parent>
  <ChildA />
  <ModalWrapper />  // ChildA uses this
</Parent>
```

---

## Performance Considerations

### Memoization

```tsx
// Expensive computations
const sortedVehicles = useMemo(() => {
  return [...vehicles].sort((a, b) => b.createdAt - a.createdAt);
}, [vehicles]);

// Stable callbacks
const handleClick = useCallback(() => {
  onSelect(id);
}, [id, onSelect]);

// Memoized components
const VehicleCard = memo(function VehicleCard({ vehicle }) {
  return <div>{vehicle.name}</div>;
});
```

### Avoid Unnecessary Re-renders

```tsx
// Use React.memo for list items
const VehicleItem = memo(({ vehicle, onSelect }) => (
  <div onClick={() => onSelect(vehicle.id)}>
    {vehicle.name}
  </div>
));

// Use keys properly
{vehicles.map(vehicle => (
  <VehicleItem 
    key={vehicle.id}  // Never use index in keys!
    vehicle={vehicle}
    onSelect={handleSelect}
  />
))}
```

---

## State Testing

### Testing Patterns

```tsx
// Test state management
test('updates filter correctly', () => {
  const { result } = renderHook(() => useVehicleFilter());
  
  act(() => {
    result.current.setFilter('make', 'Toyota');
  });
  
  expect(result.current.filters.make).toBe('Toyota');
});

// Test React Query mutations
test('invalidates queries on success', async () => {
  const queryClient = createQueryClient();
  const { result } = renderHook(() => useCreateVehicle(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
  });
  
  await act(async () => {
    await result.current.mutate(mockVehicle);
  });
  
  expect(queryClient.getQueryState(['vehicles'])).toBeDefined();
});
```

---

## Anti-Patterns to Avoid

### Don't Over-Use Context

```tsx
// Bad - context for everything
const VehicleContext = createContext<Vehicle[]>([]);

// Good - use React Query for data
const { data: vehicles } = useQuery({
  queryKey: queryKeys.vehicles.all,
  queryFn: vehiclesApi.list,
});
```

### Don't Use useState for Everything

```tsx
// Bad - managing complex state with useState
const [vehicles, setVehicles] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
// ... 20 more state variables

// Good - use React Query
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.vehicles.list({ page }),
  queryFn: () => vehiclesApi.list({ page }),
});
```

### Don't Lift State Too Early

```tsx
// Bad - lifting before needed
<Parent>
  <ChildA prop={sharedState} />
  <ChildB prop={sharedState} />
</Parent>

// Good - keep co-located until necessary
<Parent>
  <ChildA />
  <ChildB />
</Parent>

// Lift when children need to share
<Parent>
  <ParentState>
    <ChildA />
    <ChildB />
  </ParentState>
</Parent>
```

---

## Migration Guide

### From Redux

1. Replace Redux store with React Query
2. Replace `useSelector` with `useQuery`
3. Replace `useDispatch` with `useMutation`
4. Keep auth/theme in context if needed

### From Zustand

1. Server state → React Query
2. Global UI → Context
3. Feature state → Custom hooks
4. Local state → useState

---

## Summary

| State Type | Solution | When to Use |
|------------|----------|-------------|
| Server Data | React Query | API calls, caching |
| Auth State | Context | User session |
| Theme | Context | Light/dark mode |
| Toasts | Context | Notifications |
| Feature State | Custom Hook | Feature logic |
| Form State | useState | Form inputs |
| URL State | useSearchParams | Filters, pagination |

---

**End of State Management Strategy Document**
