// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/glow.css';
import { initSentry } from './utils/sentry';
import { initAnalytics } from './lib/analytics';

// Initialise Sentry before anything else renders
// Only activates if VITE_SENTRY_DSN is set in .env
initSentry();
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
