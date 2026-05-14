import { apiClient } from './client';

export interface TodayEvent {
  id: string;
  title: string;
  venueName: string;
  startsAt: string;
  endsAt: string | null;
  issuedCount: number;
  validatedCount: number;
}

export interface TodayDashboard {
  events: TodayEvent[];
  myValidationsToday: number;
}

export const staffApi = {
  async today(): Promise<TodayDashboard> {
    const { data } = await apiClient.get<TodayDashboard>('/staff/today');
    return data;
  },
};
