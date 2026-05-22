import axios from 'axios';
import { demoAPI } from '../data/demoAPI';

const BASE = '/api';

let __DEMO_MODE__ = false;
export const isDemoMode = () => __DEMO_MODE__;

export const checkBackendAvailability = async () => {
  try {
    await axios.get(`${BASE}/cars?limit=1`, { timeout: 5000, withCredentials: true });
    __DEMO_MODE__ = false;
    return true;
  } catch {
    __DEMO_MODE__ = true;
    return false;
  }
};

(function initDemoCheck() {
  checkBackendAvailability()
    .then((online) => { if (online && import.meta.env.DEV) console.info('[Backend] Reachable'); })
    .catch(() => { __DEMO_MODE__ = true; });
})();

const api = axios.create({ baseURL: BASE, withCredentials: true, timeout: 15000 });

api.interceptors.request.use(cfg => { cfg._hadToken = true; return cfg; });

let _refreshing = false;
let _queue = [];

api.interceptors.response.use(
  r => r,
  async err => {
    if (!err.response) { __DEMO_MODE__ = true; return Promise.reject(err); }
    if (err.response?.status === 401 && __DEMO_MODE__) return Promise.reject(err);
    const orig = err.config;
    const skipRefresh = orig?.url?.includes('/auth/');
    if (err.response?.status === 401 && !skipRefresh && !orig._retry && orig._hadToken) {
      if (_refreshing) return new Promise((res, rej) => _queue.push({ res, rej })).then(() => api(orig));
      orig._retry = true;
      _refreshing = true;
      try {
        await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true });
        _queue.forEach(p => p.res()); _queue = [];
        return api(orig);
      } catch {
        _queue.forEach(p => p.rej()); _queue = [];
        window.dispatchEvent(new Event('kayad:auth-expired'));
      } finally { _refreshing = false; }
    }
    return Promise.reject(err);
  }
);

const unwrap = res => res.data;

function withDemo(realObj, demoObj) {
  const wrapped = {};
  for (const key of Object.keys(realObj)) {
    wrapped[key] = async (...args) => {
      if (demoObj?.[key] && __DEMO_MODE__) { __DEMO_MODE__ = true; return demoObj[key](...args); }
      try { return await realObj[key](...args); }
      catch (err) { if (demoObj?.[key] && (!err.response || __DEMO_MODE__)) { __DEMO_MODE__ = true; return demoObj[key](...args); } throw err; }
    };
  }
  return wrapped;
}

export { api, unwrap, withDemo };

export const formatKES = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');

export default api;
