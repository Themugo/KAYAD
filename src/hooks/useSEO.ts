// src/hooks/useSEO.ts
// ============================================================
// Single source of truth for SEO meta tags.
// Replaces usePageMeta, SEOHead, and seoService.
// ============================================================
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface SEOConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
}

const SITE_NAME = "Kayad";
const DEFAULT_DESCRIPTION =
  "Buy, sell and bid on premium cars in Kenya. Live auctions with M-Pesa. Secure escrow payments.";
const SITE_URL = "https://www.kayad.space";
const DEFAULT_IMAGE = `${SITE_URL}/icon-512.png`;

/** Drop-in replacement for the old usePageMeta hook. */
export function usePageMeta(
  title?: string,
  description: string = DEFAULT_DESCRIPTION,
  opts: Omit<SEOConfig, "title" | "description"> = {}
) {
  const loc = useLocation();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Kenya's Premium Car Marketplace`;
  const fullUrl = opts.url || `${SITE_URL}${loc.pathname}${loc.search}`;
  useEffect(() => {
    document.title = fullTitle;
  }, [fullTitle]);
  return { fullTitle, fullUrl };
}

/** JSX component for setting all meta tags in <head>. */
export function SEOHead({ title, description = DEFAULT_DESCRIPTION, image, url, type = "website" }: SEOConfig) {
  const loc = useLocation();
  const finalTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Kenya's Premium Car Marketplace`;
  const finalUrl = url || `${SITE_URL}${loc.pathname}${loc.search}`;
  const finalImage = image || DEFAULT_IMAGE;
  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={finalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="en_KE" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={finalImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={finalImage} />
    </Helmet>
  );
}
