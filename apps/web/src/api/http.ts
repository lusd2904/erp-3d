import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResult, RowError } from '@shared/errors';

export class ApiError extends Error {
  code: string;
  traceId?: string;
  errors?: RowError[];

  constructor(message: string, code: string, traceId?: string, errors?: RowError[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.traceId = traceId;
    this.errors = errors;
  }
}

interface StoredAuth {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
}

function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem('erp.auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredTokens(accessToken: string, refreshToken?: string) {
  try {
    const auth = getStoredAuth() || {};
    auth.accessToken = accessToken;
    if (refreshToken) auth.refreshToken = refreshToken;
    localStorage.setItem('erp.auth', JSON.stringify(auth));
  } catch {
    // 忽略异常
  }
}

function clearStoredAuth() {
  localStorage.removeItem('erp.auth');
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
  timeout: 30000,
});

// 请求拦截器
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const auth = getStoredAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  // POST / PUT / DELETE 操作自动附带 Idempotency-Key
  const method = (config.method || '').toLowerCase();
  if (['post', 'put', 'delete'].includes(method) && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = generateUUID();
  }

  return config;
});

// 401 刷新队列与重试控制
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function onRefreshFailed() {
  refreshSubscribers = [];
}

// 响应拦截器
http.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data as ApiResult<unknown>;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code !== 'OK') {
        throw new ApiError(body.msg || '业务处理失败', body.code, body.traceId, body.errors);
      }
      return response;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 令牌过期处理
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const auth = getStoredAuth();
      if (!auth?.refreshToken) {
        clearStoredAuth();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(http(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post<ApiResult<{ accessToken: string; refreshToken?: string }>>(
          `${import.meta.env.VITE_API_BASE || '/api/v1'}/auth/refresh`,
          { refreshToken: auth.refreshToken }
        );

        if (refreshRes.data.code === 'OK' && refreshRes.data.data?.accessToken) {
          const newAccess = refreshRes.data.data.accessToken;
          const newRefresh = refreshRes.data.data.refreshToken || auth.refreshToken;
          setStoredTokens(newAccess, newRefresh);
          onTokenRefreshed(newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return http(originalRequest);
        } else {
          throw new Error('Refresh token rejected');
        }
      } catch (refreshErr) {
        onRefreshFailed();
        clearStoredAuth();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.data && typeof error.response.data === 'object' && 'code' in error.response.data) {
      const body = error.response.data as ApiResult<unknown>;
      return Promise.reject(new ApiError(body.msg || error.message, body.code, body.traceId, body.errors));
    }

    return Promise.reject(error);
  }
);

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<ApiResult<T>>(config);
  return (response.data as ApiResult<T>).data;
}

export default http;
