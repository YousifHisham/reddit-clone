import { fetchWithAuth } from './auth';

export const getSettings = () => fetchWithAuth('/api/settings');

export const updateAccount = (data) =>
  fetchWithAuth('/api/settings/account', { method: 'PATCH', body: JSON.stringify(data) });

export const updateProfile = (data) =>
  fetchWithAuth('/api/settings/profile', { method: 'PATCH', body: JSON.stringify(data) });

export const updatePrivacy = (data) =>
  fetchWithAuth('/api/settings/privacy', { method: 'PATCH', body: JSON.stringify(data) });

export const updatePreferences = (data) =>
  fetchWithAuth('/api/settings/preferences', { method: 'PATCH', body: JSON.stringify(data) });

export const updateNotifications = (data) =>
  fetchWithAuth('/api/settings/notifications', { method: 'PATCH', body: JSON.stringify(data) });

export const updateEmailNotifications = (data) =>
  fetchWithAuth('/api/settings/email', { method: 'PATCH', body: JSON.stringify(data) });

export const deleteAccount = () =>
  fetchWithAuth('/api/settings/account', { method: 'DELETE' });
