import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getCommunityByName, getCommunityPosts, joinCommunity, leaveCommunity, createJoinRequest } from '../api/communities';
import { getMe } from '../api/auth';
import { upvotePost, downvotePost, deletePost, updatePost } from '../api/posts';
import { savePost, unsavePost, getSavedPosts } from '../api/users';
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

  const handleSave = async e => {
    e.stopPropagation();
    if (!currentUser) return;
    const next = !saved;
    setSaved(next);
    if (next) await savePost(currentUser._id, post._id);
    else await unsavePost(currentUser._id, post._id);
    onSaveToggle?.(post._id, next);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleVote = async (e, dir) => {
    e.stopPropagation();
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

  return (
    <div className="post-card">
      <div className="post-body">
        <div className="post-meta">
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

        {post.flair && (
          <span className="post-flair" style={post.flairColor ? { background: post.flairColor, color: '#fff', border: 'none' } : {}}>
            {post.flair}
          </span>
        )}

        {post.status === 'pending' && currentUser && post.author?._id === currentUser._id && (
          <div className="post-pending-banner">
            <span>🚫</span><span>Post is awaiting moderator approval.</span>
          </div>
        )}
        {post.status === 'rejected' && currentUser && post.author?._id === currentUser._id && (
          <div className="post-pending-banner" style={{ borderColor: '#ff4500', color: '#ff4500' }}>
            <span>❌</span><span>Your post was rejected by the moderator.</span>
          </div>
        )}

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

export default function CommunityPage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [sort, setSort] = useState('hot');
  const [joined, setJoined] = useState(false);
  const [joinPending, setJoinPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedPostIds, setSavedPostIds] = useState(new Set());

  useEffect(() => {
    getMe().then(d => { if (d.success) setCurrentUser(d.user); });
  }, []);

  useEffect(() => { loadCommunity(); }, [name]);
  useEffect(() => { if (community) loadPosts(); }, [community, sort]);

  async function loadCommunity() {
    setLoading(true);
    const data = await getCommunityByName(name);
    if (data.success) {
      setCommunity(data.community);
      const meData = await getMe();
      if (meData.success) {
        const uid = meData.user._id;
        setJoined(data.community.members?.some(m => m === uid || m?._id === uid) ?? false);
        const savedData = await getSavedPosts(uid);
        if (savedData.success) setSavedPostIds(new Set((savedData.posts || []).map(p => p._id?.toString())));
      }
    }
    setLoading(false);
  }

  async function loadPosts() {
    const data = await getCommunityPosts(community._id, sort);
    if (data.success) setPosts(data.posts);
  }

  const handleJoinLeave = async () => {
    if (!currentUser) return navigate('/Login');
    if (joined) {
      const data = await leaveCommunity(community._id);
      if (data.success) { setJoined(false); setCommunity(c => ({ ...c, memberCount: c.memberCount - 1 })); }
    } else if (community?.type === 'restricted') {
      const data = await createJoinRequest(community._id);
      if (data.success) setJoinPending(true);
    } else {
      const data = await joinCommunity(community._id);
      if (data.success) { setJoined(true); setCommunity(c => ({ ...c, memberCount: c.memberCount + 1 })); }
    }
  };

  const isCreator = currentUser && community?.creator?._id === currentUser._id;

  if (loading) return <Layout><div className="page-loading">Loading…</div></Layout>;
  if (!community) return <Layout><div className="page-loading">Community not found.</div></Layout>;

  const bannerStyle = community.banner ? { backgroundImage: `url(${community.banner})` } : {};
  const avatarStyle = community.icon ? { backgroundImage: `url(${community.icon})`, backgroundSize: 'cover' } : {};

  const typeLabel = community.type === 'restricted' ? 'Restricted' : community.type === 'private' ? 'Private' : 'Public';

  return (
    <Layout>
      {/* Banner */}
      <div className="community-banner" style={bannerStyle} />

      {/* Community header */}
      <div className="community-header">
        <div className="community-header-inner">
          <div className="community-avatar" style={avatarStyle}>
            {!community.icon && community.name[0].toUpperCase()}
          </div>
          <div className="community-header-info">
            <h1 className="community-name">r/{community.name}</h1>
            <span className="community-members">{community.memberCount?.toLocaleString()} members</span>
          </div>
          <button
            className={`join-btn ${joined ? 'joined' : 'not-joined'}`}
            onClick={handleJoinLeave}
            disabled={joinPending}
          >
            {joined ? 'Joined' : joinPending ? 'Pending' : 'Join'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="page-content">
        <div className="page-two-col">
          {/* Feed */}
          <div className="page-main">
            <div className="sort-tabs">
              {['hot', 'new', 'top'].map(s => (
                <button key={s} className={`sort-tab ${sort === s ? 'active' : ''}`} onClick={() => setSort(s)}>
                  {s === 'hot' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c0 6-8 8-8 14a8 8 0 0 0 16 0c0-6-8-8-8-14z"/></svg>}
                  {s === 'new' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  {s === 'top' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/></svg>}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {posts.length === 0 ? (
              <div className="page-empty">No posts yet. Be the first to post!</div>
            ) : posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                currentUser={currentUser}
                isSaved={savedPostIds.has(post._id?.toString())}
                onSaveToggle={(id, next) => setSavedPostIds(prev => { const s = new Set(prev); next ? s.add(id.toString()) : s.delete(id.toString()); return s; })}
                onDelete={id => setPosts(prev => prev.filter(p => p._id !== id))}
                onUpdate={(id, body) => setPosts(prev => prev.map(p => p._id === id ? { ...p, content: body } : p))}
              />
            ))}
          </div>

          {/* Sidebar */}
          <aside className="page-sidebar">
            {/* About card */}
            <div className="sidebar-card">
              <div className="sidebar-card-banner" style={bannerStyle} />
              <div className="sidebar-card-body">
                <p className="sidebar-card-title">About r/{community.name}</p>
                <p className="sidebar-card-text">{community.description}</p>
                <hr className="sidebar-card-divider" />
                <div className="sidebar-card-stat">
                  <strong>{community.memberCount?.toLocaleString()}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 4 }}>Members</span>
                </div>
                <div className="sidebar-card-stat" style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{typeLabel} community</span>
                  {community.creator?.username && (
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>
                      · Mod: <Link to={`/u/${community.creator.username}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>u/{community.creator.username}</Link>
                    </span>
                  )}
                </div>
                <hr className="sidebar-card-divider" />
                <button
                  className="panel-create-btn"
                  style={{ width: '100%', borderRadius: 999, marginBottom: 8 }}
                  onClick={() => navigate(`/submit?community=${community.name}`)}
                >
                  Create Post
                </button>
                <button
                  className={`join-btn ${joined ? 'joined' : 'not-joined'}`}
                  onClick={handleJoinLeave}
                  disabled={joinPending}
                  style={{ width: '100%' }}
                >
                  {joined ? 'Joined' : joinPending ? 'Pending' : 'Join'}
                </button>
              </div>
            </div>

            {/* Rules card */}
            {community.rules && (
              <div className="sidebar-card" style={{ marginTop: 16 }}>
                <div className="sidebar-card-body">
                  <p className="sidebar-card-title">Rules</p>
                  <p style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{community.rules}</p>
                </div>
              </div>
            )}

            {/* Moderator tools */}
            {isCreator && (
              <div className="sidebar-card" style={{ marginTop: 16 }}>
                <div className="sidebar-card-body">
                  <p className="sidebar-card-title">Mod Tools</p>
                  {community.type === 'restricted' && (
                    <button
                      className="panel-join-btn"
                      style={{ width: '100%', marginBottom: 8, textAlign: 'center' }}
                      onClick={() => navigate(`/r/${community.name}/pending`)}
                    >
                      Review Pending Posts
                    </button>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
