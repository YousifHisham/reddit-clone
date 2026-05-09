import { fetchWithAuth } from './auth';

async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error (${res.status})` }; }
}

export async function getComments(postId) {
  const res = await fetch(`/api/posts/${postId}/comments`);
  return parseResponse(res);
}

export async function createComment({ content, postId, parentId }) {
  return fetchWithAuth('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, postId, parentId }),
  });
}

export async function deleteComment(id) {
  return fetchWithAuth(`/api/comments/${id}`, { method: 'DELETE' });
}

export async function upvoteComment(id) {
  return fetchWithAuth(`/api/comments/${id}/upvote`, { method: 'POST' });
}

export async function downvoteComment(id) {
  return fetchWithAuth(`/api/comments/${id}/downvote`, { method: 'POST' });
}
