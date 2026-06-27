// load-tests/concurrent-users.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiLatency = new Trend('api_latency');
const dbLatency = new Trend('db_latency');
const socketLatency = new Trend('socket_latency');

// Configuration
export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up to 100 users
    { duration: '10m', target: 250 },  // Ramp up to 250 users
    { duration: '10m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<600'],
    http_req_failed: ['rate<0.05'],
    api_latency: ['p(95)<300', 'p(99)<500'],
    db_latency: ['p(95)<200', 'p(99)<400'],
    socketLatency: ['p(95)<100', 'p(99)<200'],
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
  dbLatency.add(response.timings.duration * 0.6);
  return response;
}

// Helper function to estimate socket latency
function estimateSocketLatency(response) {
  socketLatency.add(response.timings.duration * 0.2);
  return response;
}

export function setup() {
  // Setup: Create user account and get token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: `user${__VU}@test.com`,
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

  // Scenario 1: Get user dashboard
  let dashboardRes = http.get(`${BASE_URL}/dashboard`, { headers });
  dashboardRes = measureApiLatency(dashboardRes);
  dashboardRes = estimateDbLatency(dashboardRes);
  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
  });
  sleep(2);

  // Scenario 2: Browse vehicles
  let browseRes = http.get(`${BASE_URL}/cars`, { headers });
  browseRes = measureApiLatency(browseRes);
  browseRes = estimateDbLatency(browseRes);
  check(browseRes, {
    'browse status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // Scenario 3: Get vehicle details (40% of users)
  if (Math.random() < 0.4) {
    const carId = Math.floor(Math.random() * 10000) + 1;
    let detailRes = http.get(`${BASE_URL}/cars/${carId}`, { headers });
    detailRes = measureApiLatency(detailRes);
    detailRes = estimateDbLatency(detailRes);
    check(detailRes, {
      'detail status is 200': (r) => r.status === 200,
    });
    sleep(2);
  }

  // Scenario 4: Add to favorites (30% of users)
  if (Math.random() < 0.3) {
    const carId = Math.floor(Math.random() * 10000) + 1;
    let favoriteRes = http.post(`${BASE_URL}/favorites`, JSON.stringify({ carId }), { headers });
    favoriteRes = measureApiLatency(favoriteRes);
    favoriteRes = estimateDbLatency(favoriteRes);
    check(favoriteRes, {
      'favorite status is 201': (r) => r.status === 201,
    });
    sleep(1);
  }

  // Scenario 5: Get notifications (50% of users)
  if (Math.random() < 0.5) {
    let notificationsRes = http.get(`${BASE_URL}/notifications`, { headers });
    notificationsRes = measureApiLatency(notificationsRes);
    notificationsRes = estimateDbLatency(notificationsRes);
    check(notificationsRes, {
      'notifications status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // Scenario 6: Get user profile (25% of users)
  if (Math.random() < 0.25) {
    let profileRes = http.get(`${BASE_URL}/profile`, { headers });
    profileRes = measureApiLatency(profileRes);
    profileRes = estimateDbLatency(profileRes);
    check(profileRes, {
      'profile status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  sleep(Math.random() * 3 + 1); // Random think time 1-4 seconds
}
