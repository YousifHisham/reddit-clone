import { fetchWithAuth } from './auth';

const BASE = '/api/communities';

async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error (${res.status})` }; }
}

export async function getCommunities(category) {
  const url = category && category !== 'All' ? `${BASE}?category=${encodeURIComponent(category)}` : BASE;
  const res = await fetch(url);
  return parseResponse(res);
}

export async function getJoinedCommunities() {
  return fetchWithAuth(`${BASE}?joined=true`);
}

export async function joinCommunity(id) {
  return fetchWithAuth(`${BASE}/${id}/join`, { method: 'POST' });
}

export async function leaveCommunity(id) {
  return fetchWithAuth(`${BASE}/${id}/leave`, { method: 'POST' });
}

export async function createCommunity(data) {
  return fetchWithAuth(BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCommunityFlairs(id) {
  const res = await fetch(`/api/communities/${id}/flairs`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false }; }
}

export async function createFlair(id, data) {
  return fetchWithAuth(`/api/communities/${id}/flairs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getPendingPosts(id) {
  return fetchWithAuth(`/api/communities/${id}/pending`);
}

export async function createJoinRequest(id) {
  return fetchWithAuth(`/api/communities/${id}/join-request`, { method: 'POST' });
}

export async function handleJoinRequest(communityId, requesterId, status) {
  return fetchWithAuth(`/api/communities/${communityId}/join-request/${requesterId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function updateCommunitySettings(id, data) {
  return fetchWithAuth(`/api/communities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getCommunityByName(name) {
  const res = await fetch(`/api/communities/name/${encodeURIComponent(name)}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false }; }
}

export async function getCommunityPosts(id, sort = 'new') {
  const res = await fetch(`/api/communities/${id}/posts?sort=${sort}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false }; }
}
