// ─── Car images using Unsplash (real car photos) ─
const DEDICATED = {
  lc:  [
    'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=400&fit=crop',
  ],
  mb:  [
    'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d1?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&h=400&fit=crop',
  ],
  bmw: [
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop',
  ],
  sub: [
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop',
  ],
  nis: [
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=600&h=400&fit=crop',
  ],
  maz: [
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&h=400&fit=crop',
  ],
  rr:  [
    'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1607016284316-6e1019c28e23?w=600&h=400&fit=crop',
  ],
  audi:[
    'https://images.unsplash.com/photo-1603584173870-7f23fd4c2b4b?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1606664444110-0c1e1e84b8fe?w=600&h=400&fit=crop',
  ],
  lex: [
    'https://images.unsplash.com/photo-1511919886926-f7fb7d0c6e2c?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=600&h=400&fit=crop',
  ],
  vw:  [
    'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1570733117311-d990c3816c47?w=600&h=400&fit=crop',
  ],
  hon: [
    'https://images.unsplash.com/photo-1605816988069-b11383b5076e?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&h=400&fit=crop',
  ],
  pick:[
    'https://images.unsplash.com/photo-1583267746897-3e42c7e14754?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&h=400&fit=crop',
  ],
};

const SHARED = [
  'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d1?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1607016284316-6e1019c28e23?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1603584173870-7f23fd4c2b4b?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1606664444110-0c1e1e84b8fe?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1511919886926-f7fb7d0c6e2c?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1570733117311-d990c3816c47?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1605816988069-b11383b5076e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1583267746897-3e42c7e14754?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&h=400&fit=crop',
];

// Build IMG: each entry = 2 dedicated + 6 from SHARED at rolling offset
const IMG = {};
const _k = Object.keys(DEDICATED);
_k.forEach((key, i) => {
  const start = (i * 6) % 24;
  IMG[key] = [...DEDICATED[key], ...SHARED.slice(start, start + 6)];
});

const DEMO_DEALER_REF = { _id: 'demo-dealer-1', name: 'Nairobi Auto Hub Ltd', role: 'dealer', dealerRating: 4.7, trustScore: 92, verified: true, tier: 'enterprise', verifications: ['email','phone','business','id','ntsa','physical'], escrowMandatory: false, memberSince: '2023', totalTransactions: 342 }; 
const ADMIN_DEALER = DEMO_DEALER_REF;

const now = Date.now();
const DAY = 86400000;

export const DEMO_USERS = {
  buyer: {
    _id: 'demo-buyer-1',
    name: 'James Kariuki',
    email: 'buyer@demo.com',
    password: 'Kayad@Demo2026!',
    role: 'user',
    phone: '254712345678',
    location: 'Westlands, Nairobi',
    bio: 'Car enthusiast looking for my next ride',
    isBanned: false,
    approved: true,
    dealerRating: 0,
    createdAt: new Date(now - 30 * DAY).toISOString(),
    tokenVersion: 0,
  },
  dealer: {
    _id: 'demo-dealer-1',
    name: 'Peter Kamau',
    email: 'dealer@demo.com',
    password: 'Kayad@Demo2026!',
    role: 'dealer',
    phone: '254723456789',
    location: 'Industrial Area, Nairobi',
    businessName: 'Nairobi Auto Hub Ltd',
    bio: 'Premium car dealer with 10+ years experience. Specializing in Japanese and German imports.',
    isBanned: false,
    approved: true,
    dealerRating: 4.7,
    createdAt: new Date(now - 180 * DAY).toISOString(),
    reviewCount: 42,
    tokenVersion: 0,
  },
  superadmin: {
    _id: 'demo-superadmin-1',
    name: 'System Owner',
    email: 'admin@kayad.demo',
    password: 'Temp@ChangeMe1!',
    role: 'superadmin',
    phone: '254700000001',
    location: 'Nairobi, Kenya',
    bio: 'Platform owner & system administrator',
    isBanned: false,
    approved: true,
    dealerRating: 0,
    superAdmin: true,
    mustChangePassword: true,
    createdAt: new Date(now - 365 * DAY).toISOString(),
    tokenVersion: 0,
  },
  admin: {
    _id: 'demo-admin-1',
    name: 'Admin User',
    email: 'admin@demo.com',
    password: 'Kayad@Demo2026!',
    role: 'admin',
    phone: '254734567890',
    location: 'Nairobi',
    isBanned: false,
    approved: true,
    dealerRating: 0,
    createdAt: new Date(now - 365 * DAY).toISOString(),
    tokenVersion: 0,
  },
  broker: {
    _id: 'demo-broker-1',
    name: 'Grace Wanjiku',
    email: 'broker@demo.com',
    password: 'Kayad@Demo2026!',
    role: 'broker',
    phone: '254745678901',
    location: 'Kilimani, Nairobi',
    bio: 'Individual car seller. All transactions protected by escrow.',
    isBanned: false,
    approved: true,
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

let _cars = [
  { _id:'car-lc1', title:'Toyota Land Cruiser V8 2021', brand:'Toyota', price:8500000, year:2021, fuel:'Diesel', transmission:'Automatic', mileage:45000, bodyType:'SUV', color:'Black', location:{city:'Nairobi'}, description:'2021 Toyota Land Cruiser V8 in pristine condition. Full service history, leather interior, sunroof, 7 seats.', features:['Leather Seats','Sunroof','7 Seats','4WD','Bluetooth','Reverse Camera'], images:IMG.lc, views:1842, allowBid:false, allowBuy:true, auctionStatus:'draft', isPromoted:true, isVerifiedDealer:true, dealRating:'great', dealer:ADMIN_DEALER },
  { _id:'car-mb1', title:'Mercedes-Benz GLE 350d 2022', brand:'Mercedes', price:12000000, year:2022, fuel:'Diesel', transmission:'Automatic', mileage:22000, bodyType:'SUV', color:'White', location:{city:'Nairobi'}, description:'Mercedes GLE 350d AMG package, panoramic roof, premium sound. One owner.', features:['AMG Package','Panoramic Roof','Premium Sound','Leather','Heated Seats','360 Camera'], images:IMG.mb, views:2103, allowBid:false, allowBuy:true, auctionStatus:'draft', isPromoted:true, isVerifiedDealer:true, dealRating:'fair', dealer:ADMIN_DEALER },
  { _id:'car-bmw1', title:'BMW X5 M Sport 2020', brand:'BMW', price:6200000, year:2020, fuel:'Petrol', transmission:'Automatic', mileage:38000, bodyType:'SUV', color:'Blue', location:{city:'Mombasa'}, description:'BMW X5 M Sport with full M package. Sport exhaust, adaptive suspension.', features:['M Sport Package','Sport Exhaust','Adaptive Suspension','Comfort Access','HUD','Wireless Charging'], images:IMG.bmw, views:1567, allowBid:false, allowBuy:true, auctionStatus:'draft', isPromoted:false, isVerifiedDealer:true, dealRating:'great', dealer:ADMIN_DEALER },
  { _id:'car-sub1', title:'Subaru Forester XT 2021', brand:'Subaru', price:3800000, year:2021, fuel:'Petrol', transmission:'Automatic', mileage:28000, bodyType:'SUV', color:'Silver', location:{city:'Nairobi'}, description:'Subaru Forester XT Turbo. Leather, sunroof, Eyesight safety suite.', features:['Turbo','Sunroof','Leather Seats','Eyesight','All Wheel Drive','Cruise Control'], images:IMG.sub, views:982, allowBid:false, allowBuy:true, auctionStatus:'draft', isPromoted:false, isVerifiedDealer:true, dealRating:'good', dealer:ADMIN_DEALER },
  { _id:'car-nis1', title:'Nissan X-Trail 2022', brand:'Nissan', price:2900000, year:2022, fuel:'Petrol', transmission:'Automatic', mileage:18000, bodyType:'SUV', color:'Grey', location:{city:'Nakuru'}, description:'Nissan X-Trail 7-seater, push start, keyless entry, touchscreen infotainment.', features:['7 Seats','Push Start','Keyless Entry','Touchscreen','Bluetooth','AC'], images:IMG.nis, views:734, bidsCount:0, currentBid:0, allowBid:false, allowBuy:true, auctionStatus:'draft', auctionEnd:null, isPromoted:false, isVerifiedDealer:false, dealRating:'good', dealer:ADMIN_DEALER },
  { _id:'car-maz1', title:'Mazda CX-5 2023', brand:'Mazda', price:4200000, year:2023, fuel:'Petrol', transmission:'Automatic', mileage:12000, bodyType:'SUV', color:'Red', location:{city:'Nairobi'}, description:'Mazda CX-5 KODO design, SkyActiv technology, Bose sound system. Only 12k km.', features:['Bose Sound','SkyActiv','Leather','Sunroof','Blind Spot Monitoring','Apple CarPlay'], images:IMG.maz, views:1289, allowBid:false, allowBuy:true, auctionStatus:'draft', isPromoted:true, isVerifiedDealer:true, dealRating:'great', dealer:ADMIN_DEALER },
  { _id:'car-rr1', title:'Land Rover Range Rover Sport 2020', brand:'Land Rover', price:15000000, year:2020, fuel:'Diesel', transmission:'Automatic', mileage:35000, bodyType:'SUV', color:'Black', location:{city:'Nairobi'}, description:'Range Rover Sport HSE Dynamic. Supercharged V6, air suspension, Meridian sound.', features:['Air Suspension','Meridian Sound','Supercharged','Terrain Response','Leather','Rear Entertainment'], images:IMG.rr, views:3210, allowBid:false, allowBuy:true, auctionStatus:'draft', isPromoted:true, isVerifiedDealer:true, dealRating:'overpriced', dealer:ADMIN_DEALER },
  { _id:'car-aud1', title:'Audi A4 2.0 TFSI 2021', brand:'Audi', price:3800000, year:2021, fuel:'Petrol', transmission:'Automatic', mileage:25000, bodyType:'Sedan', color:'White', location:{city:'Nairobi'}, description:'Audi A4 Quattro. Virtual cockpit, Bang & Olufsen sound, S-Line package. Executive sedan.', features:['Quattro AWD','Virtual Cockpit','Bang & Olufsen','S-Line','Sunroof','Adaptive Cruise'], images:IMG.audi, views:876, bidsCount:0, currentBid:0, allowBid:false, allowBuy:true, auctionStatus:'draft', auctionEnd:null, isPromoted:false, isVerifiedDealer:true, dealRating:'good', dealer:ADMIN_DEALER },
  { _id:'car-lex1', title:'Lexus ES 350 2022', brand:'Lexus', price:5200000, year:2022, fuel:'Petrol', transmission:'Automatic', mileage:15000, bodyType:'Sedan', color:'Silver', location:{city:'Mombasa'}, description:'Lexus ES 350 Luxury Package. Mark Levinson sound, semi-aniline leather. Premium sedan.', features:['Mark Levinson','Semi-Aniline Leather','Radar Cruise','Heated/Ventilated Seats','Moonroof','360 Camera'], images:IMG.lex, views:654, allowBid:false, allowBuy:true, auctionStatus:'draft', isPromoted:false, isVerifiedDealer:true, dealRating:'fair', dealer:ADMIN_DEALER },
  { _id:'car-vw1', title:'Volkswagen Passat 2021', brand:'Volkswagen', price:2600000, year:2021, fuel:'Diesel', transmission:'Automatic', mileage:32000, bodyType:'Sedan', color:'Blue', location:{city:'Eldoret'}, description:'VW Passat 2.0 TDI. Comfortline trim, spacious interior, great fuel economy.', features:['Diesel','Spacious Interior','Bluetooth','Rear Camera','Parking Sensors','Cruise Control'], images:IMG.vw, views:521, allowBid:false, allowBuy:true, auctionStatus:'draft', isPromoted:false, isVerifiedDealer:false, dealRating:'great', dealer:ADMIN_DEALER },
  { _id:'car-hon1', title:'Honda Accord 2022', brand:'Honda', price:3100000, year:2022, fuel:'Petrol', transmission:'Automatic', mileage:20000, bodyType:'Sedan', color:'Grey', location:{city:'Nairobi'}, description:'Honda Accord 2022, top of the line. Honda Sensing safety suite, leather, moonroof.', features:['Honda Sensing','Leather','Moonroof','Apple CarPlay','Wireless Charging','Lane Keep Assist'], images:IMG.hon, views:445, bidsCount:0, currentBid:0, allowBid:false, allowBuy:true, auctionStatus:'draft', auctionEnd:null, isPromoted:false, isVerifiedDealer:false, dealRating:'good', dealer:ADMIN_DEALER },
  { _id:'car-pick1', title:'Toyota Hilux Double Cabin 2021', brand:'Toyota', price:4200000, year:2021, fuel:'Diesel', transmission:'Automatic', mileage:40000, bodyType:'Pickup', color:'White', location:{city:'Nairobi'}, description:'Toyota Hilux Double Cabin 4x4. Workhorse of Africa. Well maintained.', features:['4x4','Double Cabin','Canopy','Bluetooth','AC','Power Windows'], images:IMG.pick, views:1678, allowBid:false, allowBuy:true, auctionStatus:'draft', isPromoted:true, isVerifiedDealer:true, dealRating:'great', dealer:ADMIN_DEALER },
  // Broker cars (escrow mandatory)
  { _id:'car-broker1', title:'Mazda Demio 2019', brand:'Mazda', price:890000, year:2019, fuel:'Petrol', transmission:'Automatic', mileage:62000, bodyType:'Hatchback', color:'Silver', location:{city:'Nairobi'}, description:'Well maintained Mazda Demio. Perfect first car. All payments via escrow.', features:['AC','Bluetooth','Power Windows','Central Locking'], images:IMG.maz, views:234, allowBid:true, allowBuy:true, auctionStatus:'draft', isPromoted:false, isVerifiedDealer:false, dealRating:'good', dealer:{_id:'demo-broker-1', name:'Grace Wanjiku', role:'broker', dealerRating:4.2, trustScore:78, verified:true, tier:'verified', verifications:['email','phone','id'], escrowMandatory:true, memberSince:'2024', totalTransactions:18} },
  { _id:'car-broker2', title:'Toyota Vitz 2020', brand:'Toyota', price:1250000, year:2020, fuel:'Petrol', transmission:'Automatic', mileage:34000, bodyType:'Hatchback', color:'Blue', location:{city:'Nairobi'}, description:'Toyota Vitz 2020 Grade 5. Very clean, one local owner. Escrow protected.', features:['AC','Keyless Entry','Reverse Camera','Bluetooth','Fuel Efficient'], images:IMG.hon, views:567, allowBid:true, allowBuy:true, auctionStatus:'draft', isPromoted:false, isVerifiedDealer:false, dealRating:'good', dealer:{_id:'demo-broker-1', name:'Grace Wanjiku', role:'broker', dealerRating:4.2, trustScore:78, verified:true, tier:'verified', verifications:['email','phone','id'], escrowMandatory:true, memberSince:'2024', totalTransactions:18} },
];
export const DEMO_CARS = _cars;
export function addDemoCar(car) { _cars.push(car); }
export function updateDemoCar(id, updates) { const i = _cars.findIndex(c => c._id === id); if (i >= 0) _cars[i] = { ..._cars[i], ...updates }; }
export function removeDemoCar(id) { const i = _cars.findIndex(c => c._id === id); if (i >= 0) _cars.splice(i, 1); }

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
  { _id:'esc-5', buyer:{_id:'other-buyer-3',name:'Kevin Mwangi'}, seller:DEMO_USERS.broker, car:{title:'Mazda Demio 2019'}, amount:890000, status:'held', createdAt:new Date(now-0.5*DAY).toISOString(), history:[{action:'created', at:new Date(now-0.5*DAY).toISOString()},{action:'funded', at:new Date(now-0.4*DAY).toISOString()}] },
  { _id:'esc-6', buyer:DEMO_USERS.buyer, seller:DEMO_USERS.broker, car:{title:'Toyota Vitz 2020'}, amount:1250000, status:'released', releasedAt:new Date(now-15*DAY).toISOString(), createdAt:new Date(now-25*DAY).toISOString(), history:[{action:'created', at:new Date(now-25*DAY).toISOString()},{action:'funded', at:new Date(now-24*DAY).toISOString()},{action:'buyer_requested_release', at:new Date(now-16*DAY).toISOString()},{action:'released', at:new Date(now-15*DAY).toISOString()}] },
];

export const DEMO_NOTIFICATIONS = [
  { _id:'notif-1', user:DEMO_USERS.buyer._id, title:'Bid Placed', message:'Your bid of KES 3,200,000 on Toyota Land Cruiser V8 is leading!', type:'bid', read:false, createdAt:new Date(now-0.5*DAY).toISOString() },
  { _id:'notif-2', user:DEMO_USERS.buyer._id, title:'Payment Confirmed', message:'M-Pesa payment of KES 160,000 confirmed. Receipt: PGE71H4K9V', type:'payment', read:false, createdAt:new Date(now-1*DAY).toISOString() },
  { _id:'notif-3', user:DEMO_USERS.buyer._id, title:'Escrow Funded', message:'KES 3,200,000 is now held securely in escrow for Land Cruiser V8.', type:'escrow', read:true, createdAt:new Date(now-0.3*DAY).toISOString() },
  { _id:'notif-4', user:DEMO_USERS.buyer._id, title:'New Message', message:'Nairobi Auto Hub Ltd replied to your inquiry about Mazda CX-5.', type:'chat', read:false, createdAt:new Date(now-0.1*DAY).toISOString() },
  { _id:'notif-5', user:DEMO_USERS.buyer._id, title:'Auction Ending Soon', message:'Subaru Forester XT auction ends in 12 hours!', type:'auction', read:true, createdAt:new Date(now-0.2*DAY).toISOString() },
  { _id:'notif-6', user:DEMO_USERS.dealer._id, title:'New Bid Received', message:'New bid of KES 3,200,000 on your Toyota Land Cruiser V8.', type:'bid', read:false, createdAt:new Date(now-0.5*DAY).toISOString() },
  { _id:'notif-7', user:DEMO_USERS.dealer._id, title:'Escrow Released', message:'KES 3,600,000 from Mazda CX-5 sale released to your account.', type:'escrow', read:false, createdAt:new Date(now-10*DAY).toISOString() },
  { _id:'notif-8', user:DEMO_USERS.admin._id, title:'New User Registered', message:'A new dealer account requires approval.', type:'system', read:false, createdAt:new Date(now-1*DAY).toISOString() },
  { _id:'notif-9', user:DEMO_USERS.admin._id, title:'Suspicious Activity', message:'Multiple rapid bids detected on car-lc1.', type:'system', read:true, createdAt:new Date(now-2*DAY).toISOString() },
  { _id:'notif-10', user:DEMO_USERS.admin._id, title:'Large Escrow Release', message:'KES 12,000,000 escrow pending release for Mercedes GLE.', type:'escrow', read:false, createdAt:new Date(now-1*DAY).toISOString() },
];

export const DEMO_REVIEWS = [
  { _id:'rev-1', user:{_id:DEMO_USERS.buyer._id,name:'James Kariuki'}, dealer:'demo-admin-1', car:'car-maz1', rating:5, comment:'Excellent service! The Mazda CX-5 was exactly as described. Nairobi Auto Hub made the process smooth.', createdAt:new Date(now-15*DAY).toISOString() },
  { _id:'rev-2', user:{_id:'other-buyer-1',name:'Mary Wanjiku'}, dealer:'demo-admin-1', rating:4, comment:'Professional dealer, fair pricing. Would buy from them again.', createdAt:new Date(now-30*DAY).toISOString() },
  { _id:'rev-3', user:{_id:'other-buyer-2',name:'John Ochieng'}, dealer:'demo-admin-1', rating:5, comment:'Top-notch dealership. The Mercedes GLE was immaculate. Highly recommended!', createdAt:new Date(now-20*DAY).toISOString() },
];

export const DEMO_CHATS = [
  { _id:'chat-1', participants:[{_id:DEMO_USERS.buyer._id,name:'James Kariuki'},{_id:'demo-admin-1',name:'Admin User'}], car:{_id:'car-maz1',title:'Mazda CX-5 2023'}, lastMessage:{message:'Yes, it is still available. Would you like to schedule a test drive?',createdAt:new Date(now-0.5*DAY).toISOString()}, unreadCount:1, createdAt:new Date(now-5*DAY).toISOString() },
  { _id:'chat-2', participants:[{_id:DEMO_USERS.buyer._id,name:'James Kariuki'},{_id:'demo-admin-1',name:'Admin User'}], car:{_id:'car-lc1',title:'Toyota Land Cruiser V8 2021'}, lastMessage:{message:'The vehicle is in our showroom, come for a viewing.',createdAt:new Date(now-1*DAY).toISOString()}, unreadCount:0, createdAt:new Date(now-3*DAY).toISOString() },
];

export const DEMO_MESSAGES = {
  'chat-1': [
    { _id:'msg-1', chatId:'chat-1', sender:DEMO_USERS.buyer._id, message:'Hi, is the Mazda CX-5 still available?', createdAt:new Date(now-5*DAY).toISOString() },
    { _id:'msg-2', chatId:'chat-1', sender:'demo-admin-1', message:'Yes, it is still available! When would you like to view it?', createdAt:new Date(now-4.9*DAY).toISOString() },
    { _id:'msg-3', chatId:'chat-1', sender:DEMO_USERS.buyer._id, message:'This weekend would work. Do you have Saturday slots?', createdAt:new Date(now-4*DAY).toISOString() },
    { _id:'msg-4', chatId:'chat-1', sender:'demo-admin-1', message:'Saturday 10am works perfectly. We are in Industrial Area, Nairobi.', createdAt:new Date(now-3.8*DAY).toISOString() },
    { _id:'msg-5', chatId:'chat-1', sender:'demo-admin-1', message:'Yes, it is still available. Would you like to schedule a test drive?', createdAt:new Date(now-0.5*DAY).toISOString() },
  ],
  'chat-2': [
    { _id:'msg-6', chatId:'chat-2', sender:DEMO_USERS.buyer._id, message:'I am interested in the Land Cruiser. Can you share more photos?', createdAt:new Date(now-3*DAY).toISOString() },
    { _id:'msg-7', chatId:'chat-2', sender:'demo-admin-1', message:'Sure! I have interior and exterior shots. Also, we have a video walkthrough.', createdAt:new Date(now-2.9*DAY).toISOString() },
    { _id:'msg-8', chatId:'chat-2', sender:DEMO_USERS.buyer._id, message:'Great, please send them over. Also, is the price negotiable?', createdAt:new Date(now-2*DAY).toISOString() },
    { _id:'msg-9', chatId:'chat-2', sender:'demo-admin-1', message:'The vehicle is in our showroom, come for a viewing.', createdAt:new Date(now-1*DAY).toISOString() },
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
  { _id:'demo-broker-1', name:'Grace Wanjiku', email:'broker@demo.com', role:'broker', isBanned:false, approved:true, createdAt:new Date(now-90*DAY).toISOString(), lastLogin:new Date(now-0.3*DAY).toISOString() },
  { _id:DEMO_USERS.buyer._id, name:'James Kariuki', email:'buyer@demo.com', role:'user', isBanned:false, approved:true, createdAt:new Date(now-30*DAY).toISOString(), lastLogin:new Date(now-0.2*DAY).toISOString() },
];

export function filterDemoCars(filters = {}) {
  let r = [..._cars];
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
  return _cars.find(c => c._id === id) || null;
}
