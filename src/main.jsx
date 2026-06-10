// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initPostHog } from './utils/posthog';
import { initSentry } from './utils/sentry';
import { initAnalytics } from './lib/analytics';

initPostHog();
initSentry();
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
