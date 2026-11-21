import fs from 'node:fs';
const read = (path) => fs.readFileSync(path, 'utf8');
const panel = read('src/components/offers/MarketplaceOfferPanel.jsx');
const seller = read('src/pages/dealer/components/DealerLeadsTab.jsx');
const buyer = read('src/pages/buyer/components/BuyerNegotiationsPanel.jsx');
const overview = read('src/pages/buyer/components/BuyerOverviewTab.jsx');
const api = read('src/services/leadApi.ts');
const controller = read('backend/controllers/offerNegotiationController.js');
const routes = read('backend/routes/leadRoutes.js');
const checks = [
  ['shared offer panel loads canonical lead offers', /leadApi\.offers\(leadId\)/.test(panel)],
  ['buyer and seller can submit persisted offers', /leadApi\.submitOffer/.test(panel)],
  ['recipient can accept, decline and counter', /act\(offer, 'accept'\)/.test(panel) && /act\(offer, 'reject'\)/.test(panel) && /act\(offer, 'counter'\)/.test(panel)],
  ['sender can withdraw pending offer', /act\(offer, 'withdraw'\)/.test(panel)],
  ['idempotency keys are generated per action', /idempotencyKey: key\(\)/.test(panel)],
  ['seller lead cards expose offer interface', /MarketplaceOfferPanel/.test(seller) && /expandedNegotiation/.test(seller)],
  ['buyer dashboard has negotiation inbox', /BuyerNegotiationsPanel/.test(overview)],
  ['buyer inbox loads only canonical buyer negotiation list', /leadApi\.myNegotiations\(\)/.test(buyer)],
  ['client API exposes buyer inbox and offer mutations', /myNegotiations\(\)/.test(api) && /respondToOffer/.test(api)],
  ['buyer inbox endpoint filters leads by authenticated buyer', /\.eq\("buyer", buyerId\)/.test(controller)],
  ['buyer inbox route precedes parameterized offer route', routes.indexOf('router.get("/mine/offers"') >= 0 && routes.indexOf('router.get("/mine/offers"') < routes.indexOf('router.get("/:leadId/offers"')],
  ['offer UI presents durable event history', /View negotiation activity/.test(panel) && /events\.map/.test(panel)],
];
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
console.log(`\nOffer negotiation UI validation: ${checks.filter(([, ok]) => ok).length}/${checks.length} PASS`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
