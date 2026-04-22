import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFeed, createPost, upvotePost, downvotePost, deletePost } from '../api/posts';
import { getCommunities, getJoinedCommunities, joinCommunity } from '../api/communities';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const UpArrow = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={active ? '#ff4500' : 'none'} stroke={active ? '#ff4500' : '#878a8c'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const DownArrow = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={active ? '#7193ff' : 'none'} stroke={active ? '#7193ff' : '#878a8c'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CommentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

function PostCard({ post, token, currentUserId, onVote, onDelete }) {
  const [voting, setVoting] = useState(false);
  const hasUpvoted = post.upvoters?.includes(currentUserId);
  const hasDownvoted = post.downvoters?.includes(currentUserId);
  const score = post.upvotes - post.downvotes;

  const handleVote = async (dir) => {
    if (voting || !token) return;
    setVoting(true);
    await onVote(post._id, dir);
    setVoting(false);
  };

  return (
    <div className="post-card">
      <div className="post-vote-col">
        <button className={`vote-btn ${hasUpvoted ? 'vote-up-active' : ''}`} onClick={() => handleVote('up')} disabled={voting}>
          <UpArrow active={hasUpvoted} />
        </button>
        <span className={`vote-score ${hasUpvoted ? 'score-up' : hasDownvoted ? 'score-down' : ''}`}>
          {score >= 1000 ? `${(score / 1000).toFixed(1)}k` : score}
        </span>
        <button className={`vote-btn ${hasDownvoted ? 'vote-down-active' : ''}`} onClick={() => handleVote('down')} disabled={voting}>
          <DownArrow active={hasDownvoted} />
        </button>
      </div>
      <div className="post-content-col">
        <div className="post-meta">
          <span className="post-subreddit">r/{post.community?.name}</span>
          <span className="post-meta-sep">•</span>
          <span className="post-meta-text">Posted by u/{post.author?.username}</span>
          <span className="post-meta-sep">•</span>
          <span className="post-meta-text">{timeAgo(post.createdAt)}</span>
        </div>
        <h3 className="post-title">{post.title}</h3>
        {post.flair && <span className="post-flair">{post.flair}</span>}
        {post.content && <p className="post-body-text">{post.content}</p>}
        {post.image && <img src={post.image} alt="" className="post-img" />}
        <div className="post-actions">
          <button className="post-action-btn">
            <CommentIcon />
            <span>{post.commentCount} Comments</span>
          </button>
          {post.author?._id === currentUserId && (
            <button className="post-action-btn post-delete" onClick={() => onDelete(post._id)}>
              <TrashIcon />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreatePostModal({ token, communities, onCreated, onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!communityId) return setError('Please select a community');
    setLoading(true);
    const data = await createPost({ title, content, community: communityId }, token);
    setLoading(false);
    if (data.success) { onCreated(data.post); onClose(); }
    else setError(data.message || 'Failed to create post');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Create a Post</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <select className="modal-select" value={communityId} onChange={(e) => setCommunityId(e.target.value)}>
            <option value="">Choose a community</option>
            {communities.map((c) => <option key={c._id} value={c._id}>r/{c.name}</option>)}
          </select>
          <input
            className="modal-input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            required
          />
          <div className="modal-char-count">{title.length}/300</div>
          <textarea
            className="modal-textarea"
            placeholder="Text (optional)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
          />
          {error && <p className="modal-error">{error}</p>}
          <div className="modal-footer">
            <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-submit" disabled={loading || !title || !communityId}>
              {loading ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  // ← starts TRUE so sidebar is open on desktop by default
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id);
      } catch {}
    }
  }, [token]);

  // On mobile, start closed. On desktop, start open.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 960) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const data = await getFeed(token);
    if (data.success) setPosts(data.posts);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadFeed();
    getCommunities().then((d) => { if (d.success) setCommunities(d.communities); });
    getJoinedCommunities(token).then((d) => { if (d.success) setJoinedCommunities(d.communities); });
  }, [loadFeed]);

  const handleVote = async (postId, dir) => {
    const fn = dir === 'up' ? upvotePost : downvotePost;
    const data = await fn(postId, token);
    if (data.success) {
      setPosts((prev) => prev.map((p) =>
        p._id === postId ? { ...p, upvotes: data.upvotes, downvotes: data.downvotes } : p
      ));
    }
  };

  const handleJoin = async (communityId) => {
    const data = await joinCommunity(communityId, token);
    if (data.success) {
      setCommunities((prev) => prev.map((c) =>
        c._id === communityId ? { ...c, memberCount: c.memberCount + 1, _joined: true } : c
      ));
      setJoinedCommunities((prev) => [...prev, communities.find((c) => c._id === communityId)]);
    }
  };

  const handleDelete = async (postId) => {
    const data = await deletePost(postId, token);
    if (data.success) setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handleCreated = (newPost) => setPosts((prev) => [newPost, ...prev]);

  const filteredPosts = posts.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rdt-root">

      {/* ── Navbar ── */}
      <header className="rdt-nav">
        <div className="rdt-nav-inner">
          <div className="rdt-nav-left">
            {/* Hamburger only shown on mobile (hidden on desktop via CSS) */}
            <button className="rdt-hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Sidebar">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="rdt-nav-brand">
              {/* Reddit alien SVG logo */}
              <svg className="rdt-nav-brand-logo" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="10" fill="#ff4500"/>
                <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
              </svg>
              <span className="rdt-nav-brand-text">reddit</span>
            </div>
          </div>

          <div className="rdt-nav-center">
            <div className="rdt-nav-search">
              <svg className="rdt-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#878a8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="rdt-search-input"
                placeholder="Find Anything"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="rdt-ask-reddit-inline" onClick={() => navigate('/ask-reddit')} title="Ask Reddit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Ask</span>
              </button>
            </div>
          </div>

          <div className="rdt-nav-right">
            <button className="rdt-nav-icon-btn" title="Advertise" onClick={() => navigate('/advertise')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </button>
            <button className="rdt-nav-icon-btn" title="Chat" onClick={() => navigate('/chat')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button className="rdt-nav-icon-btn" title="Create Post" onClick={() => setShowModal(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </button>
            <button className="rdt-nav-icon-btn" title="Notifications" onClick={() => navigate('/notifications')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button className="rdt-nav-avatar-btn" onClick={() => navigate('/profile')} title="My Profile">
              <div className="rdt-nav-avatar">U</div>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="rdt-body">

        {/* ── Left Sidebar ── NEW class names: rdt-sidebar-open / rdt-sidebar-closed */}
        <aside className={`rdt-left-sidebar ${sidebarOpen ? 'rdt-sidebar-open' : 'rdt-sidebar-closed'}`}>
          <nav className="rdt-left-nav">
            <button className="rdt-left-nav-item" onClick={() => navigate('/home')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>Home</span>
            </button>
            <button className="rdt-left-nav-item" onClick={() => navigate('/popular')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              <span>Popular</span>
            </button>
            <button className="rdt-left-nav-item" onClick={() => navigate('/news')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/>
              </svg>
              <span>News</span>
            </button>
            <button className="rdt-left-nav-item" onClick={() => navigate('/explore')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
              </svg>
              <span>Explore</span>
            </button>
            <hr className="rdt-left-divider" />
            <button className="rdt-left-nav-item" onClick={() => navigate('/create-community')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              <span>Start a Community</span>
            </button>
          </nav>
        </aside>

        {/* ── Sidebar toggle bubble ── sits between sidebar and feed */}
        <button
          className="rdt-sidebar-toggle-bubble"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12" height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {sidebarOpen
              ? <polyline points="15 18 9 12 15 6" />   /* ← left arrow when open */
              : <polyline points="9 18 15 12 9 6" />    /* → right arrow when closed */
            }
          </svg>
        </button>

        {/* ── Feed ── */}
        <div className="rdt-feed-col">
          {loading ? (
            <div className="rdt-loading">
              {[1,2,3].map((i) => <div key={i} className="rdt-skeleton" />)}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rdt-empty">
              <p className="rdt-empty-title">No posts yet</p>
              <p className="rdt-empty-sub">Be the first to post in your community.</p>
              <button className="rdt-btn-primary" onClick={() => setShowModal(true)}>Create Post</button>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                token={token}
                currentUserId={currentUserId}
                onVote={handleVote}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="rdt-sidebar">
          {communities.length > 0 && (
            <div className="rdt-sidebar-card">
              <div className="rdt-sidebar-body">
                <h4 className="rdt-sidebar-title">Top Communities</h4>
                <ul className="rdt-community-list">
                  {communities.slice(0, 5).map((c, i) => (
                    <li key={c._id} className="rdt-community-item">
                      <span className="rdt-community-rank">{i + 1}</span>
                      <div className="rdt-community-icon">{c.name[0].toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div className="rdt-community-name">r/{c.name}</div>
                        <div className="rdt-community-members">{c.memberCount} members</div>
                      </div>
                      {!c._joined && !joinedCommunities.find((j) => j?._id === c._id) ? (
                        <button className="rdt-join-btn" onClick={() => handleJoin(c._id)}>Join</button>
                      ) : (
                        <span className="rdt-joined-badge">✓ Joined</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>

      {showModal && (
        <CreatePostModal
          token={token}
          communities={joinedCommunities}
          onCreated={handleCreated}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
