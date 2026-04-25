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

export async function createPost(data) {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('community', data.community);
  if (data.content) formData.append('content', data.content);
  if (data.flair) formData.append('flair', data.flair);
  if (data.image) formData.append('image', data.image);
  return fetchWithAuth(BASE, {
    method: 'POST',
    body: formData,
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
