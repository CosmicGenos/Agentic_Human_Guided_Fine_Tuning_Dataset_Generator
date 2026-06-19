import api from './api';
import type { LoginRequest, LoginResponse } from '../types/auth';

export const authApi = {
  login: (payload: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', payload).then((r) => r.data),
};
