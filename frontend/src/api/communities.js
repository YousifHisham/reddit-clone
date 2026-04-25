const BASE = '/api/communities';

async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error (${res.status})` }; }
}

export async function getCommunities() {
  const res = await fetch(BASE);
  return parseResponse(res);
}

export async function getJoinedCommunities(token) {
  const res = await fetch(`${BASE}?joined=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse(res);
}

export async function joinCommunity(id, token) {
  const res = await fetch(`${BASE}/${id}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse(res);
}
