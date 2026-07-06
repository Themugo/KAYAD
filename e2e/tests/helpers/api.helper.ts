/**
 * API Helper for E2E Tests
 * Provides reusable API interaction functions for testing
 */

import { APIRequestContext, APIResponse } from '@playwright/test';

export class ApiHelper {
  /**
   * Make authenticated API request
   */
  static async authenticatedRequest(
    request: APIRequestContext,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    token: string,
    data?: any
  ): Promise<APIResponse> {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const options = {
      headers,
      data: method !== 'GET' ? JSON.stringify(data) : undefined,
    };

    switch (method) {
      case 'GET':
        return await request.get(endpoint, options);
      case 'POST':
        return await request.post(endpoint, options);
      case 'PUT':
        return await request.put(endpoint, options);
      case 'PATCH':
        return await request.patch(endpoint, options);
      case 'DELETE':
        return await request.delete(endpoint, options);
    }
  }

  /**
   * Login via API and get token
   */
  static async loginApi(
    request: APIRequestContext,
    email: string,
    password: string
  ): Promise<string> {
    const response = await request.post('/api/auth/login', {
      data: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()}`);
    }

    const data = await response.json();
    return data.token || data.data?.token;
  }

  /**
   * Register via API
   */
  static async registerApi(
    request: APIRequestContext,
    userData: any
  ): Promise<any> {
    const response = await request.post('/api/auth/register', {
      data: JSON.stringify(userData),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok()) {
      throw new Error(`Registration failed: ${response.status()}`);
    }

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
      '/api/cars',
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
      '/api/auctions',
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
      `/api/bids`,
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
      '/api/escrow',
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
      '/api/payments/initiate',
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
          `/api/admin/test-data/${id}`,
          token
        );
      } catch (error) {
        console.warn(`Failed to cleanup test data ${id}:`, error);
      }
    }
  }
}
