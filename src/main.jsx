// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ─────────────────────────────────────────────────────────────
// Performance Optimizations
// ─────────────────────────────────────────────────────────────

// 1. Preconnect to critical third-party origins
const PRECONNECT_ORIGINS = [
  'https://images.unsplash.com',
  'https://res.cloudinary.com',
  'https://supabase.co',
];

// 2. Preload critical fonts and resources
const PRELOAD_RESOURCES = [
  // Add any critical CSS/JS that needs immediate loading
];

// 3. Initialize performance monitoring in development
if (import.meta.env.DEV) {
  import('./utils/performance').then(({ perfMonitor }) => {
    perfMonitor.logWebVitals();
  });
}

// 4. Register service worker for offline caching (if supported)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed - app will work without it
    });
  });
}

// ─────────────────────────────────────────────────────────────
// React 18 Concurrent Features
// ─────────────────────────────────────────────────────────────

const rootElement = document.getElementById('root');

// Use createRoot with concurrent features
const root = ReactDOM.createRoot(rootElement);

// startTransition for non-urgent updates
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ─────────────────────────────────────────────────────────────
// Performance Observer Setup
// ─────────────────────────────────────────────────────────────

if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  // Measure Core Web Vitals
  try {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        console.debug('[KAYAD Performance] LCP:', lastEntry.startTime);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.processingStart) {
          console.debug('[KAYAD Performance] FID:', entry.processingStart - entry.startTime);
        }
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      console.debug('[KAYAD Performance] CLS:', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    // Performance Observer not supported
  }
}
