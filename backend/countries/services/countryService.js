// ============================================================
// KAYAD MULTI-COUNTRY FRAMEWORK
// COUNTRY CONFIGURATION SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';

/**
 * Country Configuration Service
 * East African automotive infrastructure
 */
class CountryService {

  // ============================================================
  // COUNTRY MANAGEMENT
  // ============================================================

  /**
   * Get all countries
   */
  async getCountries(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.isPrimary !== undefined) query.is_primary = filters.isPrimary;

    return db.find('countries', query, {
      sort: { country_name: 1 },
    });
  }

  /**
   * Get country by code
   */
  async getCountryByCode(countryCode) {
    const country = await db.findOne('countries', { country_code: countryCode });
    if (!country) {
      throw new AppError('Country not found', 404);
    }

    const config = await this.getCountryConfiguration(countryCode);
    const paymentProviders = await this.getPaymentProviders(countryCode);
    const transportAuthorities = await this.getTransportAuthorities(countryCode);
    const taxConfig = await this.getTaxConfiguration(countryCode);

    return {
      ...country,
      configuration: config,
      paymentProviders,
      transportAuthorities,
      taxConfiguration: taxConfig,
    };
  }

  /**
   * Get country configuration
   */
  async getCountryConfiguration(countryCode) {
    return db.findOne('country_configurations', { country_code: countryCode });
  }

  // ============================================================
  // PAYMENT PROVIDERS
  // ============================================================

  /**
   * Get payment providers for country
   */
  async getPaymentProviders(countryCode, type = null) {
    const query = { country_code: countryCode, is_enabled: true };
    if (type) query.provider_type = type;

    return db.find('country_payment_providers', query, {
      sort: { is_primary: -1, provider_name: 1 },
    });
  }

  /**
   * Get default payment provider
   */
  async getDefaultPaymentProvider(countryCode, type) {
    const provider = await db.findOne('country_payment_providers', {
      country_code: countryCode,
      provider_type: type,
      is_default: true,
      is_enabled: true,
    });

    if (!provider) {
      // Return first enabled provider of type
      return db.findOne('country_payment_providers', {
        country_code: countryCode,
        provider_type: type,
        is_enabled: true,
      });
    }

    return provider;
  }

  // ============================================================
  // TRANSPORT AUTHORITIES
  // ============================================================

  /**
   * Get transport authorities for country
   */
  async getTransportAuthorities(countryCode, type = null) {
    const query = { country_code: countryCode, status: 'active' };
    if (type) query.authority_type = type;

    return db.find('country_transport_authorities', query);
  }

  /**
   * Verify vehicle registration
   */
  async verifyVehicleRegistration(countryCode, registrationNumber) {
    const authority = await db.findOne('country_transport_authorities', {
      country_code: countryCode,
      authority_type: 'registration',
      status: 'active',
    });

    if (!authority || !authority.supports_online_verification) {
      return {
        verified: false,
        message: 'Online verification not available',
      };
    }

    // In production, call the authority's API
    return {
      verified: true,
      registrationNumber,
      authority: authority.authority_name,
      timestamp: new Date(),
    };
  }

  // ============================================================
  // TAX CALCULATIONS
  // ============================================================

  /**
   * Calculate taxes for a transaction
   */
  async calculateTaxes(countryCode, transactionData) {
    const { type, amount, vehiclePrice, includesServices } = transactionData;
    
    const taxes = await this.getTaxConfiguration(countryCode);
    
    const calculatedTaxes = [];
    let totalTax = 0;

    for (const tax of taxes) {
      let applicable = false;

      // Check applicability
      if (type === 'vehicle_sale' && tax.applies_to_vehicles) applicable = true;
      if (type === 'service' && tax.applies_to_services) applicable = true;
      if (type === 'finance' && tax.applies_to_finance) applicable = true;
      if (type === 'auction' && tax.applies_to_auctions) applicable = true;

      if (!applicable) continue;

      // Check amount thresholds
      if (tax.min_amount && amount < tax.min_amount) continue;
      if (tax.max_amount && amount > tax.max_amount) continue;

      let taxAmount = 0;
      if (tax.rate_percentage > 0) {
        taxAmount = (amount * tax.rate_percentage) / 100;
      }
      if (tax.rate_fixed > 0) {
        taxAmount += tax.rate_fixed;
      }

      totalTax += taxAmount;
      calculatedTaxes.push({
        taxCode: tax.tax_code,
        taxName: tax.tax_name,
        rate: tax.rate_percentage,
        amount: Math.round(taxAmount * 100) / 100,
      });
    }

    return {
      subtotal: amount,
      taxes: calculatedTaxes,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal: Math.round((amount + totalTax) * 100) / 100,
    };
  }

  /**
   * Get tax configuration for country
   */
  async getTaxConfiguration(countryCode) {
    return db.find('country_tax_configurations', {
      country_code: countryCode,
      is_active: true,
    });
  }

  // ============================================================
  // CURRENCY OPERATIONS
  // ============================================================

  /**
   * Format amount for country
   */
  formatAmountForCountry(amount, countryCode) {
    const formatters = {
      'KE': { symbol: 'KES', locale: 'en-KE', decimals: 0 },
      'UG': { symbol: 'USh', locale: 'en-UG', decimals: 0 },
      'TZ': { symbol: 'TSh', locale: 'en-TZ', decimals: 0 },
      'RW': { symbol: 'RWF', locale: 'en-RW', decimals: 0 },
      'BI': { symbol: 'FBu', locale: 'fr-BI', decimals: 0 },
      'SS': { symbol: 'SSP', locale: 'en-SS', decimals: 0 },
    };

    const formatter = formatters[countryCode] || formatters['KE'];

    return new Intl.NumberFormat(formatter.locale, {
      style: 'currency',
      currency: formatter.symbol,
      minimumFractionDigits: formatter.decimals,
      maximumFractionDigits: formatter.decimals,
    }).format(amount);
  }

  /**
   * Convert between currencies (placeholder - would use real exchange rates)
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    // In production, fetch real exchange rates
    const rates = {
      'KES': 1,
      'UGX': 370,
      'TZS': 2500,
      'RWF': 1200,
      'BIF': 2050,
      'SSP': 1500,
    };

    const inKES = amount / rates[fromCurrency];
    const converted = inKES * rates[toCurrency];

    return {
      original: amount,
      originalCurrency: fromCurrency,
      converted,
      targetCurrency: toCurrency,
      rate: rates[toCurrency] / rates[fromCurrency],
      timestamp: new Date(),
    };
  }

  // ============================================================
  // CROSS-BORDER OPERATIONS
  // ============================================================

  /**
   * Get cross-border configuration
   */
  async getCrossBorderConfig(fromCountry, toCountry) {
    const config = await db.findOne('cross_border_configurations', {
      from_country_code: fromCountry,
      to_country_code: toCountry,
      is_active: true,
    });

    if (!config) {
      throw new AppError('Cross-border route not configured', 404);
    }

    return config;
  }

  /**
   * Check import eligibility
   */
  async checkImportEligibility(countryCode, vehicleData) {
    const rules = await db.find('country_vehicle_rules', {
      country_code: countryCode,
      rule_category: 'import',
      is_active: true,
    });

    const eligibility = {
      eligible: true,
      requirements: [],
      warnings: [],
      estimatedCosts: {
        importDuty: 0,
        processingFee: 0,
        transport: 0,
        total: 0,
      },
    };

    for (const rule of rules) {
      const requirements = rule.requirements || [];
      
      // Check vehicle age
      if (rule.max_ownership_years) {
        const vehicleAge = new Date().getFullYear() - vehicleData.year;
        if (vehicleAge > rule.max_ownership_years) {
          eligibility.eligible = false;
          eligibility.warnings.push(
            `Vehicle age (${vehicleAge} years) exceeds maximum (${rule.max_ownership_years} years)`
          );
        }
      }

      eligibility.requirements.push(...requirements.map(req => ({
        rule: rule.rule_name,
        requirement: req,
      })));

      if (rule.fee_amount > 0) {
        eligibility.estimatedCosts.processingFee += rule.fee_amount;
      }
    }

    // Calculate import duty
    const crossBorderConfig = await this.getCrossBorderConfig(vehicleData.originCountry, countryCode);
    eligibility.estimatedCosts.importDuty = 
      (vehicleData.price * crossBorderConfig.import_duty_percentage) / 100;
    eligibility.estimatedCosts.total = 
      eligibility.estimatedCosts.importDuty + 
      eligibility.estimatedCosts.processingFee +
      eligibility.estimatedCosts.transport;

    return eligibility;
  }

  // ============================================================
  // VEHICLE RULES
  // ============================================================

  /**
   * Get vehicle rules for country
   */
  async getVehicleRules(countryCode, category = null) {
    const query = { country_code: countryCode, is_active: true };
    if (category) query.rule_category = category;

    return db.find('country_vehicle_rules', query);
  }

  // ============================================================
  // LOCALIZATION
  // ============================================================

  /**
   * Get localized string
   */
  async getLocalizedString(key, locale) {
    const translation = await db.findOne('localization_strings', {
      string_key: key,
      locale,
    });

    return translation?.translation || key;
  }

  /**
   * Get all translations for locale
   */
  async getTranslations(locale) {
    const strings = await db.find('localization_strings', {
      locale,
      is_verified: true,
    });

    const translations = {};
    strings.forEach(s => {
      translations[s.string_key] = s.translation;
    });

    return translations;
  }

  // ============================================================
  // BUSINESS ENTITIES
  // ============================================================

  /**
   * Get businesses by country
   */
  async getCountryBusinesses(countryCode, type = null) {
    const query = { country_code: countryCode, status: 'active' };
    if (type) query.entity_type = type;

    return db.find('country_business_entities', query);
  }

  // ============================================================
  // REGIONAL ANALYTICS
  // ============================================================

  /**
   * Get analytics for country
   */
  async getCountryAnalytics(countryCode, period = 'monthly') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
    }

    const analytics = await db.findOne('regional_analytics', {
      country_code: countryCode,
      period_type: period,
      period_start: { $lte: now },
    }, {
      sort: { period_start: -1 },
    });

    if (!analytics) {
      return this.getDefaultAnalytics(countryCode);
    }

    return analytics;
  }

  /**
   * Get default analytics
   */
  getDefaultAnalytics(countryCode) {
    return {
      country_code: countryCode,
      total_users: 0,
      new_registrations: 0,
      active_users: 0,
      total_listings: 0,
      new_listings: 0,
      vehicles_sold: 0,
      total_revenue: 0,
      active_dealers: 0,
      active_inspection_companies: 0,
      active_auction_companies: 0,
    };
  }

  /**
   * Get regional overview
   */
  async getRegionalOverview() {
    const countries = await this.getCountries({ status: 'active' });
    
    const overview = {
      totalCountries: countries.length,
      primaryCountry: countries.find(c => c.is_primary),
      countries: [],
    };

    for (const country of countries) {
      const analytics = await this.getCountryAnalytics(country.country_code);
      overview.countries.push({
        ...country,
        analytics,
      });
    }

    return overview;
  }

  // ============================================================
  // COMPLIANCE DOCUMENTS
  // ============================================================

  /**
   * Get compliance document
   */
  async getComplianceDocument(countryCode, documentType) {
    return db.findOne('country_compliance_documents', {
      country_code: countryCode,
      document_type: documentType,
      is_current: true,
      status: 'active',
    });
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Initialize default countries
   */
  async initializeDefaultCountries() {
    const countries = [
      {
        country_code: 'KE',
        country_name: 'Kenya',
        iso_code: 'KEN',
        flag_emoji: '🇰🇪',
        status: 'active',
        is_primary: true,
      },
      {
        country_code: 'UG',
        country_name: 'Uganda',
        iso_code: 'UGA',
        flag_emoji: '🇺🇬',
        status: 'active',
      },
      {
        country_code: 'TZ',
        country_name: 'Tanzania',
        iso_code: 'TZA',
        flag_emoji: '🇹🇿',
        status: 'active',
      },
      {
        country_code: 'RW',
        country_name: 'Rwanda',
        iso_code: 'RWA',
        flag_emoji: '🇷🇼',
        status: 'inactive',
      },
      {
        country_code: 'BI',
        country_name: 'Burundi',
        iso_code: 'BDI',
        flag_emoji: '🇧🇮',
        status: 'inactive',
      },
      {
        country_code: 'SS',
        country_name: 'South Sudan',
        iso_code: 'SSD',
        flag_emoji: '🇸🇸',
        status: 'inactive',
      },
    ];

    for (const country of countries) {
      const existing = await db.findOne('countries', { country_code: country.country_code });
      if (!existing) {
        await db.create('countries', {
          ...country,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    logInfo('Countries initialized');
  }

  /**
   * Initialize country configurations
   */
  async initializeCountryConfigurations() {
    const configurations = [
      {
        country_code: 'KE',
        currency_code: 'KES',
        currency_symbol: 'KES',
        currency_name: 'Kenyan Shilling',
        default_language: 'en',
        supported_languages: ['en', 'sw'],
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        timezone: 'Africa/Nairobi',
        phone_country_code: '+254',
        phone_format: 'XXX XXX XXXX',
      },
      {
        country_code: 'UG',
        currency_code: 'UGX',
        currency_symbol: 'USh',
        currency_name: 'Ugandan Shilling',
        default_language: 'en',
        supported_languages: ['en'],
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        timezone: 'Africa/Kampala',
        phone_country_code: '+256',
        phone_format: 'XXX XXX XXXX',
      },
      {
        country_code: 'TZ',
        currency_code: 'TZS',
        currency_symbol: 'TSh',
        currency_name: 'Tanzanian Shilling',
        default_language: 'en',
        supported_languages: ['en', 'sw'],
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        timezone: 'Africa/Dar_es_Salaam',
        phone_country_code: '+255',
        phone_format: 'XXX XXX XXX',
      },
      {
        country_code: 'RW',
        currency_code: 'RWF',
        currency_symbol: 'RWF',
        currency_name: 'Rwandan Franc',
        default_language: 'en',
        supported_languages: ['en', 'rw', 'fr'],
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        timezone: 'Africa/Kigali',
        phone_country_code: '+250',
        phone_format: 'XXX XXX XXX',
      },
      {
        country_code: 'BI',
        currency_code: 'BIF',
        currency_symbol: 'FBu',
        currency_name: 'Burundian Franc',
        default_language: 'fr',
        supported_languages: ['fr', 'en', 'rn'],
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        timezone: 'Africa/Bujumbura',
        phone_country_code: '+257',
        phone_format: 'XX XX XX XX',
      },
      {
        country_code: 'SS',
        currency_code: 'SSP',
        currency_symbol: 'SSP',
        currency_name: 'South Sudanese Pound',
        default_language: 'en',
        supported_languages: ['en'],
        date_format: 'DD/MM/YYYY',
        time_format: '24h',
        timezone: 'Africa/Juba',
        phone_country_code: '+211',
        phone_format: 'XXX XXX XXX',
      },
    ];

    for (const config of configurations) {
      const existing = await db.findOne('country_configurations', { country_code: config.country_code });
      if (!existing) {
        await db.create('country_configurations', {
          ...config,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    logInfo('Country configurations initialized');
  }

  /**
   * Initialize payment providers
   */
  async initializePaymentProviders() {
    // Only integrations that are actually wired into the application are
    // initialized. Additional regional providers must be added only with
    // a verified runtime integration and deployment evidence.
    const providers = [
      { country_code: 'KE', provider_code: 'mpesa', provider_name: 'M-Pesa', provider_type: 'mobile_money', is_primary: true },
    ];

    for (const provider of providers) {
      const existing = await db.findOne('country_payment_providers', {
        country_code: provider.country_code,
        provider_code: provider.provider_code,
      });
      if (!existing) {
        await db.create('country_payment_providers', {
          ...provider,
          is_enabled: true,
          transaction_fee_percentage: provider.provider_type === 'mobile_money' ? 1.5 : 0,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    logInfo('Payment providers initialized');
  }

  /**
   * Initialize tax configurations
   */
  async initializeTaxConfigurations() {
    const taxes = [
      // Kenya
      { country_code: 'KE', tax_code: 'vat', tax_name: 'Value Added Tax', tax_type: 'vat', rate_percentage: 16, applies_to_vehicles: true, applies_to_services: true },
      { country_code: 'KE', tax_code: 'stamp_duty', tax_name: 'Stamp Duty', tax_type: 'stamp_duty', rate_percentage: 0.1, applies_to_vehicles: true },
      { country_code: 'KE', tax_code: 'import_duty', tax_name: 'Import Duty', tax_type: 'import_duty', rate_percentage: 25, applies_to_vehicles: true, min_amount: 500000 },
      
      // Uganda
      { country_code: 'UG', tax_code: 'vat', tax_name: 'Value Added Tax', tax_type: 'vat', rate_percentage: 18, applies_to_vehicles: true, applies_to_services: true },
      { country_code: 'UG', tax_code: 'withholding', tax_name: 'Withholding Tax', tax_type: 'withholding', rate_percentage: 6, applies_to_services: true },
      
      // Tanzania
      { country_code: 'TZ', tax_code: 'vat', tax_name: 'Value Added Tax', tax_type: 'vat', rate_percentage: 18, applies_to_vehicles: true, applies_to_services: true },
      { country_code: 'TZ', tax_code: 'excise', tax_name: 'Excise Duty', tax_type: 'excise', rate_percentage: 10, applies_to_vehicles: true },
    ];

    for (const tax of taxes) {
      const existing = await db.findOne('country_tax_configurations', {
        country_code: tax.country_code,
        tax_code: tax.tax_code,
      });
      if (!existing) {
        await db.create('country_tax_configurations', {
          ...tax,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    logInfo('Tax configurations initialized');
  }

  /**
   * Initialize all country data
   */
  async initializeAllCountryData() {
    await this.initializeDefaultCountries();
    await this.initializeCountryConfigurations();
    await this.initializePaymentProviders();
    await this.initializeTaxConfigurations();
  }
}

export const countryService = new CountryService();
export default countryService;
