const BASE = '/api/auth';

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
