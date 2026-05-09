import { API_BASE } from './base';

const BASE = `${API_BASE}/api/auth`;

async function parseResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: `Server error (${res.status})` };
  }
}

export async function sendOtp(email) {
  const res = await fetch(`${BASE}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseResponse(res);
}

export async function verifyOtp(email, otp) {
  const res = await fetch(`${BASE}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, otp }),
  });
  return parseResponse(res);
}

export async function refreshAccessToken() {
  const res = await fetch(`${BASE}/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await parseResponse(res);
  if (data.success && data.accessToken) {
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  }
  localStorage.removeItem('accessToken');
  return null;
}

export async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem('accessToken');

  // Always try to get a valid token first
  if (!token) {
    token = await refreshAccessToken();
  } else {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 - Date.now() < 60000) {
        token = await refreshAccessToken();
      }
    } catch {
      token = await refreshAccessToken();
    }
  }

  const isFormData = options.body instanceof FormData;

  const makeRequest = (t) => fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
  });

  const res = await makeRequest(token);

  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) return { success: false, message: 'Session expired. Please log in again.', code: 'UNAUTHORIZED' };
    return parseResponse(await makeRequest(token));
  }

  return parseResponse(res);
}

export async function getMe() {
  return fetchWithAuth(`${BASE}/me`);
}

export async function logout() {
  return fetchWithAuth(`${BASE}/logout`, { method: 'POST' });
}

export async function googleLogin(credential) {
  const res = await fetch(`${BASE}/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ credential }),
  });
  return parseResponse(res);
}

export async function completeProfile(data, token) {
  const res = await fetch(`${BASE}/complete-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return parseResponse(res);
}
