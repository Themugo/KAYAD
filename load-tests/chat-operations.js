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
