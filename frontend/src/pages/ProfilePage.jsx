import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getUserByUsername, getUserPosts, getUserComments, updateProfile } from '../api/users';
import { getMe } from '../api/auth';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function cakeDay(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatScore(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n;
}

export default function ProfilePage() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState(null);
  const [comments, setComments] = useState(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then(d => { if (d.success) setCurrentUser(d.user); });
  }, []);

  useEffect(() => {
    setLoading(true);
    setPosts(null);
    setComments(null);
    setTab('posts');
    getUserByUsername(username).then(d => {
      if (d.success) { setUser(d.user); setBio(d.user.bio || ''); }
      setLoading(false);
    });
  }, [username]);

  useEffect(() => {
    if (!user) return;
    if (tab === 'posts' && posts === null) {
      getUserPosts(username).then(d => { if (d.success) setPosts(d.posts); });
    }
    if (tab === 'comments' && comments === null) {
      getUserComments(username).then(d => { if (d.success) setComments(d.comments); });
    }
  }, [tab, user]);

  const handleSave = async () => {
    setSaving(true);
    const data = await updateProfile(currentUser._id, { bio });
    if (data.success) { setUser(u => ({ ...u, bio: data.user.bio })); setEditing(false); }
    setSaving(false);
  };

  if (loading) return <Layout><div className="page-loading">Loading…</div></Layout>;
  if (!user) return <Layout><div className="page-loading">User not found.</div></Layout>;

  const isOwnProfile = currentUser?.username === user.username;
  const totalKarma = (user.postKarma || 0) + (user.commentKarma || 0);

  return (
    <Layout>
      <div className="page-content">
        <div className="page-two-col">
          {/* Main */}
          <div className="page-main">
            {/* Tabs */}
            <div className="sort-tabs">
              {['posts', 'comments'].map(t => (
                <button
                  key={t}
                  className={`sort-tab ${tab === t ? 'active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {tab === 'posts' && (
              posts === null
                ? <div className="page-loading">Loading…</div>
                : posts.length === 0
                  ? <div className="page-empty">No posts yet.</div>
                  : posts.map(post => (
                    <div key={post._id} className="content-card">
                      <div style={{ display: 'flex' }}>
                        <div className="post-vote">
                          <span className="vote-score">{formatScore(post.upvotes - post.downvotes)}</span>
                        </div>
                        <div className="post-body">
                          <div className="card-meta">
                            <Link to={`/r/${post.community?.name}`} className="community-link" style={{ color: 'var(--text)', fontWeight: 700, textDecoration: 'none', fontSize: 12 }}>
                              r/{post.community?.name}
                            </Link>
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
                  ))
            )}

            {tab === 'comments' && (
              comments === null
                ? <div className="page-loading">Loading…</div>
                : comments.length === 0
                  ? <div className="page-empty">No comments yet.</div>
                  : comments.map(comment => (
                    <div key={comment._id} className="content-card">
                      <div className="content-card-body">
                        <div className="card-meta">
                          <span>Commented on{' '}
                            <Link to={`/post/${comment.post?._id}`} style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 700 }}>
                              {comment.post?.title}
                            </Link>
                          </span>
                          <span className="post-dot">•</span>
                          <span>{timeAgo(comment.createdAt)}</span>
                        </div>
                        <p style={{ fontSize: 14, color: '#3c3c3c', lineHeight: 1.5, margin: 0 }}>{comment.content}</p>
                      </div>
                    </div>
                  ))
            )}
          </div>

          {/* Sidebar */}
          <aside className="page-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div
                    className="profile-avatar"
                    style={user.profilePicture ? { backgroundImage: `url(${user.profilePicture})` } : {}}
                  >
                    {!user.profilePicture && user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="profile-username">u/{user.username}</p>
                    <p className="profile-karma">{totalKarma.toLocaleString()} karma</p>
                  </div>
                </div>

                <hr className="sidebar-card-divider" />

                {editing ? (
                  <>
                    <textarea
                      className="comment-textarea"
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Tell us about yourself"
                      rows={3}
                      maxLength={500}
                      style={{ marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="comment-submit-btn"
                        onClick={handleSave}
                        disabled={saving}
                        style={{ padding: '6px 16px', fontSize: 13 }}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        className="post-edit-cancel"
                        onClick={() => setEditing(false)}
                        style={{ fontSize: 13 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="profile-bio">{user.bio || 'No bio yet.'}</p>
                    {isOwnProfile && (
                      <button className="profile-edit-btn" onClick={() => setEditing(true)}>
                        Edit Profile
                      </button>
                    )}
                  </>
                )}

                <hr className="sidebar-card-divider" />

                <div className="profile-stat-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Cake day: {cakeDay(user.createdAt)}
                </div>
                <div className="profile-stat-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                  Post karma: {(user.postKarma || 0).toLocaleString()}
                </div>
                <div className="profile-stat-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Comment karma: {(user.commentKarma || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
