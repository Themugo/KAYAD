/**
 * API Helper for E2E Tests
 * Provides reusable API interaction functions for testing
 */

import { APIRequestContext, APIResponse } from '@playwright/test';

export class ApiHelper {
  /**
   * Bootstrap the stateless CSRF contract for this APIRequestContext.
   * Playwright's request context retains the XSRF cookie between calls.
   */
  static async csrfToken(request: APIRequestContext): Promise<string> {
    const response = await request.get('/api/v1/auth/csrf');
    if (!response.ok()) throw new Error(`CSRF bootstrap failed: ${response.status()}`);
    const data = await response.json();
    if (!data?.csrfToken) throw new Error('CSRF bootstrap did not return a token');
    return data.csrfToken;
  }

  /**
   * Make authenticated API request using the real httpOnly-cookie session.
   * The token argument remains accepted for source compatibility with legacy
   * suites, but is deliberately ignored; the browser/API auth contract no
   * longer exposes JWTs to JavaScript.
   */
  static async authenticatedRequest(
    request: APIRequestContext,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    _legacyToken?: string,
    data?: any
  ): Promise<APIResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (method !== 'GET') headers['X-CSRF-Token'] = await this.csrfToken(request);
    const options = { headers, data: method !== 'GET' ? data : undefined };
    switch (method) {
      case 'GET': return await request.get(endpoint, options);
      case 'POST': return await request.post(endpoint, options);
      case 'PUT': return await request.put(endpoint, options);
      case 'PATCH': return await request.patch(endpoint, options);
      case 'DELETE': return await request.delete(endpoint, options);
    }
  }

  /**
   * Login via API. The response intentionally contains no JWT. Cookies are
   * retained by the same Playwright APIRequestContext for subsequent setup
   * calls, matching production authentication.
   */
  static async loginApi(
    request: APIRequestContext,
    email: string,
    password: string
  ): Promise<string> {
    const csrfToken = await this.csrfToken(request);
    const response = await request.post('/api/v1/auth/login', {
      data: { email, password },
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    });
    if (!response.ok()) throw new Error(`Login failed: ${response.status()}`);
    const data = await response.json();
    if (!data?.user) throw new Error('Login succeeded without a user payload');
    return '';
  }

  /**
   * Register via API using the same stateless CSRF contract as production.
   * Registration creates an account but does not authenticate the session.
   */
  static async registerApi(
    request: APIRequestContext,
    userData: any
  ): Promise<any> {
    const csrfToken = await this.csrfToken(request);
    const response = await request.post('/api/v1/auth/register', {
      data: userData,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    });
    if (!response.ok()) throw new Error(`Registration failed: ${response.status()}`);
    return await response.json();
  }

  /**
   * Create test vehicle via API
   */
  static async createVehicle(
    request: APIRequestContext,
    token: string,
    vehicleData: any
  ): Promise<any> {
    const response = await this.authenticatedRequest(
      request,
      'POST',
      '/api/v1/cars',
      token,
      vehicleData
    );

    if (!response.ok()) {
      throw new Error(`Vehicle creation failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Create test auction via API
   */
  static async createAuction(
    request: APIRequestContext,
    token: string,
    auctionData: any
  ): Promise<any> {
    const response = await this.authenticatedRequest(
      request,
      'POST',
      '/api/v1/auctions',
      token,
      auctionData
    );

    if (!response.ok()) {
      throw new Error(`Auction creation failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Place bid via API
   */
  static async placeBid(
    request: APIRequestContext,
    token: string,
    auctionId: string,
    amount: number
  ): Promise<any> {
    const response = await this.authenticatedRequest(
      request,
      'POST',
      `/api/v1/bids`,
      token,
      { auctionId, amount }
    );

    if (!response.ok()) {
      throw new Error(`Bid placement failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Create escrow via API
   */
  static async createEscrow(
    request: APIRequestContext,
    token: string,
    escrowData: any
  ): Promise<any> {
    const response = await this.authenticatedRequest(
      request,
      'POST',
      '/api/v1/escrow',
      token,
      escrowData
    );

    if (!response.ok()) {
      throw new Error(`Escrow creation failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Initiate payment via API
   */
  static async initiatePayment(
    request: APIRequestContext,
    token: string,
    paymentData: any
  ): Promise<any> {
    const response = await this.authenticatedRequest(
      request,
      'POST',
      '/api/v1/payments/initiate',
      token,
      paymentData
    );

    if (!response.ok()) {
      throw new Error(`Payment initiation failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Clean up test data
   */
  static async cleanupTestData(
    request: APIRequestContext,
    token: string,
    testIds: string[]
  ): Promise<void> {
    for (const id of testIds) {
      try {
        await this.authenticatedRequest(
          request,
          'DELETE',
          `/api/v1/admin/test-data/${id}`,
          token
        );
      } catch (error) {
        console.warn(`Failed to cleanup test data ${id}:`, error);
      }
    }
  }
}
