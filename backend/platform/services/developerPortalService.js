// ============================================================
// KAYAD PLATFORM ECOSYSTEM
// DEVELOPER PORTAL SERVICE
// ============================================================

import db from '../../db/index.js';
import { logInfo, logError } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Developer Portal Service
 * Extensible automotive platform for East Africa
 */
class DeveloperPortalService {

  // ============================================================
  // DEVELOPERS
  // ============================================================

  /**
   * Register as developer
   */
  async registerDeveloper(userId, developerData) {
    const developerCode = `DEV-${Date.now().toString(36).toUpperCase()}`;

    const developer = await db.create('developers', {
      developer_code: developerCode,
      user_id: userId,
      email: developerData.email,
      name: developerData.name,
      company_name: developerData.companyName,
      company_website: developerData.companyWebsite,
      company_size: developerData.companySize,
      bio: developerData.bio,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Initialize default scopes
    await this.initializeDeveloperScopes(developer.id);

    return developer;
  }

  /**
   * Get developer by ID
   */
  async getDeveloper(developerId) {
    return db.findById('developers', developerId);
  }

  /**
   * Get developer applications
   */
  async getDeveloperApps(developerId) {
    return db.find('platform_applications', { developer_id: developerId });
  }

  // ============================================================
  // APPLICATIONS
  // ============================================================

  /**
   * Register new application
   */
  async registerApplication(developerId, appData) {
    const appCode = `APP-${Date.now().toString(36).toUpperCase()}`;

    const application = await db.create('platform_applications', {
      app_code: appCode,
      app_name: appData.appName,
      description: appData.description,
      developer_id: developerId,
      logo_url: appData.logoUrl,
      category: appData.category,
      website_url: appData.websiteUrl,
      support_email: appData.supportEmail,
      environment: 'sandbox',
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Update developer stats
    await db.update('developers', developerId, {
      total_apps: await this.countDeveloperApps(developerId),
      updated_at: new Date(),
    });

    return application;
  }

  /**
   * Get application
   */
  async getApplication(appId) {
    const app = await db.findById('platform_applications', appId);
    if (!app) return null;

    const apiKeys = await db.find('api_keys', { app_id: appId });
    const webhooks = await db.find('webhook_subscriptions', { app_id: appId });

    return { ...app, apiKeys, webhooks };
  }

  /**
   * Approve application
   */
  async approveApplication(appId, reviewerId, reviewNotes) {
    await db.update('platform_applications', appId, {
      status: 'approved',
      review_notes: reviewNotes,
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      updated_at: new Date(),
    });

    return db.findById('platform_applications', appId);
  }

  // ============================================================
  // API KEYS
  // ============================================================

  /**
   * Create API key
   */
  async createApiKey(appId, keyType = 'sandbox', scopes = []) {
    const keyCode = `KAYAD-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    const keyPrefix = keyCode.substring(0, 12);
    const keyHash = crypto.createHash('sha256').update(keyCode).digest('hex');

    const apiKey = await db.create('api_keys', {
      key_code: keyCode,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      app_id: appId,
      key_type: keyType,
      scopes: scopes,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      ...apiKey,
      api_key: keyCode, // Return full key only on creation
    };
  }

  /**
   * Get API keys for app
   */
  async getApiKeys(appId) {
    const keys = await db.find('api_keys', { app_id: appId });
    // Mask the keys
    return keys.map(k => ({
      ...k,
      key_code: `${k.key_prefix}...`,
    }));
  }

  /**
   * Rotate API key
   */
  async rotateApiKey(keyId) {
    const oldKey = await db.findById('api_keys', keyId);
    if (!oldKey) throw new Error('API key not found');

    // Deactivate old key
    await db.update('api_keys', keyId, {
      is_active: false,
      updated_at: new Date(),
    });

    // Create new key
    return this.createApiKey(oldKey.app_id, oldKey.key_type, oldKey.scopes);
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey) {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const key = await db.findOne('api_keys', { key_hash: keyHash, is_active: true });

    if (!key) return { valid: false };

    // Check expiry
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return { valid: false, reason: 'Key expired' };
    }

    // Check rate limit
    const withinLimit = await this.checkRateLimit(key.id);
    if (!withinLimit) {
      return { valid: false, reason: 'Rate limit exceeded' };
    }

    // Update usage
    await db.update('api_keys', key.id, {
      total_calls: key.total_calls + 1,
      last_used_at: new Date(),
      updated_at: new Date(),
    });

    return { valid: true, scopes: key.scopes, appId: key.app_id };
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(keyId) {
    const key = await db.findById('api_keys', keyId);
    if (!key) return false;

    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // Last hour

    const usage = await db.findOne('api_rate_limits', {
      api_key_id: keyId,
      window_type: 'hour',
      window_start: { $gte: windowStart },
    });

    if (usage && usage.request_count >= key.rate_limit_per_hour) {
      return false;
    }

    return true;
  }

  // ============================================================
  // OAUTH
  // ============================================================

  /**
   * Create OAuth client
   */
  async createOAuthClient(appId, redirectUris = []) {
    const clientId = `KAYAD-${crypto.randomBytes(8).toString('hex')}`;
    const clientSecret = crypto.randomBytes(32).toString('hex');
    const clientSecretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');

    const client = await db.create('oauth_clients', {
      client_id: clientId,
      client_secret_hash: clientSecretHash,
      app_id: appId,
      redirect_uris: redirectUris,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      ...client,
      client_secret: clientSecret, // Return only on creation
    };
  }

  /**
   * Authenticate OAuth client
   */
  async authenticateOAuthClient(clientId, clientSecret) {
    const clientSecretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');
    const client = await db.findOne('oauth_clients', {
      client_id: clientId,
      client_secret_hash: clientSecretHash,
      is_active: true,
    });

    if (!client) return null;

    return client;
  }

  // ============================================================
  // API SCOPES
  // ============================================================

  /**
   * Get available scopes
   */
  async getAvailableScopes() {
    return db.find('api_scopes', { is_active: true });
  }

  /**
   * Initialize developer default scopes
   */
  async initializeDeveloperScopes(developerId) {
    const defaultScopes = ['listings.read', 'auctions.read', 'inspections.read', 'dealers.read'];

    for (const scope of defaultScopes) {
      await db.create('developer_scopes', {
        developer_id: developerId,
        scope_code: scope,
        granted_at: new Date(),
      });
    }
  }

  // ============================================================
  // WEBHOOKS
  // ============================================================

  /**
   * Create webhook subscription
   */
  async createWebhookSubscription(appId, subscriptionData) {
    const subscriptionCode = `WH-${Date.now().toString(36).toUpperCase()}`;
    const secretKey = crypto.randomBytes(32).toString('hex');

    const subscription = await db.create('webhook_subscriptions', {
      subscription_code: subscriptionCode,
      app_id: appId,
      event_type: subscriptionData.eventType,
      endpoint_url: subscriptionData.endpointUrl,
      secret_key: secretKey,
      filters: subscriptionData.filters || {},
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      ...subscription,
      signing_secret: secretKey,
    };
  }

  /**
   * Get webhooks for app
   */
  async getWebhooks(appId) {
    return db.find('webhook_subscriptions', { app_id: appId });
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(subscriptionId) {
    await db.update('webhook_subscriptions', subscriptionId, {
      is_active: false,
      updated_at: new Date(),
    });
  }

  /**
   * Publish event
   */
  async publishEvent(eventType, sourceType, sourceId, eventData) {
    const eventCode = `EVT-${Date.now().toString(36).toUpperCase()}`;

    const event = await db.create('platform_events', {
      event_code: eventCode,
      event_type: eventType,
      source_type: sourceType,
      source_id: sourceId,
      event_data: eventData,
      occurred_at: new Date(),
      published_at: new Date(),
    });

    // Deliver to subscribers
    await this.deliverWebhookEvent(event);

    return event;
  }

  /**
   * Deliver webhook event
   */
  async deliverWebhookEvent(event) {
    const subscriptions = await db.find('webhook_subscriptions', {
      event_type: event.event_type,
      is_active: true,
    });

    for (const subscription of subscriptions) {
      await this.sendWebhookDelivery(subscription, event);
    }
  }

  /**
   * Send webhook delivery
   */
  async sendWebhookDelivery(subscription, event) {
    const deliveryCode = `DEL-${Date.now().toString(36).toUpperCase()}`;
    const payload = JSON.stringify(event.event_data);
    const signature = this.generateWebhookSignature(payload, subscription.secret_key);

    // In production, this would make an HTTP request
    const delivery = await db.create('webhook_deliveries', {
      delivery_code: deliveryCode,
      subscription_id: subscription.id,
      event_type: event.event_type,
      event_id: event.event_code,
      payload: event.event_data,
      status: 'pending',
      created_at: new Date(),
    });

    // Update subscription stats
    await db.update('webhook_subscriptions', subscription.id, {
      total_deliveries: subscription.total_deliveries + 1,
      updated_at: new Date(),
    });

    return delivery;
  }

  /**
   * Generate webhook signature
   */
  generateWebhookSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  // ============================================================
  // EXTENSIONS
  // ============================================================

  /**
   * Register extension
   */
  async registerExtension(developerId, appId, extensionData) {
    const extensionCode = `EXT-${Date.now().toString(36).toUpperCase()}`;

    const extension = await db.create('extensions', {
      extension_code: extensionCode,
      extension_name: extensionData.extensionName,
      description: extensionData.description,
      developer_id: developerId,
      app_id: appId,
      category: extensionData.category,
      logo_url: extensionData.logoUrl,
      pricing_type: extensionData.pricingType || 'free',
      price_amount: extensionData.priceAmount,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });

    return extension;
  }

  /**
   * Get extension marketplace
   */
  async getExtensionMarketplace(filters = {}) {
    const query = {
      status: 'published',
      is_certified: true,
    };

    if (filters.category) query.category = filters.category;

    return db.find('extensions', query, {
      sort: { total_installs: -1 },
    });
  }

  /**
   * Install extension
   */
  async installExtension(extensionId, customerId, customerType) {
    const installationCode = `INST-${Date.now().toString(36).toUpperCase()}`;

    const installation = await db.create('extension_installations', {
      installation_code: installationCode,
      extension_id: extensionId,
      customer_id: customerId,
      customer_type: customerType,
      is_active: true,
      installed_at: new Date(),
    });

    // Update extension stats
    const extension = await db.findById('extensions', extensionId);
    await db.update('extensions', extensionId, {
      total_installs: extension.total_installs + 1,
      active_installs: extension.active_installs + 1,
      updated_at: new Date(),
    });

    return installation;
  }

  // ============================================================
  // PARTNERS
  // ============================================================

  /**
   * Register partner
   */
  async registerPartner(partnerData) {
    const partnerCode = `PART-${Date.now().toString(36).toUpperCase()}`;

    return db.create('platform_partners', {
      partner_code: partnerCode,
      partner_name: partnerData.partnerName,
      partner_type: partnerData.partnerType,
      company_name: partnerData.companyName,
      registration_number: partnerData.registrationNumber,
      website: partnerData.website,
      primary_contact_name: partnerData.contactName,
      primary_contact_email: partnerData.contactEmail,
      primary_contact_phone: partnerData.contactPhone,
      integration_type: partnerData.integrationType,
      partnership_tier: partnerData.tier || 'standard',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get partners
   */
  async getPartners(filters = {}) {
    const query = {};
    if (filters.type) query.partner_type = filters.type;
    if (filters.status) query.status = filters.status;

    return db.find('platform_partners', query);
  }

  // ============================================================
  // SDKs
  // ============================================================

  /**
   * Get available SDKs
   */
  async getAvailableSDKs() {
    const sdks = [
      { code: 'javascript', name: 'JavaScript / TypeScript', version: '2.1.0', downloads: 15432 },
      { code: 'python', name: 'Python', version: '1.8.5', downloads: 8932 },
      { code: 'java', name: 'Java', version: '1.5.2', downloads: 5621 },
      { code: 'php', name: 'PHP', version: '1.3.0', downloads: 3421 },
      { code: 'csharp', name: 'C# / .NET', version: '1.2.1', downloads: 2890 },
      { code: 'go', name: 'Go', version: '1.0.3', downloads: 1567 },
    ];

    return db.find('sdk_versions', { is_latest: true }) || sdks;
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  /**
   * Get developer analytics
   */
  async getDeveloperAnalytics(developerId) {
    const apps = await db.find('platform_applications', { developer_id: developerId });
    const appIds = apps.map(a => a.id);

    // Get API usage
    const apiKeys = await db.find('api_keys', { app_id: { $in: appIds } });
    const totalCalls = apiKeys.reduce((sum, k) => sum + (k.total_calls || 0), 0);

    // Get webhook stats
    const webhooks = await db.find('webhook_subscriptions', { app_id: { $in: appIds } });
    const totalDeliveries = webhooks.reduce((sum, w) => sum + (w.total_deliveries || 0), 0);

    return {
      totalApps: apps.length,
      approvedApps: apps.filter(a => a.status === 'approved').length,
      totalApiCalls: totalCalls,
      activeWebhooks: webhooks.filter(w => w.is_active).length,
      totalWebhookDeliveries: totalDeliveries,
    };
  }

  // ============================================================
  // SANDBOX
  // ============================================================

  /**
   * Create sandbox environment
   */
  async createSandboxEnvironment(developerId) {
    const sandboxCode = `SANDBOX-${Date.now().toString(36).toUpperCase()}`;

    return {
      sandbox_code: sandboxCode,
      developer_id: developerId,
      status: 'active',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      features: {
        test_listings: true,
        test_auctions: true,
        test_payments: true,
        webhook_testing: true,
        rate_limit: 1000,
      },
    };
  }

  /**
   * Reset sandbox
   */
  async resetSandbox(sandboxCode) {
    // In production, this would reset all test data
    logInfo('Sandbox reset', { sandboxCode });
    return { success: true, message: 'Sandbox environment reset' };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  async countDeveloperApps(developerId) {
    const apps = await db.find('platform_applications', { developer_id: developerId });
    return apps.length;
  }
}

export const developerPortalService = new DeveloperPortalService();
export default developerPortalService;
