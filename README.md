# Gari Motors — Kenya's Premium Car Marketplace

Live bidding, escrow payments, and M-Pesa integration for the East African automotive market.

## Tech Stack

- **Frontend:** React 18, Vite 5, React Router 6
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling:** Custom CSS with CSS variables (no framework)

## Features

- Browse and search vehicles with advanced filters
- Live auction bidding with real-time updates
- M-Pesa escrow payments for secure transactions
- Dealer dashboard with analytics
- Admin panel for platform management
- Role-based access control (admin, dealer, broker, user)
- Favorites and saved searches
- In-app messaging between buyers and sellers
- Vehicle image galleries with Supabase Storage

## Getting Started

```bash
npm install
npm run dev      # development server on port 3000
npm run build    # production build
npm run lint     # ESLint
```

## Environment

Supabase credentials are pre-configured in `.env`.

## Project Structure

```
src/
  api/           Supabase client and data access layer
  components/    Reusable UI components
  context/       React contexts (Auth, Socket, Toast)
  data/          Static data (car brands, testimonials)
  hooks/         Custom React hooks
  pages/         Route components (public, dealer/, admin/)
  utils/         Helper functions
```
