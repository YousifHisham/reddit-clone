import { fetchWithAuth } from './auth';

export async function getNotifications() {
  return fetchWithAuth('/api/notifications');
}

export async function markNotificationsRead() {
  return fetchWithAuth('/api/notifications/read', { method: 'PATCH' });
}

export async function approvePost(postId) {
  return fetchWithAuth(`/api/posts/${postId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'published' }),
  });
}

export async function rejectPost(postId) {
  return fetchWithAuth(`/api/posts/${postId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'rejected' }),
  });
}
