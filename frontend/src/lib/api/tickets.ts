import { apiClient } from './client';

export interface TicketDto {
  id: string;
  code: string;
  qrPayload: string;
  status: 'RESERVED' | 'PAID' | 'USED' | 'CANCELLED' | 'REFUNDED';
  eventTitle: string;
  eventStartsAt: string;
  venueName: string;
  seatCode: string;
  sectionName: string;
  priceCents: number;
  issuedAt: string;
  usedAt: string | null;
}

export interface ValidationResult {
  status: 'OK' | 'ALREADY_USED' | 'INVALID' | 'EXPIRED';
  message: string;
  attendeeName: string | null;
  seatCode: string | null;
  sectionName: string | null;
  eventTitle: string | null;
}

export const ticketsApi = {
  async listMine(): Promise<TicketDto[]> {
    const { data } = await apiClient.get<TicketDto[]>('/tickets/me');
    return data;
  },

  async get(id: string): Promise<TicketDto> {
    const { data } = await apiClient.get<TicketDto>(`/tickets/${id}`);
    return data;
  },

  /** URL absoluta del PNG con header Authorization vía fetch. */
  async getQrBlobUrl(id: string): Promise<string> {
    const { data } = await apiClient.get<Blob>(`/tickets/${id}/qr`, { responseType: 'blob' });
    return URL.createObjectURL(data);
  },

  async confirmReservation(reservationId: string): Promise<TicketDto[]> {
    const { data } = await apiClient.post<TicketDto[]>(`/reservations/${reservationId}/confirm`);
    return data;
  },

  async validate(qrPayload: string): Promise<ValidationResult> {
    const { data } = await apiClient.post<ValidationResult>('/staff/validate', { qrPayload });
    return data;
  },
};
