import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { search } from '../api/search';

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

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [tab, setTab] = useState('posts');
  const [results, setResults] = useState({ posts: [], communities: [], users: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    search(q).then(data => {
      if (data.success) setResults({ posts: data.posts, communities: data.communities, users: data.users });
      setLoading(false);
    });
  }, [q]);

  const tabs = [
    { key: 'posts', label: 'Posts', count: results.posts.length },
    { key: 'communities', label: 'Communities', count: results.communities.length },
    { key: 'people', label: 'People', count: results.users.length },
  ];

  return (
    <Layout>
      <div className="page-content-narrow">
        <p className="search-page-header">
          Search results for "{q}"
        </p>

        {/* Tabs */}
        <div className="sort-tabs">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              className={`sort-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="page-loading">Searching…</div>
        ) : (
          <>
            {/* Posts */}
            {tab === 'posts' && (
              results.posts.length === 0
                ? <div className="page-empty">No posts found for "{q}".</div>
                : results.posts.map(post => (
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
                ))
            )}

            {/* Communities */}
            {tab === 'communities' && (
              results.communities.length === 0
                ? <div className="page-empty">No communities found for "{q}".</div>
                : results.communities.map(comm => (
                  <Link key={comm._id} to={`/r/${comm.name}`} style={{ textDecoration: 'none' }}>
                    <div className="content-card">
                      <div className="content-card-body">
                        <div className="search-community-row">
                          <div
                            className="search-community-icon"
                            style={comm.icon ? { backgroundImage: `url(${comm.icon})` } : {}}
                          >
                            {!comm.icon && comm.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="search-result-name">r/{comm.name}</p>
                            <p className="search-result-sub">{comm.memberCount?.toLocaleString()} members</p>
                            {comm.description && <p className="search-result-desc">{comm.description}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
            )}

            {/* People */}
            {tab === 'people' && (
              results.users.length === 0
                ? <div className="page-empty">No people found for "{q}".</div>
                : results.users.map(u => (
                  <Link key={u._id} to={`/u/${u.username}`} style={{ textDecoration: 'none' }}>
                    <div className="content-card">
                      <div className="content-card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            className="search-user-icon"
                            style={u.profilePicture ? { backgroundImage: `url(${u.profilePicture})` } : {}}
                          >
                            {!u.profilePicture && u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="search-result-name">u/{u.username}</p>
                            <p className="search-result-sub">
                              {((u.postKarma || 0) + (u.commentKarma || 0)).toLocaleString()} karma
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
