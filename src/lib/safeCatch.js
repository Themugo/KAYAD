export const safeCatch = (label) => (err) => {
  if (err) console.error(`[${label}]`, err?.message || err);
  return null;
};
