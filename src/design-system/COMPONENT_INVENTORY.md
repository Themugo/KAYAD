# KAYAD Design System 2.0 - Component Inventory

## Overview

This document catalogs all reusable components in the KAYAD Design System, organized by category.

---

## 1. Buttons

| Component | Purpose | Variants |
|-----------|---------|----------|
| `Button` | Primary actions | primary, secondary, ghost, danger |
| `IconButton` | Icon-only actions | sm, md, lg |
| `PillButton` | Tab-like selection | active, inactive |

### Usage

```jsx
import { Button, IconButton, PillButton } from './design-system/components';

// Primary button
<Button variant="primary" size="md">Get Started</Button>

// Secondary button
<Button variant="secondary" size="lg">Learn More</Button>

// Ghost button
<Button variant="ghost">Cancel</Button>

// Icon button
<IconButton icon={Plus} label="Add" />
```

---

## 2. Form Elements

| Component | Purpose |
|-----------|---------|
| `Input` | Text input |
| `Textarea` | Multi-line text |
| `Select` | Dropdown selection |
| `Checkbox` | Multiple selection |
| `Radio` | Single selection |
| `Switch` | Toggle |
| `SearchInput` | Search with icon |

### Usage

```jsx
import { Input, Textarea, Select, Checkbox, Radio, Switch, SearchInput } from './design-system/components';

// Text input
<Input 
  label="Email" 
  placeholder="you@example.com"
  error="Invalid email"
/>

// Search input
<SearchInput 
  placeholder="Search vehicles..."
  onSearch={(value) => handleSearch(value)}
/>

// Switch
<Switch 
  label="Enable notifications"
  checked={enabled}
  onChange={setEnabled}
/>
```

---

## 3. Cards

| Component | Purpose |
|-----------|---------|
| `Card` | Base container |
| `CardInteractive` | Clickable card |
| `VehicleCard` | Vehicle listings |
| `DealerCard` | Dealer profiles |
| `StatCard` | Statistics display |
| `PricingCard` | Pricing plans |

### Usage

```jsx
import { Card, CardInteractive, VehicleCard, StatCard } from './design-system/components';

// Base card
<Card>
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>

// Interactive card
<CardInteractive onClick={() => navigate('/detail')}>
  <h3>Click me</h3>
</CardInteractive>

// Stat card
<StatCard 
  label="Total Sales"
  value="KSh 12.5M"
  trend="+12%"
  trendUp={true}
/>
```

---

## 4. Badges & Tags

| Component | Purpose |
|-----------|---------|
| `Badge` | Status indicators |
| `Tag` | Labels/categories |
| `StatusBadge` | Predefined statuses |

### Usage

```jsx
import { Badge, Tag, StatusBadge } from './design-system/components';

// Badge variants
<Badge variant="success">Verified</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Rejected</Badge>

// Status badge with dot
<StatusBadge status="live">LIVE</StatusBadge>

// Tag
<Tag onClick={() => filterBy('SUV')}>SUV</Tag>
```

---

## 5. Navigation

| Component | Purpose |
|-----------|---------|
| `Navbar` | Main navigation |
| `Sidebar` | Admin sidebar |
| `Breadcrumb` | Page hierarchy |
| `Tabs` | Content sections |
| `Pagination` | Page navigation |

### Usage

```jsx
import { Navbar, Sidebar, Breadcrumb, Tabs, Pagination } from './design-system/components';

// Tabs
<Tabs
  tabs={[
    { id: 'overview', label: 'Overview' },
    { id: 'details', label: 'Details' },
  ]}
  activeTab="overview"
  onChange={(id) => setActiveTab(id)}
/>

// Pagination
<Pagination
  currentPage={1}
  totalPages={10}
  onPageChange={(page) => setPage(page)}
/>
```

---

## 6. Feedback

| Component | Purpose |
|-----------|---------|
| `Toast` | Notifications |
| `Tooltip` | Hover hints |
| `Modal` | Dialogs |
| `Drawer` | Slide-out panels |
| `Skeleton` | Loading states |

### Usage

```jsx
import { Toast, Tooltip, Modal, Drawer, Skeleton } from './design-system/components';

// Modal
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure?</p>
</Modal>

// Toast (via context)
const { addToast } = useToast();
addToast({ message: 'Saved successfully', type: 'success' });

// Skeleton
<Skeleton variant="text" width="60%" />
<Skeleton variant="avatar" />
```

---

## 7. Layout

| Component | Purpose |
|-----------|---------|
| `Container` | Page wrapper |
| `Grid` | CSS Grid wrapper |
| `Stack` | Flexbox wrapper |
| `PageHeader` | Page title area |
| `Section` | Content sections |

### Usage

```jsx
import { Container, Grid, Stack, PageHeader, Section } from './design-system/components';

// Container
<Container size="wide">
  <PageHeader 
    title="Vehicles" 
    subtitle="Browse our collection"
    action={<Button>Add New</Button>}
  />
</Container>

// Grid
<Grid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
  {vehicles.map(v => (
    <VehicleCard key={v.id} vehicle={v} />
  ))}
</Grid>
```

---

## 8. Data Display

| Component | Purpose |
|-----------|---------|
| `Table` | Tabular data |
| `Avatar` | User images |
| `Progress` | Progress bars |
| `Countdown` | Time display |

---

## Design Token Usage

All components consume design tokens:

```css
/* Example: Button component */
.my-button {
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-button);
  border-radius: var(--radius-md);
  transition: all var(--transition-normal);
  box-shadow: var(--shadow-sm);
}
```

---

## Migration Guide

### Before (Inconsistent)
```jsx
<button 
  style={{
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    background: '#16C4A4',
    color: '#fff',
    border: 'none',
    boxShadow: '0 4px 14px rgba(22, 196, 164, 0.25)'
  }}
>
  Get Started
</button>
```

### After (Design System)
```jsx
<Button variant="primary">
  Get Started
</Button>
```

---

## Files Structure

```
src/design-system/
├── tokens.css           # Design tokens
├── components.css       # Base component styles
├── components.tsx       # React components (optional)
├── COMPONENT_INVENTORY.md
├── TOKEN_ARCHITECTURE.md
├── AUDIT_REPORT.md
└── README.md
```
