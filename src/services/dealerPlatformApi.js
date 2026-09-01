import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const dealerPlatformApi = axios.create({
  baseURL: `${API_URL}/dealer-platform`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Fixed: this client's own interceptor read a token from
