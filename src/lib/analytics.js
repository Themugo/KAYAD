const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

export function initAnalytics() {
  if (initialized || !GA_ID) return;
  initialized = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.gtag("js", new Date());
  window.gtag("config", GA_ID, {
    send_page_view: true,
  });
}

export function trackEvent(action, category, label, value) {
  if (!initialized) return;
  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
}
