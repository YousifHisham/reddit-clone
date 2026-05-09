import { fetchWithAuth } from './auth';
import { API_BASE } from './base';

const BASE = `${API_BASE}/api/messages`;

export async function getThreads(filters = {}) {
  const params = new URLSearchParams();
  if (filters.unread) params.set('unread', 'true');
  const qs = params.toString();
  return fetchWithAuth(`${BASE}/threads${qs ? '?' + qs : ''}`);
}

export async function getMessages(threadId) {
  return fetchWithAuth(`${BASE}/${threadId}`);
}

export async function sendMessage(data) {
  return fetchWithAuth(BASE, { method: 'POST', body: JSON.stringify(data) });
}

export async function markThreadRead(threadId) {
  return fetchWithAuth(`${BASE}/${threadId}/read`, { method: 'PATCH' });
}

export async function searchUsers(q) {
  const res = await fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(q)}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false, users: [] }; }
}
