import { request } from './http';
import type { LoginResult, UserInfo } from '@/types/auth';

export const authApi = {
  login(data: { username: string; password: string }) {
    return request<LoginResult>({
      url: '/auth/login',
      method: 'POST',
      data,
    });
  },

  refresh(refreshToken: string) {
    return request<LoginResult>({
      url: '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
    });
  },

  getMe() {
    return request<UserInfo>({
      url: '/auth/me',
      method: 'GET',
    });
  },
};
