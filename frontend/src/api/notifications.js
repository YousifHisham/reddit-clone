import { fetchWithAuth } from './auth';

export async function getNotifications() {
  return fetchWithAuth('/api/notifications');
}

export async function markNotificationsRead() {
  return fetchWithAuth('/api/notifications/read', { method: 'PATCH' });
}
