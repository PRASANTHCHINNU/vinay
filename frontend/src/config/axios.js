import axios from 'axios';
import { config as appConfig } from './config'; // adjust path if needed

const api = axios.create({
  baseURL: appConfig.apiUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials:true
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Request with auth:', {
        url: config.url,
        method: config.method,
        hasToken: true,
        tokenPreview: `${token.substring(0, 10)}...`
      });
    } else {
      console.log('Request without auth token:', {
        url: config.url,
        method: config.method
      });
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (response.config.url.includes('/academic-details/faculty-structure')) {
      return response;
    }
    console.log('Response success:', {
      url: response.config.url,
      status: response.status,
      hasData: !!response.data
    });
    return response.data || response;
  },
  (error) => {
    if (import.meta.env.MODE === 'development') {
      console.error('API Error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        url: error.config?.url,
        data: error.response?.data,
        headers: error.response?.headers
      });
    }

    // Handle CORS errors specifically
    if (error.message === 'Network Error') {
      console.error('CORS or Network Error:', {
        config: error.config,
        message: error.message
      });
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('Auth error - clearing token and redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }

    return Promise.reject(error);
  }
);

export default api;
