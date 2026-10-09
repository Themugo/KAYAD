// ============================================================
// KAYAD AUTOMOTIVE SERVICE TAXONOMY - single source of truth
//
// Served to the browser by GET /api/inspection/service-taxonomy and used by
// provider capability declaration, admin review and provider matching. No other
// list of specialties may be maintained in registration, admin, search or UI code.
//
// `highRisk` categories can only be PRESENTED/MATCHED as capable when a KAYAD
// administrator has verified the capability against evidence.
// `requestable` is false for everything: KAYAD currently takes no repair or
// roadside service requests (the supporting RPCs do not exist). Discovery only.
// `bookable` marks the one service with a working booking + payment + report path.
// ============================================================

export const POWERTRAINS = Object.freeze([
  { code: 'petrol', label: 'Petrol' },
  { code: 'diesel', label: 'Diesel' },
  { code: 'hybrid', label: 'Hybrid' },
  { code: 'plug_in_hybrid', label: 'Plug-in hybrid' },
  { code: 'electric', label: 'Electric' },
]);

export const SERVICE_CATEGORIES = Object.freeze([
  {
    code: 'pre_purchase_inspection', label: 'Pre-purchase inspection', line: 'buying',
    description: 'An independent check of a vehicle before you buy it.',
    highRisk: false, bookable: true, requestable: false, usesLocation: true,
    subcategories: [
      { code: 'full_inspection', label: 'Full vehicle inspection' },
      { code: 'mechanical_check', label: 'Mechanical check' },
      { code: 'bodywork_check', label: 'Bodywork and accident check' },
      { code: 'hybrid_ev_check', label: 'Hybrid / electric battery check', requiresCategory: 'hybrid_ev' },
    ],
  },
  {
    code: 'diagnostics', label: 'Diagnostics and fault assessment', line: 'owning',
    description: 'Find out what is wrong when you do not know the cause.',
    highRisk: false, bookable: false, requestable: false, usesLocation: true,
    subcategories: [
      { code: 'general_fault_assessment', label: 'General fault assessment' },
      { code: 'warning_lights', label: 'Warning lights / scan' },
      { code: 'noise_vibration', label: 'Noise or vibration' },
    ],
  },
  {
    code: 'engine_mechanical', label: 'Engine and mechanical systems', line: 'owning',
    description: 'Engine, fuel, exhaust and general mechanical repair.',
    highRisk: false, bookable: false, requestable: false, usesLocation: true,
    subcategories: [
      { code: 'engine_repair', label: 'Engine repair' },
      { code: 'servicing', label: 'Servicing and maintenance' },
      { code: 'fuel_exhaust', label: 'Fuel and exhaust' },
    ],
  },
  {
    code: 'transmission_drivetrain', label: 'Transmission and drivetrain', line: 'owning',
    description: 'Gearbox, clutch, differentials and driveshafts.',
    highRisk: false, bookable: false, requestable: false, usesLocation: true,
    subcategories: [
      { code: 'automatic_transmission', label: 'Automatic transmission' },
      { code: 'manual_clutch', label: 'Manual gearbox and clutch' },
      { code: 'four_wheel_drive', label: '4x4 / differentials' },
    ],
  },
  {
    code: 'electrical_electronics', label: 'Electrical systems and electronics', line: 'owning',
    description: 'Battery, starter, alternator, wiring and electronic modules.',
    highRisk: false, bookable: false, requestable: false, usesLocation: true,
    subcategories: [
      { code: 'battery_charging', label: 'Battery and charging' },
      { code: 'starting', label: 'Starting system' },
      { code: 'electronics_modules', label: 'Electronic modules and sensors' },
    ],
  },
  {
    code: 'hybrid_ev', label: 'Hybrid and electric vehicles', line: 'owning',
    description: 'High-voltage systems. Only shown as capable once KAYAD has verified the qualification.',
    highRisk: true, bookable: false, requestable: false, usesLocation: true,
    appliesToPowertrains: ['hybrid', 'plug_in_hybrid', 'electric'],
    subcategories: [
      { code: 'hv_battery', label: 'High-voltage battery' },
      { code: 'hybrid_system', label: 'Hybrid drive system' },
      { code: 'ev_drivetrain', label: 'Electric drivetrain and charging' },
    ],
  },
  {
    code: 'body_collision_paint', label: 'Bodywork, collision repair and painting', line: 'owning',
    description: 'Dents, collision damage, panel and paint work.',
    highRisk: false, bookable: false, requestable: false, usesLocation: true,
    subcategories: [
      { code: 'panel_beating', label: 'Panel beating' },
      { code: 'painting', label: 'Painting and finishing' },
      { code: 'glass', label: 'Glass and trim' },
    ],
  },
  {
    code: 'brakes_steering_suspension', label: 'Brakes, steering and suspension', line: 'owning',
    description: 'Stopping, steering and ride.',
    highRisk: false, bookable: false, requestable: false, usesLocation: true,
    subcategories: [
      { code: 'brakes', label: 'Brakes' },
      { code: 'steering', label: 'Steering' },
      { code: 'suspension', label: 'Suspension' },
    ],
  },
  {
    code: 'cooling_hvac', label: 'Cooling, heating and air conditioning', line: 'owning',
    description: 'Radiator, overheating and cabin climate control.',
    highRisk: false, bookable: false, requestable: false, usesLocation: true,
    subcategories: [
      { code: 'engine_cooling', label: 'Engine cooling' },
      { code: 'air_conditioning', label: 'Air conditioning' },
    ],
  },
  {
    code: 'tyres_wheels_alignment', label: 'Tyres, wheels and alignment', line: 'owning',
    description: 'Tyre fitting, balancing and wheel alignment.',
    highRisk: false, bookable: false, requestable: false, usesLocation: true,
    subcategories: [
      { code: 'tyre_fitting', label: 'Tyre fitting and balancing' },
      { code: 'alignment', label: 'Wheel alignment' },
    ],
  },
  {
    code: 'roadside_recovery', label: 'Roadside assistance and recovery', line: 'roadside',
    description: 'Providers who say they travel to a broken-down vehicle. KAYAD does not dispatch them.',
    highRisk: false, bookable: false, requestable: false, usesLocation: true, travelsToCustomer: true,
    subcategories: [
      { code: 'towing_recovery', label: 'Towing and recovery' },
      { code: 'roadside_mechanical', label: 'Roadside mechanical help' },
      { code: 'battery_tyre_fuel', label: 'Battery, tyre or fuel help' },
    ],
  },
  {
    code: 'other_specialty', label: 'Other automotive specialty', line: 'owning',
    description: 'A specialty not covered above.',
    highRisk: false, bookable: false, requestable: false, usesLocation: true,
    subcategories: [],
  },
]);

// Plain-language symptoms help customers who do not know the cause. They only SUGGEST
// where to look; they are never presented as a diagnosis.
export const SYMPTOMS = Object.freeze([
  { code: 'wont_start', label: "It won't start", suggests: ['electrical_electronics', 'engine_mechanical', 'diagnostics'] },
  { code: 'warning_light', label: 'A warning light is on', suggests: ['diagnostics', 'electrical_electronics'] },
  { code: 'brake_problem', label: 'Brakes feel wrong or noisy', suggests: ['brakes_steering_suspension', 'diagnostics'] },
  { code: 'overheating', label: 'It overheats or the AC is warm', suggests: ['cooling_hvac', 'engine_mechanical'] },
  { code: 'noise_or_vibration', label: 'Strange noise or vibration', suggests: ['diagnostics', 'brakes_steering_suspension', 'transmission_drivetrain'] },
  { code: 'gear_problem', label: 'Gears slip or will not shift', suggests: ['transmission_drivetrain', 'diagnostics'] },
  { code: 'hybrid_warning', label: 'Hybrid / EV system warning', suggests: ['hybrid_ev', 'diagnostics'] },
  { code: 'accident_damage', label: 'Accident or body damage', suggests: ['body_collision_paint'] },
  { code: 'tyre_problem', label: 'Tyre or wheel problem', suggests: ['tyres_wheels_alignment'] },
  { code: 'broken_down', label: "I'm broken down", suggests: ['roadside_recovery'] },
  { code: 'not_sure', label: "I'm not sure", suggests: ['diagnostics'] },
]);

const byCode = new Map(SERVICE_CATEGORIES.map((c) => [c.code, c]));

export const getCategory = (code) => byCode.get(String(code || '')) || null;
export const isValidCategory = (code) => byCode.has(String(code || ''));
export const isHighRiskCategory = (code) => Boolean(getCategory(code)?.highRisk);
export const isValidSubcategory = (categoryCode, subCode) => {
  if (subCode === undefined || subCode === null || subCode === '') return true;
  return Boolean(getCategory(categoryCode)?.subcategories.some((s) => s.code === subCode));
};
export const isValidPowertrain = (code) => POWERTRAINS.some((p) => p.code === code);

export const getTaxonomy = () => ({
  categories: SERVICE_CATEGORIES,
  symptoms: SYMPTOMS,
  powertrains: POWERTRAINS,
});
