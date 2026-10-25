import axios from 'axios';
import { toApiError } from './api-error';
import { notifyUnauthorized, tokenStorage } from './token-storage';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    const apiError = toApiError(error);
    // An expired/invalid token anywhere → log out via React state (no hard reload).
    // The login call itself returns 401 for a wrong password; that must reach the form.
    const isLogin = axios.isAxiosError(error) && error.config?.url === '/users/login';
    if (apiError.status === 401 && !isLogin && tokenStorage.get()) {
      notifyUnauthorized();
    }
    return Promise.reject(apiError);
  },
);
