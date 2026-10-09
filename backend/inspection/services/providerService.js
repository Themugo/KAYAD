// ============================================================
// KAYAD INSPECTION MARKETPLACE - PROVIDER SERVICE
// ============================================================

import db from './dbAdapter.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import { searchEligibleProviders, publicCapability } from './providerDiscoveryService.js';

const providersCollection = 'inspection_providers';

/**
 * Provider Service - Business logic for inspection providers
 */
class ProviderService {
  /**
   * Create a new inspection provider
   */
  async createProvider(providerData, userId) {
    const { getSupabase } = await import('../../utils/supabase.js');
    const profile = {
      companyName: providerData.companyName, tradingName: providerData.tradingName,
      businessType: providerData.businessType, email: providerData.email, phone: providerData.phone,
      county: providerData.county, town: providerData.town, address: providerData.address,
      latitude: providerData.latitude, longitude: providerData.longitude, serviceRadiusKm: providerData.serviceRadius || 50,
      offersMobile: providerData.offersMobile !== false, hasWorkshop: providerData.hasWorkshop || false,
      inspectionTypes: providerData.inspectionTypes || [],
      serviceTerms: providerData.serviceTerms || {},
    };
    const { data, error } = await getSupabase().rpc('kayad_create_inspection_provider_application', {
      p_user_id: userId, p_profile: profile,
    });
    if (error) throw new AppError(error.message || 'Inspection provider registration failed', 409);
    logInfo('Inspection provider application submitted', { providerId: data, userId });
    return this.getProviderById(data);
  }

  /**
   * Get provider by ID
   */
  async getProviderById(providerId) {
    const provider = await db.findById(providersCollection, providerId);
    if (!provider) {
      throw new AppError('Provider not found', 404);
    }
    return provider;
  }

  /**
   * Get provider by user ID
   */
  async getProviderByUserId(userId) {
    const provider = await db.findOne(providersCollection, { user_id: userId });
    return provider;
  }

  /**
   * Update provider
   */
  async updateProvider(providerId, updates) {
    const allowedUpdates = [
      'company_name', 'trading_name', 'email', 'phone', 'whatsapp', 'website',
      'county', 'town', 'address', 'latitude', 'longitude', 'service_radius_km',
      'description', 'has_workshop', 'offers_mobile', 'mobile_inspection_fee',
      'weekend_available', 'same_day_available', 'languages', 'vehicle_types',
      'inspection_types', 'commercial_vehicles', 'electric_vehicles', 'luxury_vehicles',
      'business_hours', 'payment_methods', 'bank_name', 'bank_account_name', 'bank_account_number',
      'mpesa_paybill', 'mpesa_account', 'insurance_policy', 'insurance_expires_at',
      // Identity evidence for the alternative verification route (locked once verified, see below).
      'registration_number', 'tax_id'
    ];
    const identityFields = ['registration_number', 'tax_id'];
    if (identityFields.some((k) => updates[k] !== undefined)) {
      const current = await db.findById(providersCollection, providerId);
      if (!current) throw new AppError('Provider not found', 404);
      if (['ACTIVE', 'SUSPENDED'].includes(current.lifecycle_stage)) {
        throw new AppError('Business identity cannot be changed after verification. Contact KAYAD to correct it.', 409);
      }
    }

    const sanitizedUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }
    sanitizedUpdates.updated_at = new Date();

    const result = await db.update(providersCollection, providerId, sanitizedUpdates);
    logInfo('Provider updated', { providerId });
    return result;
  }

  /**
   * Search providers. Delegates to the discovery service, which enforces
   * eligibility (ACTIVE + verified) on the server. Client status/verified
   * parameters are not honoured.
   */
  async searchProviders(filters = {}) {
    return searchEligibleProviders(filters);
  }

  /**
   * Get provider profile (public)
   */
  async getProviderProfile(providerId) {
    const provider = await db.findById(providersCollection, providerId);
    if (!provider || provider.status !== 'active' || provider.verification_status !== 'verified' || provider.lifecycle_stage !== 'ACTIVE') {
      throw new AppError('Provider not available', 404);
    }

    // Get packages
    const packages = await db.find('inspection_packages', {
      provider_id: providerId,
      is_active: true
    });

    // Get branches
    const branches = await db.find('inspection_branches', {
      provider_id: providerId,
      is_active: true
    });

    // Get credentials
    // Only admin-verified, unexpired credentials are ever shown publicly.
    const allVerified = await db.find('provider_credentials', {
      provider_id: providerId,
      verification_status: 'verified'
    });
    const now = Date.now();
    const credentials = (allVerified || []).filter((c) => !c.expires_at || new Date(c.expires_at).getTime() > now);

    // Declared vs admin-verified capabilities, and the confirmed team size.
    const capRows = await db.find('provider_service_capabilities', { provider_id: providerId });
    const staffRows = await db.find('inspection_staff', { provider_id: providerId });
    const liveStaff = (staffRows || []).filter((st) => st.affiliation_status === 'confirmed' && st.is_active !== false);
    const liveStaffIds = new Set(liveStaff.map((st) => st.id));
    const capabilities = (capRows || [])
      .filter((c) => c.status !== 'revoked' && (!c.staff_id || liveStaffIds.has(c.staff_id)))
      .map(publicCapability);

    // Get recent reviews
    const recentReviews = await db.find('inspection_reviews', {
      provider_id: providerId,
      is_published: true
    }, { limit: 10, sort: { created_at: -1 } });

    return {
      id: provider.id,
      companyName: provider.company_name,
      tradingName: provider.trading_name,
      description: provider.description,
      logo: provider.logo_url,
      coverImage: provider.cover_image_url,
      contact: {
        email: provider.email,
        phone: provider.phone,
        whatsapp: provider.whatsapp,
        website: provider.website,
      },
      location: {
        country: provider.country,
        county: provider.county,
        town: provider.town,
        address: provider.address,
        serviceRadius: provider.service_radius_km,
      },
      businessHours: provider.business_hours,
      operatingModel: {
        hasWorkshop: provider.has_workshop,
        offersMobile: provider.offers_mobile,
        mobileFee: provider.mobile_inspection_fee,
        weekendAvailable: provider.weekend_available,
        sameDayAvailable: provider.same_day_available,
      },
      specializations: {
        vehicleTypes: provider.vehicle_types,
        inspectionTypes: provider.inspection_types,
        commercialVehicles: provider.commercial_vehicles,
        electricVehicles: provider.electric_vehicles,
        luxuryVehicles: provider.luxury_vehicles,
      },
      experience: {
        yearsInBusiness: provider.years_in_business,
      },
      verification: {
        status: provider.verification_status,
        verifiedAt: provider.verified_at,
      },
      stats: {
        averageRating: Number(provider.total_reviews || 0) > 0 ? Number(provider.average_rating) : null,
        totalReviews: Number(provider.total_reviews || 0),
        completedInspections: Number(provider.total_completed_inspections || 0),
        responseTimeMinutes: provider.response_time_minutes == null ? null : Number(provider.response_time_minutes),
        acceptanceRate: null,
      },
      packages: packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        type: pkg.inspection_type,
        price: pkg.price,
        currency: pkg.currency,
        duration: pkg.estimated_duration_minutes,
        inspectionPoints: pkg.inspection_points,
        includes: {
          diagnostics: pkg.includes_diagnostics,
          roadTest: pkg.includes_road_test,
          electrical: pkg.includes_electrical_check,
          suspension: pkg.includes_suspension_check,
        },
      })),
      branches: branches.map(b => ({
        id: b.id,
        name: b.name,
        address: b.address,
        location: { latitude: b.latitude, longitude: b.longitude },
        phone: b.phone,
      })),
      credentials: credentials.map(c => ({
        id: c.id,
        type: c.credential_type,
        name: c.title,
        issuingBody: c.issued_by,
        expiryDate: c.expires_at,
        verified: true,
      })),
      capabilities,
      team: { confirmedMembers: liveStaff.length },
      recentReviews: recentReviews.map(r => ({
        id: r.id,
        rating: r.overall_rating,
        comment: r.review_text,
        createdAt: r.created_at,
      })),
    };
  }

  /**
   * Get provider dashboard stats
   */
  async getProviderDashboard(providerId) {
    const provider = await this.getProviderById(providerId);

    // Get today's bookings
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = await db.count('inspection_bookings', {
      provider_id: providerId,
      scheduled_date: today,
      status: { $nin: ['cancelled', 'no_show'] }
    });

    // Get upcoming bookings
    const upcomingBookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      scheduled_date: { $gte: today },
      status: { $in: ['booked', 'confirmed', 'inspector_assigned'] }
    }, { limit: 10, sort: { scheduled_date: 1, scheduled_time: 1 } });

    // Get pending reports
    const pendingReports = await db.count('inspection_bookings', {
      provider_id: providerId,
      status: 'inspection_complete'
    });

    // Get monthly revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyBookings = await db.aggregate('inspection_bookings', [
      { $match: { provider_id: providerId, paid_at: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total_price' }, count: { $sum: 1 } } }
    ]);

    // Get pending settlement
    const pendingSettlements = await db.find('inspection_settlements', {
      provider_id: providerId,
      status: { $in: ['pending', 'processing'] }
    });

    // Get unread messages count
    const unreadMessages = 0; // Placeholder for message system

    return {
      overview: {
        todayBookings,
        upcomingBookingsCount: upcomingBookings.length,
        pendingReports,
        monthlyRevenue: monthlyBookings[0]?.total || 0,
        monthlyInspections: monthlyBookings[0]?.count || 0,
        averageRating: provider.average_rating,
        totalReviews: provider.total_reviews,
      },
      upcomingBookings: upcomingBookings.map(b => ({
        id: b.id,
        reference: b.booking_reference,
        customerName: b.customer_name,
        vehicle: `${b.vehicle_year} ${b.vehicle_make} ${b.vehicle_model}`,
        date: b.scheduled_date,
        time: b.scheduled_time,
        location: b.inspection_town,
        status: b.status,
        price: b.total_price,
      })),
      pendingSettlement: pendingSettlements.length > 0 ? {
        amount: pendingSettlements[0].net_amount,
        status: pendingSettlements[0].status,
      } : null,
      unreadMessages,
    };
  }

  /**
   * Update provider ratings
   */
  async updateProviderRatings(providerId) {
    const reviews = await db.find('inspection_reviews', {
      provider_id: providerId,
      is_published: true
    });

    if (reviews.length === 0) {
      await db.update(providersCollection, providerId, {
        average_rating: 0,
        total_reviews: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.overall_rating, 0);
    const avgRating = totalRating / reviews.length;

    await db.update(providersCollection, providerId, {
      average_rating: Math.round(avgRating * 100) / 100,
      total_reviews: reviews.length
    });
  }

  /**
   * Update provider stats
   */
  async updateProviderStats(providerId) {
    const completedInspections = await db.count('inspection_bookings', {
      provider_id: providerId,
      status: 'closed'
    });

    // Calculate average response time (time between booking creation and confirmation)
    const confirmedBookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      confirmed_at: { $exists: true }
    }, { limit: 50, sort: { created_at: -1 } });

    let avgResponseTime = 0;
    if (confirmedBookings.length > 0) {
      const totalResponseTime = confirmedBookings.reduce((sum, b) => {
        const created = new Date(b.created_at).getTime();
        const confirmed = new Date(b.confirmed_at).getTime();
        return sum + (confirmed - created);
      }, 0);
      avgResponseTime = Math.round(totalResponseTime / confirmedBookings.length / 60000); // in minutes
    }

    // Calculate acceptance rate
    const totalBookings = await db.count('inspection_bookings', {
      provider_id: providerId,
      created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const cancelledBookings = await db.count('inspection_bookings', {
      provider_id: providerId,
      status: 'cancelled',
      created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const acceptanceRate = totalBookings > 0 ? ((totalBookings - cancelledBookings) / totalBookings) * 100 : 100;

    await db.update(providersCollection, providerId, {
      total_completed_inspections: completedInspections,
      response_time_minutes: avgResponseTime,
      acceptance_rate: Math.round(acceptanceRate * 100) / 100
    });
  }

  /**
   * Verify provider
   */
  async verifyProvider(providerId, verifiedBy) {
    await db.update(providersCollection, providerId, {
      verification_status: 'verified',
      verified_at: new Date(),
      verified_by: verifiedBy,
      status: 'active',
      updated_at: new Date()
    });

    logInfo('Provider verified', { providerId, verifiedBy });
  }

  /**
   * Suspend provider
   */
  async suspendProvider(providerId, reason) {
    await db.update(providersCollection, providerId, {
      status: 'suspended',
      suspension_reason: reason,
      updated_at: new Date()
    });

    logInfo('Provider suspended', { providerId, reason });
  }

  /**
   * Add credential to provider
   */
  async addCredential(providerId, credentialData) {
    const credential = {
      provider_id: providerId,
      credential_type: credentialData.type,
      title: credentialData.name,
      issued_by: credentialData.issuingBody || null,
      certificate_number: credentialData.certificateNumber || null,
      issued_at: credentialData.issueDate || null,
      expires_at: credentialData.expiryDate || null,
      document_url: credentialData.documentUrl || null,
      // A submitted credential is never verified until an administrator decides.
      verification_status: 'unverified',
    };

    const result = await db.create('provider_credentials', credential);
    return result;
  }

  /**
   * Get provider earnings summary
   */
  async getEarningsSummary(providerId, period = 'monthly') {
    let startDate = new Date();

    if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'yearly') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const bookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      paid_at: { $gte: startDate }
    });

    const totalEarnings = bookings.reduce((sum, b) => sum + b.total_price, 0);
    const totalInspections = bookings.length;

    // Get settled amount
    const settlements = await db.find('inspection_settlements', {
      provider_id: providerId,
      period_start: { $gte: startDate }
    });

    const settledAmount = settlements.reduce((sum, s) => sum + s.net_amount, 0);
    const pendingSettlement = totalEarnings - settledAmount;

    // Get pending payouts
    const pendingPayouts = await db.find('inspection_settlements', {
      provider_id: providerId,
      status: 'pending'
    });

    return {
      period,
      totalEarnings,
      totalInspections,
      settledAmount,
      pendingSettlement,
      pendingPayouts: pendingPayouts.map(p => ({
        id: p.id,
        reference: p.settlement_reference,
        amount: p.net_amount,
        status: p.status,
        periodStart: p.period_start,
        periodEnd: p.period_end,
      })),
    };
  }
}

export const providerService = new ProviderService();
export default providerService;
