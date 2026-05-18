import { apiClient } from './client';

export interface Point {
  x: number;
  y: number;
}

export interface VenueSection {
  id: string;
  name: string;
  type: 'SEATED' | 'GENERAL_ADMISSION';
  shape: Point[] | null;
  capacity: number | null;
  seatCount: number;
}

export interface Venue {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  stageShape: Point[] | null;
  sections: VenueSection[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const venuesApi = {
  async get(id: string): Promise<Venue> {
    const { data } = await apiClient.get<Venue>(`/venues/${id}`);
    return data;
  },
  backgroundUrl(id: string): string {
    return `${API_BASE}/venues/${id}/background`;
  },
};
