import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true, // necesario para enviar la cookie de refresh
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const token: string | undefined = parsed?.state?.accessToken;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch {
        // ignore
      }
    }
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      original._retry = true;
      try {
        const newToken = await runRefresh();
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient.request(original);
        }
      } catch {
        // refresh falló: cae el usuario al login
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('auth-storage');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

async function runRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const { data } = await axios.post(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('auth-storage');
        const parsed = stored ? JSON.parse(stored) : { state: {}, version: 0 };
        parsed.state = {
          ...parsed.state,
          accessToken: data.accessToken,
          expiresAt: Date.now() + data.expiresInSeconds * 1000,
          user: data.user,
        };
        window.localStorage.setItem('auth-storage', JSON.stringify(parsed));
      }
      return data.accessToken as string;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
