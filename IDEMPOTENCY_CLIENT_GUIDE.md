---
title: IDEMPOTENCY_CLIENT_GUIDE
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# Client-Side Idempotency Integration Guide

**Version:** 1.0  
**Date:** June 16, 2026  
**Platform:** KAYAD Fintech Platform

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Implementation Examples](#implementation-examples)
4. [Best Practices](#best-practices)
5. [Error Handling](#error-handling)
6. [Framework-Specific Guides](#framework-specific-guides)
7. [Testing](#testing)

---

## Overview

### What is Idempotency?

Idempotency ensures that the same operation can be called multiple times without causing duplicate effects. For the KAYAD platform, this means:

- **Duplicate Payment Prevention:** The same payment cannot be processed twice
- **Duplicate Callback Prevention:** M-Pesa callbacks cannot be processed multiple times
- **Duplicate Escrow Release Prevention:** Escrow funds cannot be released twice

### How It Works

1. Client generates a unique idempotency key
2. Client includes the key in the `X-Idempotency-Key` header
3. Server checks if the key exists in the database
4. If key exists, server returns cached response
5. If key doesn't exist, server processes request and caches response

### Required Header

All idempotent operations must include the `X-Idempotency-Key` header:

```http
X-Idempotency-Key: payment_1234567890_abc123def456
```

---

## Quick Start

### Step 1: Generate Idempotency Key

```javascript
const generateIdempotencyKey = (prefix = "idemp") => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
};

const idempotencyKey = generateIdempotencyKey("payment");
// Example: "payment_1718544000000_abc123def456"
```

### Step 2: Include Header in Request

```javascript
const response = await fetch('/api/payments/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Idempotency-Key': idempotencyKey
  },
  body: JSON.stringify({
    phone: '+254700000000',
    amount: 1000,
    carId: 'car123',
    type: 'escrow'
  })
});
```

### Step 3: Handle Response

```javascript
const data = await response.json();

if (data.success) {
  console.log('Payment successful:', data);
} else {
  console.error('Payment failed:', data.message);
}
```

---

## Implementation Examples

### Payment Initiation

```javascript
async function initiatePayment(paymentData) {
  const idempotencyKey = `payment_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const response = await fetch('/api/payments/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(paymentData)
  });
  
  const data = await response.json();
  return data;
}

// Usage
const payment = await initiatePayment({
  phone: '+254700000000',
  amount: 1000,
  carId: 'car123',
  type: 'escrow'
});
```

### Bid Placement

```javascript
async function placeBid(carId, bidData) {
  const idempotencyKey = `bid_${userId}_${carId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const response = await fetch(`/api/bids/${carId}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(bidData)
  });
  
  const data = await response.json();
  return data;
}

// Usage
const bid = await placeBid('car123', {
  amount: 50000,
  phone: '+254700000000',
  maxBid: 100000
});
```

### Verification Submission

```javascript
async function submitVerification(documents) {
  const idempotencyKey = `verification_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const response = await fetch('/api/verification/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({ documents })
  });
  
  const data = await response.json();
  return data;
}

// Usage
const verification = await submitVerification({
  governmentId: { url: 'https://...', number: 'ABC123' },
  kraPin: { url: 'https://...', pin: 'A001234567P' }
});
```

---

## Best Practices

### Key Generation

**DO:**
- Generate keys client-side for critical operations
- Include operation context in key (e.g., user ID, resource ID)
- Use timestamp and random components for uniqueness
- Store keys temporarily for retry scenarios

**DON'T:**
- Use sequential or predictable keys
- Reuse keys across different operations
- Generate keys server-side for client-initiated operations
- Use hardcoded keys

### Key Storage

**Temporary Storage:**
```javascript
// Store in memory for retry scenarios
const pendingOperations = new Map();

function initiatePayment(paymentData) {
  const idempotencyKey = generateIdempotencyKey("payment");
  pendingOperations.set(idempotencyKey, paymentData);
  
  // ... make request ...
  
  // Remove after success
  pendingOperations.delete(idempotencyKey);
}
```

**Session Storage:**
```javascript
// Store in session storage for page refresh scenarios
function initiatePayment(paymentData) {
  const idempotencyKey = generateIdempotencyKey("payment");
  sessionStorage.setItem('pendingPaymentKey', idempotencyKey);
  
  // ... make request ...
  
  // Remove after success
  sessionStorage.removeItem('pendingPaymentKey');
}
```

### Retry Logic

```javascript
async function initiatePaymentWithRetry(paymentData, maxRetries = 3) {
  const idempotencyKey = `payment_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(paymentData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data;
      }
      
      lastError = new Error(data.message || 'Payment failed');
    } catch (error) {
      lastError = error;
      
      // If network error, retry with same idempotency key
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError;
}
```

---

## Error Handling

### Network Errors

```javascript
async function handleNetworkError(error, idempotencyKey) {
  if (error.name === 'NetworkError' || error.name === 'TypeError') {
    // Retry with same idempotency key
    console.log('Network error, retrying with same idempotency key:', idempotencyKey);
    return true; // Should retry
  }
  return false; // Don't retry
}
```

### Server Errors

```javascript
async function handleServerError(response, idempotencyKey) {
  if (response.status === 409) {
    // Conflict - operation already processed
    console.log('Operation already processed with idempotency key:', idempotencyKey);
    return true; // Success (idempotent)
  }
  
  if (response.status === 429) {
    // Rate limited - retry with backoff
    console.log('Rate limited, retry with backoff');
    return true; // Should retry
  }
  
  return false; // Don't retry
}
```

### Idempotency Errors

```javascript
async function handleIdempotencyError(error, idempotencyKey) {
  if (error.message.includes('idempotency')) {
    // Idempotency-related error
    console.log('Idempotency error:', error.message);
    
    // Generate new key and retry
    const newKey = generateIdempotencyKey();
    console.log('Generated new idempotency key:', newKey);
    return newKey;
  }
  
  return null; // Don't retry
}
```

---

## Framework-Specific Guides

### React

```javascript
import { useState, useCallback } from 'react';

function PaymentForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const initiatePayment = useCallback(async (paymentData) => {
    setLoading(true);
    setError(null);
    
    const idempotencyKey = `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(paymentData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data;
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      initiatePayment({ phone: '+254700000000', amount: 1000 });
    }}>
      {/* Form fields */}
    </form>
  );
}
```

### Vue.js

```javascript
<template>
  <form @submit.prevent="initiatePayment">
    <!-- Form fields -->
  </form>
</template>

<script>
export default {
  data() {
    return {
      loading: false,
      error: null
    };
  },
  methods: {
    async initiatePayment() {
      this.loading = true;
      this.error = null;
      
      const idempotencyKey = `payment_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      try {
        const response = await fetch('/api/payments/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.$store.state.token}`,
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            phone: '+254700000000',
            amount: 1000
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          return data;
        } else {
          this.error = data.message;
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

### Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Request interceptor to add idempotency key
api.interceptors.request.use((config) => {
  if (config.method === 'post' || config.method === 'put' || config.method === 'delete') {
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    config.headers['X-Idempotency-Key'] = idempotencyKey;
  }
  return config;
});

// Usage
async function initiatePayment(paymentData) {
  const response = await api.post('/payments/initiate', paymentData);
  return response.data;
}
```

---

## Testing

### Unit Tests

```javascript
describe('Idempotency Key Generation', () => {
  it('should generate unique keys', () => {
    const key1 = generateIdempotencyKey('payment');
    const key2 = generateIdempotencyKey('payment');
    
    expect(key1).not.toBe(key2);
  });
  
  it('should include prefix', () => {
    const key = generateIdempotencyKey('payment');
    expect(key).toMatch(/^payment_/);
  });
});
```

### Integration Tests

```javascript
describe('Payment Idempotency', () => {
  it('should prevent duplicate payments', async () => {
    const idempotencyKey = 'test_payment_123';
    const paymentData = {
      phone: '+254700000000',
      amount: 1000,
      carId: 'car123',
      type: 'escrow'
    };
    
    // First request
    const response1 = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(paymentData)
    });
    
    const data1 = await response1.json();
    expect(data1.success).toBe(true);
    
    // Second request with same key
    const response2 = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(paymentData)
    });
    
    const data2 = await response2.json();
    expect(data2).toEqual(data1);
  });
});
```

---

## Summary

By following this guide, you can successfully integrate idempotency into your client applications. This ensures:

- **Duplicate Prevention:** No duplicate payments, callbacks, or operations
- **Network Reliability:** Graceful handling of network retries
- **User Experience:** Consistent responses to clients
- **Data Integrity:** Maintains system state consistency

**Key Points:**
- Always include `X-Idempotency-Key` header for critical operations
- Generate unique keys using timestamp and random components
- Store keys temporarily for retry scenarios
- Implement proper error handling and retry logic
- Test idempotency behavior in your integration tests

---

**Document Version:** 1.0  
**Last Updated:** June 16, 2026  
**Maintained By:** Platform Team
