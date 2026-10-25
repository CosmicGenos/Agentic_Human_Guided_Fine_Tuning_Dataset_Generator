import { api } from '@/lib/api';
import type { LoginResponse, User } from './types';

export interface SetupAccountInput {
  token: string;
  username: string;
  password: string;
}

export const authApi = {
  /** OAuth2 password form: the field is called `username` but takes the EMAIL. */
  login: (email: string, password: string) =>
    api
      .post<LoginResponse>('/users/login', new URLSearchParams({ username: email, password }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .then((r) => r.data),

  /** Public: the invited user finishes their account using the emailed token. */
  setupAccount: (input: SetupAccountInput) =>
    api.post<User>('/users/setup', input).then((r) => r.data),

  me: () => api.get<User>('/users/me').then((r) => r.data),
};
