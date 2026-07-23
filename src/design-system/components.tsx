/* ============================================================
   KAYAD Design System 2.0 - Component Library
   Premium UI Components using Design Tokens
   ============================================================ */

/* ============================================
   BUTTON SYSTEM
   ============================================ */

/* Base Button */
.btn {
  /* Sizing */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  min-height: var(--button-height-md);
  
  /* Typography */
  font-family: var(--font-sans);
  font-size: var(--text-button);
  font-weight: 600;
  line-height: var(--text-button--line-height);
  letter-spacing: var(--text-button--letter-spacing);
  text-decoration: none;
  white-space: nowrap;
  
  /* Appearance */
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  
  /* Motion */
  transition: all var(--transition-normal);
  user-select: none;
}

/* Button Sizes */
.btn-sm {
  padding: var(--space-2) var(--space-4);
  min-height: var(--button-height-sm);
  font-size: var(--text-caption);
}

.btn-lg {
  padding: var(--space-4) var(--space-8);
  min-height: var(--button-height-lg);
  font-size: var(--text-body);
}

.btn-full {
  width: 100%;
}

/* Primary Button - Brand */
.btn-primary {
  background: var(--color-brand);
  color: var(--color-text-inverse);
  border-color: var(--color-brand);
}

.btn-primary:hover {
  background: var(--color-brand-dark);
  border-color: var(--color-brand-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-brand);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: none;
}

/* Secondary Button - Outline */
.btn-secondary {
  background: transparent;
  color: var(--color-brand);
  border-color: var(--color-brand);
}

.btn-secondary:hover {
  background: var(--color-brand-subtle);
  border-color: var(--color-brand-dark);
  color: var(--color-brand-dark);
}

/* Ghost Button - No border */
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border-color: transparent;
}

.btn-ghost:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

/* Danger Button */
.btn-danger {
  background: var(--color-danger);
  color: var(--color-text-inverse);
  border-color: var(--color-danger);
}

.btn-danger:hover {
  background: var(--color-danger-dark);
  border-color: var(--color-danger-dark);
}

/* Disabled State */
.btn:disabled,
.btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Focus State */
.btn:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

/* ============================================
   INPUT SYSTEM
   ============================================ */

.input {
  /* Sizing */
  display: block;
  width: 100%;
  padding: var(--space-input-y) var(--space-input-x);
  min-height: var(--input-height-md);
  
  /* Typography */
  font-family: var(--font-sans);
  font-size: var(--text-body);
  color: var(--color-text-primary);
  
  /* Appearance */
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-none);
  
  /* Motion */
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

/* Input hover */
.input:hover {
  border-color: var(--color-border-strong);
}

/* Input focus */
.input:focus {
  outline: none;
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px var(--color-brand-subtle);
}

/* Input error */
.input-error {
  border-color: var(--color-danger);
}

.input-error:focus {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px var(--color-danger-subtle);
}

/* Input sizes */
.input-sm {
  padding: var(--space-2) var(--space-3);
  min-height: var(--input-height-sm);
  font-size: var(--text-body-sm);
}

.input-lg {
  padding: var(--space-4) var(--space-4);
  min-height: var(--input-height-lg);
  font-size: var(--text-body-lg);
}

/* ============================================
   CARD SYSTEM
   ============================================ */

.card {
  /* Layout */
  display: block;
  padding: var(--space-card-padding);
  
  /* Appearance */
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  
  /* Motion */
  transition: box-shadow var(--transition-normal), border-color var(--transition-normal), transform var(--transition-normal);
}

/* Card hover */
.card-interactive:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border-strong);
  transform: translateY(-2px);
}

/* Card padding variants */
.card-sm {
  padding: var(--space-4);
}

.card-lg {
  padding: var(--space-8);
}

.card-flush {
  padding: 0;
}

/* Card header */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border-soft);
}

/* Card footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-4);
  margin-top: var(--space-4);
  border-top: 1px solid var(--color-border-soft);
}

/* ============================================
   BADGE SYSTEM
   ============================================ */

.badge {
  /* Sizing */
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  
  /* Typography */
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 600;
  line-height: 1;
  letter-spacing: var(--text-caption--letter-spacing);
  text-transform: uppercase;
  
  /* Appearance */
  border-radius: var(--radius-full);
  white-space: nowrap;
}

/* Badge variants */
.badge-brand {
  background: var(--color-brand-subtle);
  color: var(--color-brand-dark);
  border: 1px solid transparent;
}

.badge-success {
  background: var(--color-success-subtle);
  color: var(--color-success-dark);
  border: 1px solid transparent;
}

.badge-danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger-dark);
  border: 1px solid transparent;
}

.badge-warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning-dark);
  border: 1px solid transparent;
}

.badge-info {
  background: var(--color-info-subtle);
  color: var(--color-info-dark);
  border: 1px solid transparent;
}

.badge-neutral {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border: 1px solid transparent;
}

.badge-outline {
  background: transparent;
  border: 1px solid currentColor;
}

/* Badge with dot */
.badge-dot::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: currentColor;
}

/* ============================================
   TYPOGRAPHY UTILITIES
   ============================================ */

.text-display-xl {
  font-family: var(--font-display);
  font-size: var(--text-display-xl);
  font-weight: var(--text-display-xl--font-weight);
  line-height: var(--text-display-xl--line-height);
  letter-spacing: var(--text-display-xl--letter-spacing);
}

.text-display-l {
  font-family: var(--font-display);
  font-size: var(--text-display-l);
  font-weight: var(--text-display-l--font-weight);
  line-height: var(--text-display-l--line-height);
  letter-spacing: var(--text-display-l--letter-spacing);
}

.text-h1 {
  font-family: var(--font-sans);
  font-size: var(--text-h1);
  font-weight: var(--text-h1--font-weight);
  line-height: var(--text-h1--line-height);
  letter-spacing: var(--text-h1--letter-spacing);
}

.text-h2 {
  font-family: var(--font-sans);
  font-size: var(--text-h2);
  font-weight: var(--text-h2--font-weight);
  line-height: var(--text-h2--line-height);
}

.text-h3 {
  font-family: var(--font-sans);
  font-size: var(--text-h3);
  font-weight: var(--text-h3--font-weight);
  line-height: var(--text-h3--line-height);
}

.text-h4 {
  font-family: var(--font-sans);
  font-size: var(--text-h4);
  font-weight: var(--text-h4--font-weight);
  line-height: var(--text-h4--line-height);
}

.text-body-lg {
  font-family: var(--font-sans);
  font-size: var(--text-body-lg);
  font-weight: var(--text-body-lg--font-weight);
  line-height: var(--text-body-lg--line-height);
}

.text-body {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: var(--text-body--font-weight);
  line-height: var(--text-body--line-height);
}

.text-body-sm {
  font-family: var(--font-sans);
  font-size: var(--text-body-sm);
  font-weight: var(--text-body-sm--font-weight);
  line-height: var(--text-body-sm--line-height);
}

.text-caption {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: var(--text-caption--font-weight);
  line-height: var(--text-caption--line-height);
  letter-spacing: var(--text-caption--letter-spacing);
}

.text-overline {
  font-family: var(--font-sans);
  font-size: var(--text-overline);
  font-weight: var(--text-overline--font-weight);
  line-height: var(--text-overline--line-height);
  letter-spacing: var(--text-overline--letter-spacing);
  text-transform: var(--text-overline--text-transform);
}

/* Text colors */
.text-primary { color: var(--color-text-primary); }
.text-secondary { color: var(--color-text-secondary); }
.text-muted { color: var(--color-text-muted); }
.text-brand { color: var(--color-brand); }
.text-success { color: var(--color-success); }
.text-danger { color: var(--color-danger); }
.text-warning { color: var(--color-warning); }
.text-info { color: var(--color-info); }

/* ============================================
   LAYOUT UTILITIES
   ============================================ */

.container {
  width: 100%;
  max-width: var(--container-wide);
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--space-6);
  padding-right: var(--space-6);
}

.container-content {
  max-width: var(--container-content);
}

.container-sm {
  max-width: var(--container-sm);
}

.container-md {
  max-width: var(--container-md);
}

.container-lg {
  max-width: var(--container-lg);
}

/* ============================================
   ANIMATIONS
   ============================================ */

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Scale */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Pulse dot */
@keyframes pulseDot {
  0%, 100% {
    box-shadow: 0 0 0 0 var(--color-success);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
  }
}

/* Skeleton loading */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Animation classes */
.animate-fade-in {
  animation: fadeIn var(--duration-slow) var(--ease-out) forwards;
}

.animate-fade-in-up {
  animation: fadeInUp var(--duration-slow) var(--ease-out) forwards;
}

.animate-fade-in-down {
  animation: fadeInDown var(--duration-slow) var(--ease-out) forwards;
}

.animate-slide-in-right {
  animation: slideInRight var(--duration-slow) var(--ease-out) forwards;
}

.animate-scale-in {
  animation: scaleIn var(--duration-normal) var(--ease-spring) forwards;
}

.animate-pulse-dot {
  animation: pulseDot 1.8s infinite;
}

/* Stagger delays */
.stagger-1 { animation-delay: var(--duration-fast); }
.stagger-2 { animation-delay: var(--duration-normal); }
.stagger-3 { animation-delay: var(--duration-slow); }
.stagger-4 { animation-delay: var(--duration-slower); }
.stagger-5 { animation-delay: var(--duration-slowest); }

/* ============================================
   LOADING STATES
   ============================================ */

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-brand);
  border-radius: var(--radius-full);
  animation: spin 0.7s linear infinite;
}

.spinner-sm {
  width: 16px;
  height: 16px;
}

.spinner-lg {
  width: 32px;
  height: 32px;
  border-width: 3px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Skeleton */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-secondary) 25%,
    var(--color-bg-tertiary) 50%,
    var(--color-bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

.skeleton-text {
  height: 1em;
  width: 100%;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
}

.skeleton-card {
  min-height: 200px;
}

/* ============================================
   DIVIDERS
   ============================================ */

.divider {
  height: 1px;
  background: var(--color-border-soft);
  margin: var(--space-6) 0;
}

.divider-brand {
  height: 2px;
  width: var(--space-10);
  background: linear-gradient(90deg, var(--color-brand), var(--color-brand-dark));
  border-radius: var(--radius-full);
}

/* ============================================
   EMPTY STATES
   ============================================ */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) var(--space-6);
  text-align: center;
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.empty-state-title {
  font-size: var(--text-h3);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.empty-state-description {
  font-size: var(--text-body);
  color: var(--color-text-muted);
  max-width: 320px;
}

/* ============================================
   FOCUS STATES
   ============================================ */

.focus-ring:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

/* ============================================
   SCROLLBAR STYLING
   ============================================ */

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-brand);
}

/* ============================================
   RESPONSIVE UTILITIES
   ============================================ */

@media (max-width: var(--breakpoint-md)) {
  .container {
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }
  
  .hide-mobile {
    display: none !important;
  }
}

@media (min-width: var(--breakpoint-md)) {
  .hide-desktop {
    display: none !important;
  }
}

/* ============================================
   REDUCED MOTION
   ============================================ */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
