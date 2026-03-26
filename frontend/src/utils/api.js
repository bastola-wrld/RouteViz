// Centralized API Client with Auth Interceptors
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getHeaders = (isFormData = false) => {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  
  const token = localStorage.getItem('rv_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  return headers;
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    localStorage.removeItem('rv_token');
    if (window.location.pathname !== '/auth') window.location.href = '/auth';
    throw new Error('UNAUTHORIZED');
  }

  if (response.status === 429) {
    const data = await response.json();
    throw new Error(data.error || 'Too many requests. Please wait.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

export const api = {
  get: async (path) => {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    } catch (err) {
      if (err.message === 'Failed to fetch') throw new Error('Network error — check connection');
      throw err;
    }
  },

  post: async (path, body) => {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      return handleResponse(res);
    } catch (err) {
      if (err.message === 'Failed to fetch') throw new Error('Network error — check connection');
      throw err;
    }
  },

  postForm: async (path, formData) => {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: getHeaders(true),
        body: formData
      });
      return handleResponse(res);
    } catch (err) {
      if (err.message === 'Failed to fetch') throw new Error('Network error — check connection');
      throw err;
    }
  }
};
