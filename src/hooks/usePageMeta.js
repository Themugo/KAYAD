import { useEffect } from 'react';

// Sets document title + the full Open Graph / Twitter meta set so a shared
// link (WhatsApp, Facebook, X) can preview the specific page — e.g. a car
// listing's own title, blurb and photo rather than the generic site card.
//
// NOTE: link crawlers that don't execute JS (WhatsApp/Facebook bots) won't
// see these client-set tags. For those, a crawler-facing prerender of
// /cars/:id is needed once the backend is live (see DEPLOY.md → "Social
// previews"). This hook still ensures correct previews for JS-rendering
// clients and correct in-app/browser titles everywhere.
export default function usePageMeta(title, description, opts = {}) {
  const { image, url, type = 'website' } = opts;

  useEffect(() => {
    const fullTitle = title ? `${title} | Kayad` : "Kayad — Kenya's Premium Car Marketplace";
    const prevTitle = document.title;
    document.title = fullTitle;

    const setMeta = (selector, attr, value) => {
      if (!value) return null;
      let el = document.head.querySelector(selector);
      const created = !el;
      if (!el) {
        el = document.createElement('meta');
        const [, name] = selector.match(/\[(?:name|property)="(.+)"\]/) || [];
        if (selector.includes('property')) el.setAttribute('property', name);
        else el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      const prev = el.getAttribute(attr);
      el.setAttribute(attr, value);
      return { el, prev, created };
    };

    const tracked = [
      setMeta('meta[name="description"]', 'content', description),
      setMeta('meta[property="og:title"]', 'content', fullTitle),
      setMeta('meta[property="og:description"]', 'content', description),
      setMeta('meta[property="og:type"]', 'content', type),
      setMeta('meta[property="og:image"]', 'content', image),
      setMeta('meta[property="og:url"]', 'content', url || (typeof window !== 'undefined' ? window.location.href : undefined)),
      setMeta('meta[name="twitter:title"]', 'content', fullTitle),
      setMeta('meta[name="twitter:description"]', 'content', description),
      setMeta('meta[name="twitter:image"]', 'content', image),
    ].filter(Boolean);

    return () => {
      document.title = prevTitle;
      tracked.forEach(({ el, prev, created }) => {
        if (created) el.remove();
        else if (prev != null) el.setAttribute('content', prev);
      });
    };
  }, [title, description, image, url, type]);
}
