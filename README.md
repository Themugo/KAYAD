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

```text
src/
├── api/           Supabase client and data access layer
├── components/    Reusable UI components
├── context/       React contexts (Auth, Socket, Toast)
├── data/          Static data (car brands, testimonials)
├── hooks/         Custom React hooks
├── pages/         Route components (public, dealer/, admin/)
└── utils/         Helper functions
```

## Backend

The backend is a separate Node.js service located in the [`backend/`](backend/) directory. It handles:

- REST API endpoints (see [`API_GUIDE.md`](API_GUIDE.md))
- WebSocket connections for real-time updates
- Background job processing with Bull queues

See the [Backend README](backend/README.md) for backend-specific setup instructions.

## Documentation

- [API Guide](API_GUIDE.md) — REST API documentation
- [Contributing Guide](CONTRIBUTING.md) — How to contribute to this project
- [Deployment Guide](DEPLOY.md) — Deployment instructions
- [Monitoring & Observability](MONITORING.md) — Metrics and alerting setup

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting pull requests.
