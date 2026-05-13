import { apiClient } from './client';
import type { LoginInput, RegisterInput } from '../validation/auth';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT' | 'STAFF';
}

export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: UserSummary;
}

export const authApi = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', input);
    return data;
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', input);
    return data;
  },

  async refresh(): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/refresh');
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async me(): Promise<UserSummary> {
    const { data } = await apiClient.get<UserSummary>('/users/me');
    return data;
  },
};
