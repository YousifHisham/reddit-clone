import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getCommunityByName, getCommunityPosts, joinCommunity, leaveCommunity } from '../api/communities';
import { getMe } from '../api/auth';

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

export default function CommunityPage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [sort, setSort] = useState('new');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);

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
      await leaveCommunity(community._id);
      setJoined(false);
      setCommunity(c => ({ ...c, memberCount: c.memberCount - 1 }));
    } else {
      await joinCommunity(community._id);
      setJoined(true);
      setCommunity(c => ({ ...c, memberCount: c.memberCount + 1 }));
    }
  };

  if (loading) return <Layout><div className="page-loading">Loading…</div></Layout>;
  if (!community) return <Layout><div className="page-loading">Community not found.</div></Layout>;

  const bannerStyle = community.banner
    ? { backgroundImage: `url(${community.banner})` }
    : {};

  const avatarStyle = community.icon
    ? { backgroundImage: `url(${community.icon})` }
    : {};

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
          >
            {joined ? 'Joined' : 'Join'}
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
                <button
                  key={s}
                  className={`sort-tab ${sort === s ? 'active' : ''}`}
                  onClick={() => setSort(s)}
                >
                  {s === 'hot' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2c0 6-8 8-8 14a8 8 0 0 0 16 0c0-6-8-8-8-14z"/>
                    </svg>
                  )}
                  {s === 'new' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  )}
                  {s === 'top' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/>
                    </svg>
                  )}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {posts.length === 0 ? (
              <div className="page-empty">No posts yet. Be the first to post!</div>
            ) : posts.map(post => (
              <div key={post._id} className="content-card">
                <div style={{ display: 'flex' }}>
                  <div className="post-vote">
                    <span className="vote-score">{formatScore(post.upvotes - post.downvotes)}</span>
                  </div>
                  <div className="post-body">
                    <div className="card-meta">
                      <span>Posted by{' '}
                        <Link to={`/u/${post.author?.username}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                          u/{post.author?.username}
                        </Link>
                      </span>
                      <span className="post-dot">•</span>
                      <span>{timeAgo(post.createdAt)}</span>
                    </div>
                    <Link to={`/post/${post._id}`} className="card-title">{post.title}</Link>
                    {post.content && <p className="card-excerpt">{post.content}</p>}
                    <div className="post-actions">
                      <Link to={`/post/${post._id}`} style={{ textDecoration: 'none' }}>
                        <button className="post-action-btn">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          {post.commentCount} Comments
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <aside className="page-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-card-banner" style={bannerStyle} />
              <div className="sidebar-card-body">
                <p className="sidebar-card-title">About r/{community.name}</p>
                <p className="sidebar-card-text">{community.description}</p>
                <hr className="sidebar-card-divider" />
                <div className="sidebar-card-stat">
                  <strong>{community.memberCount?.toLocaleString()}</strong> Members
                </div>
                {community.rules && (
                  <>
                    <hr className="sidebar-card-divider" />
                    <p className="sidebar-card-title" style={{ marginBottom: 6 }}>Rules</p>
                    <p style={{ fontSize: 13, color: '#3c3c3c', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{community.rules}</p>
                  </>
                )}
                <hr className="sidebar-card-divider" />
                <button
                  className={`join-btn ${joined ? 'joined' : 'not-joined'}`}
                  onClick={handleJoinLeave}
                  style={{ width: '100%' }}
                >
                  {joined ? 'Joined' : 'Join'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
