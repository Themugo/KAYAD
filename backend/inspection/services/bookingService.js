// ============================================================
// KAYAD INSPECTION MARKETPLACE - BOOKING SERVICE
// ============================================================

import db from './dbAdapter.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import { incrementCounter } from '../../config/metrics.js';
import { assertStaffAssignable } from './workforceService.js';
import { assignBooking as assignBookingAuthoritative } from './organizationService.js';

/**
 * Generate booking reference
 */
const generateBookingReference = () => {
  const prefix = 'KAYAD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Booking Service - Handles inspection bookings
 */
class BookingService {
  /**
   * Create a new booking
   */
  async createBooking(bookingData, customerId) {
    // Validate package exists
    const pkg = await db.findById('inspection_packages', bookingData.packageId);
    if (!pkg || !pkg.is_active) {
      throw new AppError('Inspection package not found', 404);
    }

    // Get provider
    const provider = await db.findById('inspection_providers', pkg.provider_id);
    if (!provider || provider.status !== 'active' || provider.verification_status !== 'verified') {
      throw new AppError('Provider not available', 400);
    }

    // Public bookings are only allowed against a currently active, verified
    // provider. The package/provider relationship above is authoritative; the
    // browser cannot redirect a booking to another provider.

    // Enforce the provider's published service model. Do not silently accept a
    // mobile booking when mobile inspection is disabled, or a workshop booking
    // when no workshop service is published.
    if (bookingData.isMobile && !provider.offers_mobile) {
      throw new AppError('Mobile inspection is not available from this provider', 400);
    }
    if (bookingData.isMobile === false && !provider.has_workshop) {
      throw new AppError('Workshop inspection is not available from this provider', 400);
    }

    // Stage 5F.16: an optional branch choice must be an ACTIVE branch of THIS provider (the composite FK makes any other value
    // impossible at the database; this check turns it into a clear 400 instead of a constraint failure).
    let branchId = null;
    if (bookingData.branchId) {
      const branch = await db.findOne('inspection_branches', { id: bookingData.branchId, provider_id: provider.id });
      if (!branch || branch.status !== 'active') throw new AppError('Selected branch is not available', 400);
      branchId = branch.id;
    }

    // Check availability
    const slotFilters = {
      provider_id: provider.id,
      scheduled_date: bookingData.scheduledDate,
      scheduled_time: bookingData.scheduledTime,
      status: { $nin: ['cancelled', 'no_show'] },
    };
    if (bookingData.staffId) {
      slotFilters.assigned_staff_id = bookingData.staffId;
    }

    const existingBooking = await db.findOne('inspection_bookings', slotFilters);
    if (existingBooking) {
      throw new AppError('Time slot not available', 400);
    }

    if (bookingData.staffId) {
      const staff = await db.findById('inspection_staff', bookingData.staffId);
      if (!staff || staff.provider_id !== provider.id || staff.is_active === false) {
        throw new AppError('Invalid or unavailable inspector', 400);
      }
    }

    // Calculate price
    let mobileFee = 0;
    if (bookingData.isMobile && provider.mobile_inspection_fee) {
      mobileFee = provider.mobile_inspection_fee;
    }

    // Monetary authority stays server-side: package price and mobile fee are
    // resolved from the canonical provider/package records. Client input
    // cannot reduce the payable amount.
    const basePrice = Number(pkg.price);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      throw new AppError('Inspection package price is invalid', 500);
    }
    if (!Number.isFinite(mobileFee) || mobileFee < 0) {
      throw new AppError('Provider mobile inspection fee is invalid', 500);
    }
    const totalPrice = basePrice + mobileFee;

    // Create booking
    const booking = {
      booking_reference: generateBookingReference(),
      provider_id: pkg.provider_id,
      branch_id: branchId,
      package_id: pkg.id,
      inspection_type: pkg.inspection_type,
      customer_id: customerId,
      customer_name: bookingData.customerName,
      customer_email: bookingData.customerEmail,
      customer_phone: bookingData.customerPhone,
      vehicle_make: bookingData.vehicleMake,
      vehicle_model: bookingData.vehicleModel,
      vehicle_year: bookingData.vehicleYear,
      vehicle_registration: bookingData.vehicleRegistration,
      vehicle_vin: bookingData.vehicleVin,
      vehicle_type: bookingData.vehicleType,
      inspection_country: bookingData.country || provider.country,
      inspection_county: bookingData.county,
      inspection_town: bookingData.town,
      inspection_address: bookingData.inspectionAddress,
      inspection_latitude: bookingData.latitude,
      inspection_longitude: bookingData.longitude,
      is_mobile: bookingData.isMobile !== false,
      seller_name: bookingData.sellerName,
      seller_phone: bookingData.sellerPhone,
      seller_is_dealer: bookingData.sellerIsDealer || false,
      scheduled_date: bookingData.scheduledDate,
      scheduled_time: bookingData.scheduledTime,
      assigned_staff_id: bookingData.staffId,
      status: 'booked',
      customer_notes: bookingData.notes,
      base_price: basePrice,
      mobile_fee: mobileFee,
      discount: 0,
      total_price: totalPrice,
      currency: pkg.currency || 'KES',
      payment_status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    let result;
    try {
      result = await db.create('inspection_bookings', booking);
    } catch (error) {
      if (error?.code === '23505') {
        throw new AppError('Time slot not available', 409);
      }
      throw error;
    }

    // Create status history
    await this.addStatusHistory(result.id, null, 'booked', customerId);

    // Send notification (would integrate with notification service)
    logInfo('Booking created', { bookingId: result.id, reference: booking.booking_reference });
    incrementCounter('inspection_booking_created');

    return result;
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId) {
    const booking = await db.findById('inspection_bookings', bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    return booking;
  }

  /**
   * Get booking by reference
   */
  async getBookingByReference(reference) {
    const booking = await db.findOne('inspection_bookings', { booking_reference: reference });
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    return booking;
  }

  /**
   * Get booking details (for customer/provider view)
   */
  async getBookingDetails(bookingId, userType = 'customer', actorId = null) {
    const booking = await this.getBookingById(bookingId);

    if (userType === 'customer' && actorId && String(booking.customer_id) !== String(actorId)) {
      throw new AppError('You do not have access to this booking', 403);
    }

    // Get package info
    const pkg = await db.findById('inspection_packages', booking.package_id);

    // Get provider info
    const provider = await db.findById('inspection_providers', booking.provider_id);

    // Get assigned staff
    let staff = null;
    if (booking.assigned_staff_id) {
      staff = await db.findById('inspection_staff', booking.assigned_staff_id);
    }

    // Get report if exists
    let report = null;
    if (booking.status === 'report_generated' || booking.status === 'customer_reviewed' || booking.status === 'closed') {
      report = await db.findOne('inspection_reports', { booking_id: bookingId });
    }

    // Format response based on user type
    const baseInfo = {
      id: booking.id,
      reference: booking.booking_reference,
      status: booking.status,
      scheduledDate: booking.scheduled_date,
      scheduledTime: booking.scheduled_time,
      estimatedEndTime: booking.estimated_end_time,
      inspectionType: booking.inspection_type,
      isMobile: booking.is_mobile,
      totalPrice: booking.total_price,
      currency: booking.currency,
      paymentStatus: booking.payment_status,
      createdAt: booking.created_at,
    };

    if (userType === 'customer') {
      return {
        ...baseInfo,
        vehicle: {
          make: booking.vehicle_make,
          model: booking.vehicle_model,
          year: booking.vehicle_year,
          registration: booking.vehicle_registration,
        },
        location: {
          county: booking.inspection_county,
          town: booking.inspection_town,
          address: booking.inspection_address,
          latitude: booking.inspection_latitude,
          longitude: booking.inspection_longitude,
        },
        seller: {
          name: booking.seller_name,
          phone: booking.seller_phone,
          isDealer: booking.seller_is_dealer,
        },
        provider: {
          id: provider.id,
          name: provider.company_name,
          logo: provider.logo_url,
          phone: provider.phone,
        },
        inspector: staff ? {
          id: staff.id,
          name: `${staff.first_name} ${staff.last_name}`,
          photo: staff.photo_url,
        } : null,
        package: pkg ? {
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          duration: pkg.estimated_duration_minutes,
        } : null,
        report: report ? {
          id: report.id,
          number: report.report_number,
          overallScore: report.overall_score,
          overallCondition: report.overall_condition,
          pdfUrl: report.pdf_url,
          shareToken: report.share_token,
        } : null,
      };
    } else {
      return {
        ...baseInfo,
        customer: {
          id: booking.customer_id,
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone,
        },
        vehicle: {
          make: booking.vehicle_make,
          model: booking.vehicle_model,
          year: booking.vehicle_year,
          registration: booking.vehicle_registration,
          vin: booking.vehicle_vin,
        },
        location: {
          county: booking.inspection_county,
          town: booking.inspection_town,
          address: booking.inspection_address,
          latitude: booking.inspection_latitude,
          longitude: booking.inspection_longitude,
        },
        seller: {
          name: booking.seller_name,
          phone: booking.seller_phone,
          isDealer: booking.seller_is_dealer,
        },
        inspector: staff ? {
          id: staff.id,
          name: `${staff.first_name} ${staff.last_name}`,
          role: staff.role,
          photo: staff.photo_url,
        } : null,
        package: pkg,
        report,
        internalNotes: booking.internal_notes,
      };
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId, newStatus, userId, staffId = null, notes = null, providerId = null) {
    const booking = await this.getBookingById(bookingId);
    if (providerId && String(booking.provider_id) !== String(providerId)) {
      throw new AppError('Booking does not belong to this provider', 403);
    }

    // Stage 5F.16: assignment is NOT a generic status change. It carries eligibility, branch-scope, payment and concurrency rules
    // that live in kayad_org_booking_assign, so it is only reachable through assignInspector().
    if (newStatus === 'inspector_assigned') {
      throw new AppError('Use the assignment endpoint to assign an inspector', 400);
    }

    const validTransitions = {
      'booked': ['confirmed', 'cancelled'],
      'confirmed': ['inspector_assigned', 'cancelled'],
      'inspector_assigned': ['travelling', 'cancelled'],
      'travelling': ['inspection_started', 'no_show'],
      'inspection_started': ['inspection_complete'],
      'inspection_complete': ['report_generated'],
      'report_generated': ['customer_reviewed'],
      'customer_reviewed': ['closed'],
    };

    const allowed = validTransitions[booking.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new AppError(`Cannot transition from ${booking.status} to ${newStatus}`, 400);
    }

    const updates = {
      status: newStatus,
      status_changed_at: new Date(),
      updated_at: new Date(),
    };

    // Update timestamps based on status
    switch (newStatus) {
      case 'confirmed':
        updates.confirmed_at = new Date();
        break;
      case 'inspection_started':
        updates.started_at = new Date();
        break;
      case 'cancelled':
        updates.cancelled_at = new Date();
        break;
    }

    if (notes) {
      updates.internal_notes = notes;
    }

    await db.update('inspection_bookings', bookingId, updates);

    // Add status history
    await this.addStatusHistory(bookingId, booking.status, newStatus, userId, staffId, notes);

    logInfo('Booking status updated', { bookingId, oldStatus: booking.status, newStatus });
    incrementCounter('inspection_status_change', { from: booking.status, to: newStatus });

    return this.getBookingById(bookingId);
  }

  /**
   * Add status history entry
   */
  async addStatusHistory(bookingId, fromStatus, toStatus, userId, staffId = null, notes = null) {
    const entry = {
      booking_id: bookingId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: userId,
      staff_id: staffId,
      notes,
      created_at: new Date(),
    };

    return db.create('inspection_status_history', entry);
  }

  /**
   * Assign inspector to booking
   */
  async assignInspector(bookingId, staffId, userId, providerId = null) {
    const booking = await this.getBookingById(bookingId);
    if (providerId && String(booking.provider_id) !== String(providerId)) {
      throw new AppError('Booking does not belong to this provider', 403);
    }
    // Stage 5F.16: one transactional, DB-authorised path (actor standing + branch scope + inspector eligibility + payment gate +
    // row lock + audit). The legacy in-app status check and two-step write are replaced by it.
    await assignBookingAuthoritative(userId, bookingId, staffId);
    return this.getBookingById(bookingId);
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId, reason, userId) {
    const booking = await this.getBookingById(bookingId);
    if (String(booking.customer_id) !== String(userId)) {
      throw new AppError('You do not have access to this booking', 403);
    }

    if (['closed', 'cancelled', 'no_show'].includes(booking.status)) {
      throw new AppError('Cannot cancel booking in current status', 400);
    }

    // Check if within cancellation policy
    const hoursUntil = (new Date(booking.scheduled_date) - new Date()) / (1000 * 60 * 60);
    let refundPercentage = 100;

    if (hoursUntil < 24) {
      refundPercentage = 50;
    }
    if (hoursUntil < 2) {
      refundPercentage = 0;
    }

    const refundAmount = (booking.total_price * refundPercentage) / 100;

    await db.update('inspection_bookings', bookingId, {
      status: 'cancelled',
      cancellation_reason: reason,
      status_changed_at: new Date(),
      cancelled_at: new Date(),
      updated_at: new Date(),
    });

    await this.addStatusHistory(bookingId, booking.status, 'cancelled', userId, null, `Refund: ${refundPercentage}%`);

    return {
      booking: await this.getBookingById(bookingId),
      refundAmount,
      refundPercentage,
    };
  }

  /**
   * Get customer bookings
   */
  async getCustomerBookings(customerId, filters = {}) {
    const query = { customer_id: customerId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.upcoming) {
      query.scheduled_date = { $gte: new Date().toISOString().split('T')[0] };
      query.status = { $nin: ['cancelled', 'closed'] };
    }

    const bookings = await db.find('inspection_bookings', query, {
      sort: { scheduled_date: -1, scheduled_time: -1 }
    });

    return Promise.all(bookings.map(b => this.getBookingDetails(b.id, 'customer', customerId)));
  }

  /**
   * Get provider bookings
   */
  async getInspectorBookings(userId, filters = {}) {
    // Stage 5F.16: only LIVE memberships count (confirmed + active, on an active branch). An ended, suspended or pending
    // membership no longer exposes work, and a person with memberships in several organizations sees all of their own assignments.
    const memberships = await db.find('inspection_staff', { user_id: userId, is_active: true, affiliation_status: 'confirmed' }, { limit: 50 });
    const branchIds = [...new Set(memberships.filter((m) => m.branch_id).map((m) => m.branch_id))];
    const liveBranches = new Set();
    for (const id of branchIds) { const br = await db.findById('inspection_branches', id); if (br && br.status === 'active') liveBranches.add(id); }
    const staff = memberships.filter((m) => !m.branch_id || liveBranches.has(m.branch_id));
    if (!staff.length) return { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };

    const query = { assigned_staff_id: { $in: staff.map((m) => m.id) } };
    if (filters.status) query.status = filters.status;
    if (filters.date) query.scheduled_date = filters.date;

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const bookings = await db.find('inspection_bookings', query, {
      sort: { scheduled_date: 1, scheduled_time: 1 }, skip, limit,
    });
    const total = await db.count('inspection_bookings', query);

    return {
      items: await Promise.all(bookings.map((booking) => this.getBookingDetails(booking.id, 'provider'))),
      total, page, limit, totalPages: Math.ceil(total / limit),
      staff: { id: staff[0].id, role: staff[0].role, firstName: staff[0].first_name, lastName: staff[0].last_name },
    };
  }

  async getProviderBookings(providerId, filters = {}) {
    const query = { provider_id: providerId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.date) {
      query.scheduled_date = filters.date;
    }

    if (filters.fromDate) {
      query.scheduled_date = { ...query.scheduled_date, $gte: filters.fromDate };
    }

    if (filters.toDate) {
      query.scheduled_date = { ...query.scheduled_date, $lte: filters.toDate };
    }

    if (filters.staffId) {
      query.assigned_staff_id = filters.staffId;
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const bookings = await db.find('inspection_bookings', query, {
      sort: { scheduled_date: 1, scheduled_time: 1 },
      skip,
      limit,
    });

    const total = await db.count('inspection_bookings', query);

    const items = await Promise.all(bookings.map(b => this.getBookingDetails(b.id, 'provider')));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get available time slots for a date
   */
  async getAvailableSlots(providerId, date, staffId = null) {
    const provider = await db.findById('inspection_providers', providerId);
    if (!provider) {
      throw new AppError('Provider not found', 404);
    }

    // Get business hours for the day
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const businessHours = provider.business_hours?.[dayOfWeek];

    if (!businessHours?.enabled) {
      return { slots: [], message: 'Provider not available on this day' };
    }

    // Get existing bookings for the date
    const existingBookings = await db.find('inspection_bookings', {
      provider_id: providerId,
      scheduled_date: date,
      status: { $nin: ['cancelled', 'no_show'] }
    });

    // Generate time slots (30-minute intervals)
    const slots = [];
    const [openHour, openMin] = businessHours.open.split(':').map(Number);
    const [closeHour, closeMin] = businessHours.close.split(':').map(Number);

    let currentHour = openHour;
    let currentMin = openMin;

    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

      // Check if slot is booked
      const isBooked = existingBookings.some(b => b.scheduled_time === timeStr);

      // Check if slot is in the past
      const now = new Date();
      const slotDate = new Date(`${date}T${timeStr}:00`);
      const isPast = slotDate < now;

      if (!isPast) {
        slots.push({
          time: timeStr,
          available: !isBooked,
          isPast,
        });
      }

      // Advance by 30 minutes
      currentMin += 30;
      if (currentMin >= 60) {
        currentHour += 1;
        currentMin = 0;
      }
    }

    return {
      date,
      slots,
      workingHours: businessHours,
    };
  }
}

export const bookingService = new BookingService();
export default bookingService;
