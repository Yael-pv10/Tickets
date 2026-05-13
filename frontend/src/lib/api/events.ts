import { apiClient } from './client';

export interface EventDto {
  id: string;
  venueId: string;
  venueName: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED';
}

export interface EventSeatDto {
  id: string;
  seatId: string;
  seatCode: string;
  sectionName: string;
  priceCents: number;
  status: 'AVAILABLE' | 'LOCKED' | 'SOLD' | 'BLOCKED';
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const eventsApi = {
  async list(page = 0, size = 20): Promise<Page<EventDto>> {
    const { data } = await apiClient.get<Page<EventDto>>('/events', {
      params: { page, size },
    });
    return data;
  },

  async get(id: string): Promise<EventDto> {
    const { data } = await apiClient.get<EventDto>(`/events/${id}`);
    return data;
  },

  async seats(id: string): Promise<EventSeatDto[]> {
    const { data } = await apiClient.get<EventSeatDto[]>(`/events/${id}/seats`);
    return data;
  },
};
