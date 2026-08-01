# KAYAD Inspection Marketplace

## Overview

The **KAYAD Inspection Marketplace** is an independent business ecosystem where verified inspection companies, automotive engineers, and certified mechanics operate their businesses through the KAYAD platform. KAYAD provides technology, standards, bookings, reporting, and trust while inspection providers remain independent businesses responsible for delivering inspection services.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    KAYAD PLATFORM                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │   VEHICLE        │    │   INSPECTION MARKETPLACE      │   │
│  │   MARKETPLACE    │◄──►│   ┌────────────────────────┐  │   │
│  │                  │    │  │  Provider Profiles     │  │   │
│  │                  │    │  │  Booking System         │  │   │
│  │                  │    │  │  Report Generation      │  │   │
│  │                  │    │  │  Payment Settlements    │  │   │
│  └──────────────────┘    │  │  Business Centers       │  │   │
│                         │  └────────────────────────┘  │   │
│                         └──────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `inspection_providers` | Inspection company/business profiles |
| `inspection_packages` | Inspection service packages |
| `inspection_staff` | Engineers and technicians |
| `inspection_branches` | Business locations |
| `inspection_bookings` | Customer bookings |
| `inspection_reports` | 150-point inspection reports |
| `inspection_checklist_items` | Individual checklist items |
| `inspection_status_history` | Booking status timeline |
| `inspection_reviews` | Customer reviews |
| `inspection_settlements` | Payment settlements |
| `inspection_transactions` | Financial transactions |
| `inspection_quality_audits` | Quality assurance audits |
| `provider_credentials` | Business certifications |
| `staff_schedules` | Staff availability |
| `inspection_disputes` | Customer disputes |

## Features

### 1. Public Marketplace

- **Provider Discovery**: Search and filter providers by location, specialization, rating
- **Provider Profiles**: Professional business pages with credentials, reviews, packages
- **Comparison**: Side-by-side provider comparison
- **Direct Booking**: Book inspections directly from provider pages

### 2. Provider Profiles

- Company information and history
- Verified credentials and certifications
- Inspection packages with pricing
- Customer reviews and ratings
- Branch locations with maps
- Business hours and availability

### 3. Inspection Types

- Pre-Purchase Inspection
- Dealer Inspection
- Auction Inspection
- Fleet Inspection
- Insurance Inspection
- Warranty Inspection
- Mechanical Diagnosis
- Road Test
- Import Verification
- Commercial Vehicle Inspection

### 4. 150-Point Digital Reports

Each inspection generates a comprehensive report covering:

| Category | Points |
|----------|--------|
| Engine | 20 |
| Transmission | 15 |
| Suspension | 12 |
| Brakes | 12 |
| Electrical | 15 |
| Interior | 15 |
| Exterior | 15 |
| Body Structure | 12 |
| Paint & Finish | 10 |
| Tyres & Wheels | 8 |
| Undercarriage | 8 |
| Road Test | 8 |

### 5. Booking System

Complete booking flow:
1. Vehicle Details
2. Package Selection
3. Schedule Date & Time
4. Location (Mobile/Workshop)
5. Customer Confirmation
6. Payment

### 6. Status Tracking

- Booked → Confirmed → Inspector Assigned → Travelling → Inspection Started → Inspection Complete → Report Generated → Customer Reviewed → Closed

### 7. Payment & Settlements

- Direct payments to providers
- Automatic commission calculation
- Tax handling
- Settlement processing
- Earnings tracking

### 8. Provider Business Center

- Dashboard with key metrics
- Booking management
- Report generation
- Staff management
- Earnings and settlements
- Analytics and reporting

## API Endpoints

### Provider Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inspection/providers` | Search providers |
| GET | `/api/inspection/providers/:id` | Get provider profile |
| GET | `/api/inspection/providers/:id/slots` | Get available slots |
| GET | `/api/inspection/providers/:id/dashboard` | Provider dashboard |
| GET | `/api/inspection/providers/:id/earnings` | Earnings summary |

### Booking Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/inspection/bookings` | Create booking |
| GET | `/api/inspection/bookings` | Get customer bookings |
| GET | `/api/inspection/bookings/:ref` | Get booking details |
| POST | `/api/inspection/bookings/:id/cancel` | Cancel booking |
| GET | `/api/inspection/provider/:id/bookings` | Provider bookings |
| POST | `/api/inspection/provider/:id/bookings/:id/status` | Update status |
| POST | `/api/inspection/provider/:id/bookings/:id/assign` | Assign inspector |

### Report Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/inspection/provider/:id/bookings/:id/report` | Create report |
| GET | `/api/inspection/reports/:id` | Get report |
| GET | `/api/inspection/reports/share/:token` | Get by share token |
| POST | `/api/inspection/provider/:id/reports/:id/pdf` | Generate PDF |
| POST | `/api/inspection/provider/:id/reports/:id/share` | Share report |

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/inspection/bookings/:id/payment` | Process payment |
| POST | `/api/inspection/bookings/:id/refund` | Process refund |
| GET | `/api/inspection/provider/:id/transactions` | Get transactions |
| GET | `/api/inspection/provider/:id/settlements` | Get settlements |
| POST | `/api/inspection/provider/:id/settlements` | Generate settlement |

## Design System

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Light Navy | #1e3a5f | Primary, headers |
| Warm Beige | #f5f0e8 | Background, cards |
| White | #ffffff | Content areas |
| Emerald | #10b981 | Success, CTAs |
| Muted Terracotta | #c4a484 | Accents, ratings |
| Soft Blue | #64748b | Secondary text |

### Typography

- Primary Font: System sans-serif
- Headings: Bold, Navy
- Body: Regular, Slate
- Accents: Medium weight

## Security

- Public users see public provider info only
- Registered users can book inspections
- Providers manage their own bookings and reports
- Admin users handle payments and disputes
- Sensitive data encrypted at rest
- Role-based access control

## Performance

- Optimized search with indexes
- Paginated results
- Lazy loading for images
- Caching for provider profiles
- Real-time status updates

## Future Enhancements

- AI-powered damage detection
- Video inspection reports
- Multi-language support
- Integration with NTSA database
- Insurance company portals
- Fleet management dashboards

## Getting Started

### Database Setup

```bash
# Apply the inspection schema
psql $DATABASE_URL -f db/inspection.schema.sql
```

### Environment Variables

```env
INSPECTION_COMMISSION_RATE=15
INSPECTION_PAYMENT_GATEWAY=mpesa
```

### Starting the Service

```bash
npm run start
```

## Testing

```bash
npm test -- --testPathPattern="inspection"
```

## License

Internal use - KAYAD Platform
