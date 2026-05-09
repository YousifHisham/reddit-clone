import { fetchWithAuth } from './auth';
import { API_BASE } from './base';

async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error (${res.status})` }; }
}

export async function getComments(postId) {
  const res = await fetch(`${API_BASE}/api/posts/${postId}/comments`);
  return parseResponse(res);
}

export async function createComment({ content, postId, parentId }) {
  return fetchWithAuth(`${API_BASE}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, postId, parentId }),
  });
}

export async function deleteComment(id) {
  return fetchWithAuth(`${API_BASE}/api/comments/${id}`, { method: 'DELETE' });
}

export async function upvoteComment(id) {
  return fetchWithAuth(`${API_BASE}/api/comments/${id}/upvote`, { method: 'POST' });
}

export async function downvoteComment(id) {
  return fetchWithAuth(`${API_BASE}/api/comments/${id}/downvote`, { method: 'POST' });
}
