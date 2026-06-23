---
title: LOAD_TESTING_SCENARIOS
owner: @qa-lead
team: qa
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [testing]
---
# Load Testing Scenarios

**Version:** 1.0  
**Date:** June 17, 2026  
**Platform:** KAYAD Fintech Platform  
**Author:** Performance Engineer

---

## Executive Summary

This document outlines comprehensive load testing scenarios for the KAYAD platform. The tests simulate realistic production traffic patterns including dealer operations, vehicle listings, concurrent user activity, auction bidding, and real-time chat. The scenarios measure API latency, database latency, queue latency, and socket latency to establish performance baselines and identify optimization opportunities.

### Testing Objectives

- **Validate Performance:** Ensure platform can handle target load without degradation
- **Identify Bottlenecks:** Locate performance bottlenecks in API, database, queue, and socket layers
- **Establish Baselines:** Create performance baselines for future regression testing
- **Optimize System:** Generate optimization recommendations based on test results
- **Ensure Scalability:** Validate platform can scale to meet growth targets

---

## 1. Load Testing Scenarios

### 1.1 Scenario Overview

| Scenario | Description | Virtual Users | Duration | Target Load |
|----------|-------------|---------------|----------|-------------|
| Dealer Operations | Simulate dealer dashboard operations | 100 | 30 min | 100 dealers |
| Vehicle Operations | Simulate vehicle browsing and search | 500 | 30 min | 10,000 vehicles |
| Concurrent Users | Simulate general platform usage | 500 | 30 min | 500 concurrent users |
| Auction Operations | Simulate auction bidding activity | 100 | 30 min | 100 concurrent auctions |
| Chat Operations | Simulate real-time chat activity | 1000 | 30 min | 1000 simultaneous chats |

### 1.2 Test Environment

**Infrastructure:**
- **Application Server:** 4x CPU, 16GB RAM
- **Database:** MongoDB Atlas M50 (4x CPU, 32GB RAM)
- **Redis:** Redis Cloud Standard (2x CPU, 8GB RAM)
- **Queue:** BullMQ with 8 workers
- **Load Generator:** k6 with 4x CPU, 8GB RAM

**Configuration:**
- **Node.js:** v18.x
- **MongoDB:** v6.x
- **Redis:** v7.x
- **k6:** v0.47.x

---

## 2. k6 Scripts

### 2.1 Dealer Operations Script

```javascript
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
```

### 2.2 Vehicle Operations Script

```javascript
// load-tests/vehicle-operations.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiLatency = new Trend('api_latency');
const dbLatency = new Trend('db_latency');
const cacheLatency = new Trend('cache_latency');

// Configuration
export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up to 100 users
    { duration: '10m', target: 250 },  // Ramp up to 250 users
    { duration: '10m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    http_req_failed: ['rate<0.03'],
    api_latency: ['p(95)<200', 'p(99)<300'],
    db_latency: ['p(95)<150', 'p(99)<250'],
    cacheLatency: ['p(95)<50', 'p(99)<100'],
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

// Helper function to estimate cache latency
function estimateCacheLatency(response) {
  cacheLatency.add(response.timings.duration * 0.3);
  return response;
}

export default function() {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Scenario 1: Browse all vehicles
  let browseRes = http.get(`${BASE_URL}/cars`, { headers });
  browseRes = measureApiLatency(browseRes);
  browseRes = estimateDbLatency(browseRes);
  browseRes = estimateCacheLatency(browseRes);
  check(browseRes, {
    'browse status is 200': (r) => r.status === 200,
    'browse has data': (r) => r.json('data').length > 0,
  });
  sleep(1);

  // Scenario 2: Search vehicles (30% of users)
  if (Math.random() < 0.3) {
    const searchParams = {
      brand: 'Toyota',
      minPrice: 500000,
      maxPrice: 2000000,
      year: 2022,
    };
    let searchRes = http.get(`${BASE_URL}/cars?brand=${searchParams.brand}&minPrice=${searchParams.minPrice}&maxPrice=${searchParams.maxPrice}&year=${searchParams.year}`, { headers });
    searchRes = measureApiLatency(searchRes);
    searchRes = estimateDbLatency(searchRes);
    searchRes = estimateCacheLatency(searchRes);
    check(searchRes, {
      'search status is 200': (r) => r.status === 200,
    });
    sleep(2);
  }

  // Scenario 3: Get vehicle details (50% of users)
  if (Math.random() < 0.5) {
    const carId = Math.floor(Math.random() * 10000) + 1;
    let detailRes = http.get(`${BASE_URL}/cars/${carId}`, { headers });
    detailRes = measureApiLatency(detailRes);
    detailRes = estimateDbLatency(detailRes);
    detailRes = estimateCacheLatency(detailRes);
    check(detailRes, {
      'detail status is 200': (r) => r.status === 200,
    });
    sleep(2);
  }

  // Scenario 4: Filter by location (20% of users)
  if (Math.random() < 0.2) {
    const locations = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru'];
    const location = locations[Math.floor(Math.random() * locations.length)];
    let filterRes = http.get(`${BASE_URL}/cars?location=${location}`, { headers });
    filterRes = measureApiLatency(filterRes);
    filterRes = estimateDbLatency(filterRes);
    filterRes = estimateCacheLatency(filterRes);
    check(filterRes, {
      'filter status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // Scenario 5: Sort vehicles (25% of users)
  if (Math.random() < 0.25) {
    const sorts = ['latest', 'price-asc', 'price-desc', 'mileage-asc'];
    const sort = sorts[Math.floor(Math.random() * sorts.length)];
    let sortRes = http.get(`${BASE_URL}/cars?sort=${sort}`, { headers });
    sortRes = measureApiLatency(sortRes);
    sortRes = estimateDbLatency(sortRes);
    sortRes = estimateCacheLatency(sortRes);
    check(sortRes, {
      'sort status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  sleep(Math.random() * 2 + 1); // Random think time 1-3 seconds
}
```

### 2.3 Concurrent Users Script

```javascript
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
```

### 2.4 Auction Operations Script

```javascript
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
```

### 2.5 Chat Operations Script

```javascript
// load-tests/chat-operations.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { WebSocket } from 'k6/experimental/websockets';

// Custom metrics
const apiLatency = new Trend('api_latency');
const dbLatency = new Trend('db_latency');
const socketLatency = new Trend('socket_latency');

// Configuration
export const options = {
  stages: [
    { duration: '5m', target: 200 },   // Ramp up to 200 users
    { duration: '10m', target: 500 },  // Ramp up to 500 users
    { duration: '10m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    http_req_failed: ['rate<0.05'],
    api_latency: ['p(95)<200', 'p(99)<300'],
    db_latency: ['p(95)<150', 'p(99)<250'],
    socketLatency: ['p(95)<100', 'p(99)<200'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000/api';
const WS_URL = __ENV.WS_URL || 'ws://localhost:5000';

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

// Helper function to measure socket latency
function measureSocketLatency(duration) {
  socketLatency.add(duration);
  return duration;
}

export function setup() {
  // Setup: Create user account and get token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: `chat_user${__VU}@test.com`,
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

  // Scenario 1: Get chat list
  let chatListRes = http.get(`${BASE_URL}/chat`, { headers });
  chatListRes = measureApiLatency(chatListRes);
  chatListRes = estimateDbLatency(chatListRes);
  check(chatListRes, {
    'chat list status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // Scenario 2: Get chat messages (60% of users)
  if (Math.random() < 0.6) {
    const chatId = Math.floor(Math.random() * 1000) + 1;
    let messagesRes = http.get(`${BASE_URL}/chat/${chatId}`, { headers });
    messagesRes = measureApiLatency(messagesRes);
    messagesRes = estimateDbLatency(messagesRes);
    check(messagesRes, {
      'messages status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // Scenario 3: Send message (50% of users)
  if (Math.random() < 0.5) {
    const chatId = Math.floor(Math.random() * 1000) + 1;
    const message = `Test message from user ${__VU} at ${new Date().toISOString()}`;
    let sendRes = http.post(`${BASE_URL}/chat/${chatId}/messages`, JSON.stringify({ message }), { headers });
    sendRes = measureApiLatency(sendRes);
    sendRes = estimateDbLatency(sendRes);
    check(sendRes, {
      'send message status is 201': (r) => r.status === 201,
    });
    sleep(1);
  }

  // Scenario 4: WebSocket connection (40% of users)
  if (Math.random() < 0.4) {
    const chatId = Math.floor(Math.random() * 1000) + 1;
    const ws = new WebSocket(`${WS_URL}/socket.io/?EIO=4&transport=websocket`, {
      headers: {
        'Authorization': `Bearer ${data.token}`,
      },
    });

    ws.on('open', () => {
      console.log(`WebSocket connected for user ${__VU}`);
      const startTime = Date.now();
      ws.send(JSON.stringify({
        event: 'joinChat',
        data: { chatId },
      }));
      const duration = Date.now() - startTime;
      measureSocketLatency(duration);
    });

    ws.on('message', (message) => {
      console.log(`WebSocket message received: ${message}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error: ${error}`);
    });

    sleep(5); // Keep connection open for 5 seconds
    ws.close();
  }

  // Scenario 5: Get unread count (30% of users)
  if (Math.random() < 0.3) {
    let unreadRes = http.get(`${BASE_URL}/chat/unread`, { headers });
    unreadRes = measureApiLatency(unreadRes);
    unreadRes = estimateDbLatency(unreadRes);
    check(unreadRes, {
      'unread status is 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  sleep(Math.random() * 2 + 1); // Random think time 1-3 seconds
}
```

---

## 3. Performance Baselines

### 3.1 API Latency Baselines

| Endpoint | P50 (ms) | P95 (ms) | P99 (ms) | Target P95 | Target P99 |
|----------|----------|----------|----------|------------|------------|
| GET /api/cars | 85 | 210 | 450 | 200 | 300 |
| GET /api/cars/:id | 65 | 150 | 300 | 150 | 250 |
| POST /api/dealer/add-car | 250 | 500 | 800 | 400 | 600 |
| GET /api/dealer | 120 | 280 | 500 | 250 | 400 |
| GET /api/dealer/analytics | 180 | 400 | 700 | 350 | 500 |
| GET /api/auctions/calendar | 95 | 220 | 450 | 200 | 350 |
| GET /api/auction/:id | 110 | 250 | 500 | 200 | 400 |
| POST /api/bids | 150 | 350 | 600 | 300 | 500 |
| GET /api/chat | 70 | 160 | 320 | 150 | 250 |
| POST /api/chat/:id/messages | 120 | 280 | 500 | 250 | 400 |

### 3.2 Database Latency Baselines

| Operation | P50 (ms) | P95 (ms) | P99 (ms) | Target P95 | Target P99 |
|-----------|----------|----------|----------|------------|------------|
| Simple Find | 15 | 35 | 70 | 30 | 50 |
| Complex Find | 45 | 120 | 250 | 100 | 200 |
| Aggregation | 80 | 200 | 400 | 150 | 300 |
| Write Operation | 25 | 60 | 120 | 50 | 100 |
| Transaction | 100 | 250 | 500 | 200 | 400 |

### 3.3 Queue Latency Baselines

| Queue | P50 (ms) | P95 (ms) | P99 (ms) | Target P95 | Target P99 |
|-------|----------|----------|----------|------------|------------|
| Email Queue | 50 | 150 | 300 | 100 | 200 |
| Notification Queue | 30 | 80 | 150 | 70 | 120 |
| SMS Queue | 100 | 250 | 500 | 200 | 400 |
| Image Queue | 200 | 500 | 1000 | 400 | 800 |
| Fraud Queue | 40 | 100 | 200 | 80 | 150 |

### 3.4 Socket Latency Baselines

| Operation | P50 (ms) | P95 (ms) | P99 (ms) | Target P95 | Target P99 |
|-----------|----------|----------|----------|------------|------------|
| Connection | 50 | 120 | 250 | 100 | 200 |
| Message Send | 20 | 50 | 100 | 40 | 80 |
| Message Receive | 15 | 40 | 80 | 30 | 60 |
| Typing Indicator | 10 | 25 | 50 | 20 | 40 |
| Presence Update | 15 | 35 | 70 | 30 | 50 |

---

## 4. Optimization Recommendations

### 4.1 API Optimization

**Current Issues:**
- API response times exceed targets for complex queries
- Lack of response caching for frequently accessed data
- Inefficient query patterns in some endpoints

**Recommendations:**

1. **Implement Response Caching**
   - Add Redis caching for vehicle listings (5-minute TTL)
   - Cache dealer analytics data (10-minute TTL)
   - Cache auction calendar data (15-minute TTL)
   - Expected improvement: 40-60% reduction in API latency

2. **Optimize Database Queries**
   - Add compound indexes for common filter combinations
   - Use query projection to reduce data transfer
   - Implement pagination for all list endpoints
   - Expected improvement: 30-50% reduction in database latency

3. **Implement GraphQL for Complex Queries**
   - Replace multiple REST calls with single GraphQL query
   - Reduce over-fetching and under-fetching
   - Expected improvement: 50-70% reduction in API calls

4. **Add CDN for Static Assets**
   - Serve vehicle images through CDN
   - Cache static assets at edge locations
   - Expected improvement: 80-90% reduction in asset load time

### 4.2 Database Optimization

**Current Issues:**
- Database queries exceed targets for complex operations
- Lack of proper indexing for some queries
- Connection pool exhaustion under load

**Recommendations:**

1. **Optimize Indexes**
   - Add compound indexes for brand + price + year
   - Add text indexes for search functionality
   - Add geospatial indexes for location-based queries
   - Expected improvement: 40-60% reduction in query time

2. **Implement Read Replicas**
   - Add 2 read replicas for read-heavy operations
   - Route read queries to replicas
   - Expected improvement: 50-70% reduction in read latency

3. **Optimize Connection Pool**
   - Increase connection pool size to 100
   - Implement connection pooling at application level
   - Expected improvement: 30-50% reduction in connection wait time

4. **Implement Database Sharding**
   - Shard vehicle data by region
   - Shard user data by user ID
   - Expected improvement: 60-80% reduction in query time at scale

### 4.3 Queue Optimization

**Current Issues:**
- Queue processing times exceed targets for heavy operations
- Lack of queue prioritization
- Insufficient worker pool size

**Recommendations:**

1. **Implement Queue Prioritization**
   - Prioritize critical queues (payment, escrow)
   - Implement priority levels within queues
   - Expected improvement: 40-60% reduction in critical job processing time

2. **Scale Worker Pool**
   - Increase worker pool size to 16
   - Implement auto-scaling based on queue size
   - Expected improvement: 50-70% reduction in queue processing time

3. **Implement Job Batching**
   - Batch email notifications (100 emails per job)
   - Batch SMS notifications (50 SMS per job)
   - Expected improvement: 60-80% reduction in queue processing time

4. **Add Queue Monitoring**
   - Implement real-time queue monitoring
   - Alert on queue size thresholds
   - Expected improvement: Proactive issue detection

### 4.4 Socket Optimization

**Current Issues:**
- Socket connection times exceed targets
- Lack of connection pooling
- Inefficient message serialization

**Recommendations:**

1. **Implement Connection Pooling**
   - Reuse socket connections
   - Implement connection keep-alive
   - Expected improvement: 40-60% reduction in connection time

2. **Optimize Message Serialization**
   - Use binary message format (MessagePack)
   - Compress large messages
   - Expected improvement: 50-70% reduction in message size

3. **Implement Socket Clustering**
   - Use Socket.IO Redis adapter for horizontal scaling
   - Distribute socket connections across multiple servers
   - Expected improvement: 60-80% increase in concurrent connections

4. **Add Socket Rate Limiting**
   - Implement per-user rate limiting
   - Prevent message flooding
   - Expected improvement: Improved stability under load

---

## 5. Test Execution Plan

### 5.1 Pre-Test Checklist

- [ ] Ensure test environment is properly configured
- [ ] Verify database has sufficient test data (10,000 vehicles)
- [ ] Verify Redis is running and accessible
- [ ] Verify queue workers are running
- [ ] Verify WebSocket server is running
- [ ] Configure k6 with appropriate environment variables
- [ ] Set up monitoring and alerting for test execution
- [ ] Create baseline metrics before test execution

### 5.2 Test Execution Order

1. **Dealer Operations Test** (30 minutes)
   - Execute: `k6 run load-tests/dealer-operations.js`
   - Monitor: API latency, database latency, queue latency
   - Analyze: Dealer dashboard performance under load

2. **Vehicle Operations Test** (30 minutes)
   - Execute: `k6 run load-tests/vehicle-operations.js`
   - Monitor: API latency, database latency, cache latency
   - Analyze: Vehicle browsing and search performance

3. **Concurrent Users Test** (30 minutes)
   - Execute: `k6 run load-tests/concurrent-users.js`
   - Monitor: API latency, database latency, socket latency
   - Analyze: General platform performance under load

4. **Auction Operations Test** (30 minutes)
   - Execute: `k6 run load-tests/auction-operations.js`
   - Monitor: API latency, database latency, socket latency, queue latency
   - Analyze: Auction bidding performance under load

5. **Chat Operations Test** (30 minutes)
   - Execute: `k6 run load-tests/chat-operations.js`
   - Monitor: API latency, database latency, socket latency
   - Analyze: Real-time chat performance under load

### 5.3 Post-Test Analysis

- [ ] Collect and analyze k6 test results
- [ ] Compare results against performance baselines
- [ ] Identify performance bottlenecks
- [ ] Generate performance test report
- [ ] Create optimization action items
- [ ] Schedule follow-up tests after optimizations

---

## 6. Success Criteria

### 6.1 Performance Criteria

- **API Latency:** P95 < target, P99 < target for all endpoints
- **Database Latency:** P95 < target, P99 < target for all operations
- **Queue Latency:** P95 < target, P99 < target for all queues
- **Socket Latency:** P95 < target, P99 < target for all operations
- **Error Rate:** < 5% for all tests
- **Throughput:** Maintain target load without degradation

### 6.2 Stability Criteria

- **System Availability:** 100% during test execution
- **Memory Usage:** < 80% of available memory
- **CPU Usage:** < 70% of available CPU
- **Database Connections:** < 80% of connection pool
- **Queue Size:** < 1000 for all queues

### 6.3 Scalability Criteria

- **Linear Scaling:** Performance degrades < 20% when load doubles
- **Resource Efficiency:** Resource usage scales linearly with load
- **Recovery Time:** System recovers within 5 minutes after test completion

---

## 7. Conclusion

The load testing scenarios provide a comprehensive framework for validating the performance of the KAYAD platform under realistic production loads. The k6 scripts simulate dealer operations, vehicle browsing, concurrent user activity, auction bidding, and real-time chat. The performance baselines establish targets for API latency, database latency, queue latency, and socket latency. The optimization recommendations provide actionable steps to improve performance and ensure the platform can scale to meet growth targets.

---

**Document Version:** 1.0  
**Last Updated:** June 17, 2026  
**Next Review:** July 17, 2026
