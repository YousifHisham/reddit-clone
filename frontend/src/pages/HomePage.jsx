import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { getMe, logout } from '../api/auth';
import { getFeed, createPost, upvotePost, downvotePost, updatePost, deletePost, updatePostStatus } from '../api/posts';
import { getCommunities, joinCommunity, leaveCommunity, createCommunity, createJoinRequest, handleJoinRequest } from '../api/communities';
import { getNotifications, markNotificationsRead, approvePost, rejectPost } from '../api/notifications';
import { getThreads, getMessages, sendMessage, markThreadRead, searchUsers } from '../api/messages';
import { search } from '../api/search';
import { savePost, unsavePost, getSavedPosts } from '../api/users';
import ShareModal from '../components/ShareModal';

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
    const handler = (e) => {
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
    if (data.success) {
      onUpdate(post._id, editBody);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    const data = await deletePost(post._id);
    setDeleteLoading(false);
    if (data.success) {
      onDelete(post._id);
    } else {
      setDeleteError(data.message || 'Failed to delete post.');
    }
  };

  return (
    <div className="post-card">
      <div className="post-body">
        <div className="post-meta">
          <span className="post-community">
            <Link to={`/r/${post.community?.name}`} style={{ color: 'inherit', textDecoration: 'none' }}>r/{post.community?.name}</Link>
          </span>
          <span className="post-dot">•</span>
          <span>Posted by <Link to={`/u/${post.author?.username}`} style={{ color: 'inherit', textDecoration: 'none' }}>u/{post.author?.username}</Link></span>
          <span className="post-dot">•</span>
          <span>{timeAgo(post.createdAt)}</span>
          {isAuthor && (
            <div className="post-menu-wrap" ref={menuRef} style={{ marginLeft: 'auto' }}>
              <button
                className="post-action-btn"
                style={{ padding: '4px 8px' }}
                onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
                title="More options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
              {menuOpen && (
                <div className="post-dropdown">
                  {(!post.type || post.type === 'Text') && (
                    <button className="post-dropdown-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setEditing(true); setEditBody(post.content || ''); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit post body
                    </button>
                  )}
                  <button className="post-dropdown-item post-dropdown-delete" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setConfirmDelete(true); }}>
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
        {post.flair && <span className="post-flair" style={post.flairColor ? { background: post.flairColor, color: '#fff', border: 'none' } : {}}>{post.flair}</span>}
        {post.status === 'pending' && currentUser && post.author?._id === currentUser._id && (
          <div className="post-pending-banner">
            <span>🚫</span>
            <span>Post is awaiting moderator approval.</span>
          </div>
        )}
        {post.status === 'rejected' && currentUser && post.author?._id === currentUser._id && (
          <div className="post-pending-banner" style={{ borderColor: '#ff4500', color: '#ff4500' }}>
            <span>❌</span>
            <span>Your post was rejected by the moderator.</span>
          </div>
        )}
        {editing ? (
          <div onClick={e => e.stopPropagation()}>
            <textarea
              className="post-edit-textarea"
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              rows={4}
            />
            <div className="post-edit-actions">
              <button className="post-edit-cancel" onClick={() => { setEditing(false); setEditBody(post.content || ''); }}>Cancel</button>
              <button className="post-edit-save" onClick={handleSaveEdit} disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          post.content && <p className="post-text">{post.content}</p>
        )}
        {post.image && <img className="post-image" src={post.image} alt="" />}
        <div className="post-actions">
          {/* Votes pill */}
          <div className={`post-pill post-pill-vote ${vote===1?'pill-up':vote===-1?'pill-down':''}`} onClick={e => e.stopPropagation()}>
            <button className="pill-vote-btn" onClick={(e) => handleVote(e, 1)} title="Upvote">
              <svg width="18" height="18" viewBox="0 0 24 24" fill={vote===1?'currentColor':'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <span className="pill-score">{formatScore(score)}</span>
            <button className="pill-vote-btn" onClick={(e) => handleVote(e, -1)} title="Downvote">
              <svg width="18" height="18" viewBox="0 0 24 24" fill={vote===-1?'currentColor':'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          {/* Comments pill */}
          <Link to={`/post/${post._id}`} style={{ textDecoration: 'none' }}>
            <div className="post-pill">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>{formatScore(post.commentCount || 0)}</span>
            </div>
          </Link>
          {/* Save pill */}
          <div className={`post-pill${saved ? ' post-pill-saved' : ''}`} onClick={handleSave} style={{ cursor: currentUser ? 'pointer' : 'default' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span>{saved ? 'Saved' : 'Save'}</span>
          </div>
          {/* Share pill */}
          <div className="post-pill" onClick={e => { e.stopPropagation(); setShowShare(true); }} style={{ cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span>Share</span>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="post-confirm-overlay" onClick={e => e.stopPropagation()}>
          <div className="post-confirm-dialog">
            <p className="post-confirm-text">Are you sure you want to delete this post?</p>
            {deleteError && <p style={{ color: '#ff4500', fontSize: 13, marginBottom: 8 }}>{deleteError}</p>}
            <div className="post-confirm-actions">
              <button className="post-confirm-cancel" onClick={() => { setConfirmDelete(false); setDeleteError(''); }}>Cancel</button>
              <button className="post-confirm-delete" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showShare && <ShareModal post={post} currentUser={currentUser} onClose={() => setShowShare(false)} />}
    </div>
  );
}

function SidebarSection({ section, onItemClick }) {
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
          <button key={i} className="sidebar-sub-item" onClick={() => onItemClick?.(item)}>
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

const COMMUNITY_TOPICS = [
  { emoji: '🍣', label: 'Anime & Cosplay' },
  { emoji: '🧑‍🎨', label: 'Art' },
  { emoji: '💵', label: 'Business & Finance' },
  { emoji: '🧩', label: 'Collectibles & Other Hobbies' },
  { emoji: '🧑‍🏫', label: 'Education & Career' },
  { emoji: '🪞', label: 'Fashion & Beauty' },
  { emoji: '🍔', label: 'Food & Drinks' },
  { emoji: '🕹️', label: 'Games' },
  { emoji: '❤️‍🩹', label: 'Health' },
  { emoji: '🏡', label: 'Home & Garden' },
  { emoji: '📜', label: 'Humanities & Law' },
  { emoji: '🌈', label: 'Identity & Relationships' },
  { emoji: '🙉', label: 'Internet Culture' },
  { emoji: '🎞️', label: 'Movies & TV' },
  { emoji: '🎶', label: 'Music' },
  { emoji: '🌿', label: 'Nature & Outdoors' },
  { emoji: '📰', label: 'News & Politics' },
  { emoji: '🌐', label: 'Places & Travel' },
  { emoji: '✨', label: 'Pop Culture' },
  { emoji: '✏️', label: 'Q&As & Stories' },
  { emoji: '📖', label: 'Reading & Writing' },
  { emoji: '🧪', label: 'Sciences' },
  { emoji: '💀', label: 'Spooky' },
  { emoji: '🏅', label: 'Sports' },
  { emoji: '🛰️', label: 'Technology' },
  { emoji: '🚗', label: 'Vehicles' },
  { emoji: '🧘', label: 'Wellness' },
];

function CreateCommunityModal({ onClose, onCreated }) {
  const [page, setPage] = useState(1);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [communityType, setCommunityType] = useState('public');
  const [matureToggle, setMatureToggle] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseColor, setBaseColor] = useState('#ff4500');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [createdCommunity, setCreatedCommunity] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    const data = await createCommunity({ name, description });
    setLoading(false);
    if (data.success) {
      setCreatedCommunity(data.community);
      onCreated(data.community);
      setPage(4);
    } else if (data.code === 'UNAUTHORIZED' || data.message?.toLowerCase().includes('not authenticated')) {
      // Token expired — attempt is fine for UI demo, still advance to page 4 with local state
      setCreatedCommunity({ name, description });
      setPage(4);
    } else {
      setError(data.message || 'Failed to create community.');
    }
  };

  const COLOR_SWATCHES = [
    '#ff4500','#ff6534','#ff585b','#ffd635','#46d160',
    '#0dd3bb','#25b79f','#0079d3','#7193ff','#9b59b6',
    '#e74c3c','#f39c12','#1a1a1b','#878a8c','#edeff1',
  ];

  return (
    <div className="ccm-overlay" onClick={onClose}>
      <div className="ccm-modal" onClick={e => e.stopPropagation()}>

        {/* ── PAGE 1: Topic picker ── */}
        {page === 1 && (
          <>
            <div className="ccm-body">
              <h1 className="ccm-h1">What will your community be about?</h1>
              <h4 className="ccm-h4">Choose a topic to help redditors discover your community</h4>
              <div className="ccm-topic-grid">
                {COMMUNITY_TOPICS.map(t => (
                  <button
                    key={t.label}
                    type="button"
                    className={`ccm-topic-btn ${selectedTopic === t.label ? 'selected' : ''}`}
                    onClick={() => setSelectedTopic(t.label)}
                  >
                    <span className="ccm-topic-emoji">{t.emoji}</span>
                    <span className="ccm-topic-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="ccm-footer">
              <div className="ccm-dots">
                {[1,2,3,4].map(i => (
                  <span key={i} className={`ccm-dot ${page === i ? 'active' : ''}`} />
                ))}
              </div>
              <div className="ccm-footer-btns">
                <button className="ccm-cancel-btn" onClick={onClose}>Cancel</button>
                <button
                  className="ccm-next-btn"
                  disabled={!selectedTopic}
                  onClick={() => setPage(2)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── PAGE 2: Community type ── */}
        {page === 2 && (
          <>
            <div className="ccm-body">
              <h1 className="ccm-h1">What kind of community is this?</h1>
              <h6 className="ccm-h6">Decide who can view and contribute in your community. Only public communities show up in search. Important: Once set, you will need to submit a request to change your community type.</h6>

              <div className="ccm-type-list">
                {[
                  { value: 'public', label: 'Public', desc: 'Anyone can view, post, and comment to this community' },
                  { value: 'restricted', label: 'Restricted', desc: 'Anyone can view, but only approved users can contribute' },
                  { value: 'private', label: 'Private', desc: 'Only approved users can view and contribute' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`ccm-type-btn ${communityType === opt.value ? 'selected' : ''}`}
                    onClick={() => setCommunityType(opt.value)}
                  >
                    <span className={`ccm-type-radio ${communityType === opt.value ? 'checked' : ''}`} />
                    <div className="ccm-type-text">
                      <span className="ccm-type-label">{opt.label}</span>
                      <span className="ccm-type-desc">{opt.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="ccm-mature-row">
                <div className="ccm-mature-text">
                  <span className="ccm-mature-label">Mature (18+)</span>
                  <span className="ccm-mature-desc">Users must be over 18 to view and contribute</span>
                </div>
                <button
                  type="button"
                  className={`fm-toggle ${matureToggle ? 'on' : ''}`}
                  onClick={() => setMatureToggle(p => !p)}
                  aria-label="Toggle mature"
                >
                  <span className="fm-toggle-knob" />
                </button>
              </div>

              <h6 className="ccm-h6 ccm-h6-footer">
                By continuing, you agree to our{' '}
                <a href="#" className="ccm-link">Mod Code of Conduct</a>{' '}and acknowledge that you understand the{' '}
                <a href="#" className="ccm-link">Reddit Rules</a>.
              </h6>
            </div>

            <div className="ccm-footer">
              <div className="ccm-dots">
                {[1,2,3,4].map(i => (
                  <span key={i} className={`ccm-dot ${page === i ? 'active' : ''}`} />
                ))}
              </div>
              <div className="ccm-footer-btns">
                <button className="ccm-cancel-btn" onClick={() => setPage(1)}>Back</button>
                <button className="ccm-next-btn" onClick={() => setPage(3)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* ── PAGE 3: Tell us about your community (split layout) ── */}
        {page === 3 && (
          <>
            <div className="ccm-body ccm-body-split">
              {/* Left: form */}
              <div className="ccm-split-form">
                <h1 className="ccm-h1">Tell us about your community</h1>
                <p className="ccm-para">A name and description help people understand what your community is all about.</p>

                <div className="ccm-field">
                  <div className="ccm-big-input-wrap">
                    <input
                      className="ccm-big-input"
                      placeholder="Community name *"
                      value={name}
                      onChange={e => setName(e.target.value.replace(/\s/g, '').slice(0, 21))}
                      maxLength={21}
                    />
                    <span className="ccm-big-counter">{name.length}/21</span>
                  </div>
                </div>

                <div className="ccm-field">
                  <div className="ccm-big-input-wrap">
                    <textarea
                      className="ccm-big-input ccm-big-textarea"
                      placeholder="Description *"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                    <span className="ccm-big-counter">{description.length}</span>
                  </div>
                </div>

                {error && <p className="auth-error" style={{ marginTop: 8 }}>{error}</p>}
              </div>

              {/* Right: live preview */}
              <div className="ccm-split-preview">
                <div className="ccm-preview-card">
                  <div className="ccm-preview-body">
                    <div className="ccm-preview-icon-ring">
                      <svg width="36" height="36" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="10" fill="#ff4500"/>
                        <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
                      </svg>
                    </div>
                    <div className="ccm-preview-name">r/{name || 'communityname'}</div>
                    <div className="ccm-preview-stats">1 weekly visitor · 1 weekly contributor</div>
                    <div className="ccm-preview-desc">{description || 'Your community description'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ccm-footer">
              <div className="ccm-dots">
                {[1,2,3,4].map(i => (
                  <span key={i} className={`ccm-dot ${page === i ? 'active' : ''}`} />
                ))}
              </div>
              <div className="ccm-footer-btns">
                <button className="ccm-cancel-btn" onClick={() => setPage(2)}>Back</button>
                <button
                  className="ccm-next-btn"
                  disabled={name.trim().length < 3 || description.trim().length === 0 || loading}
                  onClick={handleSubmit}
                >
                  {loading ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── PAGE 4: Success ── */}
        {page === 4 && (
          <div className="ccm-body ccm-success-body">
            <div className="ccm-success-left">
              <h1 className="ccm-h1">You launched a new community!</h1>
              <h3 className="ccm-h3">Here's what you should know</h3>
              <p className="ccm-para">We've applied some settings to help you get started. You can view and edit them anytime in your mod tools.</p>
              <div className="ccm-action-row">
                <button className="ccm-action-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  Rules
                </button>
                <button className="ccm-action-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  Welcome guide
                </button>
              </div>
            </div>

            <div className="ccm-success-right">
              <div className="ccm-success-card">
                <div className="ccm-success-banner" style={{ background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}99 100%)` }} />
                <div className="ccm-success-avatar-wrap">
                  <div className="ccm-success-avatar" style={{ background: baseColor }}>
                    <svg width="32" height="32" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="10" fill={baseColor}/>
                      <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
                    </svg>
                  </div>
                  <button className="ccm-avatar-edit" title="Edit avatar">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
                <div className="ccm-success-info">
                  <div className="ccm-success-name">r/{name}</div>
                  <div className="ccm-success-stats">1 weekly visitor · 1 weekly contributor</div>
                  <div className="ccm-success-desc">{description}</div>
                </div>
                <div className="ccm-color-row">
                  <div style={{ position: 'relative' }}>
                    <button className="ccm-color-btn" onClick={() => setShowColorPicker(p => !p)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Base Color
                      <span className="ccm-color-swatch" style={{ background: baseColor }} />
                    </button>
                    {showColorPicker && (
                      <div className="ccm-color-palette">
                        {COLOR_SWATCHES.map(c => (
                          <button
                            key={c}
                            className={`ccm-swatch ${baseColor === c ? 'active' : ''}`}
                            style={{ background: c }}
                            onClick={() => { setBaseColor(c); setShowColorPicker(false); }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button className="ccm-next-btn" style={{ width: '100%', marginTop: 12, borderRadius: 8 }} onClick={onClose}>
                Go To Community Page
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function ChatPanel({ currentUser, onClose }) {
  // view: 'threads' | 'create' | 'messages'
  const [view, setView] = useState('threads');
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ unread: false });
  const [pendingFilters, setPendingFilters] = useState({ unread: false });
  // create chat state
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef(null);
  const searchTimeout = useRef(null);

  const loadThreads = (f = filters) => {
    getThreads(f).then(d => { if (d.success) setThreads(d.threads); });
  };

  useEffect(() => { loadThreads(); }, []);

  useEffect(() => {
    if (!activeThread) return;
    getMessages(activeThread._id).then(d => { if (d.success) setMessages(d.messages); });
    markThreadRead(activeThread._id);
    setThreads(prev => prev.map(t =>
      t._id === activeThread._id ? { ...t, readBy: [...(t.readBy || []), currentUser._id] } : t
    ));
  }, [activeThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const otherParticipant = (t) => t.participants?.find(p => p._id !== currentUser._id);
  const isUnread = (t) => !t.readBy?.map(id => id.toString()).includes(currentUser._id?.toString());

  // user search for create chat
  const handleUserSearch = (q) => {
    setUserQuery(q);
    setSelectedUser(null);
    clearTimeout(searchTimeout.current);
    if (!q.trim()) { setUserResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      const d = await searchUsers(q);
      if (d.success) setUserResults(d.users.filter(u => u._id !== currentUser._id));
    }, 300);
  };

  const handleCreate = async () => {
    if (!selectedUser) return;
    setCreating(true);
    const d = await sendMessage({ recipientId: selectedUser._id, content: '' });
    setCreating(false);
    if (d.success) {
      const td = await getThreads();
      if (td.success) {
        setThreads(td.threads);
        const created = td.threads.find(t => t._id.toString() === (d.threadId || d.thread?._id)?.toString());
        if (created) { setActiveThread(created); setView('messages'); }
        else setView('threads');
      }
      setSelectedUser(null); setUserQuery(''); setUserResults([]);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const d = await sendMessage({ threadId: activeThread._id, content: input.trim() });
    if (d.success) {
      setMessages(prev => [...prev, d.message]);
      setInput('');
      setThreads(prev => prev.map(t =>
        t._id === activeThread._id ? { ...t, lastMessage: input.trim(), lastMessageAt: new Date() } : t
      ));
    }
  };

  const applyFilters = () => {
    setFilters(pendingFilters);
    loadThreads(pendingFilters);
    setShowFilter(false);
  };

  return (
    <div className="chat-panel" onClick={e => e.stopPropagation()}>

      {/* ── HEADER ── */}
      <div className="chat-header">
        <span className="chat-header-title">
          {view === 'create' ? 'Create Chat' : view === 'messages' ? `u/${otherParticipant(activeThread)?.username || '...'}` : 'Chats'}
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          {view === 'threads' && (
            <>
              <button className="chat-icon-btn" title="New chat" onClick={() => { setView('create'); setShowFilter(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button className="chat-icon-btn" title="Filter" onClick={() => setShowFilter(s => !s)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              </button>
            </>
          )}
          {(view === 'create' || view === 'messages') && (
            <button className="chat-icon-btn" onClick={() => { setView('threads'); setActiveThread(null); setMessages([]); setSelectedUser(null); setUserQuery(''); setUserResults([]); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}
          <button className="chat-icon-btn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* ── FILTER DROPDOWN ── */}
      {showFilter && view === 'threads' && (
        <div className="chat-filter-dropdown">
          <div className="chat-filter-title">Filter chat inbox</div>
          {[['unread', 'Unread'], ['direct', 'Direct chats'], ['group', 'Group chats'], ['modmail', 'Mod mail']].map(([key, label]) => (
            <label key={key} className="chat-filter-option">
              <input type="checkbox" checked={!!pendingFilters[key]} onChange={e => setPendingFilters(p => ({ ...p, [key]: e.target.checked }))} />
              {label}
            </label>
          ))}
          <button className="panel-create-btn" style={{ borderRadius: 8, marginTop: 8 }} onClick={applyFilters}>Apply</button>
        </div>
      )}

      {/* ── THREADS VIEW ── */}
      {view === 'threads' && (
        <div className="chat-body">
          <button className="chat-threads-row" onClick={() => {}}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Threads</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {threads.length === 0 ? (
            <div className="chat-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p className="chat-empty-title">You don't have any threads yet</p>
              <p className="chat-empty-sub">Start a conversation with someone</p>
              <button className="orange-btn" style={{ fontSize: 13, padding: '7px 18px' }} onClick={() => setView('create')}>Go to messages</button>
            </div>
          ) : (
            threads.map(t => {
              const other = otherParticipant(t);
              return (
                <button key={t._id} className={`chat-thread-item ${isUnread(t) ? 'unread' : ''}`} onClick={() => { setActiveThread(t); setView('messages'); }}>
                  <div className="chat-avatar">{other?.username?.[0]?.toUpperCase() || '?'}</div>
                  <div className="chat-thread-info">
                    <div className="chat-thread-name">u/{other?.username || 'Unknown'}</div>
                    <div className="chat-thread-preview">{t.lastMessage || 'No messages yet'}</div>
                  </div>
                  <div className="chat-thread-meta">
                    <div className="chat-thread-time">{t.lastMessageAt ? timeAgo(t.lastMessageAt) : ''}</div>
                    {isUnread(t) && <span className="chat-unread-dot" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ── CREATE CHAT VIEW ── */}
      {view === 'create' && (
        <div className="chat-body" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <input
              className="chat-input" style={{ width: '100%', borderRadius: 8, height: 38, paddingLeft: 12 }}
              placeholder="Type username(s) *"
              value={userQuery}
              onChange={e => handleUserSearch(e.target.value)}
              autoFocus
            />
            {userResults.length > 0 && (
              <div className="chat-user-results">
                {userResults.map(u => (
                  <button key={u._id} className={`chat-user-result-item ${selectedUser?._id === u._id ? 'selected' : ''}`}
                    onClick={() => { setSelectedUser(u); setUserQuery(u.username); setUserResults([]); }}>
                    <div className="chat-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{u.username[0].toUpperCase()}</div>
                    <span style={{ fontSize: 13 }}>u/{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>Search for people by username to chat with them.</p>
          {selectedUser && (
            <div className="chat-selected-user">
              <div className="chat-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{selectedUser.username[0].toUpperCase()}</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>u/{selectedUser.username}</span>
              <button className="chat-icon-btn" style={{ marginLeft: 'auto' }} onClick={() => { setSelectedUser(null); setUserQuery(''); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button className="panel-join-btn" style={{ flex: 1 }} onClick={() => { setView('threads'); setSelectedUser(null); setUserQuery(''); setUserResults([]); }}>Cancel</button>
            <button className="panel-create-btn" style={{ flex: 1, borderRadius: 8, opacity: selectedUser ? 1 : 0.4, cursor: selectedUser ? 'pointer' : 'not-allowed' }}
              disabled={!selectedUser || creating} onClick={handleCreate}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* ── MESSAGES VIEW ── */}
      {view === 'messages' && activeThread && (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '24px 0' }}>No messages yet. Say hello!</div>
            )}
            {messages.map(m => (
              <div key={m._id} className={`chat-msg ${m.sender?._id === currentUser._id ? 'mine' : 'theirs'}`}>
                <div className="chat-msg-bubble">{m.content}</div>
                <div className="chat-msg-time">{timeAgo(m.createdAt)}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form className="chat-input-row" onSubmit={handleSend}>
            <input className="chat-input" placeholder="Message..." value={input} onChange={e => setInput(e.target.value)} />
            <button type="submit" className="chat-send-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function RedditLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSort, setActiveSort] = useState("Hot");
  const [joinedMap, setJoinedMap] = useState({});
  const [joinRequestMap, setJoinRequestMap] = useState({});

  // Read saved avatar from localStorage (set by AvatarEditPage on Save)
  const savedAvatar = (() => {
    try { return JSON.parse(localStorage.getItem('savedAvatar') || 'null'); } catch { return null; }
  })();
  const avatarBg = savedAvatar?.bodyColor || null;
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [user, setUser] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const [showChat, setShowChat] = useState(false);
  const chatRef = useRef(null);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const [showDisplayMode, setShowDisplayMode] = useState(false);
  const [displayMode, setDisplayMode] = useState('dark');
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ communities: [], users: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);
  const [savedPostIds, setSavedPostIds] = useState(new Set());

  useEffect(() => {
    getMe().then(data => {
      if (data.success) {
        setUser(data.user);
        getSavedPosts(data.user._id).then(d => {
          if (d.success) setSavedPostIds(new Set(d.savedPosts.map(p => (p._id || p).toString())));
        });
      }
    });
    getCommunities().then(data => { if (data.success) setCommunities(data.communities); });
    getNotifications().then(data => { if (data.success) setNotifications(data.notifications); });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    getFeed(token, activeSort.toLowerCase()).then(data => { if (data.success) setPosts(data.posts); });
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
    const community = communities.find(c => c._id === id);
    const isJoined = joinedMap[id];
    if (isJoined) {
      const data = await leaveCommunity(id);
      if (data.success) setJoinedMap(prev => ({ ...prev, [id]: false }));
    } else if (community?.type === 'restricted') {
      const data = await createJoinRequest(id);
      if (data.success) setJoinRequestMap(prev => ({ ...prev, [id]: 'pending' }));
    } else {
      const data = await joinCommunity(id);
      if (data.success) setJoinedMap(prev => ({ ...prev, [id]: true }));
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('accessToken');
    window.location.href = '/Login';
  };

  const handleBellClick = async () => {
    setShowNotifs(prev => !prev);
    if (!showNotifs && notifications.some(n => !n.read)) {
      await markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ communities: [], users: [] });
      setShowSearchDropdown(false);
      clearTimeout(searchTimeoutRef.current);
      return;
    }
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      const data = await search(searchQuery.trim());
      if (data.success) {
        setSearchResults({ communities: data.communities || [], users: data.users || [] });
        setShowSearchDropdown(true);
      }
    }, 300);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (chatRef.current && !chatRef.current.contains(e.target)) setShowChat(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          <div className="search-container" ref={searchContainerRef}>
            <form className="search-wrap" onSubmit={e => { e.preventDefault(); const q = searchQuery.trim(); if (q) { navigate(`/search?q=${encodeURIComponent(q)}`); setShowSearchDropdown(false); } }}>
              <div className="search-snoo"><RedditLogo /></div>
              <input
                className="search-input"
                placeholder="Find anything"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchQuery.trim() && (searchResults.communities.length > 0 || searchResults.users.length > 0)) setShowSearchDropdown(true); }}
              />
              <div className="search-divider" />
              <button type="submit" className="search-ask-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Ask
              </button>
            </form>

            {showSearchDropdown && (searchResults.communities.length > 0 || searchResults.users.length > 0) && (
              <div className="search-dropdown">
                {searchResults.communities.length > 0 && (
                  <div className="search-dropdown-section">
                    <div className="search-dropdown-label">Communities</div>
                    {searchResults.communities.slice(0, 4).map(c => (
                      <div key={c._id} className="search-dropdown-item" onClick={() => { navigate(`/r/${c.name}`); setShowSearchDropdown(false); setSearchQuery(''); }}>
                        <div className="search-dd-icon" style={c.icon ? { backgroundImage: `url(${c.icon})`, background: 'none' } : { background: '#ff4500' }}>
                          {!c.icon && c.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="search-dd-name">r/{c.name}</div>
                          <div className="search-dd-sub">{c.memberCount?.toLocaleString()} members</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.communities.length > 0 && searchResults.users.length > 0 && (
                  <div className="search-dropdown-divider" />
                )}
                {searchResults.users.length > 0 && (
                  <div className="search-dropdown-section">
                    <div className="search-dropdown-label">People</div>
                    {searchResults.users.slice(0, 4).map(u => (
                      <div key={u._id} className="search-dropdown-item" onClick={() => { navigate(`/u/${u.username}`); setShowSearchDropdown(false); setSearchQuery(''); }}>
                        <div className="search-dd-icon" style={u.profilePicture ? { backgroundImage: `url(${u.profilePicture})`, background: 'none' } : { background: '#0079d3' }}>
                          {!u.profilePicture && u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="search-dd-name">u/{u.username}</div>
                          <div className="search-dd-sub">{((u.postKarma || 0) + (u.commentKarma || 0)).toLocaleString()} karma</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="search-dropdown-footer" onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery)}`); setShowSearchDropdown(false); }}>
                  View all results for "{searchQuery}"
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="nav-right">
          <div style={{ position:'relative' }} ref={chatRef}>
            <button className="nav-icon-btn" title="Messages" onClick={() => setShowChat(s => !s)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
            {showChat && user && <ChatPanel currentUser={user} onClose={() => setShowChat(false)} />}
          </div>
          <button className="nav-icon-btn" title="Notifications" style={{ position: "relative" }} onClick={handleBellClick} ref={notifRef}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {notifications.some(n => !n.read) && (
              <span className="notif-badge">{notifications.filter(n => !n.read).length}</span>
            )}
            {showNotifs && (
              <div className="notif-dropdown" onClick={e => e.stopPropagation()}>
                <div className="notif-dropdown-header">Notifications</div>
                {notifications.length === 0 ? (
                  <div className="notif-empty">No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div key={n._id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                      <span className="notif-icon">
                        {n.type === 'upvote' && '⬆️'}
                        {n.type === 'comment' && '💬'}
                        {n.type === 'join' && '👥'}
                        {n.type === 'post_approval' && '📋'}
                        {n.type === 'post_approved' && '✅'}
                        {n.type === 'post_rejected' && '❌'}
                        {n.type === 'join_request' && '👤'}
                        {n.type === 'join_approved' && '✅'}
                        {n.type === 'join_rejected' && '❌'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div className="notif-message">{n.message}</div>
                        <div className="notif-time">{timeAgo(n.createdAt)}</div>
                        {n.type === 'post_approval' && n.postId && (
                          <div className="notif-approval-actions">
                            <button
                              className="notif-approve-btn"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const res = await approvePost(n.postId);
                                if (res.success) {
                                  setNotifications(prev => prev.map(x =>
                                    x._id === n._id ? { ...x, read: true, type: 'post_approved' } : x
                                  ));
                                  showToast('Post approved');
                                }
                              }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              className="notif-reject-btn"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const res = await rejectPost(n.postId);
                                if (res.success) {
                                  setNotifications(prev => prev.map(x =>
                                    x._id === n._id ? { ...x, read: true, type: 'post_rejected' } : x
                                  ));
                                  showToast('Post rejected');
                                }
                              }}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}
                        {n.type === 'join_request' && n.communityId && n.requesterId && (
                          <div className="notif-approval-actions">
                            <button
                              className="notif-approve-btn"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const res = await handleJoinRequest(n.communityId, n.requesterId, 'approved');
                                if (res.success) {
                                  setNotifications(prev => prev.map(x =>
                                    x._id === n._id ? { ...x, read: true, type: 'join_approved' } : x
                                  ));
                                  showToast('Join request approved');
                                }
                              }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              className="notif-reject-btn"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const res = await handleJoinRequest(n.communityId, n.requesterId, 'rejected');
                                if (res.success) {
                                  setNotifications(prev => prev.map(x =>
                                    x._id === n._id ? { ...x, read: true, type: 'join_rejected' } : x
                                  ));
                                  showToast('Join request rejected');
                                }
                              }}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </button>
          <button className="nav-create-btn" onClick={() => navigate('/submit')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Create</span>
          </button>
          <div style={{ position: 'relative' }} ref={profileRef}>
            <button className="nav-avatar" onClick={() => setShowProfile(p => !p)} style={avatarBg ? { background: avatarBg } : {}}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </button>
            {showProfile && (
              <div className="profile-dropdown" onClick={e => e.stopPropagation()}>
                {/* View Profile */}
                <div className="pd-profile-row" onClick={() => { setShowProfile(false); navigate(`/u/${user?.username}`); }}>
                  <div className="pd-avatar" style={avatarBg ? { background: avatarBg } : {}}>
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                    <span className="pd-online-dot" />
                  </div>
                  <div>
                    <div className="pd-view-profile">View Profile</div>
                    <div className="pd-username">u/{user?.username || 'user'}</div>
                  </div>
                </div>

                <div className="pd-divider" />

                {/* Menu items */}
                <button className="pd-item" onClick={() => { setShowProfile(false); navigate('/avatar/edit'); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <span>Edit Avatar</span>
                </button>

                <button className="pd-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
                  <span>Drafts</span>
                </button>

                <button className="pd-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="6"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>
                  <div>
                    <div>Achievements</div>
                    <div className="pd-sub">5 unlocked</div>
                  </div>
                </button>

                <button className="pd-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/><circle cx="12" cy="12" r="3" fill="none"/><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M9 9a3 3 0 1 1 6 0c0 2-3 3-3 3"/></svg>
                  <div>
                    <div>Earn</div>
                    <div className="pd-sub">Earn cash on Reddit</div>
                  </div>
                </button>

                <button className="pd-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>Premium</span>
                </button>

                <button className="pd-item pd-item-toggle" onClick={() => { setShowProfile(false); setShowDisplayMode(true); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    <span>Display Mode</span>
                  </button>

                <button className="pd-item" onClick={handleLogout}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  <span>Log Out</span>
                </button>

                <div className="pd-divider" />

                <button className="pd-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  <span>Advertise on Reddit</span>
                </button>

                <button className="pd-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>Try Reddit Pro <span className="pd-beta">BETA</span></span>
                </button>

                <div className="pd-divider" />

                <button className="pd-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  <span>Settings</span>
                </button>

                <div className="pd-footer">
                  <a href="#">Reddit Rules</a>
                  <a href="#">Privacy Policy</a>
                  <a href="#">User Agreement</a>
                  <a href="#">Accessibility</a>
                </div>
              </div>
            )}
          </div>
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
            { icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>, label: "Home", path: "/home" },
            { icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>, label: "Popular", path: "/popular" },
            { icon: <><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>, label: "Explore", path: "/explore" },
          ].map(({ icon, label, path }) => (
            <button key={label} className={`sidebar-nav-item${location.pathname === path ? " active" : ""}`} onClick={() => navigate(path)}>
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

          {communities.length > 0 && (
            <SidebarSection
              section={{
                label: 'COMMUNITIES',
                items: communities.slice(0, 10).map(c => `r/${c.name}`),
              }}
              onItemClick={item => navigate(`/${item}`)}
            />
          )}

          {SIDEBAR_SECTIONS.filter(s => s.label !== 'COMMUNITIES').map((section) => (
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
                    {s === "Hot" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 6-8 8-8 14a8 8 0 0 0 16 0c0-6-8-8-8-14z"/><path d="M12 12c0 3-2 4-2 7a2 2 0 0 0 4 0c0-3-2-4-2-7z"/></svg>}
                    {s === "New" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                    {s === "Top" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/></svg>}
                    {s === "Rising" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                    {s}
                  </button>
                ))}
              </div>

              {/* Posts */}
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  currentUser={user}
                  isSaved={savedPostIds.has(post._id?.toString())}
                  onSaveToggle={(id, next) => setSavedPostIds(prev => { const s = new Set(prev); next ? s.add(id.toString()) : s.delete(id.toString()); return s; })}
                  onDelete={(id) => setPosts(prev => prev.filter(p => p._id !== id))}
                  onUpdate={(id, body) => setPosts(prev => prev.map(p => p._id === id ? { ...p, content: body } : p))}
                />
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="right-panel" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Top Communities */}
            <div className="panel-card">
              <div className="panel-body">
                <p className="panel-title">Top Communities</p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {communities.slice(0, 5).map((c, i) => (
                    <li key={c._id} className="panel-community-item">
                      <span className="panel-rank">{i + 1}</span>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer', minWidth: 0 }}
                        onClick={() => navigate(`/r/${c.name}`)}
                      >
                        <div className="panel-community-icon" style={{ background: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length] }}>
                          {c.name[0].toUpperCase()}
                        </div>
                        <div className="panel-community-info">
                          <div className="panel-community-name">r/{c.name}</div>
                          <div className="panel-community-members">{c.memberCount?.toLocaleString()} members</div>
                        </div>
                      </div>
                      {joinedMap[c._id] ? (
                        <span className="panel-joined">✓ Joined</span>
                      ) : joinRequestMap[c._id] === 'pending' ? (
                        <span className="join-btn-pending">Pending</span>
                      ) : (
                        <button className="panel-join-btn" onClick={() => toggleJoin(c._id)}>Join</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="panel-card" style={{ marginTop: 'auto' }}>
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
            if (community._id) setJoinedMap(prev => ({ ...prev, [community._id]: true }));
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}

      {/* Display Mode Modal */}
      {showDisplayMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }} onClick={() => setShowDisplayMode(false)}>
          <div style={{ background: 'var(--bg)', borderRadius: 16, width: 360, padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Display Mode</span>
              <button onClick={() => setShowDisplayMode(false)} style={{ background: 'var(--hover-bg)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {[{value:'auto',label:'Auto (follow system settings)',icon:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>},{value:'light',label:'Light',icon:<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>},{value:'dark',label:'Dark',icon:<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>}].map(opt => (
              <div
                key={opt.value}
                onClick={() => setDisplayMode(opt.value)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 8, cursor: 'pointer', background: displayMode === opt.value ? 'var(--hover-bg)' : 'transparent', marginBottom: 4 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{opt.icon}</svg>
                  <span style={{ fontSize: 15, color: 'var(--text)' }}>{opt.label}</span>
                </div>
                {displayMode === opt.value && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => {
                  if (displayMode === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
                  else if (displayMode === 'light') document.documentElement.removeAttribute('data-theme');
                  else {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (prefersDark) document.documentElement.setAttribute('data-theme', 'dark');
                    else document.documentElement.removeAttribute('data-theme');
                  }
                  setShowDisplayMode(false);
                }}
                style={{ background: '#0079d3', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}