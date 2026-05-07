import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getFeed } from '../api/posts';
import { upvotePost, downvotePost, deletePost, updatePost } from '../api/posts';
import { savePost, unsavePost, getSavedPosts } from '../api/users';
import { getMe } from '../api/auth';
import ShareModal from '../components/ShareModal';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatScore(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n;
}

const COMMUNITY_COLORS = ['#ff4500', '#0079d3', '#46d160', '#9b59b6', '#e74c3c', '#f39c12'];

function PostCard({ post, currentUser, isSaved = false, onSaveToggle, onDelete, onUpdate }) {
  const [votes, setVotes] = useState({ up: post.upvotes, down: post.downvotes });
  const [vote, setVote] = useState(0);
  const score = votes.up - votes.down;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.content || '');
  const [editLoading, setEditLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [saved, setSaved] = useState(isSaved);
  const [showShare, setShowShare] = useState(false);

  const isAuthor = currentUser && post.author?._id === currentUser._id;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleVote = async (e, dir) => {
    e.stopPropagation();
    if (!currentUser) return;
    const newVote = vote === dir ? 0 : dir;
    setVote(newVote);
    const fn = dir === 1 ? upvotePost : downvotePost;
    const data = await fn(post._id);
    if (data.success) setVotes({ up: data.upvotes, down: data.downvotes });
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    const data = await updatePost(post._id, editBody);
    setEditLoading(false);
    if (data.success) { onUpdate(post._id, editBody); setEditing(false); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    const data = await deletePost(post._id);
    setDeleteLoading(false);
    if (data.success) onDelete(post._id);
    else setDeleteError(data.message || 'Failed to delete post.');
  };

  const handleSave = async e => {
    e.stopPropagation();
    if (!currentUser) return;
    const next = !saved;
    setSaved(next);
    if (next) await savePost(currentUser._id, post._id);
    else await unsavePost(currentUser._id, post._id);
    onSaveToggle?.(post._id, next);
  };

  const communityColor = COMMUNITY_COLORS[(post.community?.name?.charCodeAt(0) || 0) % COMMUNITY_COLORS.length];

  return (
    <div className="post-card">
      <div className="post-body">
        <div className="post-meta">
          {post.community && (
            <>
              <Link to={`/r/${post.community.name}`} style={{ fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>
                r/{post.community.name}
              </Link>
              <span className="post-dot">•</span>
            </>
          )}
          <span>Posted by <Link to={`/u/${post.author?.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>u/{post.author?.username}</Link></span>
          <span className="post-dot">•</span>
          <span>{timeAgo(post.createdAt)}</span>
          {isAuthor && (
            <div className="post-menu-wrap" ref={menuRef} style={{ marginLeft: 'auto' }}>
              <button className="post-action-btn" style={{ padding: '4px 8px' }} onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
              {menuOpen && (
                <div className="post-dropdown">
                  {(!post.type || post.type === 'Text') && (
                    <button className="post-dropdown-item" onClick={e => { e.stopPropagation(); setMenuOpen(false); setEditing(true); setEditBody(post.content || ''); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit post body
                    </button>
                  )}
                  <button className="post-dropdown-item post-dropdown-delete" onClick={e => { e.stopPropagation(); setMenuOpen(false); setConfirmDelete(true); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <Link to={`/post/${post._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="post-title">{post.title}</h3>
        </Link>

        {editing ? (
          <div onClick={e => e.stopPropagation()}>
            <textarea className="post-edit-textarea" value={editBody} onChange={e => setEditBody(e.target.value)} rows={4} />
            <div className="post-edit-actions">
              <button className="post-edit-cancel" onClick={() => { setEditing(false); setEditBody(post.content || ''); }}>Cancel</button>
              <button className="post-edit-save" onClick={handleSaveEdit} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        ) : (
          post.content && <p className="post-text">{post.content}</p>
        )}

        {post.image && <img className="post-image" src={post.image} alt="" />}

        <div className="post-actions">
          <div className={`post-pill post-pill-vote ${vote === 1 ? 'pill-up' : vote === -1 ? 'pill-down' : ''}`} onClick={e => e.stopPropagation()}>
            <button className="pill-vote-btn" onClick={e => handleVote(e, 1)} title="Upvote">
              <svg width="18" height="18" viewBox="0 0 24 24" fill={vote === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <span className="pill-score">{formatScore(score)}</span>
            <button className="pill-vote-btn" onClick={e => handleVote(e, -1)} title="Downvote">
              <svg width="18" height="18" viewBox="0 0 24 24" fill={vote === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <Link to={`/post/${post._id}`} style={{ textDecoration: 'none' }}>
            <div className="post-pill">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>{formatScore(post.commentCount || 0)}</span>
            </div>
          </Link>
          <div className={`post-pill${saved ? ' post-pill-saved' : ''}`} onClick={handleSave} style={{ cursor: currentUser ? 'pointer' : 'default' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span>{saved ? 'Saved' : 'Save'}</span>
          </div>
          <div className="post-pill" onClick={e => { e.stopPropagation(); setShowShare(true); }} style={{ cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span>Share</span>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="post-confirm-overlay" onClick={e => e.stopPropagation()}>
          <div className="post-confirm-dialog">
            <p className="post-confirm-text">Are you sure you want to delete this post?</p>
            {deleteError && <p style={{ color: '#ff4500', fontSize: 13, marginBottom: 8 }}>{deleteError}</p>}
            <div className="post-confirm-actions">
              <button className="post-confirm-cancel" onClick={() => { setConfirmDelete(false); setDeleteError(''); }}>Cancel</button>
              <button className="post-confirm-delete" onClick={handleDelete} disabled={deleteLoading}>{deleteLoading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {showShare && <ShareModal post={post} currentUser={currentUser} onClose={() => setShowShare(false)} />}
    </div>
  );
}

const SORT_TABS = ['Hot', 'New', 'Top', 'Rising'];

export default function PopularPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('hot');
  const [currentUser, setCurrentUser] = useState(null);
  const [savedPostIds, setSavedPostIds] = useState(new Set());

  useEffect(() => {
    getMe().then(async d => {
      if (d.success) {
        setCurrentUser(d.user);
        const savedData = await getSavedPosts(d.user._id);
        if (savedData.success) setSavedPostIds(new Set(savedData.posts.map(p => p._id?.toString())));
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    getFeed(token, sort).then(d => {
      if (d.success) setPosts(d.posts);
      setLoading(false);
    });
  }, [sort]);

  return (
    <Layout>
      <div className="home-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px', display: 'flex', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sort-tabs">
            {SORT_TABS.map(t => (
              <button
                key={t}
                className={`sort-tab${sort === t.toLowerCase() ? ' active' : ''}`}
                onClick={() => setSort(t.toLowerCase())}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                  {t === 'Hot' && <><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></>}
                  {t === 'New' && <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
                  {t === 'Top' && <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>}
                  {t === 'Rising' && <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>}
                </svg>
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="page-loading">Loading…</div>
          ) : posts.length === 0 ? (
            <div className="page-empty">No posts yet.</div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                currentUser={currentUser}
                isSaved={savedPostIds.has(post._id?.toString())}
                onSaveToggle={(id, next) => setSavedPostIds(prev => { const s = new Set(prev); next ? s.add(id.toString()) : s.delete(id.toString()); return s; })}
                onDelete={id => setPosts(prev => prev.filter(p => p._id !== id))}
                onUpdate={(id, body) => setPosts(prev => prev.map(p => p._id === id ? { ...p, content: body } : p))}
              />
            ))
          )}
        </div>

        <div style={{ width: 312, flexShrink: 0 }}>
          <div className="panel-card" style={{ padding: 16 }}>
            <p className="panel-title" style={{ margin: '0 0 8px' }}>Popular Posts</p>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
              The most upvoted posts across all communities on Reddit.
            </p>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 13, color: 'var(--muted)' }}>
              Sorted by: <strong style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{sort}</strong>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
