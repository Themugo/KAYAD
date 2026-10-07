export const MIN_DURATION_MS = 24 * 60 * 60 * 1000;

const num = (v, fallback = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const normalizeAuctionSetup = (input = {}) => ({
  currency: 'KES',
  startingBid: num(input.startingBid, 0),
  bidIncrement: num(input.bidIncrement, 0),
  reservePrice: input.reservePrice === null || input.reservePrice === '' ? null : num(input.reservePrice, null),
  reserveMode: input.reserveMode || 'none',
  antiSnipe: input.antiSnipe !== false,
  antiSnipeWindowSeconds: num(input.antiSnipeWindowSeconds, 120),
  antiSnipeExtensionSeconds: num(input.antiSnipeExtensionSeconds, 120),
  maxExtensions: num(input.maxExtensions, 3),
  registrationDeadline: input.registrationDeadline || null,
  startsAt: input.startsAt || null,
  endsAt: input.endsAt || null,
  timezone: input.timezone || 'Africa/Nairobi',
  settlement: {
    mode: input.settlement?.mode || (input.escrowEnabled ? 'escrow' : 'direct'),
    paymentMethod: input.settlement?.paymentMethod || 'mpesa',
    escrow: { enabled: Boolean(input.settlement?.escrow?.enabled ?? input.escrowEnabled ?? false) },
  },
  commitment: {
    required: Boolean(input.commitment?.required ?? input.commitmentRequired),
    type: input.commitment?.type || input.commitmentType || 'fixed',
    amount: num(input.commitment?.amount ?? input.commitmentAmount, 0),
    percent: num(input.commitment?.percent ?? input.commitmentPercent, 0),
    refundable: input.commitment?.refundable !== false,
    recipient: input.commitment?.recipient || 'organizer',
    recipientAccount: input.commitment?.recipientAccount || '',
  },
  bidderRequirements: input.bidderRequirements || { phoneVerified: true, emailVerified: true, identityVerified: false, organizationVerified: false },
  paymentDeadlineHours: num(input.paymentDeadlineHours, 24),
  winnerFulfilment: input.winnerFulfilment || { collectionLocation: '', collectionInstructions: '', transferDocuments: [], transferOwner: 'organizer' },
  defaultRules: input.defaultRules || { gracePeriodHours: 24, depositConsequence: 'forfeit_if_permitted', reawardEnabled: true },
  cancellationRules: input.cancellationRules || { organizerCancellationAllowed: false, suspensionAllowed: true, refundPolicy: 'according_to_terms' },
  termsVersion: input.termsVersion || 'auction-terms-v1',
  termsAccepted: Boolean(input.termsAccepted),
  publicPreview: input.publicPreview || { title: '', summary: '', highlights: [] },
});

export function validateConfig(config) {
  const errors = [];
  if (config.currency !== 'KES') errors.push('Auction currency must be KES');
  if (!(config.startingBid >= 1000)) errors.push('Starting bid must be at least KES 1,000');
  if (!(config.bidIncrement > 0)) errors.push('Bid increment must be greater than zero');
  if (!['none', 'soft', 'hard'].includes(config.reserveMode)) errors.push('Invalid reserve mode');
  if (config.reservePrice !== null && config.reservePrice < config.startingBid) errors.push('Reserve price must be >= starting bid');
  if (config.startsAt && config.endsAt) {
    const start = Date.parse(config.startsAt), end = Date.parse(config.endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) errors.push('Auction end must be after auction start');
    if (Number.isFinite(end) && Number.isFinite(start) && end - start < MIN_DURATION_MS) errors.push('Auction duration must be at least 24 hours');
    if (config.registrationDeadline && Date.parse(config.registrationDeadline) > start) errors.push('Registration deadline must be on or before auction start');
  } else errors.push('Auction start and end time are required');
  if (config.antiSnipe) {
    if (!(config.antiSnipeWindowSeconds >= 10 && config.antiSnipeWindowSeconds <= 3600)) errors.push('Anti-snipe window must be 10–3600 seconds');
    if (!(config.antiSnipeExtensionSeconds >= 10 && config.antiSnipeExtensionSeconds <= 3600)) errors.push('Anti-snipe extension must be 10–3600 seconds');
    if (!(config.maxExtensions >= 0 && config.maxExtensions <= 10)) errors.push('Maximum extensions must be 0–10');
  }
  // Payment rails are intentionally constrained to the rails that are
  // actually implemented today. Direct winner settlement is M-Pesa;
  // escrow custody is bank-transfer based. Do not publish a configuration
  // that the winner UI cannot actually execute.
  if (config.settlement?.mode === 'direct' && config.settlement?.paymentMethod !== 'mpesa') {
    errors.push('Direct auction settlement currently supports M-Pesa only.');
  }
  if (config.settlement?.mode === 'escrow' && config.settlement?.paymentMethod !== 'bank') {
    errors.push('Escrow auction settlement currently uses bank/custody transfer only.');
  }

  if (config.commitment.required) {
    if (config.commitment.type === 'fixed' && !(config.commitment.amount > 0)) errors.push('Commitment amount is required');
    if (config.commitment.type === 'percent' && !(config.commitment.percent > 0 && config.commitment.percent <= 100)) errors.push('Commitment percentage must be between 0 and 100');
    if (!config.commitment.recipient) errors.push('Commitment recipient is required');
    if (!String(config.commitment.recipientAccount || '').trim()) errors.push('Commitment payment destination is required');
  }
  if (!(config.paymentDeadlineHours > 0 && config.paymentDeadlineHours <= 168)) errors.push('Winner payment deadline must be between 1 and 168 hours');
  if (!config.termsVersion || !config.termsAccepted) errors.push('Auction terms version must be accepted');
  return errors;
}

export function vehicleReadiness(car, config) {
  const checks = [
    ['vehicle_identity', Boolean(car.vin || car.chassis_number), 'VIN/chassis number is missing'],
    ['registration', Boolean(car.registration_number), 'Vehicle registration number is missing'],
    ['ownership', Boolean(car.logbook_verified || car.ntsa_verified), 'Ownership/registration authority evidence is not verified'],
    ['inspection', String(car.inspection_status || '').toLowerCase() === 'passed', 'Vehicle inspection is not passed'],
    ['media', Array.isArray(car.images) && car.images.length >= 6, 'At least 6 vehicle photos are required'],
    ['description', Boolean(car.title && car.description), 'Vehicle title/description is incomplete'],
    ['location', Boolean(car.location_city), 'Vehicle location is missing'],
    ['starting_bid', config.startingBid >= 1000, 'Starting bid is not valid'],
    ['increment', config.bidIncrement > 0, 'Bid increment is not configured'],
    ['fulfilment', Boolean(config.winnerFulfilment?.collectionLocation), 'Winner collection location is missing'],
  ];
  const blockers = checks.filter(([, ok]) => !ok).map(([, , message]) => message);
  return { publishable: blockers.length === 0, blockers, checks: checks.map(([id, ok, message]) => ({ id, ok, message })) };
}
