/**
 * Fetch API Client for OMS Portal
 * Production API: https://omsapi.digiindiasolutions.com
 */

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  // If VITE_API_URL is provided, use it (trimming any trailing slashes)
  const base = (envUrl && envUrl.trim())
    ? envUrl.trim().replace(/\/+$/, '')
    : 'https://omsapi.digiindiasolutions.com';

  // Ensure /api path is present since all backend routes are mounted under /api
  return base.endsWith('/api') ? base : `${base}/api`;
};

const BASE_URL = getApiBaseUrl();

export async function request(endpoint, options = {}) {
  // Normalize endpoint to prevent double slashes or missing leading slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Prevent duplicate /api if endpoint already starts with /api/
  const formattedEndpoint = cleanEndpoint.startsWith('/api/')
    ? cleanEndpoint.slice(4)
    : cleanEndpoint;

  const url = `${BASE_URL}${formattedEndpoint}`;
  const token = localStorage.getItem('oms_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    // If 401 Unauthorized and not on login page, clear token and redirect
    if (response.status === 401) {
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('oms_token');
        localStorage.removeItem('oms_user');
        window.location.href = '/login?expired=1';
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  get: (endpoint, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`${endpoint}${queryString}`, { method: 'GET' });
  },

  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
