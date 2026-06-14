// src/hooks/useSEO.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// React hook for SEO management
// Updates document title, meta tags, canonical URL, and structured data
// ─────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { generateMetaTags } from "../utils/seoService.js";

export const useSEO = (metadata) => {
  useEffect(() => {
    if (!metadata) return;

    // Update document title
    if (metadata.title) {
      document.title = metadata.title;
    }

    // Update or create meta tags
    const metaTags = generateMetaTags(metadata);

    metaTags.forEach((tag) => {
      let element;

      if (tag.name) {
        element = document.querySelector(`meta[name="${tag.name}"]`);
      } else if (tag.property) {
        element = document.querySelector(`meta[property="${tag.property}"]`);
      } else if (tag.rel) {
        element = document.querySelector(`link[rel="${tag.rel}"]`);
      }

      if (element) {
        // Update existing tag
        if (tag.content) element.setAttribute("content", tag.content);
        if (tag.href) element.setAttribute("href", tag.href);
      } else {
        // Create new tag
        if (tag.name || tag.property) {
          element = document.createElement("meta");
          if (tag.name) element.setAttribute("name", tag.name);
          if (tag.property) element.setAttribute("property", tag.property);
          if (tag.content) element.setAttribute("content", tag.content);
          document.head.appendChild(element);
        } else if (tag.rel) {
          element = document.createElement("link");
          element.setAttribute("rel", tag.rel);
          if (tag.href) element.setAttribute("href", tag.href);
          document.head.appendChild(element);
        }
      }
    });

    // Inject structured data
    if (metadata.structuredData) {
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.textContent = JSON.stringify(metadata.structuredData);
      } else {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.textContent = JSON.stringify(metadata.structuredData);
        document.head.appendChild(script);
      }
    }

    // Cleanup function
    return () => {
      // Optional: cleanup meta tags if needed
    };
  }, [metadata]);
};

export default useSEO;
