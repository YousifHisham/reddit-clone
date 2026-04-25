import { fetchWithAuth } from './auth';

const BASE = '/api/users';

async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error (${res.status})` }; }
}

export async function getProfile(id) {
  const res = await fetch(`${BASE}/${id}`);
  return parseResponse(res);
}

export async function updateProfile(id, data) {
  const formData = new FormData();
  if (data.bio !== undefined) formData.append('bio', data.bio);
  if (data.profilePicture) formData.append('profilePicture', data.profilePicture);

  return fetchWithAuth(`${BASE}/${id}`, {
    method: 'PUT',
    headers: {},        // let browser set multipart boundary
    body: formData,
  });
}

export async function searchUsers(q) {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`);
  return parseResponse(res);
}

export async function getSavedPosts(id) {
  return fetchWithAuth(`${BASE}/${id}/saved`);
}

export async function savePost(userId, postId) {
  return fetchWithAuth(`${BASE}/${userId}/save/${postId}`, { method: 'POST' });
}

export async function unsavePost(userId, postId) {
  return fetchWithAuth(`${BASE}/${userId}/save/${postId}`, { method: 'DELETE' });
}
