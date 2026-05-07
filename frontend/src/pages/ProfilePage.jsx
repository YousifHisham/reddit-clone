import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

const TABS = ['Overview', 'Posts', 'Comments', 'Saved', 'Upvoted', 'Downvoted'];

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [posts, setPosts] = useState(null);
  const [comments, setComments] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then(d => { if (d.success) setCurrentUser(d.user); });
  }, []);

  useEffect(() => {
    setLoading(true);
    setPosts(null);
    setComments(null);
    setTab('Overview');
    getUserByUsername(username).then(d => {
      if (d.success) setUser(d.user);
      setLoading(false);
    });
  }, [username]);

  useEffect(() => {
    if (!user) return;
    if ((tab === 'Overview' || tab === 'Posts') && posts === null) {
      getUserPosts(username).then(d => { if (d.success) setPosts(d.posts); });
    }
    if ((tab === 'Overview' || tab === 'Comments') && comments === null) {
      getUserComments(username).then(d => { if (d.success) setComments(d.comments); });
    }
  }, [tab, user]);

  if (loading) return <Layout><div className="page-loading">Loading…</div></Layout>;
  if (!user) return <Layout><div className="page-loading">User not found.</div></Layout>;

  const isOwnProfile = currentUser?.username === user.username;
  const totalKarma = (user.postKarma || 0) + (user.commentKarma || 0);

  return (
    <Layout>
      {/* Avatar + name row */}
      <div style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 0', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: user.profilePicture ? `url(${user.profilePicture}) center/cover` : '#ff4500',
            border: '4px solid var(--bg-page)',
            marginTop: 16, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff',
          }}>
            {!user.profilePicture && user.username[0].toUpperCase()}
          </div>
          <div style={{ paddingBottom: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{user.username}</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>u/{user.username}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '12px 16px', border: 'none', background: 'none',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
                color: tab === t ? 'var(--text)' : 'var(--muted)',
                borderBottom: tab === t ? '2px solid var(--orange)' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* Left: posts/comments */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Showing all content bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 16px', marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Showing all content
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          {/* Create post button */}
          {isOwnProfile && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => navigate('/submit')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 999,
                  background: 'none', color: 'var(--text)', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--font)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create Post
              </button>
            </div>
          )}

          {/* Posts */}
          {(tab === 'Overview' || tab === 'Posts') && (
            posts === null
              ? <div className="page-loading">Loading…</div>
              : posts.length === 0
                ? (
                  <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--muted)' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>You don't have any posts yet</p>
                    <p style={{ fontSize: 14 }}>Once you post to a community, it'll show up here.</p>
                  </div>
                )
                : posts.map(post => (
                  <div key={post._id} className="content-card" style={{ background: 'var(--bg-page)', borderRadius: 8, marginBottom: 8 }}>
                    <div className="content-card-body">
                      <div className="card-meta">
                        <Link to={`/r/${post.community?.name}`} style={{ color: 'var(--text)', fontWeight: 700, textDecoration: 'none', fontSize: 12 }}>
                          r/{post.community?.name}
                        </Link>
                        <span className="post-dot">•</span>
                        <span>{timeAgo(post.createdAt)}</span>
                      </div>
                      <Link to={`/post/${post._id}`} className="card-title">{post.title}</Link>
                      {post.content && <p className="card-excerpt">{post.content}</p>}
                      <div className="card-stats">
                        <span>{formatScore(post.upvotes - post.downvotes)} points</span>
                        <span>•</span>
                        <Link to={`/post/${post._id}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{post.commentCount} comments</Link>
                      </div>
                    </div>
                  </div>
                ))
          )}

          {/* Comments */}
          {tab === 'Comments' && (
            comments === null
              ? <div className="page-loading">Loading…</div>
              : comments.length === 0
                ? <div className="page-empty">No comments yet.</div>
                : comments.map(comment => (
                  <div key={comment._id} className="content-card" style={{ background: 'var(--bg-page)', borderRadius: 8, marginBottom: 8 }}>
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
                      <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{comment.content}</p>
                    </div>
                  </div>
                ))
          )}

          {(tab === 'Saved' || tab === 'Upvoted' || tab === 'Downvoted' || tab === 'History' || tab === 'Hidden') && (
            <div className="page-empty">Nothing here yet.</div>
          )}
        </div>

        {/* Right: stats sidebar */}
        <div style={{ width: 312, flexShrink: 0, position: 'sticky', top: 'calc(var(--nav-h) + 20px)', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Profile card */}
          <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Banner */}
            <div style={{ position: 'relative', height: 80, background: 'linear-gradient(180deg, #0079d3 0%, #1a1a1b 100%)', borderRadius: '12px 12px 0 0' }}>
              <button style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {/* Username + Share */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{user.username}</p>
                <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', border: '1px solid var(--border)', borderRadius: 999, background: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share
                </button>
              </div>

              {/* Followers */}
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>0 followers</p>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 8px', marginBottom: 16 }}>
                {[
                  { label: 'Karma', value: totalKarma.toLocaleString() },
                  { label: 'Contributions', value: (posts?.length || 0) + (comments?.length || 0) },
                  { label: 'Reddit Age', value: `${Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))}d` },
                  { label: 'Active in >', value: '0' },
                  { label: 'Gold earned', value: '0' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{value}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{label}</p>
                  </div>
                ))}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />

              {/* Achievements */}
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Achievements</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {['🏆','🎖️','⭐'].map((emoji, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{emoji}</div>
                ))}
                <span style={{ fontSize: 13, color: 'var(--text)', marginLeft: 4 }}>Joined Reddit, Secured Account</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>2 unlocked</span>
                <button style={{ padding: '4px 12px', border: '1px solid var(--border)', borderRadius: 999, background: 'none', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>View All</button>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />

              {/* Settings */}
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Settings</p>
              {isOwnProfile && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                      {user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Profile</p>
                      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Customize your profile</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/avatar/edit')}
                    style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 999, background: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    Update
                  </button>
                </div>
              )}

              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>Cake day: {cakeDay(user.createdAt)}</p>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
