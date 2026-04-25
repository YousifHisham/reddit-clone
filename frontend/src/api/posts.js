import { fetchWithAuth } from './auth';

const BASE = '/api/posts';

async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error (${res.status})` }; }
}

export async function getFeed(token) {
  const res = await fetch(`${BASE}/feed`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  return parseResponse(res);
}

export async function createPost(data, token) {
  return fetchWithAuth(BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function upvotePost(id, token) {
  return fetchWithAuth(`${BASE}/${id}/upvote`, { method: 'POST' });
}

export async function downvotePost(id, token) {
  return fetchWithAuth(`${BASE}/${id}/downvote`, { method: 'POST' });
}

export async function deletePost(id, token) {
  return fetchWithAuth(`${BASE}/${id}`, { method: 'DELETE' });
}
