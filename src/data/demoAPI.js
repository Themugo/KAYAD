import {
  DEMO_USERS, DEMO_CARS, DEMO_BIDS, DEMO_PAYMENTS, DEMO_ESCROWS,
  DEMO_NOTIFICATIONS, DEMO_REVIEWS, DEMO_CHATS, DEMO_MESSAGES,
  DEMO_DEALER_STATS, DEMO_ADMIN_STATS, DEMO_ADMIN_USERS,
  filterDemoCars, getDemoCar, addDemoCar, updateDemoCar, removeDemoCar,
} from './demoData';

// ─── Helpers ──────────────────────────────────────────────────────
const delay = (min = 200, max = 800) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

const fakeJWT = (user) =>
  btoa(JSON.stringify({ _id: user._id, email: user.email, role: user.role, name: user.name, superAdmin: user.superAdmin || false }));

const decodeFakeJWT = (token) => {
  try { return JSON.parse(atob(token)); } catch { return null; }
};

const getDemoUser = () => {
  const token = localStorage.getItem('kayad_token');
  if (!token) return null;
  const decoded = decodeFakeJWT(token);
  if (!decoded) return null;
  return Object.values(DEMO_USERS).find(u => u._id === decoded._id) || null;
};

const withUser = (fn) => (...args) => {
  const user = getDemoUser();
  if (!user) return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });
  return fn(user, ...args);
};

const wrapSuccess = (data) => ({ success: true, ...data });

const makeEmail = (name) =>
  `${name?.toLowerCase().replace(/[^a-z]/g, '')}@kayad.space`;

const transformCar = (c) => ({
  ...c,
  model: c.model || c.title?.split(' ').slice(1).slice(0, -1).join(' ') || c.brand,
  dealerPhone: c.dealer?.phone || c.dealerPhone || '2547XXXXXX',
  trustScore: c.trustScore ?? Math.round(85 + Math.random() * 15),
  images: c.images,
  dealer: c.dealer ? {
    ...c.dealer,
    id: c.dealer._id,
    email: c.dealer.email || makeEmail(c.dealer.name || c.dealer.businessName),
  } : c.dealer,
});

const transformReview = (r) => ({
  ...r,
  reviewer: r.user,
});

// ─── Demo Auth API ────────────────────────────────────────────────
const demoAuth = {
  register: async (body) => {
    await delay();
    const exists = Object.values(DEMO_USERS).find(u => u.email === body.email);
    if (exists) throw { response: { status: 400, data: { message: 'Email already registered' } } };
    const newUser = {
      _id: 'demo-user-' + Date.now(),
      name: body.name || body.email.split('@')[0],
      email: body.email,
      role: body.role || 'user',
      phone: body.phone || '',
      location: body.location || '',
      businessName: body.businessName || '',
      isBanned: false,
      approved: true,
      createdAt: new Date().toISOString(),
      tokenVersion: 0,
    };
    const token = fakeJWT(newUser);
    return wrapSuccess({ token, user: newUser });
  },

  login: async (body) => {
    await delay();
    const user = Object.values(DEMO_USERS).find(u => u.email === body.email && u.password === body.password);
    if (!user) throw { response: { status: 401, data: { message: 'Invalid email or password' } } };
    if (user.isBanned) throw { response: { status: 403, data: { message: 'Your account has been suspended' } } };
    const token = fakeJWT(user);
    const { password, ...safe } = user;
    return wrapSuccess({ token, user: safe });
  },

  refresh: async () => {
    await delay(100, 300);
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Token expired' } } };
    const token = fakeJWT(user);
    return wrapSuccess({ token });
  },

  logout: async () => {
    await delay(100, 300);
    return wrapSuccess({ message: 'Logged out' });
  },

  profile: async () => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const { password, ...safe } = user;
    return wrapSuccess({ user: safe });
  },

  me: async () => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const { password, ...safe } = user;
    return wrapSuccess({ user: safe });
  },

  updateProfile: async (body) => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    Object.assign(user, body);
    const { password, ...safe } = user;
    return wrapSuccess({ user: safe });
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    if (user.password !== currentPassword) {
      throw { response: { status: 400, data: { message: 'Current password is incorrect' } } };
    }
    if (newPassword.length < 6) {
      throw { response: { status: 400, data: { message: 'New password must be at least 6 characters' } } };
    }
    user.password = newPassword;
    user.mustChangePassword = false;
    const { password, ...safe } = user;
    const token = fakeJWT(user);
    return wrapSuccess({ token, user: safe, message: 'Password changed successfully' });
  },
};

// ─── Demo Cars API ────────────────────────────────────────────────
const demoDealerCars = (userId) => DEMO_CARS.filter(c => c.dealer?._id === (userId || 'demo-dealer-1'));

const demoCars = {
  list: async (params = {}) => {
    await delay();
    return wrapSuccess(filterDemoCars(params));
  },

  get: async (id) => {
    await delay();
    const car = getDemoCar(id);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    return wrapSuccess({ car: transformCar(car), data: transformCar(car) });
  },

  insights: async (id) => {
    await delay();
    const car = getDemoCar(id);
    return wrapSuccess({
      data: {
        avgMarketPrice: car ? Math.round(car.price * 1.05) : 5000000,
        priceRange: { min: 2000000, max: 20000000 },
        demand: 'high',
        avgDaysOnMarket: 14,
      },
    });
  },

  trackClick: async () => { await delay(50, 150); return wrapSuccess({}); },

  create: async (formData) => {
    await delay(500, 1200);
    const user = getDemoUser();
    if (!user || !['dealer', 'admin', 'superadmin'].includes(user.role)) {
      throw { response: { status: 403, data: { message: 'Only dealers can create listings' } } };
    }
      const images = [];
      try {
        const files = formData.getAll('images');
        for (const f of files) {
          if (f instanceof File && f.size > 0) images.push(URL.createObjectURL(f));
        }
      } catch { /* formData may not have images field - OK */ }
      const newCar = {
        _id: 'demo-car-' + Date.now(),
        title: formData.get('title') || 'New Listing',
        brand: formData.get('brand') || 'Toyota',
        price: Number(formData.get('price')) || 1000000,
        year: Number(formData.get('year')) || 2020,
        fuel: formData.get('fuel') || 'Petrol',
        transmission: formData.get('transmission') || 'Automatic',
        mileage: Number(formData.get('mileage')) || 0,
        bodyType: formData.get('bodyType') || 'SUV',
        color: formData.get('color') || 'Black',
        description: formData.get('description') || '',
        features: (formData.get('features') || '').split(',').filter(Boolean),
        images,
        views: 0,
        bidsCount: 0,
        currentBid: 0,
        allowBid: formData.get('allowBid') === 'true',
        allowBuy: formData.get('allowBuy') !== 'false',
        auctionStatus: 'draft',
        isPromoted: false,
        isVerifiedDealer: true,
        dealer: { _id: user._id, name: user.businessName || user.name, dealerRating: 4.5 },
        location: { city: formData.get('city') || 'Nairobi' },
        createdAt: new Date().toISOString(),
        coverImage: Number(formData.get('coverImage')) || 0,
      };
      addDemoCar(newCar);
      return wrapSuccess({ car: transformCar(newCar), data: transformCar(newCar) });
  },

  update: async (id, body) => {
    await delay(300, 800);
    const car = getDemoCar(id);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    const user = getDemoUser();
    if (user?.role !== 'superadmin' && user?._id !== car.dealer?._id) {
      throw { response: { status: 403, data: { message: 'You can only edit your own listings' } } };
    }
      updateDemoCar(id, body);
      const updated = getDemoCar(id);
      return wrapSuccess({ car: transformCar(updated), data: transformCar(updated) });
  },

  remove: async (id) => {
    await delay(200, 500);
      const car = getDemoCar(id);
      if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
      removeDemoCar(id);
      return wrapSuccess({ message: 'Car deleted' });
  },

  myCars: async () => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const cars = demoDealerCars(user._id);
    return wrapSuccess({ cars: cars.map(transformCar), data: cars.map(transformCar) });
  },

  analytics: async () => {
    await delay();
    return wrapSuccess({ analytics: DEMO_DEALER_STATS.analytics, data: DEMO_DEALER_STATS.analytics });
  },

  buy: async (id) => {
    await delay();
    const car = getDemoCar(id);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    return wrapSuccess({ success: true, checkoutRequestID: 'demo-checkout-' + Date.now() });
  },

  bid: async (id, body) => {
    await delay();
    const car = getDemoCar(id);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    return wrapSuccess({ bid: { _id: 'demo-bid-' + Date.now() }, _id: 'demo-bid-' + Date.now() });
  },

  toggleFav: async () => {
    await delay(100, 300);
    return wrapSuccess({ message: 'Toggled' });
  },

  fraudCheck: async () => {
    await delay();
    return wrapSuccess({ risk: 'low', flags: [], score: 15 });
  },

  adminStart: async (id) => {
    await delay();
    return wrapSuccess({ message: 'Auction started', car: transformCar({ ...getDemoCar(id), auctionStatus: 'live' }) });
  },

  adminEnd: async (id) => {
    await delay();
    return wrapSuccess({ message: 'Auction ended', car: transformCar({ ...getDemoCar(id), auctionStatus: 'ended' }) });
  },
};

// ─── Demo Bids API ────────────────────────────────────────────────
const demoBids = {
  place: async (carId, body) => {
    await delay();
    const car = getDemoCar(carId);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    const user = getDemoUser();
    const newBid = {
      _id: 'demo-bid-' + Date.now(),
      car: carId,
      amount: body.amount,
      user: { _id: user?._id || 'unknown', name: user?.name || 'Bidder' },
      phone: body.phone || '2547XXXXXX',
      mpesaPaid: false,
      createdAt: new Date().toISOString(),
    };
    return wrapSuccess({ bid: newBid, _id: newBid._id });
  },

  getForCar: async (carId) => {
    await delay();
    const bids = DEMO_BIDS.filter(b => b.car === carId);
    return wrapSuccess({ bids, data: bids });
  },

  endAuction: async (carId) => {
    await delay();
    return wrapSuccess({ message: 'Auction ended' });
  },

  adminAll: async (params = {}) => {
    await delay();
    const bids = DEMO_BIDS;
    const total = bids.length;
    return wrapSuccess({ bids, data: bids, pagination: { total, page: 1, limit: params.limit || 50, pages: 1 }, total });
  },

  adminSuspicious: async () => {
    await delay();
    return wrapSuccess({ bids: [], data: [] });
  },

  adminSetWinner: async () => {
    await delay();
    return wrapSuccess({ message: 'Winner set' });
  },
};

// ─── Demo Payments API ────────────────────────────────────────────
const demoPayments = {
  initiate: async (body) => {
    await delay(500, 1500);
    const checkoutId = 'demo-checkout-' + Date.now();
    return wrapSuccess({ checkoutRequestID: checkoutId, checkoutID: checkoutId });
  },

  status: async (id) => {
    await delay();
    const payment = DEMO_PAYMENTS.find(p => p.checkoutRequestID === id || p._id === id);
    return wrapSuccess({
      payment: payment || { _id: id, status: 'success', amount: 0 },
    });
  },

  myPayments: async () => {
    await delay();
    const user = getDemoUser();
    const payments = DEMO_PAYMENTS.filter(p => p.user === user?._id);
    return wrapSuccess({ payments, data: payments });
  },

  byCheckout: async (checkoutId) => {
    await delay();
    const payment = DEMO_PAYMENTS.find(p => p.checkoutRequestID === checkoutId || p._id === checkoutId);
    return wrapSuccess({
      payment: payment || { _id: checkoutId, status: 'success', amount: 0 },
    });
  },
};

// ─── Demo Escrow API ──────────────────────────────────────────────
const demoEscrow = {
  mine: async () => {
    await delay();
    const user = getDemoUser();
    const escrows = DEMO_ESCROWS.filter(e =>
      e.buyer?._id === user?._id || e.seller?._id === user?._id
    );
    return wrapSuccess({ escrows, data: escrows });
  },

  all: async (params = {}) => {
    await delay();
    let escrows = DEMO_ESCROWS;
    if (params.status) escrows = escrows.filter(e => e.status === params.status);
    const total = escrows.length;
    return wrapSuccess({ escrows, data: escrows, pagination: { total, page: 1, limit: params.limit || 50, pages: 1 }, total });
  },

  get: async (id) => {
    await delay();
    const escrow = DEMO_ESCROWS.find(e => e._id === id);
    if (!escrow) throw { response: { status: 404, data: { message: 'Escrow not found' } } };
    return wrapSuccess({ escrow });
  },

  release: async () => {
    await delay();
    return wrapSuccess({ message: 'Escrow released' });
  },

  refund: async () => {
    await delay();
    return wrapSuccess({ message: 'Escrow refunded' });
  },
};

// ─── Demo Dealer API ──────────────────────────────────────────────
const demoDealer = {
  earnings: async () => {
    await delay();
    return wrapSuccess({
      earnings: DEMO_DEALER_STATS.earnings,
      data: DEMO_DEALER_STATS.earnings,
      monthly: [{ month: 'Jan', amount: 2000000 }, { month: 'Feb', amount: 3500000 }, { month: 'Mar', amount: 4100000 }],
      byMonth: [{ month: 'Jan', amount: 2000000 }, { month: 'Feb', amount: 3500000 }, { month: 'Mar', amount: 4100000 }],
    });
  },

  cars: async (params = {}) => {
    await delay();
    const user = getDemoUser();
    const cars = demoDealerCars(user?._id);
    return wrapSuccess({ cars: cars.map(transformCar), data: cars.map(transformCar) });
  },

  analytics: async () => {
    await delay();
    return wrapSuccess({
      analytics: DEMO_DEALER_STATS.analytics,
      data: DEMO_DEALER_STATS.analytics,
      topCars: DEMO_CARS.slice(0, 5).map(transformCar),
      cars: DEMO_CARS.slice(0, 5).map(transformCar),
    });
  },

  summary: async () => {
    await delay();
    return wrapSuccess({
      summary: DEMO_DEALER_STATS.summary,
      data: DEMO_DEALER_STATS.summary,
      ...DEMO_DEALER_STATS.summary,
    });
  },

  quickStats: async () => {
    await delay();
    return wrapSuccess(DEMO_DEALER_STATS.summary);
  },
};

// ─── Demo Admin API ───────────────────────────────────────────────
const demoAdmin = {
  stats: async () => {
    await delay();
    return wrapSuccess({
      stats: DEMO_ADMIN_STATS.stats,
      data: DEMO_ADMIN_STATS.stats,
      ...DEMO_ADMIN_STATS.stats,
    });
  },

  users: async (params = {}) => {
    await delay();
    let users = [...DEMO_ADMIN_USERS];
    if (params.role) users = users.filter(u => u.role === params.role);
    if (params.search) {
      const q = params.search.toLowerCase();
      users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    const total = users.length;
    return wrapSuccess({ users, data: users, pagination: { total, page: 1, limit: params.limit || 50, pages: 1 }, total });
  },

  toggleBan: async () => {
    await delay();
    return wrapSuccess({ message: 'Ban toggled' });
  },

  approveDealer: async () => {
    await delay();
    return wrapSuccess({ message: 'Dealer approved' });
  },

  cars: async (params = {}) => {
    await delay();
    let cars = DEMO_CARS;
    const total = cars.length;
    return wrapSuccess({ cars: cars.map(transformCar), data: cars.map(transformCar), pagination: { total, page: 1, limit: params.limit || 50, pages: 1 }, total });
  },

  deleteCar: async () => {
    await delay();
    return wrapSuccess({ message: 'Car deleted' });
  },

  updateSellerSettings: async (userId, body) => {
    await delay();
    const user = DEMO_ADMIN_USERS.find(u => u._id === userId) || {};
    const updated = { ...user, ...body };
    return wrapSuccess({ message: 'Seller settings updated', user: updated });
  },

  getConfig: async () => {
    await delay();
    return wrapSuccess({ config: { platformName: 'Kayad', dealerCommission: 5, bidCommitmentPct: 5, dealerTrialDays: 14, waivePayments: true, freeMarket: false, listingFee: 0, fontDisplay: 'Cormorant Garamond', fontBody: 'DM Sans', fontSizePct: 100 } });
  },

  updateConfig: async (body) => {
    await delay();
    return wrapSuccess({ config: body, message: 'Config updated' });
  },

  getAuditLog: async (params = {}) => {
    await delay();
    return wrapSuccess({ entries: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } });
  },

  appendAuditLog: async (body) => {
    await delay();
    return wrapSuccess({ entry: { ...body, _id: 'demo-audit-' + Date.now(), createdAt: new Date().toISOString() } });
  },

  testMpesa: async (body) => {
    await delay(1000, 2000);
    return wrapSuccess({ message: 'STK push sent', checkoutRequestID: 'demo-checkout-' + Date.now() });
  },

  moderateCar: async (carId, body) => {
    await delay();
    const action = body.action;
    return wrapSuccess({ message: `Listing ${action}d successfully.`, car: { _id: carId, status: action === 'approve' ? 'active' : 'rejected' } });
  },
};

// ─── Demo Auction Admin API ───────────────────────────────────────
const demoAuctionAdmin = {
  start: async (carId, body) => {
    await delay();
    return wrapSuccess({ message: 'Auction started', car: transformCar({ ...getDemoCar(carId), auctionStatus: 'live', auctionEnd: body?.duration ? new Date(Date.now() + body.duration).toISOString() : new Date(Date.now() + 86400000).toISOString() }) });
  },
  end: async (carId) => {
    await delay();
    return wrapSuccess({ message: 'Auction ended', car: transformCar({ ...getDemoCar(carId), auctionStatus: 'ended' }) });
  },
  extend: async (carId, body) => {
    await delay();
    return wrapSuccess({ message: 'Auction extended', car: transformCar(getDemoCar(carId)) });
  },
  bidHistory: async (carId) => {
    await delay();
    const bids = DEMO_BIDS.filter(b => b.car === carId);
    return wrapSuccess({ bids, data: bids });
  },
  setWinner: async (carId, bidId) => {
    await delay();
    return wrapSuccess({ message: 'Winner set' });
  },
};

// ─── Demo Favorites API ───────────────────────────────────────────
const demoFavorites = {
  list: async () => {
    await delay();
    return wrapSuccess({ favorites: DEMO_CARS.slice(0, 2).map(transformCar), data: DEMO_CARS.slice(0, 2).map(transformCar) });
  },
  add: async () => {
    await delay(100, 300);
    return wrapSuccess({ message: 'Added to favorites' });
  },
  remove: async () => {
    await delay(100, 300);
    return wrapSuccess({ message: 'Removed from favorites' });
  },
  toggle: async () => {
    await delay(100, 300);
    return wrapSuccess({ message: 'Toggled' });
  },
};

// ─── Demo Chat API ────────────────────────────────────────────────
const demoChat = {
  inbox: async () => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const chats = DEMO_CHATS.filter(c =>
      c.participants.some(p => p._id === user._id)
    );
    return wrapSuccess({ chats, data: chats });
  },

  start: async (body) => {
    await delay();
    const user = getDemoUser();
    const dealer = DEMO_USERS.dealer;
    const car = getDemoCar(body.carId);
    const newChat = {
      _id: 'demo-chat-' + Date.now(),
      participants: [
        { _id: user?._id || 'unknown', name: user?.name || 'Buyer' },
        { _id: body.participantId || dealer._id, name: dealer.businessName || 'Dealer' },
      ],
      car: { _id: car?._id || body.carId, title: car?.title || 'Vehicle' },
      lastMessage: { message: 'Chat started', createdAt: new Date().toISOString() },
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };
    return wrapSuccess({ chat: newChat, _id: newChat._id });
  },

  messages: async (chatId) => {
    await delay();
    const msgs = DEMO_MESSAGES[chatId] || [];
    return wrapSuccess({ messages: msgs, data: msgs });
  },

  send: async (chatId, body) => {
    await delay();
    const user = getDemoUser();
    const newMsg = {
      _id: 'demo-msg-' + Date.now(),
      chatId,
      sender: user?._id || 'unknown',
      message: body.message,
      createdAt: new Date().toISOString(),
    };
    return wrapSuccess({ message: newMsg });
  },

  seen: async () => {
    await delay(50, 150);
    return wrapSuccess({});
  },

  leave: async () => {
    await delay();
    return wrapSuccess({ message: 'Chat deleted' });
  },
};

// ─── Demo Notifications API ───────────────────────────────────────
const demoNotif = {
  list: async (params = {}) => {
    await delay();
    const user = getDemoUser();
    let notifs = DEMO_NOTIFICATIONS.filter(n => n.user === user?._id);
    if (params.limit) notifs = notifs.slice(0, Number(params.limit));
    return wrapSuccess({ notifications: notifs, data: notifs });
  },

  markRead: async () => {
    await delay(100, 300);
    return wrapSuccess({});
  },

  markAllRead: async () => {
    await delay(100, 300);
    return wrapSuccess({});
  },

  remove: async () => {
    await delay(100, 300);
    return wrapSuccess({});
  },
};

// ─── Demo Reviews API ─────────────────────────────────────────────
const demoReviews = {
  create: async (body) => {
    await delay();
    const user = getDemoUser();
    const newReview = {
      _id: 'demo-rev-' + Date.now(),
      user: { _id: user?._id || 'unknown', name: user?.name || 'Anonymous' },
      reviewer: { _id: user?._id || 'unknown', name: user?.name || 'Anonymous' },
      dealer: body.dealer,
      car: body.carId,
      rating: body.rating,
      comment: body.comment,
      createdAt: new Date().toISOString(),
    };
    return wrapSuccess({ review: newReview });
  },

  mine: async () => {
    await delay();
    const user = getDemoUser();
    const reviews = DEMO_REVIEWS.filter(r => r.user?._id === user?._id);
    return wrapSuccess({ reviews: reviews.map(transformReview), data: reviews.map(transformReview) });
  },

  forDealer: async (dealerId) => {
    await delay();
    const reviews = DEMO_REVIEWS.filter(r => r.dealer === dealerId);
    return wrapSuccess({ reviews: reviews.map(transformReview), data: reviews.map(transformReview) });
  },

  remove: async () => {
    await delay(100, 300);
    return wrapSuccess({});
  },
};

// ─── Demo Transactions API ────────────────────────────────────────
const demoTransactions = {
  list: async () => {
    await delay();
    return wrapSuccess({ transactions: [], data: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 }, total: 0 });
  },
  get: async () => {
    await delay();
    return wrapSuccess({ transaction: null });
  },
  summary: async () => {
    await delay();
    return wrapSuccess({ summary: { total: 0, pending: 0, completed: 0 } });
  },
};

// ─── Export ───────────────────────────────────────────────────────
export const demoAPI = {
  auth: demoAuth,
  cars: demoCars,
  bids: demoBids,
  payments: demoPayments,
  escrow: demoEscrow,
  dealer: demoDealer,
  admin: demoAdmin,
  auctionAdmin: demoAuctionAdmin,
  favorites: demoFavorites,
  chat: demoChat,
  notif: demoNotif,
  savedSearch: { list: async () => ({ searches: [] }), create: async () => ({}), update: async () => ({}), remove: async () => ({}) },
  ntsa: {
    list: async () => {
      await delay();
      const cars = await demoCars.list({ page: 1, limit: 50 }, false);
      const items = (cars.cars || []).slice(0, 8);
      return {
        requests: items.map((c, i) => ({
          _id: `ntsa_demo_${i}`,
          car: c,
          status: ['pending', 'in_review', 'passed', 'failed'][i % 4],
          chassisVerified: i % 4 === 2,
          logbookVerified: i % 4 === 2,
          importVerified: i % 4 === 2,
          dutyStatus: i % 4 === 2 ? 'duty_paid' : 'unknown',
          adminNotes: i % 4 === 3 ? 'Logbook serial mismatch – contact seller' : null,
          documents: i % 2 === 0 ? [{ url: '#', label: 'Logbook Scan' }] : [],
          createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        })),
        total: 8,
      };
    },
    queue: async () => { await delay(300, 600); return { message: 'Queued for verification' }; },
    process: async () => { await delay(300, 600); return { message: 'Updated' }; },
    addDoc: async () => { await delay(200, 400); return { message: 'Document added' }; },
    status: async (carId) => {
      await delay(100, 300);
      const cars = await demoCars.list({ page: 1, limit: 50 }, false);
      const car = (cars.cars || []).find(c => c._id === carId || c.slug === carId);
      if (!car) {
        return { status: null, request: null };
      }
      const idx = Math.abs(car._id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)) % 4;
      const statuses = ['pending', 'in_review', 'passed', 'failed'];
      return {
        status: statuses[idx],
        request: {
          _id: `ntsa_status_${carId}`,
          status: statuses[idx],
          carId: car._id,
          chassisVerified: idx === 2,
          logbookVerified: idx === 2,
          importVerified: idx === 2,
          dutyStatus: idx === 2 ? 'duty_paid' : 'unknown',
          adminNotes: idx === 3 ? 'Document mismatch – contact support' : null,
          createdAt: new Date().toISOString(),
        },
      };
    },
  },
  inspection: {
    order: async () => ({}), confirmPayment: async () => ({}), myOrders: async () => ({ orders: [] }),
    myTasks: async () => ({ orders: [] }), list: async () => ({ orders: [] }),
    availableInspectors: async () => ({ inspectors: [] }), assign: async () => ({}),
    start: async () => ({}), submit: async () => ({}), get: async () => ({}), forCar: async () => ({ inspection: null }),
  },
  reviews: demoReviews,
  transactions: demoTransactions,
};
