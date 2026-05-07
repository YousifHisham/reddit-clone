import { useState, useRef } from 'react';
import { sendMessage, searchUsers } from '../api/messages';

export default function ShareModal({ post, currentUser, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const timeoutRef = useRef(null);

  const handleSearch = q => {
    setQuery(q);
    setSelected(null);
    clearTimeout(timeoutRef.current);
    if (!q.trim()) { setResults([]); return; }
    timeoutRef.current = setTimeout(async () => {
      const d = await searchUsers(q);
      if (d.success) setResults(d.users.filter(u => u._id !== currentUser?._id));
    }, 300);
  };

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    const url = `${window.location.origin}/post/${post._id}`;
    await sendMessage({
      recipientId: selected._id,
      content: `📎 **${post.title}**\n${url}`,
    });
    setSending(false);
    setSent(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <span>Share Post</span>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="share-modal-body">
          <div className="share-post-preview">{post.title}</div>

          <input
            className="auth-input"
            placeholder="Search by username…"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            autoFocus
          />

          {results.length > 0 && !selected && (
            <div className="share-user-results">
              {results.map(u => (
                <button
                  key={u._id}
                  className="share-user-item"
                  onClick={() => { setSelected(u); setQuery(u.username); setResults([]); }}
                >
                  <div className="search-dd-icon" style={{ width: 28, height: 28, fontSize: 11, background: '#0079d3' }}>
                    {u.username[0].toUpperCase()}
                  </div>
                  <span>u/{u.username}</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="share-selected">
              <div className="search-dd-icon" style={{ width: 28, height: 28, fontSize: 11, background: '#0079d3' }}>
                {selected.username[0].toUpperCase()}
              </div>
              <span>u/{selected.username}</span>
              <button onClick={() => { setSelected(null); setQuery(''); }}>✕</button>
            </div>
          )}

          <button
            className="panel-create-btn"
            style={{ width: '100%', borderRadius: 8, opacity: selected && !sent ? 1 : 0.5 }}
            disabled={!selected || sending || sent}
            onClick={handleSend}
          >
            {sent ? '✓ Sent!' : sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
