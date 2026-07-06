// Tailwind v4 processes CSS via the @tailwindcss/vite plugin — no PostCSS
// plugins needed here. This file exists only to shadow the root-level
// postcss.config.js (which references autoprefixer) so Vite stops searching
// upward and doesn't crash trying to load a package that isn't installed
// inside this artifact.
export default {
  plugins: {},
};
