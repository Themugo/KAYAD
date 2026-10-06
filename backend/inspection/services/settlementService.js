// ============================================================
// KAYAD INSPECTION MARKETPLACE - SETTLEMENT SERVICE
// ============================================================

import db from './dbAdapter.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import { getSupabase } from '../../utils/supabase.js';

/**
 * Generate settlement reference
 */
const generateSettlementReference = () => {
  const prefix = 'KAYAD-SET';
  const month = new Date().toISOString().slice(0, 7).replace('-', '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${month}-${random}`;
};

/**
 * Settlement Service - Handles provider payments
 */
class SettlementService {
  /**
   * Get provider commission rate
   */
  async getProviderCommission(providerId) {
    const provider = await db.findById('inspection_providers', providerId);
    if (!provider) {
      throw new AppError('Provider not found', 404);
    }
    return provider.commission_rate || 15.0;
  }

  /**
   * Process payment for booking
   */
  async processPayment(bookingId, paymentData) {
    const { data, error } = await getSupabase().rpc('kayad_process_inspection_payment_atomic', {
      p_booking_id: bookingId,
      p_payment_method: paymentData.method || null,
      p_payment_reference: paymentData.reference || null,
      p_user_id: paymentData.userId || null,
    });
    if (error) {
      logError('Inspection payment failed', error, { bookingId });
      throw new AppError(error.message || 'Inspection payment failed', 409);
    }
    return data;
  }

  /**
   * Process refund
   */
  async processRefund(bookingId, refundData, userId) {
    const { data, error } = await getSupabase().rpc('kayad_process_inspection_refund_atomic', {
      p_booking_id: bookingId,
      p_amount: refundData.amount,
      p_reason: refundData.reason || null,
      p_user_id: userId,
    });
    if (error) {
      logError('Inspection refund failed', error, { bookingId });
      throw new AppError(error.message || 'Inspection refund failed', 409);
    }
    return data;
  }

  /**
   * Generate settlement for provider
   */
  async generateSettlement(providerId, periodStart, periodEnd, userId = null) {
    const { data, error } = await getSupabase().rpc('kayad_generate_inspection_settlement_atomic', {
      p_provider_id: providerId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_user_id: userId,
    });
    if (error) {
      logError('Inspection settlement generation failed', error, { providerId, periodStart, periodEnd });
      throw new AppError(error.message || 'Inspection settlement generation failed', 409);
    }
    return data?.settlement || data;
  }

  /**
   * Get provider transactions
   */
  async getProviderTransactions(providerId, filters = {}) {
    const query = { provider_id: providerId };

    if (filters.type) {
      query.transaction_type = filters.type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.fromDate) {
      query.created_at = { $gte: new Date(filters.fromDate) };
    }

    if (filters.toDate) {
      query.created_at = { ...query.created_at, $lte: new Date(filters.toDate) };
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const skip = (page - 1) * limit;

    const transactions = await db.find('inspection_transactions', query, {
      sort: { created_at: -1 },
      skip,
      limit,
    });

    const total = await db.count('inspection_transactions', query);

    return {
      items: transactions.map(t => ({
        id: t.id,
        type: t.transaction_type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        description: t.description,
        reference: t.reference,
        bookingId: t.booking_id,
        settlementId: t.settlement_id,
        createdAt: t.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get provider settlements
   */
  async getProviderSettlements(providerId, filters = {}) {
    const query = { provider_id: providerId };

    if (filters.status) {
      query.status = filters.status;
    }

    const settlements = await db.find('inspection_settlements', query, {
      sort: { created_at: -1 },
    });

    return settlements.map(s => ({
      id: s.id,
      reference: s.settlement_reference,
      periodStart: s.period_start,
      periodEnd: s.period_end,
      grossAmount: s.gross_amount,
      commissionAmount: s.commission_amount,
      taxAmount: s.tax_amount,
      netAmount: s.net_amount,
      currency: s.currency,
      status: s.status,
      bookingsCount: s.bookings_count,
      paidAt: s.paid_at,
      createdAt: s.created_at,
    }));
  }

  /**
   * Mark settlement as paid
   */
  async markSettlementPaid(settlementId, paymentData, userId = null) {
    const { data, error } = await getSupabase().rpc('kayad_mark_inspection_settlement_paid_atomic', {
      p_settlement_id: settlementId,
      p_payment_method: paymentData.method || null,
      p_payment_reference: paymentData.reference || null,
      p_user_id: userId,
    });
    if (error) {
      logError('Inspection settlement payout failed', error, { settlementId });
      throw new AppError(error.message || 'Inspection settlement payout failed', 409);
    }
    return data;
  }

  /**
   * Get earnings summary
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

    const provider = await db.findById('inspection_providers', providerId);
    const commissionRate = provider.commission_rate || 15;

    // Get all transactions in period
    const transactions = await db.find('inspection_transactions', {
      provider_id: providerId,
      created_at: { $gte: startDate }
    });

    let totalEarnings = 0;
    let totalCommission = 0;
    let totalPaid = 0;
    let totalPending = 0;

    for (const t of transactions) {
      if (t.transaction_type === 'inspection_payment') {
        totalEarnings += parseFloat(t.amount);
      } else if (t.transaction_type === 'commission') {
        totalCommission += Math.abs(parseFloat(t.amount));
      } else if (t.transaction_type === 'payout' && t.status === 'completed') {
        totalPaid += parseFloat(t.amount);
      } else if (t.transaction_type === 'refund') {
        totalEarnings -= Math.abs(parseFloat(t.amount));
      }
    }

    // Calculate net earnings (earnings - commission)
    const netEarnings = totalEarnings - totalCommission;

    // Pending = net earnings - paid
    const settlements = await db.find('inspection_settlements', {
      provider_id: providerId,
      status: 'pending'
    });
    totalPending = settlements.reduce((sum, s) => sum + parseFloat(s.net_amount), 0);

    return {
      period,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      netEarnings: Math.round(netEarnings * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      commissionRate,
      currency: 'KES',
    };
  }
}

export const settlementService = new SettlementService();
export default settlementService;
