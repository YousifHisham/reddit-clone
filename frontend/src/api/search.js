async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error (${res.status})` }; }
}

export async function search(q, type = 'all') {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`);
  return parseResponse(res);
}
