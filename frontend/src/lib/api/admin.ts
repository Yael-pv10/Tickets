import { apiClient } from './client';
import type { EventDto } from './events';

// ---------- Venues ----------

export interface Point {
  x: number;
  y: number;
}

export type SectionType = 'SEATED' | 'GENERAL_ADMISSION';

export interface SectionDto {
  id: string;
  venueId: string;
  name: string;
  type: SectionType;
  shape: Point[] | null;
  capacity: number | null;
  seatCount: number;
}

export interface VenueDto {
  id: string;
  name: string;
  address: string | null;
  capacity: number;
  canvasWidth: number;
  canvasHeight: number;
  stageShape: Point[] | null;
  sections: SectionDto[];
}

export interface SeatDto {
  id: string;
  sectionId: string;
  rowLabel: string;
  seatNumber: number;
  seatCode: string;
  posX: number;
  posY: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT' | 'STAFF';
  enabled: boolean;
  createdAt: string;
}

export const adminApi = {
  // Venues
  async listVenues(): Promise<VenueDto[]> {
    const { data } = await apiClient.get<VenueDto[]>('/admin/venues');
    return data;
  },
  async createVenue(input: { name: string; address: string; capacity: number }): Promise<VenueDto> {
    const { data } = await apiClient.post<VenueDto>('/admin/venues', input);
    return data;
  },
  async deleteVenue(id: string): Promise<void> {
    await apiClient.delete(`/admin/venues/${id}`);
  },

  // Sections
  async createSection(venueId: string, name: string): Promise<SectionDto> {
    const { data } = await apiClient.post<SectionDto>(`/admin/venues/${venueId}/sections`, { name });
    return data;
  },
  async deleteSection(sectionId: string): Promise<void> {
    await apiClient.delete(`/admin/venues/sections/${sectionId}`);
  },
  async listSeats(sectionId: string): Promise<SeatDto[]> {
    const { data } = await apiClient.get<SeatDto[]>(`/admin/venues/sections/${sectionId}/seats`);
    return data;
  },
  async bulkSeats(
    sectionId: string,
    rows: Array<{ rowLabel: string; fromNumber: number; toNumber: number }>
  ): Promise<SeatDto[]> {
    const { data } = await apiClient.post<SeatDto[]>(
      `/admin/venues/sections/${sectionId}/seats/bulk`,
      { rows }
    );
    return data;
  },
  async updateLayout(
    sectionId: string,
    seats: Array<{ seatId: string; posX: number; posY: number }>
  ): Promise<SeatDto[]> {
    const { data } = await apiClient.put<SeatDto[]>(
      `/admin/venues/sections/${sectionId}/layout`,
      { seats }
    );
    return data;
  },
  async fillSection(
    sectionId: string,
    input: { corners: Point[]; rows: number; seatsPerRow: number }
  ): Promise<SeatDto[]> {
    const { data } = await apiClient.post<SeatDto[]>(
      `/admin/venues/sections/${sectionId}/seats/fill`,
      input
    );
    return data;
  },
  async updateSectionShape(
    sectionId: string,
    input: { type: SectionType; shape: Point[] | null; capacity: number | null }
  ): Promise<SectionDto> {
    const { data } = await apiClient.put<SectionDto>(
      `/admin/venues/sections/${sectionId}/shape`,
      input
    );
    return data;
  },

  // Mapa del auditorio
  async updateCanvas(
    venueId: string,
    input: { canvasWidth: number; canvasHeight: number; stageShape: Point[] | null }
  ): Promise<VenueDto> {
    const { data } = await apiClient.put<VenueDto>(`/admin/venues/${venueId}/canvas`, input);
    return data;
  },
  async uploadBackground(venueId: string, file: File): Promise<void> {
    const form = new FormData();
    form.append('file', file);
    await apiClient.put(`/admin/venues/${venueId}/background`, form);
  },
  async deleteBackground(venueId: string): Promise<void> {
    await apiClient.delete(`/admin/venues/${venueId}/background`);
  },

  // Events
  async listEvents(): Promise<EventDto[]> {
    const { data } = await apiClient.get<EventDto[]>('/admin/events');
    return data;
  },
  async createEvent(input: {
    venueId: string;
    title: string;
    description: string;
    startsAt: string;
    endsAt?: string;
    defaultPriceCents: number;
    sectionPrices?: Array<{ sectionId: string; priceCents: number }>;
  }): Promise<EventDto> {
    const { data } = await apiClient.post<EventDto>('/admin/events', input);
    return data;
  },
  async publishEvent(id: string): Promise<EventDto> {
    const { data } = await apiClient.post<EventDto>(`/admin/events/${id}/publish`);
    return data;
  },
  async cancelEvent(id: string): Promise<EventDto> {
    const { data } = await apiClient.post<EventDto>(`/admin/events/${id}/cancel`);
    return data;
  },
  async deleteEvent(id: string): Promise<void> {
    await apiClient.delete(`/admin/events/${id}`);
  },

  // Users
  async listUsers(): Promise<AdminUser[]> {
    const { data } = await apiClient.get<AdminUser[]>('/admin/users');
    return data;
  },
  async createTeamMember(input: {
    email: string;
    name: string;
    password: string;
    role: 'STAFF' | 'ADMIN';
  }): Promise<AdminUser> {
    const { data } = await apiClient.post<AdminUser>('/admin/users', input);
    return data;
  },
  async updateUserRole(id: string, role: 'STAFF' | 'ADMIN'): Promise<AdminUser> {
    const { data } = await apiClient.put<AdminUser>(`/admin/users/${id}/role`, { role });
    return data;
  },
};
