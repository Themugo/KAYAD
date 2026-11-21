// K6 Load Testing Script for KAYAD API
// Tests critical endpoints under load

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 50 },    // Ramp down to 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.05'],     // Error rate must be below 5%
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api';

export default function () {
  // Test 1: Get all cars (showroom)
  const carsRes = http.get(`${BASE_URL}/cars`, {
    tags: { name: 'GetCars' },
  });
  check(carsRes, {
    'cars status is 200': (r) => r.status === 200,
    'cars response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Get single car details
  const carId = carsRes.json('data[0]._id');
  if (carId) {
    const carRes = http.get(`${BASE_URL}/cars/${carId}`, {
      tags: { name: 'GetCarDetails' },
    });
    check(carRes, {
      'car details status is 200': (r) => r.status === 200,
      'car details response time < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);
  }

  sleep(1);

  // Test 3: Search cars
  const searchRes = http.get(`${BASE_URL}/cars?search=toyota`, {
    tags: { name: 'SearchCars' },
  });
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(2);
}

export function handleSummary(data) {
  return {
    'performance-summary.json': JSON.stringify({
      'http_req_duration': data.metrics.http_req_duration,
      'http_req_failed': data.metrics.http_req_failed,
      'errors': data.metrics.errors,
    }, null, 2),
  };
}
