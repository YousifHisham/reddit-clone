import { fetchWithAuth } from './auth';
import { API_BASE } from './base';

const BASE = `${API_BASE}/api/settings`;

export const getSettings = () => fetchWithAuth(BASE);

export const updateAccount = (data) =>
  fetchWithAuth(`${BASE}/account`, { method: 'PATCH', body: JSON.stringify(data) });

export const updateProfile = (data) =>
  fetchWithAuth(`${BASE}/profile`, { method: 'PATCH', body: JSON.stringify(data) });

export const updatePrivacy = (data) =>
  fetchWithAuth(`${BASE}/privacy`, { method: 'PATCH', body: JSON.stringify(data) });

export const updatePreferences = (data) =>
  fetchWithAuth(`${BASE}/preferences`, { method: 'PATCH', body: JSON.stringify(data) });

export const updateNotifications = (data) =>
  fetchWithAuth(`${BASE}/notifications`, { method: 'PATCH', body: JSON.stringify(data) });

export const updateEmailNotifications = (data) =>
  fetchWithAuth(`${BASE}/email`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteAccount = () =>
  fetchWithAuth(`${BASE}/account`, { method: 'DELETE' });
