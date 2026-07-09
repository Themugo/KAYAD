export function formatPrice(amount) {
  if (amount >= 1000000) {
    return `KES ${(amount / 1000000).toFixed(1)}M`;
  }
  return `KES ${amount.toLocaleString()}`;
}

export function formatPriceFull(amount) {
  return `KES ${amount.toLocaleString('en-KE')}`;
}

export function formatCountdown(endTime) {
  const diff = endTime - Date.now();
  if (diff <= 0) return 'ENDED';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function formatMileage(km) {
  return km;
}
