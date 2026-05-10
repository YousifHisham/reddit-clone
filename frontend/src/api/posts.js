import { fetchWithAuth } from './auth';

const BASE = '/api/posts';

async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error (${res.status})` }; }
}

export async function getFeed(sort = 'hot') {
  return fetchWithAuth(`${BASE}/feed?sort=${sort}`);
}

export async function createPost(data) {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('community', data.community);
  if (data.content) formData.append('content', data.content);
  if (data.flair) formData.append('flair', data.flair);
  if (data.image) formData.append('image', data.image);
  if (data.url) formData.append('url', data.url);
  if (data.tags) formData.append('tags', JSON.stringify(data.tags));
  if (data.type) formData.append('type', data.type);
  return fetchWithAuth(BASE, {
    method: 'POST',
    body: formData,
  });
}

export async function getDrafts() {
  return fetchWithAuth(`${BASE}/drafts`);
}

export async function saveDraft(data) {
  const formData = new FormData();
  formData.append('title', data.title || '');
  formData.append('community', data.community || '');
  if (data.content) formData.append('content', data.content);
  if (data.image) formData.append('image', data.image);
  if (data.url) formData.append('url', data.url);
  if (data.tags) formData.append('tags', JSON.stringify(data.tags));
  if (data.type) formData.append('type', data.type);
  formData.append('status', 'draft');
  return fetchWithAuth(`${BASE}/draft`, {
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

export async function updatePostStatus(id, status) {
  return fetchWithAuth(`${BASE}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function updatePost(id, body) {
  return fetchWithAuth(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
}

export async function deletePost(id, token) {
  return fetchWithAuth(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function getPost(id) {
  const res = await fetch(`${BASE}/${id}`);
  return parseResponse(res);
}

export async function summarizePost(id) {
  const res = await fetch(`${BASE}/${id}/summarize`, { method: 'POST' });
  return parseResponse(res);
}
