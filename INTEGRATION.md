---
title: INTEGRATION
owner: @backend-lead
team: backend
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [api]
---
# Kayad — Backend Integration

This codebase has all backend routes, controllers, models, and services fully integrated. No additional files need to be added or replaced.

## Backend Structure

```bash
backend/
├── models/           # Mongoose models (User, Car, Dealer, etc.)
├── controllers/      # Route controllers
├── routes/          # Express route definitions
├── middleware/      # Custom middleware (auth, validation)
├── services/        # Business logic services
├── config/          # Configuration files
└── server.js        # Entry point
```

## API Integration Example

```javascript
// Example: Using the car listing API
const response = await fetch('https://api.kayad.space/api/cars', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const cars = await response.json();
```

For setup instructions, see [README.md](README.md) and [DEPLOY.md](DEPLOY.md).
