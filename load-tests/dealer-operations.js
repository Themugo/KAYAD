// load-tests/dealer-operations.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiLatency = new Trend('api_latency');
const dbLatency = new Trend('db_latency');
const queueLatency = new Trend('queue_latency');

// Configuration
export const options = {
  stages: [
    { duration: '5m', target: 20 },   // Ramp up to 20 dealers
    { duration: '10m', target: 50 },  // Ramp up to 50 dealers
    { duration: '10m', target: 100 }, // Ramp up to 100 dealers
    { duration: '5m', target: 100 },  // Stay at 100 dealers
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    api_latency: ['p(95)<300', 'p(99)<500'],
    db_latency: ['p(95)<200', 'p(99)<400'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api';
const DEALER_TOKEN = __ENV.DEALER_TOKEN || 'test_dealer_token';

// Helper function to measure API latency
function measureApiLatency(response) {
  apiLatency.add(response.timings.duration);
  return response;
}

// Helper function to estimate database latency
function estimateDbLatency(response) {
  // Estimate DB latency as 60% of total API latency
  dbLatency.add(response.timings.duration * 0.6);
  return response;
}

// Helper function to estimate queue latency
function estimateQueueLatency(response) {
  // Estimate queue latency as 20% of total API latency
  queueLatency.add(response.timings.duration * 0.2);
  return response;
}

export function setup() {
  // Setup: Create dealer account and get token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: `dealer${__VU}@test.com`,
    password: 'test123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200) {
    throw new Error('Failed to login dealer');
  }

  const token = loginRes.json('token');
  return { token };
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Scenario 1: Get dealer dashboard
  let dashboardRes = http.get(`${BASE_URL}/dealer`, { headers });
  dashboardRes = measureApiLatency(dashboardRes);
  dashboardRes = estimateDbLatency(dashboardRes);
  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
  });
  sleep(2);

  // Scenario 2: Get dealer analytics
  let analyticsRes = http.get(`${BASE_URL}/dealer/analytics`, { headers });
  analyticsRes = measureApiLatency(analyticsRes);
  analyticsRes = estimateDbLatency(analyticsRes);
  check(analyticsRes, {
    'analytics status is 200': (r) => r.status === 200,
  });
  sleep(3);

  // Scenario 3: Get dealer cars
  let carsRes = http.get(`${BASE_URL}/dealer/cars`, { headers });
  carsRes = measureApiLatency(carsRes);
  carsRes = estimateDbLatency(carsRes);
  check(carsRes, {
    'cars status is 200': (r) => r.status === 200,
  });
  sleep(2);

  // Scenario 4: Add new car (10% of users)
  if (Math.random() < 0.1) {
    const carData = {
      brand: 'Toyota',
      model: 'Corolla',
      year: 2023,
      price: 1500000,
      mileage: 50000,
      fuel: 'Petrol',
      transmission: 'Automatic',
      location: 'Nairobi',
      description: 'Test car for load testing',
    };

    let addCarRes = http.post(`${BASE_URL}/dealer/add-car`, JSON.stringify(carData), { headers });
    addCarRes = measureApiLatency(addCarRes);
    addCarRes = estimateDbLatency(addCarRes);
    addCarRes = estimateQueueLatency(addCarRes);
    check(addCarRes, {
      'add car status is 201': (r) => r.status === 201,
    });
    sleep(5);
  }

  // Scenario 5: Get dealer settlements
  let settlementsRes = http.get(`${BASE_URL}/dealer/settlement`, { headers });
  settlementsRes = measureApiLatency(settlementsRes);
  settlementsRes = estimateDbLatency(settlementsRes);
  check(settlementsRes, {
    'settlements status is 200': (r) => r.status === 200,
  });
  sleep(3);
}

export function teardown(data) {
  // Teardown: Cleanup test data
  console.log('Test completed for dealer');
}
