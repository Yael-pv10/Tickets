import { apiClient } from './client';

export interface ReservationItem {
  eventSeatId: string;
  seatCode: string;
  sectionName: string;
  priceCents: number;
}

export interface Reservation {
  id: string;
  eventId: string;
  eventTitle: string;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  totalCents: number;
  items: ReservationItem[];
}

export const reservationsApi = {
  async create(eventId: string, eventSeatIds: string[]): Promise<Reservation> {
    const { data } = await apiClient.post<Reservation>('/reservations', {
      eventId,
      eventSeatIds,
    });
    return data;
  },

  async get(id: string): Promise<Reservation> {
    const { data } = await apiClient.get<Reservation>(`/reservations/${id}`);
    return data;
  },

  async cancel(id: string): Promise<void> {
    await apiClient.delete(`/reservations/${id}`);
  },
};
