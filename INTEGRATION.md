# Integration Guide — Gari Motors Marketplace

## Supabase Integration

### Database
- PostgreSQL with normalized schema
- Row Level Security (RLS) on every table
- Foreign keys with cascading rules
- Indexes on frequently queried columns
- Soft deletes via `deleted_at` columns

### Authentication
- Supabase Auth with email/password
- Role-based access control via `profiles.role` column
- Roles: `superadmin`, `admin`, `dealer`, `broker`, `user`
- JWT tokens managed by Supabase client SDK
- Session refresh handled automatically

### Storage
- Vehicle images: `vehicles` bucket
- User avatars: `avatars` bucket
- Documents: `documents` bucket
- Signed URLs for secure access

### Realtime
- Auction bids: realtime subscriptions on `bids` table
- Notifications: realtime subscriptions on `notifications` table

## Frontend Data Flow

```
React Component
  → src/api/supabaseClient.js (singleton Supabase client)
  → Supabase PostgreSQL (with RLS policies)
  → Data returned to component
```

No intermediate API server is needed. The Supabase client talks directly to PostgreSQL with RLS enforcing security.
