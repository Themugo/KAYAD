import { CAR_SPECS } from './carSeedData';
import { buildCarImages } from './carImages';

const BRAND_KEYS = CAR_SPECS.map(s => s.demoImg);
const IMG = buildCarImages(BRAND_KEYS);

const DEMO_DEALER_REF = { _id: 'demo-dealer-1', name: 'Nairobi Auto Hub Ltd', role: 'dealer', dealerRating: 4.7, trustScore: 92, verified: true, tier: 'enterprise', verifications: ['email','phone','business','id','ntsa','physical'], escrowMandatory: false, memberSince: '2023', totalTransactions: 342 }; 
const ADMIN_DEALER = DEMO_DEALER_REF;



const now = Date.now();
const DAY = 86400000;

function buildDemoCars() {
  return CAR_SPECS.map((spec, i) => {
    const createdAt = new Date(now - (28 - i * 2) * DAY).toISOString();
    const id = 'car-' + spec.carId;
    const isPromoted = spec.isPromoted ?? false;
    return {
      _id: id,
      createdAt,
      title: spec.title,
      brand: spec.brand,
      price: spec.price,
      year: spec.year,
      fuel: spec.fuel,
      transmission: spec.transmission,
      mileage: spec.mileage,
      bodyType: spec.bodyType,
      color: spec.color,
      location: spec.location,
      description: spec.description,
      features: spec.features,
      images: IMG[spec.demoImg],
      views: spec.views,
      allowBid: false,
      allowBuy: true,
      auctionStatus: 'draft',
      isPromoted,
      isVerifiedDealer: i < 8,
      dealRating: i % 3 === 0 ? 'great' : i % 3 === 1 ? 'good' : 'fair',
      dealer: ADMIN_DEALER,
    };
  });
}

export const DEMO_USERS = {
  buyer: {
    _id: 'demo-buyer-1',
    name: 'James Kariuki',
    email: 'buyer@demo.com',
    role: 'user',
    phone: '254712345678',
    location: 'Westlands, Nairobi',
    bio: 'Car enthusiast looking for my next ride',
    emailVerified: true,
    status: 'approved',
    isBanned: false,
    dealerRating: 0,
    createdAt: new Date(now - 30 * DAY).toISOString(),
    tokenVersion: 0,
  },
  dealer: {
    _id: 'demo-dealer-1',
    name: 'Peter Kamau',
    email: 'dealer@demo.com',
    role: 'dealer',
    phone: '254723456789',
    location: 'Industrial Area, Nairobi',
    businessName: 'Nairobi Auto Hub Ltd',
    bio: 'Premium car dealer with 10+ years experience. Specializing in Japanese and German imports.',
    emailVerified: true,
    status: 'approved',
    isBanned: false,
    dealerRating: 4.7,
    createdAt: new Date(now - 180 * DAY).toISOString(),
    reviewCount: 42,
    tokenVersion: 0,
  },
  individual_seller: {
    _id: 'demo-individual-seller-1',
    name: 'Grace Wanjiku',
    email: 'individual@demo.com',
    role: 'individual_seller',
    phone: '254745678901',
    location: 'Kilimani, Nairobi',
    bio: 'Individual car seller. All transactions protected by escrow.',
    emailVerified: true,
    status: 'approved',
    isBanned: false,
    dealerRating: 4.2,
    trustScore: 78,
    verified: true,
    tier: 'verified',
    verifications: ['email','phone','id'],
    escrowMandatory: true,
    memberSince: '2024',
    totalTransactions: 18,
    createdAt: new Date(now - 90 * DAY).toISOString(),
    tokenVersion: 0,
  },
};

const DEMO_CARS_KEY = 'kayad_demo_cars';

// Load persisted demo cars from localStorage or use seed data
const loadDemoCars = () => {
  try {
    const stored = localStorage.getItem(DEMO_CARS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return buildDemoCars();
};

const saveDemoCars = (cars) => {
  try {
    localStorage.setItem(DEMO_CARS_KEY, JSON.stringify(cars));
  } catch { /* ignore */ }
};

let _cars = loadDemoCars();

export const DEMO_CARS = new Proxy(_cars, {
  get(target, prop) {
    return target[prop];
  },
  set(target, prop, value) {
    target[prop] = value;
    saveDemoCars(target);
    return true;
  }
});

// For direct array mutations, we need to save manually
const persistCars = () => saveDemoCars(_cars);

export function addDemoCar(car) {
  if (!car.createdAt) car.createdAt = new Date().toISOString();
  _cars.unshift(car);
  persistCars();
}
export function updateDemoCar(id, updates) {
  const i = _cars.findIndex(c => c._id === id);
  if (i >= 0) {
    _cars[i] = { ..._cars[i], ...updates };
    persistCars();
  }
}
export function removeDemoCar(id) {
  const i = _cars.findIndex(c => c._id === id);
  if (i >= 0) {
    _cars.splice(i, 1);
    persistCars();
  }
}

// Reset demo cars to seed data (for admin use)
export const resetDemoCars = () => {
  _cars = buildDemoCars();
  persistCars();
};

export const DEMO_BIDS = (() => {
  const bids = [];
  let t = now - 2 * DAY;
  const add = (carId, amount, user, phone) => {
    t += 300000 + Math.random() * 600000;
    bids.push({ _id:`bid-${bids.length+1}`, car:carId, amount, user:{_id:user||DEMO_USERS.buyer._id,name:user===DEMO_USERS.buyer._id?'James Kariuki':'Bidder'}, phone:phone||'2547XXXXXX', mpesaPaid:true, createdAt:new Date(t).toISOString() });
  };
  add('car-lc1', 2800000, DEMO_USERS.buyer._id);
  add('car-lc1', 2900000, 'other-bidder-1');
  add('car-lc1', 3050000, DEMO_USERS.buyer._id);
  add('car-lc1', 3100000, 'other-bidder-2');
  add('car-lc1', 3200000, DEMO_USERS.buyer._id);
  add('car-bmw1', 3800000, DEMO_USERS.buyer._id);
  add('car-bmw1', 3900000, 'other-bidder-1');
  add('car-bmw1', 4000000, DEMO_USERS.buyer._id);
  add('car-bmw1', 4100000, 'other-bidder-2');
  add('car-sub1', 2700000, DEMO_USERS.buyer._id);
  add('car-sub1', 2800000, 'other-bidder-3');
  add('car-sub1', 2850000, DEMO_USERS.buyer._id);
  add('car-maz1', 3400000, DEMO_USERS.buyer._id);
  add('car-maz1', 3500000, 'other-bidder-1');
  add('car-maz1', 3600000, DEMO_USERS.buyer._id);
  add('car-lex1', 6000000, DEMO_USERS.buyer._id);
  add('car-lex1', 6200000, 'other-bidder-3');
  add('car-pick1', 2900000, DEMO_USERS.buyer._id);
  add('car-pick1', 3000000, 'other-bidder-1');
  add('car-pick1', 3100000, DEMO_USERS.buyer._id);
  return bids;
})();

export const DEMO_PAYMENTS = [
  { _id:'pay-1', user:DEMO_USERS.buyer._id, car:{_id:'car-lc1', title:'Toyota Land Cruiser V8 2021'}, type:'bid', amount:160000, phone:'254712345678', status:'success', mpesaReceiptNumber:'PGE71H4K9V', checkoutRequestID:'mock-checkout-1', createdAt:new Date(now-1*DAY).toISOString() },
  { _id:'pay-2', user:DEMO_USERS.buyer._id, car:{_id:'car-maz1', title:'Mazda CX-5 2023'}, type:'bid', amount:180000, phone:'254712345678', status:'success', mpesaReceiptNumber:'RFA82J5M2W', checkoutRequestID:'mock-checkout-2', createdAt:new Date(now-0.5*DAY).toISOString() },
  { _id:'pay-3', user:DEMO_USERS.buyer._id, car:{_id:'car-sub1', title:'Subaru Forester XT 2021'}, type:'bid', amount:142500, phone:'254712345678', status:'pending', checkoutRequestID:'mock-checkout-3', createdAt:new Date(now-2*DAY).toISOString() },
  { _id:'pay-4', user:DEMO_USERS.buyer._id, car:{_id:'car-lc1', title:'Toyota Land Cruiser V8 2021'}, type:'escrow', amount:3200000, phone:'254712345678', status:'success', mpesaReceiptNumber:'XCV73K8N1B', checkoutRequestID:'mock-checkout-4', createdAt:new Date(now-0.3*DAY).toISOString() },
];

export const DEMO_ESCROWS = [
  { _id:'esc-1', buyer:DEMO_USERS.buyer, seller:ADMIN_DEALER, car:{title:'Toyota Land Cruiser V8 2021'}, amount:3200000, status:'held', createdAt:new Date(now-0.3*DAY).toISOString(), history:[{action:'created', at:new Date(now-0.3*DAY).toISOString()},{action:'funded', at:new Date(now-0.2*DAY).toISOString()}] },
  { _id:'esc-2', buyer:{_id:'other-buyer-1',name:'Mary Wanjiku'}, seller:ADMIN_DEALER, car:{title:'Mazda CX-5 2023'}, amount:3600000, status:'released', releasedAt:new Date(now-10*DAY).toISOString(), createdAt:new Date(now-20*DAY).toISOString(), history:[{action:'created', at:new Date(now-20*DAY).toISOString()},{action:'funded', at:new Date(now-19*DAY).toISOString()},{action:'buyer_requested_release', at:new Date(now-11*DAY).toISOString()},{action:'released', at:new Date(now-10*DAY).toISOString()}] },
  { _id:'esc-3', buyer:{_id:'other-buyer-2',name:'John Ochieng'}, seller:ADMIN_DEALER, car:{title:'Mercedes-Benz GLE 350d 2022'}, amount:12000000, status:'released', releasedAt:new Date(now-5*DAY).toISOString(), createdAt:new Date(now-15*DAY).toISOString(), history:[{action:'created', at:new Date(now-15*DAY).toISOString()},{action:'funded', at:new Date(now-14*DAY).toISOString()},{action:'buyer_requested_release', at:new Date(now-6*DAY).toISOString()},{action:'released', at:new Date(now-5*DAY).toISOString()}] },
  { _id:'esc-4', buyer:DEMO_USERS.buyer, seller:ADMIN_DEALER, car:{title:'BMW X5 M Sport 2020'}, amount:4100000, status:'pending', createdAt:new Date(now-0.1*DAY).toISOString(), history:[{action:'created', at:new Date(now-0.1*DAY).toISOString()}] },
  { _id:'esc-5', buyer:{_id:'other-buyer-3',name:'Kevin Mwangi'}, seller:DEMO_USERS.individual_seller, car:{title:'Mazda Demio 2019'}, amount:890000, status:'held', createdAt:new Date(now-0.5*DAY).toISOString(), history:[{action:'created', at:new Date(now-0.5*DAY).toISOString()},{action:'funded', at:new Date(now-0.4*DAY).toISOString()}] },
  { _id:'esc-6', buyer:DEMO_USERS.buyer, seller:DEMO_USERS.individual_seller, car:{title:'Toyota Vitz 2020'}, amount:1250000, status:'released', releasedAt:new Date(now-15*DAY).toISOString(), createdAt:new Date(now-25*DAY).toISOString(), history:[{action:'created', at:new Date(now-25*DAY).toISOString()},{action:'funded', at:new Date(now-24*DAY).toISOString()},{action:'buyer_requested_release', at:new Date(now-16*DAY).toISOString()},{action:'released', at:new Date(now-15*DAY).toISOString()}] },
];

export const DEMO_NOTIFICATIONS = [
  { _id:'notif-1', user:DEMO_USERS.buyer._id, title:'Bid Placed', message:'Your bid of KES 3,200,000 on Toyota Land Cruiser V8 is leading!', type:'bid', read:false, createdAt:new Date(now-0.5*DAY).toISOString() },
  { _id:'notif-2', user:DEMO_USERS.buyer._id, title:'Payment Confirmed', message:'M-Pesa payment of KES 160,000 confirmed. Receipt: PGE71H4K9V', type:'payment', read:false, createdAt:new Date(now-1*DAY).toISOString() },
  { _id:'notif-3', user:DEMO_USERS.buyer._id, title:'Escrow Funded', message:'KES 3,200,000 is now held securely in escrow for Land Cruiser V8.', type:'escrow', read:true, createdAt:new Date(now-0.3*DAY).toISOString() },
  { _id:'notif-4', user:DEMO_USERS.buyer._id, title:'New Message', message:'Nairobi Auto Hub Ltd replied to your inquiry about Mazda CX-5.', type:'chat', read:false, createdAt:new Date(now-0.1*DAY).toISOString() },
  { _id:'notif-5', user:DEMO_USERS.buyer._id, title:'Auction Ending Soon', message:'Subaru Forester XT auction ends in 12 hours!', type:'auction', read:true, createdAt:new Date(now-0.2*DAY).toISOString() },
  { _id:'notif-11', user:DEMO_USERS.buyer._id, title:'NTSA Verified', message:'Logbook verification passed for Mazda CX-5.', type:'ntsa', read:false, createdAt:new Date(now-0.05*DAY).toISOString() },
  { _id:'notif-12', user:DEMO_USERS.buyer._id, title:'Inspection Scheduled', message:'Your inspection for BMW X5 is confirmed for tomorrow.', type:'inspection', read:false, createdAt:new Date(now-0.15*DAY).toISOString() },
  { _id:'notif-6', user:DEMO_USERS.dealer._id, title:'New Bid Received', message:'New bid of KES 3,200,000 on your Toyota Land Cruiser V8.', type:'bid', read:false, createdAt:new Date(now-0.5*DAY).toISOString() },
  { _id:'notif-7', user:DEMO_USERS.dealer._id, title:'Escrow Released', message:'KES 3,600,000 from Mazda CX-5 sale released to your account.', type:'escrow', read:false, createdAt:new Date(now-10*DAY).toISOString() },
  { _id:'notif-13', user:DEMO_USERS.dealer._id, title:'Listing Approved', message:'Your Mercedes-Benz GLE listing has been approved.', type:'system', read:true, createdAt:new Date(now-2*DAY).toISOString() },
  { _id:'notif-8', user:DEMO_USERS.dealer._id, title:'New User Registered', message:'A new dealer account requires approval.', type:'system', read:false, createdAt:new Date(now-1*DAY).toISOString() },
  { _id:'notif-9', user:DEMO_USERS.dealer._id, title:'Suspicious Activity', message:'Multiple rapid bids detected on car-lc1.', type:'system', read:true, createdAt:new Date(now-2*DAY).toISOString() },
  { _id:'notif-10', user:DEMO_USERS.dealer._id, title:'Large Escrow Release', message:'KES 12,000,000 escrow pending release for Mercedes GLE.', type:'escrow', read:false, createdAt:new Date(now-1*DAY).toISOString() },
  { _id:'notif-14', user:DEMO_USERS.dealer._id, title:'Dispute Raised', message:'Buyer opened a dispute on escrow esc-5.', type:'escrow', read:false, createdAt:new Date(now-0.5*DAY).toISOString() },
];

export const DEMO_REVIEWS = [
  { _id:'rev-1', user:{_id:DEMO_USERS.buyer._id,name:'James Kariuki'}, dealer:'demo-dealer-1', car:'car-maz1', rating:5, comment:'Excellent service! The Mazda CX-5 was exactly as described. Nairobi Auto Hub made the process smooth.', createdAt:new Date(now-15*DAY).toISOString() },
  { _id:'rev-2', user:{_id:'other-buyer-1',name:'Mary Wanjiku'}, dealer:'demo-dealer-1', rating:4, comment:'Professional dealer, fair pricing. Would buy from them again.', createdAt:new Date(now-30*DAY).toISOString() },
  { _id:'rev-3', user:{_id:'other-buyer-2',name:'John Ochieng'}, dealer:'demo-dealer-1', rating:5, comment:'Top-notch dealership. The Mercedes GLE was immaculate. Highly recommended!', createdAt:new Date(now-20*DAY).toISOString() },
];

export const DEMO_CHATS = [
  { _id:'chat-1', participants:[{_id:DEMO_USERS.buyer._id,name:'James Kariuki'},{_id:'demo-dealer-1',name:'Nairobi Auto Hub'}], car:{_id:'car-maz1',title:'Mazda CX-5 2023'}, lastMessage:{message:'Yes, it is still available. Would you like to schedule a test drive?',createdAt:new Date(now-0.5*DAY).toISOString()}, unreadCount:1, createdAt:new Date(now-5*DAY).toISOString() },
  { _id:'chat-2', participants:[{_id:DEMO_USERS.buyer._id,name:'James Kariuki'},{_id:'demo-dealer-1',name:'Nairobi Auto Hub'}], car:{_id:'car-lc1',title:'Toyota Land Cruiser V8 2021'}, lastMessage:{message:'The vehicle is in our showroom, come for a viewing.',createdAt:new Date(now-1*DAY).toISOString()}, unreadCount:0, createdAt:new Date(now-3*DAY).toISOString() },
];

export const DEMO_MESSAGES = {
  'chat-1': [
    { _id:'msg-1', chatId:'chat-1', sender:DEMO_USERS.buyer._id, message:'Hi, is the Mazda CX-5 still available?', createdAt:new Date(now-5*DAY).toISOString(), seen:true, seenBy:['demo-dealer-1'] },
    { _id:'msg-2', chatId:'chat-1', sender:'demo-dealer-1', message:'Yes, it is still available! When would you like to view it?', createdAt:new Date(now-4.9*DAY).toISOString(), seen:true, seenBy:[DEMO_USERS.buyer._id] },
    { _id:'msg-3', chatId:'chat-1', sender:DEMO_USERS.buyer._id, message:'This weekend would work. Do you have Saturday slots?', createdAt:new Date(now-4*DAY).toISOString(), seen:true, seenBy:['demo-dealer-1'] },
    { _id:'msg-4', chatId:'chat-1', sender:'demo-dealer-1', message:'Saturday 10am works perfectly. We are in Industrial Area, Nairobi.', createdAt:new Date(now-3.8*DAY).toISOString(), seen:true, seenBy:[DEMO_USERS.buyer._id] },
    { _id:'msg-5', chatId:'chat-1', sender:'demo-dealer-1', message:'Yes, it is still available. Would you like to schedule a test drive?', createdAt:new Date(now-0.5*DAY).toISOString(), seen:false, seenBy:[], attachments:[{url:'https://placehold.co/600x400/D4C4A8/1a1a2e?text=Mazda+CX-5',type:'image',name:'Mazda CX-5 Interior'}], },
  ],
  'chat-2': [
    { _id:'msg-6', chatId:'chat-2', sender:DEMO_USERS.buyer._id, message:'I am interested in the Land Cruiser. Can you share more photos?', createdAt:new Date(now-3*DAY).toISOString(), seen:true, seenBy:['demo-dealer-1'] },
    { _id:'msg-7', chatId:'chat-2', sender:'demo-dealer-1', message:'Sure! I have interior and exterior shots. Also, we have a video walkthrough.', createdAt:new Date(now-2.9*DAY).toISOString(), seen:true, seenBy:[DEMO_USERS.buyer._id] },
    { _id:'msg-8', chatId:'chat-2', sender:DEMO_USERS.buyer._id, message:'Great, please send them over. Also, is the price negotiable?', createdAt:new Date(now-2*DAY).toISOString(), seen:true, seenBy:['demo-dealer-1'] },
    { _id:'msg-9', chatId:'chat-2', sender:'demo-dealer-1', message:'The vehicle is in our showroom, come for a viewing.', createdAt:new Date(now-1*DAY).toISOString(), seen:false, seenBy:[] },
  ],
};

export const DEMO_DEALER_STATS = {
  summary: { totalCars: 12, activeCars: 12, totalViews: 12668, totalBids: 52, liveAuctions: 4 },
  earnings: { total: 18500000, thisMonth: 3600000, inEscrow: 3200000, released: 15300000, pending: 3200000 },
  analytics: { totalCars:12, totalViews:12668, totalBids:52, viewsOverTime:[120,340,560,780,450,890,1200,980,760,1100,1340,1568] },
};

export const DEMO_ADMIN_STATS = {
  stats: { totalUsers: 1246, totalCars: 842, totalBids: 3891, escrowTotal: 28400000, pendingApprovals: 3, flaggedListings: 2, revenue: 1250000 },
};

export const DEMO_ADMIN_USERS = [
  { _id:'admin-target-1', name:'Jane Muthoni', email:'jane@example.com', role:'user', isBanned:false, approved:false, createdAt:new Date(now-2*DAY).toISOString(), lastLogin:new Date(now-1*DAY).toISOString() },
  { _id:'admin-target-2', name:'David Omondi', email:'david@example.com', role:'dealer', isBanned:false, approved:false, businessName:'Omondi Auto Traders', createdAt:new Date(now-5*DAY).toISOString(), lastLogin:new Date(now-3*DAY).toISOString() },
  { _id:'admin-target-3', name:'Sarah Chebet', email:'sarah@example.com', role:'dealer', isBanned:true, approved:true, businessName:'Chebet Motors', createdAt:new Date(now-60*DAY).toISOString(), lastLogin:new Date(now-10*DAY).toISOString() },
  { _id:'admin-target-4', name:'Michael Kiplagat', email:'michael@example.com', role:'user', isBanned:false, approved:true, createdAt:new Date(now-90*DAY).toISOString(), lastLogin:new Date(now-7*DAY).toISOString() },
  { _id:'demo-dealer-1', name:'Peter Kamau', email:'dealer@demo.com', role:'dealer', isBanned:false, approved:true, businessName:'Nairobi Auto Hub Ltd', createdAt:new Date(now-180*DAY).toISOString(), lastLogin:new Date(now-0.1*DAY).toISOString() },
  { _id:'demo-individual-seller-1', name:'Grace Wanjiku', email:'individual@demo.com', role:'individual_seller', isBanned:false, approved:true, createdAt:new Date(now-90*DAY).toISOString(), lastLogin:new Date(now-0.3*DAY).toISOString() },
  { _id:DEMO_USERS.buyer._id, name:'James Kariuki', email:'buyer@demo.com', role:'user', isBanned:false, approved:true, createdAt:new Date(now-30*DAY).toISOString(), lastLogin:new Date(now-0.2*DAY).toISOString() },
];

export function getDemoMarketPulse(carId) {
  const car = getDemoCar(carId);
  if (!car) return null;
  const demandScores = { prado: 95, landcruiser: 98, harrier: 88, cx5: 85, xtrail: 78, forester: 80, demio: 82, vitz: 85, axio: 75, premio: 80 };
  const lower = (car.title || "").toLowerCase();
  let demand = 65;
  for (const [k, v] of Object.entries(demandScores)) {
    if (lower.includes(k)) { demand = v; break; }
  }
  const daysOnMarket = Math.round((Date.now() - new Date(car.createdAt || Date.now()).getTime()) / 86400000);
  const priceRatio = 0.85 + Math.random() * 0.3;
  const fairMin = Math.round(car.price * 0.88);
  const fairMax = Math.round(car.price * 1.08);
  const priceVsMarket = Math.round((1 - priceRatio) * 100);
  const trend = priceVsMarket < -10 ? "overvalued" : priceVsMarket > 10 ? "undervalued" : "stable";
  return {
    predictiveScore: Math.min(100, Math.round(demand * 0.6 + (car.views > 100 ? 15 : 5) + (priceRatio < 1.1 ? 10 : 0))),
    trend,
    demandScore: demand,
    fairPriceRange: { min: fairMin, max: fairMax, avg: Math.round((fairMin + fairMax) / 2) },
    estDaysToSell: Math.max(3, Math.round(45 - demand * 0.3 + (1 - priceRatio) * 15)),
    daysOnMarket,
    marketAvgPrice: Math.round(car.price * priceRatio),
    priceVsMarket,
    sampleSize: 8 + Math.floor(Math.random() * 15),
  };
}

export function getDemoDealerInsights() {
  const cars = _cars.slice(0, 10);
  const photoScore = Math.min(100, Math.round(cars.reduce((s, c) => {
    const cnt = (c.images || []).length;
    return s + (cnt >= 5 ? 95 : cnt >= 3 ? 75 : cnt >= 1 ? 50 : 10);
  }, 0) / cars.length));
  const recommendations = cars.slice(0, 5).map(c => {
    const pulse = getDemoMarketPulse(c._id);
    return {
      carId: c._id,
      title: c.title,
      currentPrice: c.price,
      optimalPrice: pulse?.fairPriceRange?.avg || c.price,
      priceDiff: pulse ? Math.round(((c.price - pulse.fairPriceRange.avg) / pulse.fairPriceRange.avg) * 100) : 0,
      photoCount: (c.images || []).length,
      engagementScore: pulse?.predictiveScore || 50,
      daysOnMarket: pulse?.daysOnMarket || 1,
    };
  });
  return { totalCars: cars.length, photoScore, recommendations, averageScore: Math.round(recommendations.reduce((s, r) => s + r.engagementScore, 0) / recommendations.length) };
}

export function filterDemoCars(filters = {}) {
  let r = [..._cars];
  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    r = r.filter(c => {
      const title = (c.title || '').toLowerCase();
      const brand = (c.brand || '').toLowerCase();
      const city = (c.location?.city || '').toLowerCase();
      return title.includes(q) || brand.includes(q) || city.includes(q);
    });
  }
  if (filters.brand && filters.brand !== 'All Brands') r = r.filter(c => c.brand === filters.brand);
  if (filters.fuel) r = r.filter(c => c.fuel === filters.fuel);
  if (filters.transmission) r = r.filter(c => c.transmission === filters.transmission);
  if (filters.body || filters.bodyType) {
    const bodyVal = filters.body || filters.bodyType;
    r = r.filter(c => c.bodyType === bodyVal);
  }
  if (filters.city || filters.location) {
    const cityVal = filters.city || filters.location;
    r = r.filter(c => c.location?.city === cityVal);
  }
  if (filters.minPrice) r = r.filter(c => c.price >= Number(filters.minPrice));
  if (filters.maxPrice) r = r.filter(c => c.price <= Number(filters.maxPrice));
  if (filters.yearMin || filters.minYear) {
    const y = Number(filters.yearMin || filters.minYear);
    if (y) r = r.filter(c => c.year >= y);
  }
  if (filters.yearMax || filters.maxYear) {
    const y = Number(filters.yearMax || filters.maxYear);
    if (y) r = r.filter(c => c.year <= y);
  }
  if (filters.mileageMin) r = r.filter(c => c.mileage >= Number(filters.mileageMin));
  if (filters.mileageMax) r = r.filter(c => c.mileage <= Number(filters.mileageMax));
  if (filters.condition) r = r.filter(c => c.condition === filters.condition);
  if (filters.category === 'auction') r = r.filter(c => c.auctionStatus === 'live' || c.allowBid);
  if (filters.category === 'fixed') r = r.filter(c => c.auctionStatus !== 'live' && !c.allowBid);
  if (filters.auctionStatus === 'live') r = r.filter(c => c.auctionStatus === 'live');
  if (filters.color) r = r.filter(c => c.color === filters.color);
  const total = r.length;
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 12;
  const totalPages = Math.ceil(total / limit) || 1;
  if (filters.sort === 'price_asc') r.sort((a, b) => (a.price || 0) - (b.price || 0));
  else if (filters.sort === 'price_desc') r.sort((a, b) => (b.price || 0) - (a.price || 0));
  else if (filters.sort === 'year_desc') r.sort((a, b) => (b.year || 0) - (a.year || 0));
  else if (filters.sort === 'year_asc') r.sort((a, b) => (a.year || 0) - (b.year || 0));
  else if (filters.sort === 'mileage_asc') r.sort((a, b) => (a.mileage || 0) - (b.mileage || 0));
  else if (filters.sort === 'views_desc') r.sort((a, b) => (b.views || 0) - (a.views || 0));
  else r.sort((a, b) => {
    const aLive = a.auctionStatus === 'live' ? 1 : 0;
    const bLive = b.auctionStatus === 'live' ? 1 : 0;
    if (bLive !== aLive) return bLive - aLive;
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
  const start = (page - 1) * limit;
  const paged = r.slice(start, start + limit);
  return { cars: paged, total, pagination: { total, page, limit, pages: totalPages } };
}

export function getDemoCar(id) {
  return _cars.find(c => c._id === id) || null;
}
