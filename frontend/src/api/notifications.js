import { fetchWithAuth } from './auth';
import { API_BASE } from './base';

export async function getNotifications() {
  return fetchWithAuth(`${API_BASE}/api/notifications`);
}

export async function markNotificationsRead() {
  return fetchWithAuth(`${API_BASE}/api/notifications/read`, { method: 'PATCH' });
}

export async function approvePost(postId) {
  return fetchWithAuth(`${API_BASE}/api/posts/${postId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'published' }),
  });
}

export async function rejectPost(postId) {
  return fetchWithAuth(`${API_BASE}/api/posts/${postId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'rejected' }),
  });
}
