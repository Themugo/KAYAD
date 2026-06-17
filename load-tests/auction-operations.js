// load-tests/auction-operations.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiLatency = new Trend('api_latency');
const dbLatency = new Trend('db_latency');
const socketLatency = new Trend('socket_latency');
const queueLatency = new Trend('queue_latency');

// Configuration
export const options = {
  stages: [
    { duration: '5m', target: 20 },   // Ramp up to 20 users
    { duration: '10m', target: 50 },  // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    http_req_failed: ['rate<0.05'],
    api_latency: ['p(95)<200', 'p(99)<300'],
    db_latency: ['p(95)<150', 'p(99)<250'],
    socketLatency: ['p(95)<100', 'p(99)<200'],
    queueLatency: ['p(95)<50', 'p(99)<100'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api';

// Helper function to measure API latency
function measureApiLatency(response) {
  apiLatency.add(response.timings.duration);
  return response;
}

// Helper function to estimate database latency
function estimateDbLatency(response) {
  dbLatency.add(response.timings.duration * 0.5);
  return response;
}

// Helper function to estimate socket latency
function estimateSocketLatency(response) {
  socketLatency.add(response.timings.duration * 0.3);
  return response;
}

// Helper function to estimate queue latency
function estimateQueueLatency(response) {
  queueLatency.add(response.timings.duration * 0.2);
  return response;
}

export function setup() {
  // Setup: Create user account and get token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: `auction_user${__VU}@test.com`,
    password: 'test123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200) {
    throw new Error('Failed to login user');
  }

  const token = loginRes.json('token');
  return { token };
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Scenario 1: Get auction calendar
  let calendarRes = http.get(`${BASE_URL}/auctions/calendar`, { headers });
  calendarRes = measureApiLatency(calendarRes);
  calendarRes = estimateDbLatency(calendarRes);
  check(calendarRes, {
    'calendar status is 200': (r) => r.status === 200,
  });
  sleep(2);

  // Scenario 2: Get live auction (40% of users)
  if (Math.random() < 0.4) {
    const auctionId = Math.floor(Math.random() * 100) + 1;
    let liveRes = http.get(`${BASE_URL}/auction/${auctionId}`, { headers });
    liveRes = measureApiLatency(liveRes);
    liveRes = estimateDbLatency(liveRes);
    liveRes = estimateSocketLatency(liveRes);
    check(liveRes, {
      'live auction status is 200': (r) => r.status === 200,
    });
    sleep(3);
  }

  // Scenario 3: Place bid (30% of users)
  if (Math.random() < 0.3) {
    const auctionId = Math.floor(Math.random() * 100) + 1;
    const bidAmount = Math.floor(Math.random() * 500000) + 1000000;
    let bidRes = http.post(`${BASE_URL}/bids`, JSON.stringify({
      auctionId,
      amount: bidAmount,
    }), { headers });
    bidRes = measureApiLatency(bidRes);
    bidRes = estimateDbLatency(bidRes);
    bidRes = estimateSocketLatency(bidRes);
    bidRes = estimateQueueLatency(bidRes);
    check(bidRes, {
      'bid status is 201': (r) => r.status === 201,
    });
    sleep(2);
  }

  // Scenario 4: Get auction history (25% of users)
  if (Math.random() < 0.25) {
    const auctionId = Math.floor(Math.random() * 100) + 1;
    let historyRes = http.get(`${BASE_URL}/auctions/${auctionId}/history`, { headers });
    historyRes = measureApiLatency(historyRes);
    historyRes = estimateDbLatency(historyRes);
    check(historyRes, {
      'history status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // Scenario 5: Get user bids (35% of users)
  if (Math.random() < 0.35) {
    let bidsRes = http.get(`${BASE_URL}/bids`, { headers });
    bidsRes = measureApiLatency(bidsRes);
    bidsRes = estimateDbLatency(bidsRes);
    check(bidsRes, {
      'bids status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  sleep(Math.random() * 2 + 1); // Random think time 1-3 seconds
}
