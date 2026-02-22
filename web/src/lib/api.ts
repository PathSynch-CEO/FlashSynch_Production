import axios from 'axios';
import type { PublicCard, LeadCaptureData } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function getCardBySlug(slug: string): Promise<PublicCard> {
  const response = await api.get<{ data: PublicCard }>(`/cards/${slug}`);
  return response.data.data;
}

export async function submitLeadCapture(slug: string, data: LeadCaptureData): Promise<void> {
  await api.post(`/cards/${slug}/capture`, data);
}

export async function trackScan(slug: string, eventType: string, linkId?: string): Promise<void> {
  await api.post(`/cards/${slug}/scan`, {
    eventType,
    linkId,
  });
}
