// src/api/api.js — Supabase data access layer
import { supabase } from '../lib/supabaseClient';
import { formatKES as fmtKES } from '../utils/helpers';
import { MOCK_CARS, BRANDS, TESTIMONIALS, filterMockCars, getMockCar } from '../data/mockCars';
import { dedupedFetch, clearCache } from '../utils/requestCache';

export const formatKES = fmtKES;
export { BRANDS, TESTIMONIALS };

// Transform a Supabase car row to the frontend's expected shape
function transformCar(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id,
    _id: row.id,
    bodyType: row.body_type,
    location: { city: row.location_city },
    isAuction: row.auction_status === 'live' && row.allow_bid,
    isLive: row.auction_status === 'live',
    auctionEnd: row.auction_end,
    currentBid: row.current_bid || 0,
    totalBids: row.bids_count || 0,
    image: row.images?.[0] || null,
    featured: row.is_promoted,
    dealer: row.dealer_id ? { _id: row.dealer_id } : null,
  };
}

// ─── AUTH API ──────────────────────────────────────
export const authAPI = {
  async signUp({ email, password, name, role = 'user', phone, location, businessName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, phone, location, business_name: businessName },
      },
    });
    if (error) throw { response: { status: 400, data: { message: error.message } } };

    // If dealer role, mark as needing approval
    if (role === 'dealer' && data.user) {
      await supabase
        .from('profiles')
        .update({ business_name: businessName, approved: false, role: 'dealer' })
        .eq('id', data.user.id);
    }

    return {
      token: data.session?.access_token,
      user: data.user ? await this.me() : null,
    };
  },

  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw { response: { status: 401, data: { message: error.message } } };

    // Check if banned
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.is_banned) {
      await supabase.auth.signOut();
      throw { response: { status: 403, data: { message: 'Your account has been suspended' } } };
    }

    // Update last login
    await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);

    return { token: data.session?.access_token, user: profile };
  },

  async me(signal) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw { response: { status: 500, data: { message: error.message } } };
    if (!profile) throw { response: { status: 404, data: { message: 'Profile not found' } } };
    return { user: profile };
  },

  invalidateCache() {
    clearCache();
  },

  async logout() {
    await supabase.auth.signOut();
    return { success: true };
  },

  async updateProfile(body) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.location !== undefined) updates.location = body.location;
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.business_name !== undefined) updates.business_name = body.business_name;
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { user: data };
  },

  async changePassword({ currentPassword, newPassword }) {
    if (newPassword.length < 6) {
      throw { response: { status: 400, data: { message: 'Password must be at least 6 characters' } } };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw { response: { status: 400, data: { message: error.message } } };

    await supabase.from('profiles').update({ must_change_password: false }).eq('id', (await supabase.auth.getUser()).data.user.id);
    return { message: 'Password changed' };
  },
};

// ─── CARS API ──────────────────────────────────────
export const carsAPI = {
  async list(params = {}) {
    let query = supabase
      .from('cars')
      .select('*, dealer:profiles!cars_dealer_id_fkey(id, name, business_name, dealer_rating, location, phone)', { count: 'exact' })
      .is('deleted_at', null)
      .eq('approved', true);

    if (params.brand && params.brand !== 'All Brands') query = query.eq('brand', params.brand);
    if (params.fuel && params.fuel !== 'All') query = query.eq('fuel', params.fuel);
    if (params.transmission && params.transmission !== 'All') query = query.eq('transmission', params.transmission);
    if (params.bodyType && params.bodyType !== 'All') query = query.eq('body_type', params.bodyType);
    if (params.auctionStatus === 'live') query = query.eq('auction_status', 'live');
    if (params.search) query = query.or(`title.ilike.%${params.search}%,brand.ilike.%${params.search}%`);
    if (params.priceMax) query = query.lte('price', params.priceMax);

    if (params.sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (params.sort === 'price_desc') query = query.order('price', { ascending: false });
    else if (params.sort === 'year_desc') query = query.order('year', { ascending: false });
    else query = query.order('is_promoted', { ascending: false }).order('created_at', { ascending: false });

    if (params.limit) query = query.limit(params.limit);

    const { data, error, count } = await query;
    if (error) throw { response: { status: 500, data: { message: error.message } } };

    // Fallback to mock data if no cars in database yet
    if (!data || data.length === 0) {
      return { cars: filterMockCars(params).map(c => ({ ...c, _id: c.id })), total: filterMockCars(params).length };
    }

    return { cars: data.map(transformCar), total: count };
  },

  async get(id) {
    // Try numeric ID (mock data) first
    if (/^\d+$/.test(String(id))) {
      const mock = getMockCar(Number(id));
      if (mock) return { car: { ...mock, _id: mock.id }, data: { ...mock, _id: mock.id } };
    }

    const { data, error } = await supabase
      .from('cars')
      .select('*, dealer:profiles!cars_dealer_id_fkey(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw { response: { status: 500, data: { message: error.message } } };
    if (!data) {
      // Fallback to mock
      const mock = getMockCar(Number(id));
      if (mock) return { car: { ...mock, _id: mock.id }, data: { ...mock, _id: mock.id } };
      throw { response: { status: 404, data: { message: 'Car not found' } } };
    }

    // Track view
    supabase.from('car_views').insert({ car_id: id }).then(() => {});

    return { car: transformCar(data), data: transformCar(data) };
  },

  async insights(id) {
    const { data: car } = await supabase.from('cars').select('price, brand, year').eq('id', id).maybeSingle();
    if (!car) return { data: { avgMarketPrice: 0, demand: 'unknown' } };

    const { data: similar } = await supabase
      .from('cars')
      .select('price')
      .eq('brand', car.brand)
      .neq('id', id)
      .limit(10);

    const prices = similar?.map(s => s.price) || [];
    const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : car.price;

    return {
      data: {
        avgMarketPrice: Math.round(avg),
        priceRange: { min: Math.min(...prices, car.price), max: Math.max(...prices, car.price) },
        demand: prices.length > 5 ? 'high' : prices.length > 2 ? 'medium' : 'low',
        avgDaysOnMarket: 14,
      },
    };
  },

  async trackClick(id) {
    await supabase.from('car_views').insert({ car_id: id });
    return {};
  },

  async create(formData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const carData = {
      dealer_id: user.id,
      title: formData.get('title'),
      brand: formData.get('brand'),
      model: formData.get('model') || '',
      year: Number(formData.get('year')),
      fuel: formData.get('fuel'),
      transmission: formData.get('transmission'),
      body_type: formData.get('bodyType'),
      mileage: Number(formData.get('mileage')) || 0,
      color: formData.get('color') || '',
      price: Number(formData.get('price')),
      description: formData.get('description') || '',
      features: (formData.get('features') || '').split(',').filter(Boolean),
      images: formData.get('images') ? JSON.parse(formData.get('images')) : [],
      location_city: formData.get('city') || 'Nairobi',
      auction_status: formData.get('allowBid') === 'true' ? 'draft' : 'ended',
      allow_bid: formData.get('allowBid') === 'true',
      allow_buy: formData.get('allowBuy') !== 'false',
      approved: false,
    };

    const { data, error } = await supabase.from('cars').insert(carData).select().maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { car: transformCar(data), data: transformCar(data) };
  },

  async update(id, body) {
    const { data, error } = await supabase.from('cars').update(body).eq('id', id).select().maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { car: transformCar(data), data: transformCar(data) };
  },

  async remove(id) {
    // Soft delete
    const { error } = await supabase.from('cars').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Car deleted' };
  },

  async myCars() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('dealer_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw { response: { status: 500, data: { message: error.message } } };

    if (!data || data.length === 0) {
      return { cars: MOCK_CARS.slice(0, 5).map(c => ({ ...c, _id: c.id })), data: MOCK_CARS.slice(0, 5).map(c => ({ ...c, _id: c.id })) };
    }
    return { cars: data.map(transformCar), data: data.map(transformCar) };
  },

  async listPaginated(params = {}, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabase
      .from('cars')
      .select('*, dealer:profiles!cars_dealer_id_fkey(id, name, business_name, dealer_rating, location, phone)', { count: 'exact' })
      .is('deleted_at', null)
      .eq('approved', true)
      .range(from, to);

    if (params.brand && params.brand !== 'All Brands') query = query.eq('brand', params.brand);
    if (params.fuel && params.fuel !== 'All') query = query.eq('fuel', params.fuel);
    if (params.transmission && params.transmission !== 'All') query = query.eq('transmission', params.transmission);
    if (params.bodyType && params.bodyType !== 'All') query = query.eq('body_type', params.bodyType);
    if (params.auctionStatus === 'live') query = query.eq('auction_status', 'live');
    if (params.search) query = query.or(`title.ilike.%${params.search}%,brand.ilike.%${params.search}%`);
    if (params.priceMax) query = query.lte('price', params.priceMax);

    if (params.sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (params.sort === 'price_desc') query = query.order('price', { ascending: false });
    else if (params.sort === 'year_desc') query = query.order('year', { ascending: false });
    else query = query.order('is_promoted', { ascending: false }).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw { response: { status: 500, data: { message: error.message } } };

    if (!data || data.length === 0) {
      const mockResults = filterMockCars(params);
      const paged = mockResults.slice(from, to + 1);
      return { cars: paged.map(c => ({ ...c, _id: c.id })), total: mockResults.length, page, pages: Math.ceil(mockResults.length / limit), hasMore: to < mockResults.length };
    }
    return { cars: data.map(transformCar), total: count, page, pages: Math.ceil((count || 0) / limit), hasMore: to < (count || 0) };
  },

  async analytics() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data: cars } = await supabase
      .from('cars')
      .select('id, views_count, bids_count, price, title')
      .eq('dealer_id', user.id)
      .is('deleted_at', null);

    const totalViews = cars?.reduce((a, c) => a + (c.views_count || 0), 0) || 0;
    const totalBids = cars?.reduce((a, c) => a + (c.bids_count || 0), 0) || 0;

    return {
      analytics: {
        totalCars: cars?.length || 0,
        totalViews,
        totalBids,
        viewsOverTime: Array.from({ length: 12 }, () => Math.floor(Math.random() * 500)),
      },
      data: {
        totalCars: cars?.length || 0,
        totalViews,
        totalBids,
        viewsOverTime: Array.from({ length: 12 }, () => Math.floor(Math.random() * 500)),
      },
    };
  },

  async buy(id) {
    return { success: true, checkoutRequestID: 'escrow-' + Date.now() };
  },

  async bid(id, body) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data, error } = await supabase
      .from('bids')
      .insert({ car_id: id, user_id: user.id, amount: body.amount, phone: body.phone })
      .select()
      .maybeSingle();

    if (error) throw { response: { status: 400, data: { message: error.message } } };

    // Update car's current bid and bid count
    await supabase.rpc('update_car_bid_stats', { car_id: id }).catch(() => {});

    return { bid: data, _id: data?.id };
  },

  async toggleFav(carId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('car_id', carId)
      .maybeSingle();

    if (existing) {
      await supabase.from('favorites').delete().eq('id', existing.id);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, car_id: carId });
    }

    return { message: 'Toggled' };
  },

  async adminStart(id) {
    const { data, error } = await supabase
      .from('cars')
      .update({ auction_status: 'live', auction_end: new Date(Date.now() + 86400000).toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { car: transformCar(data) };
  },

  async adminEnd(id) {
    const { data, error } = await supabase
      .from('cars')
      .update({ auction_status: 'ended' })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { car: transformCar(data) };
  },
};

// ─── BIDS API ──────────────────────────────────────
export const bidsAPI = {
  async place(carId, body) {
    return carsAPI.bid(carId, body);
  },

  async getForCar(carId) {
    const { data, error } = await supabase
      .from('bids')
      .select('*, user:profiles!bids_user_id_fkey(id, name)')
      .eq('car_id', carId)
      .order('amount', { ascending: false });

    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { bids: data || [], data: data || [] };
  },

  async endAuction(carId) {
    return carsAPI.adminEnd(carId);
  },

  async adminAll(params = {}) {
    let query = supabase
      .from('bids')
      .select('*, car:cars(id, title), user:profiles!bids_user_id_fkey(id, name, email)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.limit) query = query.limit(params.limit);

    const { data, error, count } = await query;
    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { bids: data || [], data: data || [], pagination: { total: count || 0, page: 1, limit: 50, pages: 1 }, total: count || 0 };
  },

  async adminSuspicious() {
    return { bids: [], data: [] };
  },

  async adminSetWinner(bidId) {
    const { data: bid } = await supabase.from('bids').select('car_id').eq('id', bidId).maybeSingle();
    if (bid) {
      await supabase.from('cars').update({ auction_status: 'sold' }).eq('id', bid.car_id);
    }
    return { message: 'Winner set' };
  },
};

// ─── PAYMENTS API ──────────────────────────────────
export const paymentsAPI = {
  async initiate(body) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const checkoutId = 'checkout-' + Date.now();
    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        car_id: body.carId,
        amount: body.amount,
        type: body.type || 'bid',
        phone: body.phone,
        status: 'pending',
        checkout_request_id: checkoutId,
      })
      .select()
      .maybeSingle();

    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { checkoutRequestID: checkoutId, checkoutID: checkoutId };
  },

  async status(id) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .or(`id.eq.${id},checkout_request_id.eq.${id}`)
      .maybeSingle();

    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { payment: data || { status: 'pending' } };
  },

  async myPayments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data, error } = await supabase
      .from('payments')
      .select('*, car:cars(id, title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { payments: data || [], data: data || [] };
  },

  async byCheckout(checkoutId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('checkout_request_id', checkoutId)
      .maybeSingle();
    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { payment: data };
  },
};

// ─── ESCROW API ────────────────────────────────────
export const escrowAPI = {
  async mine() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*, car:cars(id, title), buyer:profiles!escrow_transactions_buyer_id_fkey(id, name), seller:profiles!escrow_transactions_seller_id_fkey(id, name)')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { escrows: data || [], data: data || [] };
  },

  async all(params = {}) {
    let query = supabase
      .from('escrow_transactions')
      .select('*, car:cars(id, title), buyer:profiles!escrow_transactions_buyer_id_fkey(id, name), seller:profiles!escrow_transactions_seller_id_fkey(id, name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.status) query = query.eq('status', params.status);
    if (params.limit) query = query.limit(params.limit);

    const { data, error, count } = await query;
    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { escrows: data || [], data: data || [], pagination: { total: count || 0, page: 1, limit: 50, pages: 1 }, total: count || 0 };
  },

  async get(id) {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*, car:cars(id, title), buyer:profiles!escrow_transactions_buyer_id_fkey(*), seller:profiles!escrow_transactions_seller_id_fkey(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw { response: { status: 500, data: { message: error.message } } };
    if (!data) throw { response: { status: 404, data: { message: 'Escrow not found' } } };
    return { escrow: data };
  },

  async release(id) {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Escrow released', escrow: data };
  },

  async refund(id) {
    const { data, error } = await supabase
      .from('escrow_transactions')
      .update({ status: 'refunded', refunded_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Escrow refunded', escrow: data };
  },
};

// ─── DEALER API ────────────────────────────────────
export const dealerAPI = {
  async earnings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data: escrows } = await supabase
      .from('escrow_transactions')
      .select('amount, status, created_at')
      .eq('seller_id', user.id);

    const released = escrows?.filter(e => e.status === 'released').reduce((a, e) => a + e.amount, 0) || 0;
    const inEscrow = escrows?.filter(e => e.status === 'funded').reduce((a, e) => a + e.amount, 0) || 0;

    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthEscrows = escrows?.filter(e => {
        const ed = new Date(e.created_at);
        return ed.getMonth() === d.getMonth() && e.status === 'released';
      }) || [];
      return { month: d.toLocaleString('en', { month: 'short' }), amount: monthEscrows.reduce((a, e) => a + e.amount, 0) };
    }).reverse();

    return {
      earnings: { total: released, thisMonth: monthly[monthly.length - 1]?.amount || 0, inEscrow, released, pending: inEscrow, monthly },
      data: { total: released, thisMonth: monthly[monthly.length - 1]?.amount || 0, inEscrow, released, pending: inEscrow, monthly },
      monthly,
      byMonth: monthly,
    };
  },

  async cars() {
    return carsAPI.myCars();
  },

  async analytics() {
    return carsAPI.analytics();
  },

  async summary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data: cars, count } = await supabase
      .from('cars')
      .select('id, views_count, bids_count, auction_status', { count: 'exact' })
      .eq('dealer_id', user.id)
      .is('deleted_at', null);

    const { data: escrows } = await supabase
      .from('escrow_transactions')
      .select('amount, status')
      .eq('seller_id', user.id);

    const summary = {
      totalCars: count || 0,
      activeCars: cars?.filter(c => c.auction_status === 'live' || c.auction_status === 'ended').length || 0,
      totalViews: cars?.reduce((a, c) => a + (c.views_count || 0), 0) || 0,
      totalBids: cars?.reduce((a, c) => a + (c.bids_count || 0), 0) || 0,
      liveAuctions: cars?.filter(c => c.auction_status === 'live').length || 0,
      soldCars: cars?.filter(c => c.auction_status === 'sold').length || 0,
      pendingEscrows: escrows?.filter(e => e.status === 'funded').length || 0,
      totalRevenue: escrows?.filter(e => e.status === 'released').reduce((a, e) => a + e.amount, 0) || 0,
    };

    return { summary, data: summary, ...summary };
  },

  async quickStats() {
    return this.summary();
  },

  async bids() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { bids: [], pagination: { total: 0 } };

    const { data: carIds } = await supabase.from('cars').select('id').eq('dealer_id', user.id);
    if (!carIds?.length) return { bids: [], pagination: { total: 0 } };

    const { data, error, count } = await supabase
      .from('bids')
      .select('*, car:cars(id, title), user:profiles!bids_user_id_fkey(id, name)', { count: 'exact' })
      .in('car_id', carIds.map(c => c.id))
      .order('created_at', { ascending: false });

    if (error) return { bids: [], pagination: { total: 0 } };
    return { bids: data || [], pagination: { total: count || 0 } };
  },

  async escrows() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { escrows: [] };

    const { data, error } = await supabase
      .from('escrow_transactions')
      .select('*, car:cars(id, title), buyer:profiles!escrow_transactions_buyer_id_fkey(id, name)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return { escrows: [] };
    return { escrows: data || [] };
  },
};

// ─── ADMIN API ─────────────────────────────────────
export const adminAPI = {
  async stats() {
    const [usersRes, carsRes, bidsRes, escrowsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('cars').select('id', { count: 'exact' }).is('deleted_at', null),
      supabase.from('bids').select('id', { count: 'exact' }),
      supabase.from('escrow_transactions').select('amount, status'),
    ]);

    const escrowTotal = escrowsRes.data?.reduce((a, e) => a + e.amount, 0) || 0;

    const stats = {
      totalUsers: usersRes.count || 0,
      totalCars: carsRes.count || 0,
      totalBids: bidsRes.count || 0,
      escrowTotal,
      pendingApprovals: 0,
      flaggedListings: 0,
      revenue: Math.round(escrowTotal * 0.05),
    };

    // Count pending dealer approvals
    const { count: pendingCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('role', 'dealer')
      .eq('approved', false);

    stats.pendingApprovals = pendingCount || 0;

    return { stats, data: stats, ...stats };
  },

  async users(params = {}) {
    let query = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (params.role) query = query.eq('role', params.role);
    if (params.search) query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    if (params.limit) query = query.limit(params.limit);

    const { data, error, count } = await query;
    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { users: data || [], data: data || [], pagination: { total: count || 0, page: 1, limit: 50, pages: 1 }, total: count || 0 };
  },

  async toggleBan(userId) {
    const { data: user } = await supabase.from('profiles').select('is_banned').eq('id', userId).maybeSingle();
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_banned: !user?.is_banned })
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Ban toggled', user: data };
  },

  async approveDealer(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ approved: true, dealer_approved_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Dealer approved', user: data };
  },

  async cars(params = {}) {
    let query = supabase
      .from('cars')
      .select('*, dealer:profiles!cars_dealer_id_fkey(id, name, business_name)', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (params.limit) query = query.limit(params.limit);

    const { data, error, count } = await query;
    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { cars: (data || []).map(transformCar), data: (data || []).map(transformCar), pagination: { total: count || 0, page: 1, limit: 50, pages: 1 }, total: count || 0 };
  },

  async deleteCar(id) {
    return carsAPI.remove(id);
  },

  async updateSellerSettings(userId, body) {
    const { data, error } = await supabase
      .from('profiles')
      .update(body)
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Seller settings updated', user: data };
  },

  async getConfig() {
    const { data, error } = await supabase.from('system_settings').select('key, value');
    if (error) throw { response: { status: 500, data: { message: error.message } } };

    const config = {};
    data?.forEach(row => {
      try { config[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value; }
      catch { config[row.key] = row.value; }
    });

    return { config };
  },

  async updateConfig(body) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    for (const [key, value] of Object.entries(body)) {
      await supabase
        .from('system_settings')
        .upsert({ key, value: JSON.stringify(value), updated_by: user.id })
        .eq('key', key);
    }
    return { config: body, message: 'Config updated' };
  },

  async getAuditLog() {
    const { data, error, count } = await supabase
      .from('audit_logs')
      .select('*, actor:profiles!audit_logs_actor_id_fkey(id, name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { entries: data || [], pagination: { total: count || 0, page: 1, limit: 50, pages: 0 } };
  },

  async appendAuditLog(body) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({ ...body, actor_id: user?.id })
      .select()
      .maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { entry: data };
  },

  async testMpesa(body) {
    return { message: 'M-Pesa test initiated', checkoutRequestID: 'test-' + Date.now() };
  },
};

// ─── AUCTION ADMIN API ─────────────────────────────
export const auctionAdminAPI = {
  async start(carId, body) {
    const { data, error } = await supabase
      .from('cars')
      .update({
        auction_status: 'live',
        auction_end: new Date(Date.now() + (body?.durationMs || 86400000)).toISOString(),
      })
      .eq('id', carId)
      .select()
      .maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Auction started', car: transformCar(data) };
  },

  async end(carId) {
    return carsAPI.adminEnd(carId);
  },

  async extend(carId) {
    const { data: car } = await supabase.from('cars').select('auction_end').eq('id', carId).maybeSingle();
    const newEnd = new Date((car?.auction_end ? new Date(car.auction_end).getTime() : Date.now()) + 3600000).toISOString();
    const { data, error } = await supabase.from('cars').update({ auction_end: newEnd }).eq('id', carId).select().maybeSingle();
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Auction extended', car: transformCar(data) };
  },

  async bidHistory(carId) {
    return bidsAPI.getForCar(carId);
  },

  async setWinner(bidId) {
    return bidsAPI.adminSetWinner(bidId);
  },
};

// ─── FAVORITES API ─────────────────────────────────
export const favoritesAPI = {
  async list() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data, error } = await supabase
      .from('favorites')
      .select('car:cars!favorites_car_id_fkey(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw { response: { status: 500, data: { message: error.message } } };

    const cars = data?.map(f => transformCar(f.car)).filter(Boolean) || [];
    return { favorites: cars, data: cars };
  },

  async add(carId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const { error } = await supabase.from('favorites').insert({ user_id: user.id, car_id: carId });
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Added' };
  },

  async remove(carId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('car_id', carId);
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Removed' };
  },

  async toggle(carId) {
    return carsAPI.toggleFav(carId);
  },
};

// ─── CHAT API ──────────────────────────────────────
export const chatAPI = {
  async inbox() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data, error } = await supabase
      .from('conversations')
      .select('*, car:cars(id, title), buyer:profiles!conversations_buyer_id_fkey(id, name), seller:profiles!conversations_seller_id_fkey(id, name)')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw { response: { status: 500, data: { message: error.message } } };

    const chats = (data || []).map(c => ({
      ...c,
      participants: [
        { _id: c.buyer?.id, name: c.buyer?.name },
        { _id: c.seller?.id, name: c.seller?.name },
      ],
      unreadCount: c.buyer_id === user.id ? c.buyer_unread_count : c.seller_unread_count,
    }));

    return { chats, data: chats };
  },

  async start(body) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    // Check for existing conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('buyer_id', user.id)
      .eq('seller_id', body.participantId)
      .eq('car_id', body.carId)
      .maybeSingle();

    if (existing) return { chat: existing, _id: existing.id };

    const { data, error } = await supabase
      .from('conversations')
      .insert({ buyer_id: user.id, seller_id: body.participantId, car_id: body.carId })
      .select()
      .maybeSingle();

    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { chat: data, _id: data?.id };
  },

  async messages(chatId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { messages: data || [], data: data || [] };
  },

  async send(chatId, body) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: chatId, sender_id: user.id, message: body.message })
      .select()
      .maybeSingle();

    if (error) throw { response: { status: 400, data: { message: error.message } } };

    // Update conversation
    await supabase
      .from('conversations')
      .update({ last_message: body.message, last_message_at: new Date().toISOString() })
      .eq('id', chatId);

    return { message: data };
  },

  async seen(chatId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data: conv } = await supabase.from('conversations').select('buyer_id, seller_id').eq('id', chatId).maybeSingle();
    if (!conv) return {};

    const updates = {};
    if (conv.buyer_id === user.id) updates.buyer_unread_count = 0;
    if (conv.seller_id === user.id) updates.seller_unread_count = 0;

    await supabase.from('conversations').update(updates).eq('id', chatId);
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', chatId).neq('sender_id', user.id).is('read_at', null);

    return {};
  },

  async leave(chatId) {
    const { error } = await supabase.from('conversations').delete().eq('id', chatId);
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return { message: 'Chat deleted' };
  },
};

// ─── NOTIFICATIONS API ─────────────────────────────
export const notifAPI = {
  async list(params = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (params.limit) query = query.limit(params.limit);

    const { data, error } = await query;
    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { notifications: data || [], data: data || [] };
  },

  async markRead(id) {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return {};
  },

  async markAllRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return {};
  },

  async remove(id) {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return {};
  },
};

// ─── REVIEWS API ───────────────────────────────────
export const reviewsAPI = {
  async create(body) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data, error } = await supabase
      .from('reviews')
      .insert({ reviewer_id: user.id, dealer_id: body.dealer, car_id: body.carId, rating: body.rating, comment: body.comment })
      .select()
      .maybeSingle();

    if (error) throw { response: { status: 400, data: { message: error.message } } };

    // Update dealer rating
    const { data: reviews } = await supabase.from('reviews').select('rating').eq('dealer_id', body.dealer);
    if (reviews?.length) {
      const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
      await supabase.from('profiles').update({ dealer_rating: Math.round(avg * 10) / 10, review_count: reviews.length }).eq('id', body.dealer);
    }

    return { review: data };
  },

  async mine() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data, error } = await supabase
      .from('reviews')
      .select('*, dealer:profiles!reviews_dealer_id_fkey(id, name)')
      .eq('reviewer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { reviews: data || [], data: data || [] };
  },

  async forDealer(dealerId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, name)')
      .eq('dealer_id', dealerId)
      .order('created_at', { ascending: false });

    if (error) throw { response: { status: 500, data: { message: error.message } } };

    // Return with both reviewer and user fields for compatibility
    const reviews = (data || []).map(r => ({ ...r, user: r.reviewer }));
    return { reviews, data: reviews };
  },

  async remove(id) {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) throw { response: { status: 400, data: { message: error.message } } };
    return {};
  },
};

// ─── TRANSACTIONS API ──────────────────────────────
export const transactionsAPI = {
  async list() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data, error, count } = await supabase
      .from('payments')
      .select('*, car:cars(id, title)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { transactions: data || [], data: data || [], pagination: { total: count || 0, page: 1, limit: 20, pages: 0 }, total: count || 0 };
  },

  async get(id) {
    const { data, error } = await supabase.from('payments').select('*').eq('id', id).maybeSingle();
    if (error) throw { response: { status: 500, data: { message: error.message } } };
    return { transaction: data };
  },

  async summary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };

    const { data } = await supabase.from('payments').select('amount, status').eq('user_id', user.id);
    const total = data?.reduce((a, p) => a + p.amount, 0) || 0;
    const pending = data?.filter(p => p.status === 'pending').reduce((a, p) => a + p.amount, 0) || 0;
    const completed = data?.filter(p => p.status === 'success').reduce((a, p) => a + p.amount, 0) || 0;

    return { summary: { total, pending, completed } };
  },
};

// ─── INSPECTION API (mock for frontend-only use) ──
export const inspectionAPI = {
  async myTasks() {
    return { tasks: [
      { _id: 'insp-001', car: { title: 'Toyota Prado TX', brand: 'Toyota', year: 2022, images: [''] }, status: 'pending_payment', buyer: { name: 'James K.' }, createdAt: '2026-07-10', packageType: 'standard', amount: 3500 },
      { _id: 'insp-002', car: { title: 'Honda CR-V', brand: 'Honda', year: 2021, images: [''] }, status: 'assigned', buyer: { name: 'Grace W.' }, createdAt: '2026-07-09', packageType: 'premium', amount: 5500, inspector: { name: 'Sarah M.' } },
      { _id: 'insp-003', car: { title: 'Nissan X-Trail', brand: 'Nissan', year: 2023, images: [''] }, status: 'in_progress', buyer: { name: 'Peter O.' }, createdAt: '2026-07-08', packageType: 'standard', amount: 3500, inspector: { name: 'John D.' }, progress: 45 },
      { _id: 'insp-004', car: { title: 'Mazda CX-5', brand: 'Mazda', year: 2022, images: [''] }, status: 'completed', buyer: { name: 'Aisha M.' }, createdAt: '2026-07-07', packageType: 'premium', amount: 5500, inspector: { name: 'Sarah M.' }, completedAt: '2026-07-10' },
      { _id: 'insp-005', car: { title: 'Subaru Outback', brand: 'Subaru', year: 2021, images: [''] }, status: 'pending_payment', buyer: { name: 'John K.' }, createdAt: '2026-07-11', packageType: 'standard', amount: 3500 },
    ] };
  },
  async start(id) { return { message: 'Inspection started' }; },
  async submit(id, body) { return { message: 'Inspection submitted' }; },
  list: () => inspectionAPI.myTasks(),
  availableInspectors: () => ({ inspectors: [
    { _id: 'insp-01', name: 'Sarah M.', rating: 4.9, completed: 128 },
    { _id: 'insp-02', name: 'John D.', rating: 4.7, completed: 94 },
    { _id: 'insp-03', name: 'Peter K.', rating: 4.5, completed: 52 },
  ] }),
  assign: (id, inspectorId) => ({ message: 'Inspector assigned' }),
};

// Re-export mock data for fallback
export { MOCK_CARS, filterMockCars, getMockCar };
