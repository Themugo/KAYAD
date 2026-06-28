import {
  DEMO_USERS, DEMO_CARS, DEMO_BIDS, DEMO_PAYMENTS, DEMO_ESCROWS,
  DEMO_NOTIFICATIONS, DEMO_REVIEWS, DEMO_CHATS, DEMO_MESSAGES,
  DEMO_DEALER_STATS, DEMO_ADMIN_STATS, DEMO_ADMIN_USERS,
  filterDemoCars, getDemoCar, addDemoCar, updateDemoCar, removeDemoCar,
  getDemoMarketPulse, getDemoDealerInsights,
} from './demoData';

// ⚠️ ARCHITECTURAL DEBT: ~1,500 lines of mock API that duplicate
// real backend endpoints. Each new feature needs a parallel mock here.
// Consider removing for production and using a single backend path.

// ─── Helpers ──────────────────────────────────────────────────────
const delay = (min = 200, max = 800) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

// Convert a File to a base64 data URL so it survives page refreshes
// via localStorage (blob URLs from URL.createObjectURL() are ephemeral).
// Downscale + compress an uploaded image to a small JPEG data URL before
// storing. Raw camera photos are 3-8 MB each as base64 and instantly blow
// past the ~5 MB localStorage quota. Capping the longest edge at ~800px
// and re-encoding as JPEG keeps each image ~30-80 KB, so a full listing
// with several photos persists comfortably even on mobile (5 MB quota).
const fileToBase64 = (file) =>
  new Promise((resolve) => {
    const MAX_EDGE = 600;
    const QUALITY = 0.4;
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => {
      const dataUrl = reader.result;
      const img = new Image();
      img.onerror = () => resolve(dataUrl); // fall back to original if decode fails
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > MAX_EDGE || height > MAX_EDGE) {
            if (width >= height) { height = Math.round(height * (MAX_EDGE / width)); width = MAX_EDGE; }
            else { width = Math.round(width * (MAX_EDGE / height)); height = MAX_EDGE; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', QUALITY));
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });

// ─── Demo Ads ─────────────────────────────────────────────────────────────
// Live ad data shown on the home page AdBoard when the backend is unreachable.
const DEMO_ADS = [
  {
    _id: 'ad-kayad-1',
    clientName: 'KAYAD',
    headline: 'Sell Your Car Faster with KAYAD',
    subline: 'List in 5 minutes • Reach 50,000+ buyers • Secure M-Pesa escrow',
    targetLink: '/dealer/onboarding',
    placement: 'homepage_banner',
    imageUrl: null,
    isActive: true,
    isInternal: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'ad-kayad-2',
    clientName: 'KAYAD Auctions',
    headline: 'Live Car Auctions — Every Week',
    subline: 'Bid from anywhere in Kenya. Real cars. Real prices. No hidden fees.',
    targetLink: '/auctions/calendar',
    placement: 'homepage_banner',
    imageUrl: null,
    isActive: true,
    isInternal: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'ad-kayad-3',
    clientName: 'KAYAD Ghost Checker',
    headline: 'Check Any Car for Hidden Faults',
    subline: 'NTSA verification · logbook check · comprehensive inspection reports',
    targetLink: '/ghost-checker',
    placement: 'homepage_banner',
    imageUrl: null,
    isActive: true,
    isInternal: true,
    createdAt: new Date().toISOString(),
  },
];

// Demo session state.
// IMPORTANT: the demo user must survive page reloads. The auth token lives in
// localStorage, so an in-memory-only user means that after a refresh the app
// looks logged-in (token present) but every write op (create/update/profile)
// calls getDemoUser() → null → 403/401. We therefore persist the demo user to
// localStorage and rehydrate it from the token when memory is empty.
const DEMO_USER_KEY = 'kayad_demo_user';
let _demoUser = null;

const readStoredDemoUser = () => {
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const setDemoUser = (user) => {
  _demoUser = user;
  try {
    if (user) localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(DEMO_USER_KEY);
  } catch { /* storage unavailable — fall back to memory only */ }
};

export const getDemoUser = () => {
  if (_demoUser) return _demoUser;
  _demoUser = readStoredDemoUser();
  if (_demoUser) {
    try { localStorage.setItem(DEMO_USER_KEY, JSON.stringify(_demoUser)); } catch { /* ignore */ }
  }
  return _demoUser;
};

export const clearDemoUser = () => {
  _demoUser = null;
  try { localStorage.removeItem(DEMO_USER_KEY); } catch { /* ignore */ }
};

// Demo team persistence (per dealer). Seeded with a couple of members so the
// Team tab isn't empty in a pitch.
const DEMO_TEAM_KEY = 'kayad_demo_team';
const seedTeam = () => ([
  { _id: 'demo-member-seed-1', name: 'Sarah Njeri', email: 'sarah@nairobiautohub.co.ke', role: 'sales_agent', permissions: ['view_leads', 'respond_chats'], status: 'active', invitedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { _id: 'demo-member-seed-2', name: 'David Omondi', email: 'david@nairobiautohub.co.ke', role: 'lot_agent', permissions: ['list_cars', 'edit_cars'], status: 'active', invitedAt: new Date(Date.now() - 12 * 86400000).toISOString() },
]);
const readDemoTeam = (dealerId) => {
  const key = `${DEMO_TEAM_KEY}:${dealerId || 'self'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const seeded = seedTeam();
  try { localStorage.setItem(key, JSON.stringify(seeded)); } catch { /* ignore */ }
  return seeded;
};
const writeDemoTeam = (dealerId, team) => {
  const key = `${DEMO_TEAM_KEY}:${dealerId || 'self'}`;
  try { localStorage.setItem(key, JSON.stringify(team)); } catch { /* ignore */ }
};

// Demo token — base64-encoded JSON the api.js `isDemoToken()` helper can read.
// isDemoToken() does JSON.parse(atob(token)) and checks `.email` / `.superAdmin`,
// so the token MUST carry those fields. Returning a token here is what keeps the
// app in demo mode after login (otherwise it stores "undefined" and breaks auth).
export const makeDemoToken = (user) =>
  btoa(JSON.stringify({
    _id: user._id,
    email: user.email,
    role: user.role,
    superAdmin: !!user.superAdmin,
    demo: true,
  }));

const wrapSuccess = (data) => ({ success: true, ...data });

// Mutable working copy of the admin user list so demo suspend/deactivate/
// delete/cleanup actually mutate state during a pitch. Reset restores the seed.
let _adminUsersStore = DEMO_ADMIN_USERS.map(u => ({ ...u }));
const _adminUsers = () => _adminUsersStore;
const _resetAdminUsers = (val) => {
  _adminUsersStore = val === null
    ? DEMO_ADMIN_USERS.map(u => ({ ...u }))
    : val;
};

const makeEmail = (name) =>
  `${name?.toLowerCase().replace(/[^a-z]/g, '')}@kayad.space`;

const transformCar = (c) => {
  if (!c) return c;
  // Honour a chosen display/cover image: consumers render images[0], so if a
  // valid coverImage index is set, surface that image first.
  let images = c.images;
  const cov = Number(c.coverImage);
  if (Array.isArray(images) && Number.isInteger(cov) && cov > 0 && cov < images.length) {
    images = [images[cov], ...images.filter((_, i) => i !== cov)];
  }
  return {
    ...c,
    isDemo: true, // marks sample data so the UI can show a DEMO sticker vs. real listings
    model: c.model || c.title?.split(' ').slice(1).slice(0, -1).join(' ') || c.brand,
    dealerPhone: c.dealer?.phone || c.dealerPhone || '2547XXXXXX',
    trustScore: c.trustScore ?? Math.round(85 + Math.random() * 15),
    images,
    dealer: c.dealer ? {
      ...c.dealer,
      id: c.dealer._id,
      email: c.dealer.email || makeEmail(c.dealer.name || c.dealer.businessName),
    } : c.dealer,
  };
};

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
    const { password: _pw, ...safe } = newUser;
    setDemoUser(safe);
    return wrapSuccess({ user: safe, token: makeDemoToken(safe) });
  },

  login: async (body) => {
    await delay();
    const user = Object.values(DEMO_USERS).find(u => u.email === body.email);
    if (!user) throw { response: { status: 401, data: { message: 'Invalid email or password' } } };
    // Verify password — demo accounts each have a defined password field.
    // Allow login without password only for the original buyer/dealer/broker
    // which used no-password quick-login buttons before admin accounts were added.
    if (user.password && body.password && user.password !== body.password) {
      throw { response: { status: 401, data: { message: 'Invalid email or password' } } };
    }
    if (user.isBanned) throw { response: { status: 403, data: { message: 'Your account has been suspended' } } };
    const { password: _pw, ...safe } = user;
    setDemoUser(safe);
    return wrapSuccess({ user: safe, token: makeDemoToken(safe) });
  },

  refresh: async () => {
    await delay(100, 300);
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Session expired' } } };
    return wrapSuccess({ user, token: makeDemoToken(user) });
  },

  logout: async () => {
    await delay(100, 300);
    clearDemoUser();
    return wrapSuccess({ message: 'Logged out' });
  },

  profile: async () => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const { password: _pw1, ...safe } = user;
    return wrapSuccess({ user: safe });
  },

  me: async () => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const { password: _pw2, ...safe } = user;
    return wrapSuccess({ user: safe });
  },

  updateProfile: async (body) => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const updated = { ...user, ...body };
    setDemoUser(updated);
    const { password: _pw5, ...safe } = updated;
    return wrapSuccess({ user: safe });
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    if (newPassword.length < 6) {
      throw { response: { status: 400, data: { message: 'New password must be at least 6 characters' } } };
    }
    user.mustChangePassword = false;
    const { password: _pw, ...safe } = user;
    setDemoUser(safe);
    return wrapSuccess({ user: safe, message: 'Password changed successfully' });
  },

  forgotPassword: async () => {
    await delay(300, 600);
    return wrapSuccess({ message: 'If that email is registered, a reset link has been sent.' });
  },

  resetPassword: async () => {
    await delay(300, 600);
    return wrapSuccess({ message: 'Password has been reset successfully.' });
  },

  verifyEmail: async () => {
    await delay(200, 400);
    const user = getDemoUser();
    if (user) {
      user.emailVerified = true;
      setDemoUser(user);
    }
    return wrapSuccess({ message: 'Email verified successfully' });
  },

  resendVerification: async () => {
    await delay(300, 600);
    return wrapSuccess({ message: 'Verification email sent' });
  },
};

// ─── Demo Cars API ────────────────────────────────────────────────
const demoDealerCars = (userId) => {
  const user = getDemoUser();
  // The flagship dealer demo (Nairobi Auto Hub) manages the whole sample
  // catalogue so it can showcase editing every demo car. The individual seller
  // demo (Grace Wanjiku) stays scoped to its OWN listings so the two accounts
  // are clearly distinct. Admins/superadmins see everything.
  const seesAll = userId === 'demo-dealer-1' || ['admin', 'superadmin'].includes(user?.role);
  if (seesAll) return DEMO_CARS;
  return DEMO_CARS.filter(c => c.dealer?._id === userId);
};

const demoCars = {
  list: async (params = {}) => {
    await delay();
    const result = filterDemoCars(params);
    const cars = (result.cars || []).map(transformCar);
    return wrapSuccess({ ...result, cars, data: cars });
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
    if (!user || !['dealer', 'individual_seller', 'admin', 'superadmin'].includes(user.role)) {
      throw { response: { status: 403, data: { message: 'Only dealers and sellers can create listings' } } };
    }
      const images = [];
      try {
        const files = formData.getAll('images');
        const demoCarImages = [
          'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=800&q=80',
          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80',
          'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
          'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
          'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80',
          'https://images.unsplash.com/photo-1554744511-0d3d7f8b0a1e?w=800&q=80',
          'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80',
        ];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (f instanceof File && f.size > 0) {
            const url = f.size > 0 ? await fileToBase64(f) : (demoCarImages[i] || demoCarImages[0]);
            images.push({ url, public_id: null });
          }
        }
      } catch { /* formData may not have images field - OK */ }
      const rawFeatures = formData.getAll('features');
      const features = rawFeatures.length > 0 ? rawFeatures.filter(Boolean) : (formData.get('features') || '').split(',').filter(Boolean);
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
        features,
        images,
        views: 0,
        bidsCount: 0,
        currentBid: 0,
        allowBid: formData.get('allowBid') === 'true',
        allowBuy: formData.get('allowBuy') !== 'false',
        auctionStatus: formData.get('auctionStatus') || 'draft',
        isPromoted: false,
        isVerifiedDealer: true,
        dealer: { _id: user._id, name: user.businessName || user.name, dealerRating: 4.5 },
        location: { city: formData.get('city') || 'Nairobi' },
        createdAt: new Date().toISOString(),
        coverImage: Number(formData.get('coverImage')) || 0,
      };
      if (newCar.auctionStatus === 'live') {
        newCar.auctionEnd = new Date(Date.now() + 7 * 86400000).toISOString();
      }
      // Honour the seller's chosen display image: the grid and detail page use
      // images[0] as the cover, so move the selected one to the front.
      const coverIdx = Number(formData.get('coverImage')) || 0;
      if (coverIdx > 0 && coverIdx < newCar.images.length) {
        const [chosen] = newCar.images.splice(coverIdx, 1);
        newCar.images.unshift(chosen);
        newCar.coverImage = 0;
      }
      addDemoCar(newCar);
      return wrapSuccess({ car: transformCar(newCar), data: transformCar(newCar) });
  },

  addImages: async (id, formData) => {
    await delay(300, 800);
    const car = getDemoCar(id);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    const files = formData.getAll('images');
    const newImages = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f instanceof File && f.size > 0) {
        const url = f.size > 0 ? await fileToBase64(f) : `https://images.unsplash.com/photo-${1500000000 + Math.floor(Math.random() * 999999)}?w=800&q=80`;
        newImages.push({ url, public_id: null });
      }
    }
    const updated = { ...car, images: [...(car.images || []), ...newImages] };
    updateDemoCar(id, updated);
    return wrapSuccess({ message: `${newImages.length} image(s) uploaded`, car: transformCar(updated), data: { images: updated.images } });
  },

  update: async (id, body) => {
    await delay(300, 800);
    const car = getDemoCar(id);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    const user = getDemoUser();
    const isStaff = ['admin', 'superadmin'].includes(user?.role);
    const isOwner = String(car.dealer?._id || car.dealer) === user?._id;
    if (!isOwner && !isStaff) {
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
      const user = getDemoUser();
      const isStaff = ['admin', 'superadmin'].includes(user?.role);
      const isOwner = String(car.dealer?._id || car.dealer) === user?._id;
      if (!isOwner && !isStaff) {
        throw { response: { status: 403, data: { message: 'Not authorized' } } };
      }
      removeDemoCar(id);
      return wrapSuccess({ message: 'Car deleted' });
  },

  promote: async (id, body) => {
    await delay(200, 400);
    const car = getDemoCar(id);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    updateDemoCar(id, body);
    return wrapSuccess({ message: 'Updated', car: transformCar({ ...car, ...body }) });
  },

  deleteImage: async (id, idx) => {
    await delay(200, 400);
    const car = getDemoCar(id);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    const newImages = [...(car.images || [])];
    if (idx < 0 || idx >= newImages.length) throw { response: { status: 400, data: { message: 'Invalid image index' } } };
    newImages.splice(idx, 1);
    const updated = { ...car, images: newImages, coverImage: idx < (car.coverImage || 0) ? (car.coverImage || 0) - 1 : 0 };
    updateDemoCar(id, updated);
    return wrapSuccess({ message: 'Image deleted', car: transformCar(updated), data: { images: newImages } });
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

  priceHistory: async (carId) => {
    await delay();
    const car = getDemoCar(carId);
    if (!car) return wrapSuccess({ priceHistory: [], data: [] });
    const now = Date.now();
    const history = Array.from({ length: 6 }, (_, i) => ({
      price: car.price * (0.92 + i * 0.016 + Math.random() * 0.01),
      date: new Date(now - (5 - i) * 86400000 * 7).toISOString(),
    }));
    return wrapSuccess({ priceHistory: history, data: history });
  },

  demoAll: async (params) => {
    await delay();
    return demoCars.list(params);
  },

  batch: async (ids) => {
    await delay();
    const cars = (ids || []).map(id => getDemoCar(id)).filter(Boolean).map(transformCar);
    return wrapSuccess({ cars, data: cars });
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

  dispute: async () => {
    await delay(300, 600);
    return wrapSuccess({ message: 'Dispute raised' });
  },

  requestRelease: async () => {
    await delay(200, 500);
    return wrapSuccess({ message: 'Release requested' });
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

  // ─── Bids on the dealer's own listings ──────────────────────────
  bids: async () => {
    await delay();
    const user = getDemoUser();
    const myCarIds = demoDealerCars(user?._id).map(c => c._id);
    const bids = DEMO_BIDS
      .filter(b => myCarIds.includes(b.car))
      .map(b => {
        const car = getDemoCar(b.car);
        return { ...b, car: car ? { _id: car._id, title: car.title, images: car.images } : b.car, status: b.status || 'active' };
      });
    return wrapSuccess({ bids, data: bids });
  },

  acceptBid: async (bidId) => {
    await delay(300, 700);
    return wrapSuccess({ message: 'Bid accepted', bidId, status: 'accepted' });
  },

  rejectBid: async (bidId) => {
    await delay(300, 700);
    return wrapSuccess({ message: 'Bid rejected', bidId, status: 'rejected' });
  },

  // ─── Listing actions ────────────────────────────────────────────
  markSold: async (carId) => {
    await delay(300, 700);
    updateDemoCar(carId, { auctionStatus: 'sold', allowBid: false, allowBuy: false, soldAt: new Date().toISOString() });
    const car = getDemoCar(carId);
    return wrapSuccess({ message: 'Listing marked as sold', car: car ? transformCar(car) : null });
  },

  bulkStatus: async (ids = [], status) => {
    await delay(400, 900);
    (Array.isArray(ids) ? ids : [ids]).forEach(id => updateDemoCar(id, { auctionStatus: status }));
    return wrapSuccess({ message: `${(Array.isArray(ids) ? ids : [ids]).length} listing(s) updated`, status });
  },

  duplicate: async (carId) => {
    await delay(400, 900);
    const src = getDemoCar(carId);
    if (!src) throw { response: { status: 404, data: { message: 'Listing not found' } } };
    const copy = { ...src, _id: 'demo-car-' + Date.now(), title: `${src.title} (Copy)`, views: 0, bidsCount: 0, currentBid: 0, createdAt: new Date().toISOString() };
    addDemoCar(copy);
    return wrapSuccess({ message: 'Listing duplicated', car: transformCar(copy) });
  },

  // ─── Team management ────────────────────────────────────────────
  getTeam: async () => {
    await delay();
    const user = getDemoUser();
    const team = readDemoTeam(user?._id);
    return wrapSuccess({ members: team, team, data: team });
  },

  inviteMember: async ({ email, role, permissions } = {}) => {
    await delay(300, 700);
    const user = getDemoUser();
    const team = readDemoTeam(user?._id);
    if (team.some(m => m.email === email)) {
      throw { response: { status: 400, data: { message: 'This person is already on your team' } } };
    }
    const member = {
      _id: 'demo-member-' + Date.now(),
      name: (email || 'member').split('@')[0],
      email: email || 'member@demo.com',
      role: role || 'sales_agent',
      permissions: permissions || [],
      status: 'active',
      invitedAt: new Date().toISOString(),
    };
    team.push(member);
    writeDemoTeam(user?._id, team);
    return wrapSuccess({ member, message: 'Team member invited' });
  },

  updateMember: async (memberId, updates = {}) => {
    await delay(300, 600);
    const user = getDemoUser();
    const team = readDemoTeam(user?._id);
    const i = team.findIndex(m => m._id === memberId);
    if (i >= 0) team[i] = { ...team[i], ...updates };
    writeDemoTeam(user?._id, team);
    return wrapSuccess({ member: team[i], message: 'Team member updated' });
  },

  removeMember: async (memberId) => {
    await delay(300, 600);
    const user = getDemoUser();
    const team = readDemoTeam(user?._id).filter(m => m._id !== memberId);
    writeDemoTeam(user?._id, team);
    return wrapSuccess({ message: 'Team member removed' });
  },

  getSettlement: async () => {
    await delay();
    return wrapSuccess({
      settlement: {
        accountName: 'Nairobi Auto Hub Ltd',
        accountNumber: '1234567890',
        bank: 'Equity Bank',
        bankCode: '12',
        branch: 'Industrial Area',
        phone: '254723456789',
        method: 'bank_transfer',
        autoSettlement: true,
        settlementPeriod: 'weekly',
      },
      data: {
        accountName: 'Nairobi Auto Hub Ltd',
        accountNumber: '1234567890',
        bank: 'Equity Bank',
        bankCode: '12',
        branch: 'Industrial Area',
        phone: '254723456789',
        method: 'bank_transfer',
        autoSettlement: true,
        settlementPeriod: 'weekly',
      },
    });
  },

  updateSettlement: async (body) => {
    await delay(300, 600);
    return wrapSuccess({ message: 'Settlement settings updated', data: body });
  },

  getMyActivityLog: async (params) => {
    await delay();
    return wrapSuccess({ logs: [], data: { logs: [], total: 0 } });
  },

  getProfile: async () => {
    await delay();
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    return wrapSuccess({ dealer: user, data: user });
  },

  updateProfile: async (body) => {
    await delay(300, 600);
    const user = getDemoUser();
    if (!user) throw { response: { status: 401, data: { message: 'Unauthorized' } } };
    const updated = { ...user, ...body };
    setDemoUser(updated);
    return wrapSuccess({ dealer: updated, message: 'Profile updated', data: updated });
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
    let users = _adminUsers().map(u => ({ ...u, isDemo: true }));
    if (params.role) users = users.filter(u => u.role === params.role);
    if (params.search) {
      const q = params.search.toLowerCase();
      users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (params.pendingApproval === true || params.pendingApproval === 'true') {
      users = users.filter(u => u.role === 'dealer' && u.status !== 'approved');
    }
    if (params.banned === true || params.banned === 'true') {
      users = users.filter(u => u.isBanned);
    }
    if (params.isDemo === true || params.isDemo === 'true') {
      users = users.filter(u => u.isDemo);
    }
    const total = users.length;
    return wrapSuccess({ users, data: users, pagination: { total, page: 1, limit: params.limit || 50, pages: 1 }, total });
  },

  toggleBan: async (id) => {
    await delay();
    const list = _adminUsers();
    const u = list.find(x => x._id === id);
    if (u) u.isBanned = !u.isBanned;
    return wrapSuccess({ message: u?.isBanned ? 'User suspended' : 'User unsuspended', isBanned: !!u?.isBanned });
  },

  deactivateUser: async (id) => {
    await delay();
    const list = _adminUsers();
    const u = list.find(x => x._id === id);
    if (u) u.deactivatedAt = u.deactivatedAt ? null : new Date().toISOString();
    return wrapSuccess({ message: u?.deactivatedAt ? 'User deactivated' : 'User reactivated', deactivatedAt: u?.deactivatedAt || null });
  },

  deleteUser: async (id) => {
    await delay(300, 700);
    const list = _adminUsers();
    const i = list.findIndex(x => x._id === id);
    if (i >= 0) list.splice(i, 1);
    return wrapSuccess({ message: 'User and associated data deleted' });
  },

  // Demo-data control — lets a real admin show how sample accounts/cars are
  // purged so the live market only surfaces real dealers and sellers.
  demoStatus: async () => {
    await delay();
    const demoUsers = _adminUsers().filter(u => u.isDemo !== false).length;
    return wrapSuccess({ demoUsers, demoCars: DEMO_CARS.length, isDemoActive: true, data: { demoUsers, demoCars: DEMO_CARS.length } });
  },

  demoCleanup: async () => {
    await delay(500, 1100);
    const removedUsers = _adminUsers().length;
    const removedCars = DEMO_CARS.length;
    _resetAdminUsers([]);
    return wrapSuccess({ message: `Demo data cleared — ${removedUsers} accounts and ${removedCars} listings removed. The live market now shows only real dealers.`, removedUsers, removedCars });
  },

  reseed: async () => {
    await delay(500, 1100);
    _resetAdminUsers(null); // null → restore original seed
    return wrapSuccess({ message: 'Demo data restored' });
  },

  approveDealer: async (id) => {
    await delay();
    const u = _adminUsers().find(x => x._id === id);
    if (u) u.status = 'approved';
    return wrapSuccess({ message: 'Dealer approved' });
  },

  cars: async (params = {}) => {
    await delay();
    let cars = DEMO_CARS;
    const total = cars.length;
    return wrapSuccess({ cars: cars.map(transformCar), data: cars.map(transformCar), pagination: { total, page: 1, limit: params.limit || 50, pages: 1 }, total });
  },

  deleteCar: async (carId) => {
    await delay();
    if (carId) removeDemoCar(carId);
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
    const car = getDemoCar(carId);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    const durationMs = Number(body?.durationMs || body?.duration || 86400000);
    const updated = {
      ...car,
      auctionStatus: 'live',
      allowBid: true,
      auctionStartTime: new Date().toISOString(),
      auctionEnd: new Date(Date.now() + durationMs).toISOString(),
      currentBid: Number(body?.startingBid || car.currentBid || car.price || 0),
      reservePrice: body?.reservePrice || null,
      extensionCount: 0,
    };
    updateDemoCar(carId, updated);
    return wrapSuccess({ message: 'Auction started', car: transformCar(updated) });
  },
  end: async (carId) => {
    await delay();
    const car = getDemoCar(carId);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    const updated = { ...car, auctionStatus: 'ended', allowBid: false, auctionEnd: new Date().toISOString() };
    updateDemoCar(carId, updated);
    return wrapSuccess({ message: 'Auction ended', car: transformCar(updated) });
  },
  extend: async (carId, body) => {
    await delay();
    const car = getDemoCar(carId);
    if (!car) throw { response: { status: 404, data: { message: 'Car not found' } } };
    const hours = Number(typeof body === 'number' ? body : body?.hours || 0);
    const baseEnd = car.auctionEnd ? new Date(car.auctionEnd).getTime() : Date.now();
    const updated = {
      ...car,
      auctionEnd: new Date(Math.max(baseEnd, Date.now()) + hours * 60 * 60 * 1000).toISOString(),
      extensionCount: (car.extensionCount || 0) + 1,
    };
    updateDemoCar(carId, updated);
    return wrapSuccess({ message: 'Auction extended', car: transformCar(updated) });
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
    return wrapSuccess({ message: 'Toggled', favorited: true });
  },
  setPriceAlert: async () => {
    await delay(100, 300);
    return wrapSuccess({ notifyOnPriceDrop: true });
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
    const msgs = (DEMO_MESSAGES[chatId] || []).map(m => ({
      ...m,
      seen: m.seen !== undefined ? m.seen : false,
      seenBy: m.seenBy || [],
      attachments: m.attachments || [],
    }));
    return wrapSuccess({ messages: msgs, data: msgs });
  },

  send: async (chatId, body) => {
    await delay();
    const user = getDemoUser();
    const newMsg = {
      _id: 'demo-msg-' + Date.now(),
      chatId,
      sender: user?._id || 'unknown',
      message: body.message || '',
      createdAt: new Date().toISOString(),
      seen: false,
      seenBy: [],
      attachments: body.attachments || [],
    };
    // Also add to DEMO_MESSAGES for persistence in this session
    if (!DEMO_MESSAGES[chatId]) DEMO_MESSAGES[chatId] = [];
    DEMO_MESSAGES[chatId].push(newMsg);
    return wrapSuccess({ message: newMsg });
  },

  seen: async (chatId) => {
    await delay(50, 150);
    if (chatId && DEMO_MESSAGES[chatId]) {
      const user = getDemoUser();
      const uid = user?._id;
      DEMO_MESSAGES[chatId] = DEMO_MESSAGES[chatId].map(m => {
        if (m.sender !== uid) {
          const seenBy = m.seenBy || [];
          if (!seenBy.includes(uid)) seenBy.push(uid);
          return { ...m, seen: true, seenBy };
        }
        return m;
      });
    }
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

    if (params.type) notifs = notifs.filter(n => n.type === params.type);

    const total = notifs.length;
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 30;
    const start = (page - 1) * limit;
    notifs = notifs.slice(start, start + limit);

    return wrapSuccess({
      notifications: notifs,
      data: notifs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
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

// ─── Demo Market Intelligence API ─────────────────────────────────
const demoMarket = {
  pulse: async (carId) => {
    await delay();
    const pulse = getDemoMarketPulse(carId);
    if (!pulse) throw { response: { status: 404, data: { message: 'Car not found' } } };
    return wrapSuccess({ data: pulse });
  },

  trends: async (params = {}) => {
    await delay();
    const brands = [...new Set(DEMO_CARS.map(c => c.brand))];
    const data = brands.map(b => {
      const bc = DEMO_CARS.filter(c => c.brand === b);
      return { brand: b, count: bc.length, avgPrice: Math.round(bc.reduce((s, c) => s + c.price, 0) / bc.length) };
    });
    return wrapSuccess({ data, totalCars: DEMO_CARS.length, period: `${params.days || 90}d` });
  },

  dealerInsights: async () => {
    await delay();
    const insights = getDemoDealerInsights();
    return wrapSuccess({ data: insights });
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
  market: demoMarket,
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
  savedSearch: {
    list: async () => ({ searches: [] }), create: async () => ({}), update: async () => ({}),
    remove: async () => ({}), delete: async () => ({}), toggleAlerts: async () => ({ message: 'Toggled' }),
  },
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
  escrowVault: {
    init: async (carId) => { await delay(); return wrapSuccess({ escrow: { _id: `esc-vault-demo-${Date.now()}`, car: carId, status: 'pending' } }); },
    my: async () => { await delay(); return wrapSuccess({ escrows: [] }); },
    get: async (id) => { await delay(); return wrapSuccess({ escrow: null }); },
    forCar: async (carId) => { await delay(); return wrapSuccess({ escrow: null }); },
    markInspection: async (id) => { await delay(); return wrapSuccess({ message: 'Inspection marked complete' }); },
    requestOtp: async (id) => { await delay(); return wrapSuccess({ message: 'OTP sent' }); },
    release: async (id, otp) => { await delay(); return wrapSuccess({ message: 'Released' }); },
    webhookFunded: async (id) => { await delay(); return wrapSuccess({ message: 'Webhook processed' }); },
    adminAll: async () => { await delay(); return wrapSuccess({ escrows: [] }); },
    adminConfirm: async (id) => { await delay(); return wrapSuccess({ message: 'Confirmed' }); },
    adminRefund: async (id) => { await delay(); return wrapSuccess({ message: 'Refund initiated' }); },
  },
  reviews: demoReviews,
  transactions: demoTransactions,

  // ─── Ads (public + admin) ───────────────────────────────────────
  ads: {
    list: async (params = {}) => {
      await delay(100, 300);
      const placement = params?.placement;
      const ads = DEMO_ADS.filter(a =>
        a.isActive !== false &&
        (!placement || a.placement === placement || a.placement === 'all')
      );
      return { ads, total: ads.length };
    },
    adminList: async () => {
      await delay(100, 300);
      return { ads: DEMO_ADS, total: DEMO_ADS.length };
    },
    create: async (body) => {
      await delay(200, 500);
      const ad = { ...body, _id: `ad-demo-${Date.now()}`, isActive: true, createdAt: new Date().toISOString() };
      DEMO_ADS.push(ad);
      return { ad };
    },
    update: async (id, body) => {
      await delay(200, 400);
      const i = DEMO_ADS.findIndex(a => a._id === id);
      if (i >= 0) DEMO_ADS[i] = { ...DEMO_ADS[i], ...body };
      return { ad: DEMO_ADS[i] };
    },
    remove: async (id) => {
      await delay(100, 300);
      const i = DEMO_ADS.findIndex(a => a._id === id);
      if (i >= 0) DEMO_ADS.splice(i, 1);
      return { message: 'Deleted' };
    },
  },
};
