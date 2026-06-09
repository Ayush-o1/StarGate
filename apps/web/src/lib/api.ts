import { useAuthStore } from '../store/authStore';

const API_BASE = 'http://localhost:3000/api/v1';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const { tokens, clearAuth, setAuth } = useAuthStore.getState();
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearAuth();
      throw new Error('Session expired');
    }

    try {
      const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Session expired');
      }

      const newTokens = await refreshResponse.json();
      
      // We don't have the user object here immediately, but we can update the tokens
      // Next request will succeed, or we can fetch /me
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setAuth(currentUser, newTokens);
      }

      // Retry original request
      headers.set('Authorization', `Bearer ${newTokens.accessToken}`);
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

    } catch (error) {
      clearAuth();
      throw new Error('Session expired');
    }
  }

  if (!response.ok) {
    let message = 'An error occurred';
    try {
      const data = await response.json();
      message = data?.error?.message || message;
    } catch {
      // Ignore JSON parse error on empty response
    }
    throw new Error(message);
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
};
