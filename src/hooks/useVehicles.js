// src/hooks/useVehicles.js
// UNIFIED VEHICLE HOOKS - Single source of truth for vehicle data fetching
import { useState, useEffect, useCallback } from 'react';
import { carsAPI } from '../api/api';

// ─────────────────────────────────────────────────────────────
// useVehicles - Fetch paginated vehicle list with filters
// Returns both 'vehicles' and 'cars' for backwards compatibility
// ─────────────────────────────────────────────────────────────
export function useVehicles(initialFilters = {}, pageSize = 24) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchCars = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const result = await carsAPI.listPaginated(filters, pageNum, pageSize);
      
      if (append) {
        setVehicles(prev => [...prev, ...(result.cars || [])]);
      } else {
        setVehicles(result.cars || []);
      }
      setTotal(result.total || 0);
      setHasMore(result.hasMore !== false);
      setPage(pageNum);
    } catch (err) {
      console.error('useVehicles fetch error:', err);
      setError(err);
      if (!append) {
        setVehicles([]);
        setTotal(0);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, pageSize]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchCars(page + 1, true);
    }
  }, [loadingMore, hasMore, page, fetchCars]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  useEffect(() => {
    fetchCars(1);
  }, [fetchCars]);

  return {
    vehicles,      // Primary name
    cars: vehicles, // Alias for backwards compatibility
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    page,
    filters,
    setFilters: updateFilters,
    resetFilters,
    loadMore,
    refetch: () => fetchCars(1),
  };
}

// ─────────────────────────────────────────────────────────────
// useVehicle - Fetch single vehicle by ID
// ─────────────────────────────────────────────────────────────
export function useVehicle(id) {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVehicle = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await carsAPI.get(id);
      // Handle different response formats
      const carData = result?.car || result?.data || result;
      setVehicle(carData);
    } catch (err) {
      console.error('useVehicle fetch error:', err);
      setError(err);
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  return { vehicle, loading, error, refetch: fetchVehicle };
}

// ─────────────────────────────────────────────────────────────
// useFeaturedVehicles - Fetch featured vehicles
// ─────────────────────────────────────────────────────────────
export function useFeaturedVehicles(limit = 8) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const result = await carsAPI.listPaginated({ featured: true }, 1, limit);
        setVehicles(result.cars || []);
      } catch (err) {
        console.error('useFeaturedVehicles error:', err);
        setError(err);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, [limit]);

  return { vehicles, loading, error };
}

// ─────────────────────────────────────────────────────────────
// useDealerVehicles - Fetch vehicles for a specific dealer
// ─────────────────────────────────────────────────────────────
export function useDealerVehicles(dealerId, options = {}) {
  const { pageSize = 24, ...filters } = options;
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchVehicles = useCallback(async (pageNum = 1) => {
    if (!dealerId) return;
    
    try {
      setLoading(pageNum === 1);
      const result = await carsAPI.listPaginated({ 
        ...filters, 
        dealerId 
      }, pageNum, pageSize);
      
      if (pageNum === 1) {
        setVehicles(result.cars || []);
      } else {
        setVehicles(prev => [...prev, ...(result.cars || [])]);
      }
      setHasMore(result.hasMore !== false);
      setPage(pageNum);
    } catch (err) {
      console.error('useDealerVehicles error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [dealerId, filters, pageSize]);

  useEffect(() => {
    fetchVehicles(1);
  }, [dealerId, JSON.stringify(filters)]);

  const loadMore = useCallback(() => {
    if (hasMore) fetchVehicles(page + 1);
  }, [hasMore, page, fetchVehicles]);

  return { vehicles, loading, error, hasMore, loadMore, refetch: () => fetchVehicles(1) };
}

// ─────────────────────────────────────────────────────────────
// useAuctionVehicles - Fetch vehicles in auctions
// ─────────────────────────────────────────────────────────────
export function useAuctionVehicles(options = {}) {
  const { pageSize = 24 } = options;
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true);
        const result = await carsAPI.listPaginated({ 
          category: 'auction',
          auctionStatus: 'live'
        }, 1, pageSize);
        setVehicles(result.cars || []);
      } catch (err) {
        console.error('useAuctionVehicles error:', err);
        setError(err);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, [pageSize]);

  return { vehicles, loading, error };
}

// ─────────────────────────────────────────────────────────────
// useRelatedVehicles - Fetch vehicles related to a specific car
// ─────────────────────────────────────────────────────────────
export function useRelatedVehicles(car, limit = 4) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!car) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Get vehicles with same make/model
        const result = await carsAPI.listPaginated({
          brand: car.brand || car.make,
          model: car.model,
          exclude: car.id,
        }, 1, limit);
        setVehicles(result.cars || []);
      } catch (err) {
        console.error('useRelatedVehicles error:', err);
        setError(err);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRelated();
  }, [car?.id, car?.brand, car?.make, car?.model, limit]);

  return { vehicles, loading, error };
}

// ─────────────────────────────────────────────────────────────
// DEFAULT EXPORT - All vehicle hooks
// ─────────────────────────────────────────────────────────────
export default {
  useVehicles,
  useVehicle,
  useFeaturedVehicles,
  useDealerVehicles,
  useAuctionVehicles,
  useRelatedVehicles,
};
