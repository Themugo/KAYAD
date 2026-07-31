// ============================================================
// KAYAD CONFIGURATION CENTER CONTROLLER
// Master Data Management & Platform Configuration
// ============================================================

import ConfigEntry from "../models/ConfigEntry.js";
import FeatureFlag from "../models/FeatureFlag.js";
import ReferenceData from "../models/ReferenceData.js";
import VehicleMasterData from "../models/VehicleMasterData.js";
import LocationMasterData from "../models/LocationMasterData.js";
import CountryConfig from "../models/CountryConfig.js";
import ConfigAuditLog from "../models/ConfigAuditLog.js";

// ============================================
// GENERIC CONFIG ENTRIES
// ============================================

export async function getConfigEntries(req, res) {
  const { category, section, country, search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (category) filters.category = category;
  if (section) filters.section = section;
  if (country) filters.country = country;
  if (search) {
    filters.search = { key: { ilike: `%${search}%` }, value: { ilike: `%${search}%` } };
  }

  const entries = await ConfigEntry.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "updated_at",
    order: "desc",
  });

  res.json({ success: true, data: entries });
}

export async function getConfigEntry(req, res) {
  const entry = await ConfigEntry.findById(req.params.id);
  if (!entry) return res.status(404).json({ success: false, error: "Config entry not found" });
  res.json({ success: true, data: entry });
}

export async function createConfigEntry(req, res) {
  const { key, value, category, section, country, type, metadata, status } = req.body;

  const entry = await ConfigEntry.create({
    key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    category,
    section,
    country,
    type: type || 'string',
    metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata,
    status: status || 'active',
    createdBy: req.user?.id,
  });

  await logConfigChange(req.user?.id, 'create', entry.id, null, entry.value, req.body.reason);

  res.status(201).json({ success: true, data: entry });
}

export async function updateConfigEntry(req, res) {
  const { key, value, type, metadata, status, reason } = req.body;

  const existing = await ConfigEntry.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Config entry not found" });

  const updateData = {
    updatedBy: req.user?.id,
    updatedAt: new Date().toISOString(),
  };

  if (key !== undefined) updateData.key = key;
  if (value !== undefined) updateData.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (type !== undefined) updateData.type = type;
  if (metadata !== undefined) updateData.metadata = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;
  if (status !== undefined) updateData.status = status;

  const entry = await ConfigEntry.update(req.params.id, updateData);

  await logConfigChange(req.user?.id, 'update', entry.id, existing.value, entry.value, reason);

  res.json({ success: true, data: entry });
}

export async function deleteConfigEntry(req, res) {
  const existing = await ConfigEntry.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Config entry not found" });

  await logConfigChange(req.user?.id, 'delete', existing.id, existing.value, null, req.body.reason);
  await ConfigEntry.delete(req.params.id);

  res.json({ success: true, message: "Config entry deleted" });
}

export async function bulkUpdateConfigEntries(req, res) {
  const { entries } = req.body;
  const results = [];

  for (const entry of entries) {
    const existing = await ConfigEntry.findById(entry.id);
    if (existing) {
      const updateData = {
        value: typeof entry.value === 'object' ? JSON.stringify(entry.value) : String(entry.value),
        updatedBy: req.user?.id,
        updatedAt: new Date().toISOString(),
      };
      const updated = await ConfigEntry.update(entry.id, updateData);
      await logConfigChange(req.user?.id, 'bulk_update', entry.id, existing.value, updated.value, entry.reason);
      results.push({ id: entry.id, status: 'updated' });
    }
  }

  res.json({ success: true, data: results });
}

// ============================================
// FEATURE FLAGS
// ============================================

export async function getFeatureFlags(req, res) {
  const { status, category, country, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;
  if (category) filters.category = category;
  if (country) filters.country = country;

  const flags = await FeatureFlag.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "category",
    order: "asc",
  });

  res.json({ success: true, data: flags });
}

export async function getFeatureFlag(req, res) {
  const flag = await FeatureFlag.findById(req.params.id);
  if (!flag) return res.status(404).json({ success: false, error: "Feature flag not found" });
  res.json({ success: true, data: flag });
}

export async function createFeatureFlag(req, res) {
  const { key, name, description, status, category, country, rolloutPercentage, metadata } = req.body;

  const flag = await FeatureFlag.create({
    key,
    name,
    description,
    status: status || 'inactive',
    category,
    country,
    rolloutPercentage: rolloutPercentage || 0,
    metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata,
    createdBy: req.user?.id,
  });

  await logConfigChange(req.user?.id, 'feature_create', flag.id, null, flag.status, `Created feature flag: ${key}`);

  res.status(201).json({ success: true, data: flag });
}

export async function updateFeatureFlag(req, res) {
  const { name, description, status, rolloutPercentage, metadata, reason } = req.body;

  const existing = await FeatureFlag.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Feature flag not found" });

  const updateData = { updatedBy: req.user?.id, updatedAt: new Date().toISOString() };

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (rolloutPercentage !== undefined) updateData.rolloutPercentage = rolloutPercentage;
  if (metadata !== undefined) updateData.metadata = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;

  const flag = await FeatureFlag.update(req.params.id, updateData);

  await logConfigChange(req.user?.id, 'feature_update', flag.id, existing.status, flag.status, reason || `Updated feature flag: ${existing.key}`);

  res.json({ success: true, data: flag });
}

export async function deleteFeatureFlag(req, res) {
  const existing = await FeatureFlag.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Feature flag not found" });

  await logConfigChange(req.user?.id, 'feature_delete', existing.id, existing.status, null, `Deleted feature flag: ${existing.key}`);
  await FeatureFlag.delete(req.params.id);

  res.json({ success: true, message: "Feature flag deleted" });
}

export async function toggleFeatureFlag(req, res) {
  const existing = await FeatureFlag.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Feature flag not found" });

  const newStatus = existing.status === 'active' ? 'inactive' : 'active';
  const flag = await FeatureFlag.update(req.params.id, { status: newStatus, updatedBy: req.user?.id });

  await logConfigChange(req.user?.id, 'feature_toggle', flag.id, existing.status, newStatus, `Toggled feature flag: ${existing.key}`);

  res.json({ success: true, data: flag });
}

export async function checkFeatureFlag(req, res) {
  const { key } = req.params;
  const { country } = req.query;

  let filters = { key, status: 'active' };
  if (country) filters.country = country;

  const flags = await FeatureFlag.findAll({ filters });

  if (flags.length === 0) {
    // Check for global flag
    const globalFlags = await FeatureFlag.findAll({ filters: { key, status: 'active', country: null } });
    if (globalFlags.length > 0) {
      res.json({ success: true, data: { enabled: true, flag: globalFlags[0], countrySpecific: false } });
    } else {
      res.json({ success: true, data: { enabled: false, flag: null } });
    }
  } else {
    res.json({ success: true, data: { enabled: true, flag: flags[0], countrySpecific: !!country } });
  }
}

// ============================================
// REFERENCE DATA
// ============================================

export async function getReferenceData(req, res) {
  const { type, category, status, search, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (type) filters.type = type;
  if (category) filters.category = category;
  if (status) filters.status = status;

  const data = await ReferenceData.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "displayOrder",
    order: "asc",
  });

  res.json({ success: true, data });
}

export async function getReferenceDataById(req, res) {
  const data = await ReferenceData.findById(req.params.id);
  if (!data) return res.status(404).json({ success: false, error: "Reference data not found" });
  res.json({ success: true, data });
}

export async function createReferenceData(req, res) {
  const { type, value, label, category, metadata, displayOrder, status } = req.body;

  const data = await ReferenceData.create({
    type,
    value,
    label,
    category,
    metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata,
    displayOrder: displayOrder || 0,
    status: status || 'active',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data });
}

export async function updateReferenceData(req, res) {
  const { value, label, category, metadata, displayOrder, status } = req.body;

  const existing = await ReferenceData.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: "Reference data not found" });

  const updateData = { updatedBy: req.user?.id, updatedAt: new Date().toISOString() };

  if (value !== undefined) updateData.value = value;
  if (label !== undefined) updateData.label = label;
  if (category !== undefined) updateData.category = category;
  if (metadata !== undefined) updateData.metadata = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;
  if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
  if (status !== undefined) updateData.status = status;

  const data = await ReferenceData.update(req.params.id, updateData);

  await logConfigChange(req.user?.id, 'reference_update', data.id, existing.value, data.value, `Updated reference: ${existing.type}/${existing.value}`);

  res.json({ success: true, data });
}

export async function deleteReferenceData(req, res) {
  await ReferenceData.delete(req.params.id);
  res.json({ success: true, message: "Reference data deleted" });
}

export async function getReferenceTypes(req, res) {
  const types = [
    { id: 'vehicle_status', name: 'Vehicle Status', category: 'vehicle' },
    { id: 'listing_status', name: 'Listing Status', category: 'marketplace' },
    { id: 'dealer_level', name: 'Dealer Level', category: 'dealer' },
    { id: 'subscription_plan', name: 'Subscription Plan', category: 'subscription' },
    { id: 'auction_category', name: 'Auction Category', category: 'auction' },
    { id: 'auction_status', name: 'Auction Status', category: 'auction' },
    { id: 'inspection_category', name: 'Inspection Category', category: 'inspection' },
    { id: 'inspection_outcome', name: 'Inspection Outcome', category: 'inspection' },
    { id: 'finance_status', name: 'Finance Status', category: 'finance' },
    { id: 'escrow_status', name: 'Escrow Status', category: 'escrow' },
    { id: 'payment_status', name: 'Payment Status', category: 'payment' },
    { id: 'complaint_category', name: 'Complaint Category', category: 'support' },
    { id: 'support_category', name: 'Support Category', category: 'support' },
    { id: 'risk_level', name: 'Risk Level', category: 'security' },
    { id: 'notification_type', name: 'Notification Type', category: 'notification' },
    { id: 'body_type', name: 'Body Type', category: 'vehicle' },
    { id: 'fuel_type', name: 'Fuel Type', category: 'vehicle' },
    { id: 'transmission_type', name: 'Transmission Type', category: 'vehicle' },
    { id: 'drive_type', name: 'Drive Type', category: 'vehicle' },
    { id: 'membership_level', name: 'Membership Level', category: 'dealer' },
  ];

  res.json({ success: true, data: types });
}

// ============================================
// VEHICLE MASTER DATA
// ============================================

export async function getVehicleMasterData(req, res) {
  const { type, make, status, search, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (type) filters.dataType = type;
  if (make) filters.make = make;
  if (status) filters.status = status;

  const data = await VehicleMasterData.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "displayOrder",
    order: "asc",
  });

  res.json({ success: true, data });
}

export async function getVehicleMasterDataById(req, res) {
  const data = await VehicleMasterData.findById(req.params.id);
  if (!data) return res.status(404).json({ success: false, error: "Vehicle master data not found" });
  res.json({ success: true, data });
}

export async function createVehicleMasterData(req, res) {
  const { dataType, make, model, variant, value, label, metadata, displayOrder, status } = req.body;

  const data = await VehicleMasterData.create({
    dataType,
    make,
    model,
    variant,
    value,
    label,
    metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata,
    displayOrder: displayOrder || 0,
    status: status || 'active',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data });
}

export async function updateVehicleMasterData(req, res) {
  const { make, model, variant, value, label, metadata, displayOrder, status } = req.body;

  const updateData = { updatedBy: req.user?.id, updatedAt: new Date().toISOString() };

  if (make !== undefined) updateData.make = make;
  if (model !== undefined) updateData.model = model;
  if (variant !== undefined) updateData.variant = variant;
  if (value !== undefined) updateData.value = value;
  if (label !== undefined) updateData.label = label;
  if (metadata !== undefined) updateData.metadata = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;
  if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
  if (status !== undefined) updateData.status = status;

  const data = await VehicleMasterData.update(req.params.id, updateData);
  res.json({ success: true, data });
}

export async function deleteVehicleMasterData(req, res) {
  await VehicleMasterData.delete(req.params.id);
  res.json({ success: true, message: "Vehicle master data deleted" });
}

export async function getVehicleMakes(req, res) {
  const makes = await VehicleMasterData.findAll({
    filters: { dataType: 'make', status: 'active' },
    orderBy: "value",
    order: "asc",
  });
  res.json({ success: true, data: makes });
}

export async function getVehicleModels(req, res) {
  const { make } = req.query;
  let filters = { dataType: 'model', status: 'active' };
  if (make) filters.make = make;

  const models = await VehicleMasterData.findAll({
    filters,
    orderBy: "value",
    order: "asc",
  });
  res.json({ success: true, data: models });
}

export async function getVehicleTypes(req, res) {
  const types = [
    { id: 'make', name: 'Makes', description: 'Vehicle manufacturers' },
    { id: 'model', name: 'Models', description: 'Vehicle models' },
    { id: 'variant', name: 'Variants', description: 'Vehicle variants' },
    { id: 'body_type', name: 'Body Types', description: 'Vehicle body styles' },
    { id: 'fuel_type', name: 'Fuel Types', description: 'Fuel types' },
    { id: 'transmission_type', name: 'Transmission Types', description: 'Transmission options' },
    { id: 'drive_type', name: 'Drive Types', description: 'Drive configurations' },
    { id: 'engine_type', name: 'Engine Types', description: 'Engine types' },
    { id: 'color', name: 'Colors', description: 'Vehicle colors' },
    { id: 'interior_color', name: 'Interior Colors', description: 'Interior colors' },
    { id: 'trim_level', name: 'Trim Levels', description: 'Trim levels' },
    { id: 'feature', name: 'Features', description: 'Vehicle features' },
    { id: 'accessory', name: 'Accessories', description: 'Accessories' },
    { id: 'safety_feature', name: 'Safety Features', description: 'Safety features' },
    { id: 'inspection_category', name: 'Inspection Categories', description: 'Inspection categories' },
    { id: 'vehicle_condition', name: 'Conditions', description: 'Vehicle conditions' },
    { id: 'vehicle_category', name: 'Categories', description: 'Vehicle categories' },
    { id: 'ev_type', name: 'EV Types', description: 'Electric vehicle types' },
  ];

  res.json({ success: true, data: types });
}

// ============================================
// LOCATION MASTER DATA
// ============================================

export async function getLocationMasterData(req, res) {
  const { type, country, region, status, search, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (type) filters.locationType = type;
  if (country) filters.country = country;
  if (region) filters.region = region;
  if (status) filters.status = status;

  const data = await LocationMasterData.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "displayOrder",
    order: "asc",
  });

  res.json({ success: true, data });
}

export async function createLocationMasterData(req, res) {
  const { locationType, country, region, county, city, value, label, metadata, displayOrder, status } = req.body;

  const data = await LocationMasterData.create({
    locationType,
    country,
    region,
    county,
    city,
    value,
    label,
    metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata,
    displayOrder: displayOrder || 0,
    status: status || 'active',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data });
}

export async function updateLocationMasterData(req, res) {
  const { region, county, city, value, label, metadata, displayOrder, status } = req.body;

  const updateData = { updatedBy: req.user?.id, updatedAt: new Date().toISOString() };

  if (region !== undefined) updateData.region = region;
  if (county !== undefined) updateData.county = county;
  if (city !== undefined) updateData.city = city;
  if (value !== undefined) updateData.value = value;
  if (label !== undefined) updateData.label = label;
  if (metadata !== undefined) updateData.metadata = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;
  if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
  if (status !== undefined) updateData.status = status;

  const data = await LocationMasterData.update(req.params.id, updateData);
  res.json({ success: true, data });
}

export async function deleteLocationMasterData(req, res) {
  await LocationMasterData.delete(req.params.id);
  res.json({ success: true, message: "Location data deleted" });
}

export async function getCountries(req, res) {
  const countries = await LocationMasterData.findAll({
    filters: { locationType: 'country', status: 'active' },
    orderBy: "value",
    order: "asc",
  });
  res.json({ success: true, data: countries });
}

export async function getRegions(req, res) {
  const { country } = req.query;
  let filters = { locationType: 'region', status: 'active' };
  if (country) filters.country = country;

  const regions = await LocationMasterData.findAll({ filters });
  res.json({ success: true, data: regions });
}

export async function getCities(req, res) {
  const { country, region } = req.query;
  let filters = { locationType: 'city', status: 'active' };
  if (country) filters.country = country;
  if (region) filters.region = region;

  const cities = await LocationMasterData.findAll({ filters });
  res.json({ success: true, data: cities });
}

export async function getLocationTypes(req, res) {
  const types = [
    { id: 'country', name: 'Countries', description: 'Countries' },
    { id: 'region', name: 'Regions', description: 'Regions/States/Provinces' },
    { id: 'county', name: 'Counties', description: 'Counties' },
    { id: 'city', name: 'Cities', description: 'Cities/Towns' },
    { id: 'sub_county', name: 'Sub-Counties', description: 'Sub-Counties' },
    { id: 'postal_code', name: 'Postal Codes', description: 'Postal/ZIP codes' },
    { id: 'dealer_zone', name: 'Dealer Zones', description: 'Dealer zones' },
    { id: 'inspection_zone', name: 'Inspection Zones', description: 'Inspection service zones' },
    { id: 'auction_zone', name: 'Auction Zones', description: 'Auction zones' },
    { id: 'delivery_zone', name: 'Delivery Zones', description: 'Delivery zones' },
  ];

  res.json({ success: true, data: types });
}

// ============================================
// COUNTRY CONFIGURATION
// ============================================

export async function getCountryConfigs(req, res) {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (status) filters.status = status;

  const configs = await CountryConfig.findAll({
    filters,
    limit: parseInt(limit),
    offset,
  });

  res.json({ success: true, data: configs });
}

export async function getCountryConfig(req, res) {
  const config = await CountryConfig.findById(req.params.id);
  if (!config) return res.status(404).json({ success: false, error: "Country config not found" });
  res.json({ success: true, data: config });
}

export async function createCountryConfig(req, res) {
  const { country, countryCode, currency, language, taxRate, settings, status } = req.body;

  const config = await CountryConfig.create({
    country,
    countryCode,
    currency,
    language,
    taxRate: taxRate || 0,
    settings: typeof settings === 'object' ? JSON.stringify(settings) : settings,
    status: status || 'active',
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: config });
}

export async function updateCountryConfig(req, res) {
  const { country, currency, language, taxRate, settings, status } = req.body;

  const updateData = { updatedBy: req.user?.id, updatedAt: new Date().toISOString() };

  if (country !== undefined) updateData.country = country;
  if (currency !== undefined) updateData.currency = currency;
  if (language !== undefined) updateData.language = language;
  if (taxRate !== undefined) updateData.taxRate = taxRate;
  if (settings !== undefined) updateData.settings = typeof settings === 'object' ? JSON.stringify(settings) : settings;
  if (status !== undefined) updateData.status = status;

  const config = await CountryConfig.update(req.params.id, updateData);
  res.json({ success: true, data: config });
}

export async function deleteCountryConfig(req, res) {
  await CountryConfig.delete(req.params.id);
  res.json({ success: true, message: "Country config deleted" });
}

// ============================================
// CONFIG AUDIT LOG
// ============================================

export async function getConfigAuditLogs(req, res) {
  const { entityId, entityType, userId, action, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let filters = {};
  if (entityId) filters.entityId = entityId;
  if (entityType) filters.entityType = entityType;
  if (userId) filters.userId = userId;
  if (action) filters.action = action;

  const logs = await ConfigAuditLog.findAll({
    filters,
    limit: parseInt(limit),
    offset,
    orderBy: "createdAt",
    order: "desc",
  });

  res.json({ success: true, data: logs });
}

export async function rollbackConfig(req, res) {
  const { logId } = req.params;

  const log = await ConfigAuditLog.findById(logId);
  if (!log) return res.status(404).json({ success: false, error: "Audit log not found" });

  if (log.action === 'delete' || log.action === 'create') {
    return res.status(400).json({ success: false, error: "Cannot rollback create/delete actions" });
  }

  // Restore previous value
  if (log.entityType === 'ConfigEntry') {
    await ConfigEntry.update(log.entityId, { value: log.previousValue, updatedBy: req.user?.id });
  } else if (log.entityType === 'FeatureFlag') {
    await FeatureFlag.update(log.entityId, { status: log.previousValue, updatedBy: req.user?.id });
  }

  res.json({ success: true, message: "Config rolled back successfully" });
}

// ============================================
// DASHBOARD & EXPORT
// ============================================

export async function getConfigStats(req, res) {
  const [configEntries, featureFlags, referenceData, vehicleData, locationData, countries] = await Promise.all([
    ConfigEntry.findAll({ limit: 1000 }),
    FeatureFlag.findAll({ limit: 1000 }),
    ReferenceData.findAll({ limit: 1000 }),
    VehicleMasterData.findAll({ limit: 1000 }),
    LocationMasterData.findAll({ limit: 1000 }),
    CountryConfig.findAll({ limit: 100 }),
  ]);

  const featureStats = {
    total: featureFlags.length,
    active: featureFlags.filter(f => f.status === 'active').length,
    inactive: featureFlags.filter(f => f.status === 'inactive').length,
  };

  const referenceStats = {
    total: referenceData.length,
    byType: referenceData.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {}),
  };

  const vehicleStats = {
    total: vehicleData.length,
    makes: vehicleData.filter(v => v.dataType === 'make').length,
    models: vehicleData.filter(v => v.dataType === 'model').length,
    bodyTypes: vehicleData.filter(v => v.dataType === 'body_type').length,
  };

  const locationStats = {
    total: locationData.length,
    countries: locationData.filter(l => l.locationType === 'country').length,
    regions: locationData.filter(l => l.locationType === 'region').length,
    cities: locationData.filter(l => l.locationType === 'city').length,
  };

  res.json({
    success: true,
    data: {
      configEntries: { total: configEntries.length },
      featureFlags: featureStats,
      referenceData: referenceStats,
      vehicleMasterData: vehicleStats,
      locationMasterData: locationStats,
      countries: { total: countries.length },
    },
  });
}

export async function exportConfig(req, res) {
  const { format = 'json', category } = req.query;

  let data;
  if (category === 'vehicle') {
    data = await VehicleMasterData.findAll({ limit: 10000 });
  } else if (category === 'location') {
    data = await LocationMasterData.findAll({ limit: 10000 });
  } else if (category === 'reference') {
    data = await ReferenceData.findAll({ limit: 10000 });
  } else if (category === 'feature') {
    data = await FeatureFlag.findAll({ limit: 10000 });
  } else {
    data = await ConfigEntry.findAll({ limit: 10000 });
  }

  if (format === 'csv') {
    // Convert to CSV
    const headers = Object.keys(data[0] || {});
    const csv = [headers.join(',')];
    data.forEach(row => {
      csv.push(headers.map(h => JSON.stringify(row[h] || '')).join(','));
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=config-${category || 'all'}-${Date.now()}.csv`);
    res.send(csv.join('\n'));
  } else {
    res.json({ success: true, data });
  }
}

export async function importConfig(req, res) {
  const { format = 'json', category, data: importData, overwrite = false } = req.body;

  let results = { created: 0, updated: 0, errors: [] };

  for (const item of importData) {
    try {
      if (category === 'vehicle') {
        const existing = await VehicleMasterData.findAll({ filters: { dataType: item.dataType, value: item.value } });
        if (existing.length > 0) {
          if (overwrite) {
            await VehicleMasterData.update(existing[0].id, item);
            results.updated++;
          }
        } else {
          await VehicleMasterData.create({ ...item, createdBy: req.user?.id });
          results.created++;
        }
      } else if (category === 'reference') {
        const existing = await ReferenceData.findAll({ filters: { type: item.type, value: item.value } });
        if (existing.length > 0) {
          if (overwrite) {
            await ReferenceData.update(existing[0].id, item);
            results.updated++;
          }
        } else {
          await ReferenceData.create({ ...item, createdBy: req.user?.id });
          results.created++;
        }
      } else if (category === 'location') {
        const existing = await LocationMasterData.findAll({ filters: { locationType: item.locationType, value: item.value, country: item.country } });
        if (existing.length > 0) {
          if (overwrite) {
            await LocationMasterData.update(existing[0].id, item);
            results.updated++;
          }
        } else {
          await LocationMasterData.create({ ...item, createdBy: req.user?.id });
          results.created++;
        }
      }
    } catch (error) {
      results.errors.push({ item, error: error.message });
    }
  }

  res.json({ success: true, data: results });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function logConfigChange(userId, action, entityId, previousValue, newValue, reason) {
  return await ConfigAuditLog.create({
    userId,
    action,
    entityId,
    entityType: getEntityType(entityId),
    previousValue: typeof previousValue === 'object' ? JSON.stringify(previousValue) : previousValue,
    newValue: typeof newValue === 'object' ? JSON.stringify(newValue) : newValue,
    reason,
    ipAddress: null,
    userAgent: null,
  });
}

function getEntityType(entityId) {
  // Simplified - in real implementation, would check actual entity
  return 'ConfigEntry';
}
