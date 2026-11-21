# KAYAD Inspection Business Center

## Overview

The **KAYAD Inspection Business Center** is the complete operational workspace for independent inspection companies to manage their daily business operations. It is NOT an inspector dashboard or customer interface - it is the platform inspection companies use to run their entire company.

KAYAD provides technology while inspection companies remain independent businesses responsible for delivering inspection services.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  INSPECTION BUSINESS CENTER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  EXECUTIVE HOME  │  │    BOOKINGS      │  │   CALENDAR    │  │
│  │  • Today's Jobs  │  │  • Kanban View   │  │  • Day View   │  │
│  │  • Team Status   │  │  • Status Flow   │  │  • Week View  │  │
│  │  • Quick Actions │  │  • Assignments   │  │  • Month View │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │    ENGINEERS     │  │     REPORTS       │  │   ANALYTICS  │  │
│  │  • Team Overview  │  │  • QA Workflow    │  │  • Revenue   │  │
│  │  • Performance    │  │  • Review Queue   │  │  • Jobs      │  │
│  │  • Schedules     │  │  • Corrections    │  │  • Quality   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │     FINANCE      │  │    CUSTOMERS      │  │  MARKETING   │  │
│  │  • Revenue       │  │  • Customer List  │  │  • Packages  │  │
│  │  • Settlements   │  │  • History       │  │  • Promos   │  │
│  │  • Commission     │  │  • Segments      │  │  • Profile   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Extensions

### Core Tables

| Table | Description |
|-------|-------------|
| `inspection_engineers` | Team members with roles, skills, and performance |
| `engineer_schedules` | Engineer availability and job assignments |
| `inspection_customers` | Customer relationships and history |
| `report_versions` | QA workflow for reports |
| `report_corrections` | Issues found during review |
| `business_metrics` | Aggregated business data |
| `inspection_promos` | Marketing promotions |
| `business_documents` | Certificates and licenses |
| `engineer_locations` | Real-time location tracking |
| `business_audit_logs` | Activity tracking |

## Features

### 1. Executive Home

**What work needs attention today?**

| Metric | Description |
|--------|-------------|
| Today's Jobs | Total scheduled jobs |
| Jobs Awaiting Assignment | Unassigned bookings |
| Engineers On Duty | Available team members |
| Engineers Travelling | Currently in transit |
| Reports Pending | Awaiting report generation |
| Reports in QA | Under quality review |
| Completed Today | Jobs finished |
| Revenue Today | Day's earnings |
| Monthly Revenue | Month's earnings |
| Customer Rating | Average score |
| Quality Alerts | Reports pending >24h |

**Quick Actions:**
- Assign Engineer
- Accept Booking
- Reschedule
- Generate Report
- Manage Team
- Settings

### 2. Booking Management

**Kanban Board with Full Lifecycle:**

| Stage | Description |
|-------|-------------|
| New Requests | Bookings awaiting acceptance |
| Accepted | Confirmed, awaiting engineer |
| Engineer Assigned | Inspector selected |
| Travelling | Inspector en route |
| In Progress | Inspection underway |
| Report Writing | Post-inspection documentation |
| Quality Review | QA check |
| Delivered | Sent to customer |
| Completed | Fully closed |

### 3. Calendar System

**Professional Scheduling Views:**
- Day View
- Week View
- Month View
- Engineer Calendar
- Vehicle Calendar
- Location Calendar

**Features:**
- Conflict Detection
- Automatic Travel Planning
- Multi-resource scheduling

### 4. Engineer Management

**Roles:**
- Lead Engineer
- Senior Inspector
- Junior Inspector
- Electrical Specialist
- Body Specialist
- Commercial Vehicle Specialist
- Motorcycle Specialist
- QA Reviewer

**Capabilities:**
- Availability Management
- Certification Tracking
- Skill Matching
- Performance Metrics
- Workload Distribution
- Geographic Coverage

### 5. Report Review Center

**Quality Assurance Workflow:**

```
Draft → Engineer Complete → QA Review → Corrections Requested → Approved → Sent → Archived
```

**QA Controls:**
- Reject reports
- Request specific corrections
- Track correction resolution
- Audit report accuracy
- Monitor inspection consistency

### 6. Business Analytics

**Metrics Dashboard:**

| Category | Metrics |
|----------|---------|
| Overview | Jobs, Revenue, Growth |
| Jobs | Completion Rate, Avg Time, by Type, by County |
| Revenue | Gross, Net, by Type, Trend |
| Engineers | Utilization, Top Performers, Workload |
| Customers | New, Repeat, Satisfaction |
| Quality | Score, Approval Rate, Reviews |

### 7. Finance Center

**Payment Management:**
- Gross Revenue
- KAYAD Commission
- Net Revenue
- Pending Payments
- Settlement History
- Refunds

**Settlement Process:**
1. Booking payment received
2. Commission calculated automatically
3. Settlement generated (weekly/monthly)
4. Provider payout processed
5. Settlement marked as paid

### 8. Customer Management

**Customer Segments:**
- Private Buyers
- Dealers
- Auction Buyers
- Fleet Customers
- Insurance Companies
- Corporate Clients

**Capabilities:**
- Customer History
- Total Inspections
- Total Spent
- Repeat Customer Rate
- Rating History

### 9. Marketing

**Features:**
- Inspection Packages
- Pricing Management
- Special Promotions
- Customer Campaigns
- Business Profile
- Featured Provider Status

### 10. Document Center

**Document Types:**
- Business Certificates
- Operating Licenses
- Insurance Policies
- Engineer Certifications
- Inspection Templates
- Training Documents

**Features:**
- Expiry Tracking
- Verification Status
- Upload & Storage
- Category Organization

### 11. Quality Management

**Quality Controls:**
- Report Accuracy Audits
- Engineer Rating Monitoring
- Inspection Consistency Checks
- Customer Complaint Tracking
- Audit Results
- Certification Renewals
- Training Requirements

## Design System

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Light Navy | #1e3a5f | Primary, Sidebar, Headers |
| Warm Beige | #f5f0e8 | Background, Cards |
| White | #ffffff | Content Areas |
| Emerald | #10b981 | Success, CTAs, Available |
| Muted Terracotta | #c4a484 | Accents, Ratings |
| Soft Blue | #64748b | Secondary Text |

### Status Colors

| Status | Color |
|--------|-------|
| New Request | Blue (#3b82f6) |
| Accepted | Purple (#8b5cf6) |
| Travelling | Amber (#f59e0b) |
| In Progress | Emerald (#10b981) |
| Completed | Gray (#6b7280) |
| Cancelled | Red (#ef4444) |

## API Endpoints

### Dashboard
- `GET /api/business-center/:providerId/dashboard` - Executive dashboard
- `GET /api/business-center/:providerId/attention` - Jobs needing attention

### Bookings
- `GET /api/business-center/:providerId/bookings` - All bookings
- `GET /api/business-center/:providerId/bookings/status` - By status
- `POST /api/business-center/:providerId/bookings/:id/status` - Update status

### Engineers
- `GET /api/business-center/:providerId/engineers` - Team list
- `GET /api/business-center/:providerId/engineers/:id/performance` - Performance
- `GET /api/business-center/:providerId/engineers/available` - Available engineers
- `POST /api/business-center/:providerId/engineers/:id/availability` - Set availability

### Reports
- `GET /api/business-center/:providerId/reports/queue` - Review queue
- `POST /api/business-center/:providerId/reports/:id/submit` - Submit for review
- `POST /api/business-center/:providerId/reports/:id/approve` - Approve
- `POST /api/business-center/:providerId/reports/:id/corrections` - Request corrections
- `POST /api/business-center/:providerId/reports/:id/send` - Send to customer

### Analytics
- `GET /api/business-center/:providerId/analytics` - Full analytics
- `GET /api/business-center/:providerId/analytics/revenue` - Revenue breakdown
- `GET /api/business-center/:providerId/analytics/quality` - QA metrics

### Finance
- `GET /api/business-center/:providerId/finance/overview` - Financial summary
- `GET /api/business-center/:providerId/finance/transactions` - All transactions
- `GET /api/business-center/:providerId/finance/settlements` - Settlement history

### Customers
- `GET /api/business-center/:providerId/customers` - Customer list
- `GET /api/business-center/:providerId/customers/:id` - Customer details
- `GET /api/business-center/:providerId/customers/:id/history` - Inspection history

## Validation Checklist

- ✓ Inspection companies can operate independently
- ✓ Engineers are efficiently scheduled
- ✓ Reports pass through quality assurance before delivery
- ✓ Business analytics help providers grow
- ✓ Payments clearly separate provider earnings and KAYAD commissions
- ✓ Every workflow minimizes manual administration

## Getting Started

### Database Setup

```bash
# Apply the business center schema
psql $DATABASE_URL -f db/businessCenter.schema.sql
```

### Environment Variables

```env
KAYAD_COMMISSION_RATE=15
BUSINESS_CENTER_ENABLED=true
```

### Running the Application

```bash
npm run dev
```

## License

Internal use - KAYAD Platform
