// ─── Car images using picsum.photos (reliable placeholder service) ─
const S = (seed) => `https://picsum.photos/seed/${seed}/600/400`;

const DEDICATED = {
  lc:  [S('landcruiser1'), S('landcruiser2')],
  mb:  [S('mercedes1'),    S('mercedes2')],
  bmw: [S('bmw1'),         S('bmw2')],
  sub: [S('subaru1'),      S('subaru2')],
  nis: [S('nissan1'),      S('nissan2')],
  maz: [S('mazda1'),       S('mazda2')],
  rr:  [S('rangerover1'),  S('rangerover2')],
  audi:[S('audi1'),        S('audi2')],
  lex: [S('lexus1'),       S('lexus2')],
  vw:  [S('vw1'),          S('vw2')],
  hon: [S('honda1'),       S('honda2')],
  pick:[S('hilux1'),       S('hilux2')],
};

const SHARED = Array.from({ length: 24 }, (_, i) => S(`shared${i}`));

// Build IMG: each entry = 2 dedicated + 6 from SHARED at rolling offset
const IMG = {};
const _k = Object.keys(DEDICATED);
_k.forEach((key, i) => {
  const start = (i * 6) % 24;
  IMG[key] = [...DEDICATED[key], ...SHARED.slice(start, start + 6)];
});

// ─── DEMO DEALER - Handles all demo car operations ─
const DEMO_DEALER = {
  _id: 'demo-dealer-1',
  name: 'Peter Kamau',
  email: 'dealer@demo.com',
  role: 'dealer',
  phone: '254723456789',
  location: 'Industrial Area, Nairobi',
  businessName: 'Nairobi Auto Hub Ltd',
  bio: 'Premium car dealer with 10+ years experience. Specializing in Japanese and German imports.',
  isBanned: false,
  approved: true,
  dealerRating: 4.7,
  reviewCount: 42,
  isDemo: true,
  active: true,
};

// ─── DEMO PRIVATE SELLER ─
const DEMO_SELLER = {
  _id: 'demo-seller-1',
  name: 'Mary Wanjiku',
  email: 'seller@demo.com',
  role: 'seller',
  phone: '254734567890',
  location: 'Westlands, Nairobi',
  bio: 'Private car owner selling my personal vehicle.',
  isBanned: false,
  approved: true,
  dealerRating: 0,
  isDemo: true,
  active: true,
};

// ─── DEMO BUYER ─
const DEMO_BUYER = {
  _id: 'demo-buyer-1',
  name: 'James Kariuki',
  email: 'buyer@demo.com',
  role: 'user',
  phone: '254712345678',
  location: 'Westlands, Nairobi',
  bio: 'Car enthusiast looking for my next ride',
  isBanned: false,
  approved: true,
  dealerRating: 0,
  isDemo: true,
  active: true,
};

// ─── SYSTEM ADMIN - Sole platform owner (the actual user) ─
const SYSTEM_ADMIN = {
  _id: 'admin-system-1',
  name: 'System Owner',
  email: 'jimmythemugo@gmail.com',
  role: 'superadmin',
  phone: '254700000001',
  location: 'Nairobi, Kenya',
  bio: 'Platform owner & system administrator',
  isBanned: false,
  approved: true,
  dealerRating: 0,
  superAdmin: true,
  isDemo: false,
  active: true,
};

// Export all users - admin is separate from demo accounts
export const DEMO_USERS = {
  buyer: DEMO_BUYER,
  dealer: DEMO_DEALER,
  seller: DEMO_SELLER,
  admin: SYSTEM_ADMIN,
};

const now = Date.now();
const DAY = 86400000;

// ─── DEMO CARS - All managed by the demo dealer ─
export const DEMO_CARS = [
  { _id:'car-lc1', title:'Toyota Land Cruiser V8 2021', brand:'Toyota', price:8500000, year:2021, fuel:'Diesel', transmission:'Automatic', mileage:45000, bodyType:'SUV', color:'Black', location:{city:'Nairobi'}, description:'2021 Toyota Land Cruiser V8 in pristine condition. Full service history, leather interior, sunroof, 7 seats.', features:['Leather Seats','Sunroof','7 Seats','4WD','Bluetooth','Reverse Camera'], images:IMG.lc, views:1842, bidsCount:14, currentBid:3200000, allowBid:true, allowBuy:true, auctionStatus:'live', auctionEnd:new Date(now+3*DAY).toISOString(), isPromoted:true, isVerifiedDealer:true, dealRating:'great', dealer:DEMO_DEALER },
  { _id:'car-mb1', title:'Mercedes-Benz GLE 350d 2022', brand:'Mercedes', price:12000000, year:2022, fuel:'Diesel', transmission:'Automatic', mileage:22000, bodyType:'SUV', color:'White', location:{city:'Nairobi'}, description:'Mercedes GLE 350d AMG package, panoramic roof, premium sound. One owner.', features:['AMG Package','Panoramic Roof','Premium Sound','Leather','Heated Seats','360 Camera'], images:IMG.mb, views:2103, bidsCount:0, currentBid:0, allowBid:false, allowBuy:true, auctionStatus:'ended', auctionEnd:null, isPromoted:true, isVerifiedDealer:true, dealRating:'fair', dealer:DEMO_DEALER },
  { _id:'car-bmw1', title:'BMW X5 M Sport 2020', brand:'BMW', price:6200000, year:2020, fuel:'Petrol', transmission:'Automatic', mileage:38000, bodyType:'SUV', color:'Blue', location:{city:'Mombasa'}, description:'BMW X5 M Sport with full M package. Sport exhaust, adaptive suspension.', features:['M Sport Package','Sport Exhaust','Adaptive Suspension','Comfort Access','HUD','Wireless Charging'], images:IMG.bmw, views:1567, bidsCount:8, currentBid:4100000, allowBid:true, allowBuy:false, auctionStatus:'live', auctionEnd:new Date(now+1.5*DAY).toISOString(), isPromoted:false, isVerifiedDealer:true, dealRating:'great', dealer:DEMO_DEALER },
  { _id:'car-sub1', title:'Subaru Forester XT 2021', brand:'Subaru', price:3800000, year:2021, fuel:'Petrol', transmission:'Automatic', mileage:28000, bodyType:'SUV', color:'Silver', location:{city:'Nairobi'}, description:'Subaru Forester XT Turbo. Leather, sunroof, Eyesight safety suite.', features:['Turbo','Sunroof','Leather Seats','Eyesight','All Wheel Drive','Cruise Control'], images:IMG.sub, views:982, bidsCount:3, currentBid:2850000, allowBid:true, allowBuy:true, auctionStatus:'live', auctionEnd:new Date(now+0.5*DAY).toISOString(), isPromoted:false, isVerifiedDealer:true, dealRating:'good', dealer:DEMO_DEALER },
  { _id:'car-nis1', title:'Nissan X-Trail 2022', brand:'Nissan', price:2900000, year:2022, fuel:'Petrol', transmission:'Automatic', mileage:18000, bodyType:'SUV', color:'Grey', location:{city:'Nakuru'}, description:'Nissan X-Trail 7-seater, push start, keyless entry, touchscreen infotainment.', features:['7 Seats','Push Start','Keyless Entry','Touchscreen','Bluetooth','AC'], images:IMG.nis, views:734, bidsCount:0, currentBid:0, allowBid:false, allowBuy:true, auctionStatus:'draft', auctionEnd:null, isPromoted:false, isVerifiedDealer:false, dealRating:'good', dealer:DEMO_DEALER },
  { _id:'car-maz1', title:'Mazda CX-5 2023', brand:'Mazda', price:4200000, year:2023, fuel:'Petrol', transmission:'Automatic', mileage:12000, bodyType:'SUV', color:'Red', location:{city:'Nairobi'}, description:'Mazda CX-5 KODO design, SkyActiv technology, Bose sound system. Only 12k km.', features:['Bose Sound','SkyActiv','Leather','Sunroof','Blind Spot Monitoring','Apple CarPlay'], images:IMG.maz, views:1289, bidsCount:5, currentBid:3600000, allowBid:true, allowBuy:true, auctionStatus:'live', auctionEnd:new Date(now+2*DAY).toISOString(), isPromoted:true, isVerifiedDealer:true, dealRating:'great', dealer:DEMO_DEALER },
  { _id:'car-rr1', title:'Land Rover Range Rover Sport 2020', brand:'Land Rover', price:15000000, year:2020, fuel:'Diesel', transmission:'Automatic', mileage:35000, bodyType:'SUV', color:'Black', location:{city:'Nairobi'}, description:'Range Rover Sport HSE Dynamic. Supercharged V6, air suspension, Meridian sound.', features:['Air Suspension','Meridian Sound','Supercharged','Terrain Response','Leather','Rear Entertainment'], images:IMG.rr, views:3210, bidsCount:0, currentBid:0, allowBid:false, allowBuy:true, auctionStatus:'ended', auctionEnd:null, isPromoted:true, isVerifiedDealer:true, dealRating:'overpriced', dealer:DEMO_DEALER },
  { _id:'car-aud1', title:'Audi A4 2.0 TFSI 2021', brand:'Audi', price:3800000, year:2021, fuel:'Petrol', transmission:'Automatic', mileage:25000, bodyType:'Sedan', color:'White', location:{city:'Nairobi'}, description:'Audi A4 Quattro. Virtual cockpit, Bang & Olufsen sound, S-Line package. Executive sedan.', features:['Quattro AWD','Virtual Cockpit','Bang & Olufsen','S-Line','Sunroof','Adaptive Cruise'], images:IMG.audi, views:876, bidsCount:0, currentBid:0, allowBid:false, allowBuy:true, auctionStatus:'draft', auctionEnd:null, isPromoted:false, isVerifiedDealer:true, dealRating:'good', dealer:DEMO_DEALER },
  { _id:'car-lex1', title:'Lexus ES 350 2022', brand:'Lexus', price:5200000, year:2022, fuel:'Petrol', transmission:'Automatic', mileage:15000, bodyType:'Sedan', color:'Silver', location:{city:'Mombasa'}, description:'Lexus ES 350 Luxury Package. Mark Levinson sound, semi-aniline leather. Premium sedan.', features:['Mark Levinson','Semi-Aniline Leather','Radar Cruise','Heated/Ventilated Seats','Moonroof','360 Camera'], images:IMG.lex, views:654, bidsCount:2, currentBid:6200000, allowBid:true, allowBuy:true, auctionStatus:'live', auctionEnd:new Date(now+4*DAY).toISOString(), isPromoted:false, isVerifiedDealer:true, dealRating:'fair', dealer:DEMO_DEALER },
  { _id:'car-vw1', title:'Volkswagen Passat 2021', brand:'Volkswagen', price:2600000, year:2021, fuel:'Diesel', transmission:'Automatic', mileage:32000, bodyType:'Sedan', color:'Blue', location:{city:'Eldoret'}, description:'VW Passat 2.0 TDI. Comfortline trim, spacious interior, great fuel economy.', features:['Diesel','Spacious Interior','Bluetooth','Rear Camera','Parking Sensors','Cruise Control'], images:IMG.vw, views:521, bidsCount:0, currentBid:0, allowBid:false, allowBuy:true, auctionStatus:'ended', auctionEnd:null, isPromoted:false, isVerifiedDealer:false, dealRating:'great', dealer:DEMO_DEALER },
  { _id:'car-hon1', title:'Honda Accord 2022', brand:'Honda', price:3100000, year:2022, fuel:'Petrol', transmission:'Automatic', mileage:20000, bodyType:'Sedan', color:'Grey', location:{city:'Nairobi'}, description:'Honda Accord 2022, top of the line. Honda Sensing safety suite, leather, moonroof.', features:['Honda Sensing','Leather','Moonroof','Apple CarPlay','Wireless Charging','Lane Keep Assist'], images:IMG.hon, views:445, bidsCount:0, currentBid:0, allowBid:false, allowBuy:true, auctionStatus:'draft', auctionEnd:null, isPromoted:false, isVerifiedDealer:false, dealRating:'good', dealer:DEMO_DEALER },
  { _id:'car-pick1', title:'Toyota Hilux Double Cabin 2021', brand:'Toyota', price:4200000, year:2021, fuel:'Diesel', transmission:'Automatic', mileage:40000, bodyType:'Pickup', color:'White', location:{city:'Nairobi'}, description:'Toyota Hilux Double Cabin 4x4. Workhorse of Africa. Well maintained.', features:['4x4','Double Cabin','Canopy','Bluetooth','AC','Power Windows'], images:IMG.pick, views:1678, bidsCount:10, currentBid:3100000, allowBid:true, allowBuy:true, auctionStatus:'live', auctionEnd:new Date(now+1*DAY).toISOString(), isPromoted:true, isVerifiedDealer:true, dealRating:'great', dealer:DEMO_DEALER },
];

export const DEMO_BIDS = (() => {
  const bids = [];
  let t = now - 2 * DAY;
  const add = (carId, amount, user, phone) => {
    t += 300000 + Math.random() * 600000;
    bids.push({ _id:`bid-${bids.length+1}`, car:carId, amount, user:{_id:user||DEMO_BUYER._id,name:user===DEMO_BUYER._id?'James Kariuki':'Bidder'}, phone:phone||'2547XXXXXX', mpesaPaid:true, createdAt:new Date(t).toISOString() });
  };
  add('car-lc1', 2800000, DEMO_BUYER._id);
  add('car-lc1', 2900000, 'other-bidder-1');
  add('car-lc1', 3050000, DEMO_BUYER._id);
  add('car-lc1', 3100000, 'other-bidder-2');
  add('car-lc1', 3200000, DEMO_BUYER._id);
  add('car-bmw1', 3800000, DEMO_BUYER._id);
  add('car-bmw1', 3900000, 'other-bidder-1');
  add('car-bmw1', 4000000, DEMO_BUYER._id);
  add('car-bmw1', 4100000, 'other-bidder-2');
  add('car-sub1', 2700000, DEMO_BUYER._id);
  add('car-sub1', 2800000, 'other-bidder-3');
  add('car-sub1', 2850000, DEMO_BUYER._id);
  add('car-maz1', 3400000, DEMO_BUYER._id);
  add('car-maz1', 3500000, 'other-bidder-1');
  add('car-maz1', 3600000, DEMO_BUYER._id);
  add('car-lex1', 6000000, DEMO_BUYER._id);
  add('car-lex1', 6200000, 'other-bidder-3');
  add('car-pick1', 2900000, DEMO_BUYER._id);
  add('car-pick1', 3000000, 'other-bidder-1');
  add('car-pick1', 3100000, DEMO_BUYER._id);
  return bids;
})();

export const DEMO_PAYMENTS = [
  { _id:'pay-1', user:DEMO_BUYER._id, car:'car-lc1', type:'bid', amount:160000, phone:'254712345678', status:'success', mpesaReceiptNumber:'PGE71H4K9V', checkoutRequestID:'mock-checkout-1', car:{title:'Toyota Land Cruiser V8 2021'}, createdAt:new Date(now-1*DAY).toISOString() },
  { _id:'pay-2', user:DEMO_BUYER._id, car:'car-maz1', type:'bid', amount:180000, phone:'254712345678', status:'success', mpesaReceiptNumber:'RFA82J5M2W', checkoutRequestID:'mock-checkout-2', car:{title:'Mazda CX-5 2023'}, createdAt:new Date(now-0.5*DAY).toISOString() },
  { _id:'pay-3', user:DEMO_BUYER._id, car:'car-sub1', type:'bid', amount:142500, phone:'254712345678', status:'pending', checkoutRequestID:'mock-checkout-3', car:{title:'Subaru Forester XT 2021'}, createdAt:new Date(now-2*DAY).toISOString() },
  { _id:'pay-4', user:DEMO_BUYER._id, car:'car-lc1', type:'escrow', amount:3200000, phone:'254712345678', status:'funded', mpesaReceiptNumber:'XCV73K8N1B', checkoutRequestID:'mock-checkout-4', car:{title:'Toyota Land Cruiser V8 2021'}, createdAt:new Date(now-0.3*DAY).toISOString() },
];

export const DEMO_ESCROWS = [
  { _id:'esc-1', buyer:DEMO_BUYER, seller:DEMO_DEALER, car:{title:'Toyota Land Cruiser V8 2021'}, amount:3200000, status:'funded', createdAt:new Date(now-0.3*DAY).toISOString() },
  { _id:'esc-2', buyer:{_id:'other-buyer-1',name:'Mary Wanjiku'}, seller:DEMO_DEALER, car:{title:'Mazda CX-5 2023'}, amount:3600000, status:'released', releasedAt:new Date(now-10*DAY).toISOString(), createdAt:new Date(now-20*DAY).toISOString() },
  { _id:'esc-3', buyer:{_id:'other-buyer-2',name:'John Ochieng'}, seller:DEMO_DEALER, car:{title:'Mercedes-Benz GLE 350d 2022'}, amount:12000000, status:'released', releasedAt:new Date(now-5*DAY).toISOString(), createdAt:new Date(now-15*DAY).toISOString() },
  { _id:'esc-4', buyer:DEMO_BUYER, seller:DEMO_DEALER, car:{title:'BMW X5 M Sport 2020'}, amount:4100000, status:'pending', createdAt:new Date(now-0.1*DAY).toISOString() },
];

export const DEMO_NOTIFICATIONS = [
  { _id:'notif-1', user:DEMO_BUYER._id, title:'Bid Placed', message:'Your bid of KES 3,200,000 on Toyota Land Cruiser V8 is leading!', type:'bid', read:false, createdAt:new Date(now-0.5*DAY).toISOString() },
  { _id:'notif-2', user:DEMO_BUYER._id, title:'Payment Confirmed', message:'M-Pesa payment of KES 160,000 confirmed. Receipt: PGE71H4K9V', type:'payment', read:false, createdAt:new Date(now-1*DAY).toISOString() },
  { _id:'notif-3', user:DEMO_BUYER._id, title:'Escrow Funded', message:'KES 3,200,000 is now held securely in escrow for Land Cruiser V8.', type:'escrow', read:true, createdAt:new Date(now-0.3*DAY).toISOString() },
  { _id:'notif-4', user:DEMO_BUYER._id, title:'New Message', message:'Nairobi Auto Hub Ltd replied to your inquiry about Mazda CX-5.', type:'chat', read:false, createdAt:new Date(now-0.1*DAY).toISOString() },
  { _id:'notif-5', user:DEMO_BUYER._id, title:'Auction Ending Soon', message:'Subaru Forester XT auction ends in 12 hours!', type:'auction', read:true, createdAt:new Date(now-0.2*DAY).toISOString() },
  { _id:'notif-6', user:DEMO_DEALER._id, title:'New Bid Received', message:'New bid of KES 3,200,000 on your Toyota Land Cruiser V8.', type:'bid', read:false, createdAt:new Date(now-0.5*DAY).toISOString() },
  { _id:'notif-7', user:DEMO_DEALER._id, title:'Escrow Released', message:'KES 3,600,000 from Mazda CX-5 sale released to your account.', type:'escrow', read:false, createdAt:new Date(now-10*DAY).toISOString() },
  { _id:'notif-8', user:SYSTEM_ADMIN._id, title:'New User Registered', message:'A new dealer account requires approval.', type:'system', read:false, createdAt:new Date(now-1*DAY).toISOString() },
  { _id:'notif-9', user:SYSTEM_ADMIN._id, title:'Suspicious Activity', message:'Multiple rapid bids detected on car-lc1.', type:'system', read:true, createdAt:new Date(now-2*DAY).toISOString() },
  { _id:'notif-10', user:SYSTEM_ADMIN._id, title:'Large Escrow Release', message:'KES 12,000,000 escrow pending release for Mercedes GLE.', type:'escrow', read:false, createdAt:new Date(now-1*DAY).toISOString() },
];

export const DEMO_REVIEWS = [
  { _id:'rev-1', user:{_id:DEMO_BUYER._id,name:'James Kariuki'}, dealer:DEMO_DEALER._id, car:'car-maz1', rating:5, comment:'Excellent service! The Mazda CX-5 was exactly as described. Nairobi Auto Hub made the process smooth.', createdAt:new Date(now-15*DAY).toISOString() },
  { _id:'rev-2', user:{_id:'other-buyer-1',name:'Mary Wanjiku'}, dealer:DEMO_DEALER._id, rating:4, comment:'Professional dealer, fair pricing. Would buy from them again.', createdAt:new Date(now-30*DAY).toISOString() },
  { _id:'rev-3', user:{_id:'other-buyer-2',name:'John Ochieng'}, dealer:DEMO_DEALER._id, rating:5, comment:'Top-notch dealership. The Mercedes GLE was immaculate. Highly recommended!', createdAt:new Date(now-20*DAY).toISOString() },
];

export const DEMO_CHATS = [
  { _id:'chat-1', participants:[{_id:DEMO_BUYER._id,name:'James Kariuki'},{_id:DEMO_DEALER._id,name:'Peter Kamau'}], car:{_id:'car-maz1',title:'Mazda CX-5 2023'}, lastMessage:{message:'Yes, it is still available. Would you like to schedule a test drive?',createdAt:new Date(now-0.5*DAY).toISOString()}, unreadCount:1, createdAt:new Date(now-5*DAY).toISOString() },
  { _id:'chat-2', participants:[{_id:DEMO_BUYER._id,name:'James Kariuki'},{_id:DEMO_DEALER._id,name:'Peter Kamau'}], car:{_id:'car-lc1',title:'Toyota Land Cruiser V8 2021'}, lastMessage:{message:'The vehicle is in our showroom, come for a viewing.',createdAt:new Date(now-1*DAY).toISOString()}, unreadCount:0, createdAt:new Date(now-3*DAY).toISOString() },
];

export const DEMO_MESSAGES = {
  'chat-1': [
    { _id:'msg-1', chatId:'chat-1', sender:DEMO_BUYER._id, message:'Hi, is the Mazda CX-5 still available?', createdAt:new Date(now-5*DAY).toISOString() },
    { _id:'msg-2', chatId:'chat-1', sender:DEMO_DEALER._id, message:'Yes, it is still available! When would you like to view it?', createdAt:new Date(now-4.9*DAY).toISOString() },
    { _id:'msg-3', chatId:'chat-1', sender:DEMO_BUYER._id, message:'This weekend would work. Do you have Saturday slots?', createdAt:new Date(now-4*DAY).toISOString() },
    { _id:'msg-4', chatId:'chat-1', sender:DEMO_DEALER._id, message:'Saturday 10am works perfectly. We are in Industrial Area, Nairobi.', createdAt:new Date(now-3.8*DAY).toISOString() },
    { _id:'msg-5', chatId:'chat-1', sender:DEMO_DEALER._id, message:'Yes, it is still available. Would you like to schedule a test drive?', createdAt:new Date(now-0.5*DAY).toISOString() },
  ],
  'chat-2': [
    { _id:'msg-6', chatId:'chat-2', sender:DEMO_BUYER._id, message:'I am interested in the Land Cruiser. Can you share more photos?', createdAt:new Date(now-3*DAY).toISOString() },
    { _id:'msg-7', chatId:'chat-2', sender:DEMO_DEALER._id, message:'Sure! I have interior and exterior shots. Also, we have a video walkthrough.', createdAt:new Date(now-2.9*DAY).toISOString() },
    { _id:'msg-8', chatId:'chat-2', sender:DEMO_BUYER._id, message:'Great, please send them over. Also, is the price negotiable?', createdAt:new Date(now-2*DAY).toISOString() },
    { _id:'msg-9', chatId:'chat-2', sender:DEMO_DEALER._id, message:'The vehicle is in our showroom, come for a viewing.', createdAt:new Date(now-1*DAY).toISOString() },
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
  { _id:DEMO_DEALER._id, name:'Peter Kamau', email:'dealer@demo.com', role:'dealer', isBanned:false, approved:true, businessName:'Nairobi Auto Hub Ltd', isDemo:true, createdAt:new Date(now-180*DAY).toISOString(), lastLogin:new Date(now-0.1*DAY).toISOString() },
  { _id:DEMO_BUYER._id, name:'James Kariuki', email:'buyer@demo.com', role:'user', isBanned:false, approved:true, isDemo:true, createdAt:new Date(now-30*DAY).toISOString(), lastLogin:new Date(now-0.2*DAY).toISOString() },
  { _id:DEMO_SELLER._id, name:'Mary Wanjiku', email:'seller@demo.com', role:'seller', isBanned:false, approved:true, isDemo:true, createdAt:new Date(now-45*DAY).toISOString(), lastLogin:new Date(now-0.3*DAY).toISOString() },
];

export function filterDemoCars(filters = {}) {
  let r = [...DEMO_CARS];
  if (filters.search) { const q = filters.search.toLowerCase(); r = r.filter(c => c.title.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q) || c.location.city.toLowerCase().includes(q)); }
  if (filters.brand && filters.brand !== 'All Brands') r = r.filter(c => c.brand === filters.brand);
  if (filters.fuel) r = r.filter(c => c.fuel === filters.fuel);
  if (filters.transmission) r = r.filter(c => c.transmission === filters.transmission);
  if (filters.bodyType) r = r.filter(c => c.bodyType === filters.bodyType);
  if (filters.city) r = r.filter(c => c.location.city === filters.city);
  if (filters.minPrice) r = r.filter(c => c.price >= Number(filters.minPrice));
  if (filters.maxPrice) r = r.filter(c => c.price <= Number(filters.maxPrice));
  if (filters.minYear) r = r.filter(c => c.year >= Number(filters.minYear));
  if (filters.maxYear) r = r.filter(c => c.year <= Number(filters.maxYear));
  if (filters.auctionStatus === 'live') r = r.filter(c => c.auctionStatus === 'live');
  const total = r.length;
  if (filters.limit) r = r.slice(0, Number(filters.limit));
  return { cars: r, total, pagination: { total, page: 1, limit: filters.limit || 10, pages: 1 } };
}

export function getDemoCar(id) {
  return DEMO_CARS.find(c => c._id === id) || null;
}
