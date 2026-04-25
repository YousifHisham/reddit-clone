import { useState, useEffect } from "react";
import { getMe, logout } from '../api/auth';
import { getFeed, createPost, upvotePost, downvotePost } from '../api/posts';
import { getCommunities, joinCommunity, leaveCommunity, createCommunity } from '../api/communities';
 

// ── Icons ──
const Icon = ({ d, size = 18, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

const RedditLogo = () => (
  <svg width="32" height="32" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="10" fill="#ff4500"/>
    <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
  </svg>
);

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const SIDEBAR_SECTIONS = [
  { label: "GAMES ON REDDIT", items: ["r/gaming", "r/pcgaming", "r/indiegaming"] },
  { label: "CUSTOM FEEDS", items: ["+ Create Custom Feed"] },
  { label: "RECENT", items: ["r/programming", "r/worldnews"] },
  { label: "COMMUNITIES", items: ["r/technology", "r/science", "r/gaming", "r/programming"] },
  { label: "RESOURCES", items: ["Reddit Help", "Reddit Premium", "Advertise"] },
];

const COMMUNITY_COLORS = ["#ff4500","#0079d3","#46d160","#9b59b6","#e74c3c","#f39c12"];

function formatScore(n) {
  return n >= 1000 ? `${(n/1000).toFixed(1)}k` : n;
}

// ── Components ──

function PostCard({ post, onVote }) {
  const [votes, setVotes] = useState({ up: post.upvotes, down: post.downvotes });
  const [vote, setVote] = useState(0);
  const score = votes.up - votes.down;

  const handleVote = async (e, dir) => {
    e.stopPropagation();
    const newVote = vote === dir ? 0 : dir;
    setVote(newVote);
    const fn = dir === 1 ? upvotePost : downvotePost;
    const data = await fn(post._id);
    if (data.success) setVotes({ up: data.upvotes, down: data.downvotes });
  };

  return (
    <div className="post-card">
      <div className="post-vote">
        <button className={`vote-btn ${vote === 1 ? "up-active" : ""}`} onClick={(e) => handleVote(e, 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={vote===1?"#ff4500":"none"} stroke={vote===1?"#ff4500":"currentColor"} strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <span className={`vote-score ${vote===1?"up":vote===-1?"down":""}`}>{formatScore(score)}</span>
        <button className={`vote-btn ${vote === -1 ? "down-active" : ""}`} onClick={(e) => handleVote(e, -1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={vote===-1?"#7193ff":"none"} stroke={vote===-1?"#7193ff":"currentColor"} strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <div className="post-body">
        <div className="post-meta">
          <span className="post-community">r/{post.community?.name}</span>
          <span className="post-dot">•</span>
          <span>Posted by u/{post.author?.username}</span>
          <span className="post-dot">•</span>
          <span>{timeAgo(post.createdAt)}</span>
        </div>
        <h3 className="post-title">{post.title}</h3>
        {post.flair && <span className="post-flair">{post.flair}</span>}
        {post.content && <p className="post-text">{post.content}</p>}
        {post.image && <img className="post-image" src={post.image} alt="" style={{ width:'100%', maxHeight:480, objectFit:'cover', borderRadius:4, marginBottom:8 }} />}
        <div className="post-actions">
          <button className="post-action-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>{formatScore(post.commentCount || 0)} Comments</span>
          </button>
          <button className="post-action-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            <span>Share</span>
          </button>
          <button className="post-action-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span>Save</span>
          </button>
          <button className="post-action-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarSection({ section }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="sidebar-section-header" onClick={() => setOpen(!open)}>
        <span>{section.label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div className="sidebar-section-items" style={{ maxHeight: open ? "500px" : "0" }}>
        {section.items.map((item, i) => (
          <button key={i} className="sidebar-sub-item">
            <span className="community-dot" style={{ background: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length] }}>
              {item[0] === "r" ? item[2]?.toUpperCase() : "+"}
            </span>
            <span>{item}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CreatePostModal({ communities, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [community, setCommunity] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !community) return setError('Title and community are required.');
    setError('');
    setLoading(true);
    const data = await createPost({ title, content, community, image });
    setLoading(false);
    if (data.success) { onCreated(data.post); onClose(); }
    else setError(data.message || 'Failed to create post.');
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:12, padding:'28px 32px', width:'100%', maxWidth:480, boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Create Post</h2>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <select className="auth-input" value={community} onChange={e => setCommunity(e.target.value)} required>
            <option value="">Select a community</option>
            {communities.map(c => <option key={c._id} value={c._id}>r/{c.name}</option>)}
          </select>
          <input className="auth-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required maxLength={300} />
          <textarea className="auth-input" placeholder="Text (optional)" value={content} onChange={e => setContent(e.target.value)} rows={4} style={{ resize:'vertical', borderRadius:8 }} />
          <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} style={{ fontSize:13 }} />
          {error && <p className="auth-error">{error}</p>}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button type="button" className="panel-join-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="panel-create-btn" style={{ width:'auto', padding:'8px 20px' }} disabled={loading}>{loading ? 'Posting...' : 'Post'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateCommunityModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const data = await createCommunity({ name, description });
    setLoading(false);
    if (data.success) { onCreated(data.community); onClose(); }
    else setError(data.message || 'Failed to create community.');
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:12, padding:'28px 32px', width:'100%', maxWidth:480, boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize:18, fontWeight:700, marginBottom:16 }}>Create Community</h2>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input className="auth-input" placeholder="Community name (3-21 chars)" value={name} onChange={e => setName(e.target.value)} required minLength={3} maxLength={21} />
          <textarea className="auth-input" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize:'vertical', borderRadius:8 }} required />
          {error && <p className="auth-error">{error}</p>}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button type="button" className="panel-join-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="panel-create-btn" style={{ width:'auto', padding:'8px 20px' }} disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RedditLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSort, setActiveSort] = useState("Hot");
  const [joinedMap, setJoinedMap] = useState({});
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [user, setUser] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);

  useEffect(() => {
    getMe().then(data => { if (data.success) setUser(data.user); });
    getCommunities().then(data => { if (data.success) setCommunities(data.communities); });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    getFeed(token).then(data => { if (data.success) setPosts(data.posts); });
  }, [activeSort]);

  useEffect(() => {
    if (!user || communities.length === 0) return;
    const joined = {};
    communities.forEach(c => {
      joined[c._id] = c.members?.map(m => m.toString()).includes(user._id.toString());
    });
    setJoinedMap(joined);
  }, [user, communities]);

  const toggleJoin = async (id) => {
    const isJoined = joinedMap[id];
    const fn = isJoined ? leaveCommunity : joinCommunity;
    const data = await fn(id);
    if (data.success) setJoinedMap(prev => ({ ...prev, [id]: !isJoined }));
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('accessToken');
    window.location.href = '/Login';
  };

  return (
    <>
      {/* ── Navbar ── */}
      <header className="nav">
        <div className="nav-left">
          <div className="nav-logo">
            <RedditLogo />
            <span className="nav-logo-text">reddit</span>
          </div>
        </div>

        <div className="nav-center">
          <div className="search-wrap">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input className="search-input" placeholder="Find anything" />
          </div>
        </div>

        <div className="nav-right">
          <button className="nav-ask-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Ask</span>
          </button>
          <button className="nav-icon-btn" title="Messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button className="nav-icon-btn" title="Notifications" style={{ position: "relative" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span className="notif-dot" />
          </button>
          <button className="nav-create-btn" onClick={() => setShowCreatePost(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Create</span>
          </button>
          <button className="nav-avatar" onClick={handleLogout} title="Logout">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </button>
        </div>
      </header>

      {/* ── Sidebar toggle bubble ── */}
      <button
        className={`sidebar-bubble ${sidebarOpen ? "" : "closed"}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title="Toggle sidebar"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {sidebarOpen
            ? <polyline points="15 18 9 12 15 6" />
            : <polyline points="9 18 15 12 9 6" />
          }
        </svg>
      </button>

      {/* ── Sidebar ── */}
      <nav className={`sidebar ${sidebarOpen ? "" : "closed"}`}>
        <div className="sidebar-inner">
          {[
            { icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>, label: "Home", active: true },
            { icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>, label: "Popular" },
            { icon: <><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/></>, label: "News" },
            { icon: <><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>, label: "Explore" },
          ].map(({ icon, label, active }) => (
            <button key={label} className={`sidebar-nav-item ${active ? "active" : ""}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
              <span>{label}</span>
            </button>
          ))}

          <hr className="sidebar-divider" />

          <button className="sidebar-nav-item" onClick={() => setShowCreateCommunity(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <span>Start a Community</span>
          </button>

          <hr className="sidebar-divider" />

          {SIDEBAR_SECTIONS.map((section) => (
            <SidebarSection key={section.label} section={section} />
          ))}
        </div>
      </nav>

      {/* ── Main layout ── */}
      <div className={`layout`}>
        <div className={`main ${sidebarOpen ? "" : "sidebar-closed"}`} style={{ marginLeft: sidebarOpen ? "270px" : "0" }}>

          {/* Feed */}
          <div className="feed">
            <div className="feed-inner">
              {/* Sort bar */}
              <div className="sort-bar">
                {["Hot", "New", "Top", "Rising"].map((s) => (
                  <button
                    key={s}
                    className={`sort-btn ${activeSort === s ? "active" : ""}`}
                    onClick={() => setActiveSort(s)}
                  >
                    {s === "Hot" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c0 6-8 8-8 14a8 8 0 0 0 16 0c0-6-8-8-8-14z"/></svg>}
                    {s === "New" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                    {s === "Top" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/></svg>}
                    {s === "Rising" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                    {s}
                  </button>
                ))}
              </div>

              {/* Posts */}
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="right-panel">
            <div className="panel-card">
              <div className="panel-banner" />
              <div className="panel-body">
                <p className="panel-title">Home</p>
                <p style={{ fontSize: 14, color: "#3c3c3c", lineHeight: 1.5, marginBottom: 12 }}>
                  Your personal Reddit frontpage. Come here to check in with your favorite communities.
                </p>
                <hr className="panel-divider" />
                <button className="panel-create-btn" onClick={() => setShowCreatePost(true)}>Create Post</button>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-body">
                <p className="panel-title">Top Communities</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {communities.slice(0, 5).map((c, i) => (
                    <li key={c._id} className="panel-community-item">
                      <span className="panel-rank">{i + 1}</span>
                      <div className="panel-community-icon" style={{ background: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length] }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="panel-community-info">
                        <div className="panel-community-name">r/{c.name}</div>
                        <div className="panel-community-members">{c.memberCount?.toLocaleString()} members</div>
                      </div>
                      {joinedMap[c._id]
                        ? <span className="panel-joined">✓ Joined</span>
                        : <button className="panel-join-btn" onClick={() => toggleJoin(c._id)}>Join</button>
                      }
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-body">
                <div className="panel-footer">
                  <a href="#">Help</a><a href="#">About</a><a href="#">Careers</a>
                  <a href="#">Press</a><a href="#">Blog</a><a href="#">Rules</a>
                  <a href="#">Privacy</a><a href="#">User Agreement</a>
                  <br />
                  <span>Reddit Inc © 2026. All rights reserved.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCreatePost && (
        <CreatePostModal
          communities={communities.filter(c => joinedMap[c._id])}
          onClose={() => setShowCreatePost(false)}
          onCreated={post => { setPosts(prev => [post, ...prev]); }}
        />
      )}
      {showCreateCommunity && (
        <CreateCommunityModal
          onClose={() => setShowCreateCommunity(false)}
          onCreated={community => {
            setCommunities(prev => [community, ...prev]);
            setJoinedMap(prev => ({ ...prev, [community._id]: true }));
          }}
        />
      )}
    </>
  );
}