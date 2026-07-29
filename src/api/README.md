/**
 * API Layer Documentation
 * 
 * This document describes the organization of API calls in the application.
 * All API communication should be centralized here to ensure:
 * 
 * - Consistent request/response handling
 * - Centralized error handling
 * - Easy mocking for tests
 * - Single source of truth for API contracts
 * 
 * ## Directory Structure
 * 
 * ```
 * src/api/
 * ├── client.ts          # Base axios instance with interceptors
 * ├── endpoints/         # Feature-specific API endpoints
 * │   ├── vehicles.ts    # Vehicle/listing APIs
 * │   ├── dealers.ts      # Dealer APIs
 * │   ├── auctions.ts     # Auction APIs
 * │   ├── escrow.ts       # Escrow APIs
 * │   ├── inspections.ts  # Inspection APIs
 * │   ├── users.ts        # User/auth APIs
 * │   └── notifications.ts
 * └── types.ts           # API request/response types
 * ```
 * 
 * ## Usage Pattern
 * 
 * ```typescript
 * // Import the specific API module
 * import { vehiclesApi } from '@/api/endpoints/vehicles';
 * 
 * // Use in components or hooks
 * const { data, loading, error } = useSWR('/vehicles', vehiclesApi.list);
 * 
 * // Or directly
 * const vehicles = await vehiclesApi.list({ page: 1, limit: 20 });
 * ```
 * 
 * ## API Client Configuration
 * 
 * The base client should include:
 * 
 * - Base URL configuration
 * - Authentication headers
 * - Request/response interceptors
 * - Error handling
 * - Timeout configuration
 * - Retry logic
 * 
 * ## Error Handling
 * 
 * All API calls should handle:
 * 
 * - Network errors
 * - 4xx client errors (with user-friendly messages)
 * - 5xx server errors (with retry logic)
 * - Authentication errors (redirect to login)
 * - Rate limiting
 * 
 * ## Example Endpoint
 * 
 * ```typescript
 * // src/api/endpoints/vehicles.ts
 * 
 * import { apiClient } from '../client';
 * import type { Vehicle, VehicleFilters } from '@/types';
 * 
 * export const vehiclesApi = {
 *   list: async (filters?: VehicleFilters): Promise<Vehicle[]> => {
 *     const response = await apiClient.get('/vehicles', { params: filters });
 *     return response.data;
 *   },
 * 
 *   get: async (id: string): Promise<Vehicle> => {
 *     const response = await apiClient.get(`/vehicles/${id}`);
 *     return response.data;
 *   },
 * 
 *   create: async (data: CreateVehicleInput): Promise<Vehicle> => {
 *     const response = await apiClient.post('/vehicles', data);
 *     return response.data;
 *   },
 * 
 *   update: async (id: string, data: UpdateVehicleInput): Promise<Vehicle> => {
 *     const response = await apiClient.patch(`/vehicles/${id}`, data);
 *     return response.data;
 *   },
 * 
 *   delete: async (id: string): Promise<void> => {
 *     await apiClient.delete(`/vehicles/${id}`);
 *   },
 * };
 * ```
 * 
 * ## Type Safety
 * 
 * All API endpoints should have proper TypeScript types for:
 * 
 * - Request parameters
 * - Request body
 * - Response data
 * - Error responses
 * 
 * ## Testing
 * 
 * API modules should be easily mockable for testing:
 * 
 * ```typescript
 * // Mock example
 * jest.mock('@/api/endpoints/vehicles', () => ({
 *   vehiclesApi: {
 *     list: jest.fn().mockResolvedValue(mockVehicles),
 *     get: jest.fn().mockResolvedValue(mockVehicle),
 *   },
 * }));
 * ```
 */
