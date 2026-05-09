import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMe, logout } from '../api/auth';
import { createPost, saveDraft } from '../api/posts';
import { getCommunities, getCommunityFlairs } from '../api/communities';
import { getNotifications, markNotificationsRead } from '../api/notifications';

const COMMUNITY_COLORS = ['#ff4500','#0079d3','#46d160','#9b59b6','#e74c3c','#f39c12'];

const RedditLogo = () => (
  <svg width="32" height="32" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="10" fill="#ff4500"/>
    <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
  </svg>
);

const TABS = ['Text', 'Images & Video', 'Link', 'Poll'];

const TOOLBAR_GROUPS = [
  [
    { label: 'B', title: 'Bold', cmd: 'bold', style: { fontWeight: 700 } },
    { label: 'I', title: 'Italic', cmd: 'italic', style: { fontStyle: 'italic' } },
    { label: 'S', title: 'Strikethrough', cmd: 'strikeThrough', style: { textDecoration: 'line-through' } },
    { label: 'X²', title: 'Superscript', cmd: 'superscript' },
  ],
  [
    { label: 'T', title: 'Heading', cmd: 'formatBlock', val: 'h3', style: { fontWeight: 700, fontSize: 15 } },
    { label: '🔗', title: 'Link', cmd: 'createLink' },
    { label: '🖼', title: 'Image', cmd: 'insertImage' },
    { label: '😊', title: 'Emoji', cmd: null },
  ],
  [
    { label: '•', title: 'Bullet list', cmd: 'insertUnorderedList' },
    { label: '1.', title: 'Numbered list', cmd: 'insertOrderedList' },
  ],
  [
    { label: '</>', title: 'Code block', cmd: 'formatBlock', val: 'pre' },
    { label: '❝❝', title: 'Blockquote', cmd: 'formatBlock', val: 'blockquote' },
    { label: '👁', title: 'Spoiler', cmd: null },
    { label: '···', title: 'More options', cmd: null },
  ],
];

function RichToolbar({ editorRef }) {
  const exec = (cmd, val) => {
    if (!cmd) return;
    if (cmd === 'createLink') {
      const url = prompt('Enter URL:');
      if (url) document.execCommand('createLink', false, url);
    } else if (cmd === 'insertImage') {
      const url = prompt('Enter image URL:');
      if (url) document.execCommand('insertImage', false, url);
    } else {
      document.execCommand(cmd, false, val || null);
    }
    editorRef.current?.focus();
  };

  return (
    <div className="sp-toolbar">
      {TOOLBAR_GROUPS.map((group, gi) => (
        <span key={gi} className="sp-toolbar-group">
          {group.map(btn => (
            <button
              key={btn.label}
              type="button"
              title={btn.title}
              className="sp-toolbar-btn"
              style={btn.style}
              onMouseDown={e => { e.preventDefault(); exec(btn.cmd, btn.val); }}
            >
              {btn.label}
            </button>
          ))}
        </span>
      ))}
    </div>
  );
}

function CommunitySelector({ communities, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="sp-community-selector" ref={ref}>
      <button type="button" className="sp-community-btn" onClick={() => setOpen(o => !o)}>
        {selected ? (
          <>
            <span className="sp-community-icon" style={{ background: COMMUNITY_COLORS[selected.name.charCodeAt(0) % COMMUNITY_COLORS.length] }}>
              {selected.name[0].toUpperCase()}
            </span>
            <span className="sp-community-btn-name">r/{selected.name}</span>
          </>
        ) : (
          <>
            <RedditLogo />
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>Select a community</span>
          </>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 'auto', color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="sp-community-dropdown">
          <div className="sp-community-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="sp-community-search"
              placeholder="Search communities"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)' }}>No communities found</div>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c._id}
                type="button"
                className="sp-community-option"
                onClick={() => { onSelect(c); setOpen(false); setQuery(''); }}
              >
                <span className="sp-community-icon" style={{ background: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length] }}>
                  {c.name[0].toUpperCase()}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>r/{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.memberCount?.toLocaleString() || 0} members</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const SIDEBAR_SECTIONS = [
  { label: 'GAMES ON REDDIT', items: ['r/gaming', 'r/pcgaming', 'r/indiegaming'] },
  { label: 'CUSTOM FEEDS', items: ['+ Create Custom Feed'] },
  { label: 'RECENT', items: ['r/programming', 'r/worldnews'] },
  { label: 'COMMUNITIES', items: ['r/technology', 'r/science', 'r/gaming', 'r/programming'] },
  { label: 'RESOURCES', items: ['Reddit Help', 'Reddit Premium', 'Advertise'] },
];

function SidebarSection({ section }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="sidebar-section-header" onClick={() => setOpen(!open)}>
        <span>{section.label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div className="sidebar-section-items" style={{ maxHeight: open ? '500px' : '0' }}>
        {section.items.map((item, i) => (
          <button key={i} className="sidebar-sub-item">
            <span className="community-dot" style={{ background: ['#ff4500','#0079d3','#46d160','#9b59b6','#e74c3c','#f39c12'][i % 6] }}>
              {item[0] === 'r' ? item[2]?.toUpperCase() : '+'}
            </span>
            <span>{item}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SubmitPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [activeTab, setActiveTab] = useState('Text');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const editorRef = useRef(null);

  // flair + tags state
  const [showFlairModal, setShowFlairModal] = useState(false);
  const [communityFlairs, setCommunityFlairs] = useState([]);
  const [flairSearch, setFlairSearch] = useState('');
  const [selectedFlair, setSelectedFlair] = useState(null);
  const [pendingFlair, setPendingFlair] = useState(null);
  const [nsfwToggle, setNsfwToggle] = useState(false);
  const [brandToggle, setBrandToggle] = useState(false);
  const [pendingNsfw, setPendingNsfw] = useState(false);
  const [pendingBrand, setPendingBrand] = useState(false);
  const [showAllFlairs, setShowAllFlairs] = useState(false);

  const canPost = title.trim().length > 0 && selectedCommunity;

  useEffect(() => {
    getMe().then(d => { if (d.success) setUser(d.user); else navigate('/Login'); });
    getCommunities().then(d => {
      if (d.success) {
        setCommunities(d.communities);
        const preselect = searchParams.get('community');
        if (preselect) {
          const match = d.communities.find(c => c.name === preselect.toLowerCase());
          if (match) setSelectedCommunity(match);
        }
      }
    });
    getNotifications().then(d => { if (d.success) setNotifications(d.notifications); });
  }, []);

  useEffect(() => {
    if (!selectedCommunity) { setCommunityFlairs([]); return; }
    getCommunityFlairs(selectedCommunity._id).then(d => {
      if (d.success) setCommunityFlairs(d.flairs);
    });
    // reset flair when community changes
    setSelectedFlair(null);
    setPendingFlair(null);
  }, [selectedCommunity]);

  useEffect(() => {
    const handler = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMediaChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const getEditorContent = () => editorRef.current?.innerHTML || '';

  const handlePost = async () => {
    if (!canPost) return;
    setError('');
    setLoading(true);
    const data = {
      title: title.trim(),
      community: selectedCommunity._id,
      type: activeTab,
      content: activeTab === 'Text' ? getEditorContent() : '',
      url: activeTab === 'Link' ? url : '',
      image: activeTab === 'Images & Video' ? mediaFile : null,
      flair: selectedFlair?.name || '',
      flairColor: selectedFlair?.color || '',
      nsfw: nsfwToggle,
    };
    const res = await createPost(data);
    setLoading(false);
    if (res.success) navigate('/home');
    else setError(res.message || 'Failed to create post.');
  };

  const handleDraft = async () => {
    setError('');
    setLoading(true);
    const data = {
      title: title.trim(),
      community: selectedCommunity?._id || '',
      type: activeTab,
      content: activeTab === 'Text' ? getEditorContent() : '',
      url: activeTab === 'Link' ? url : '',
      image: activeTab === 'Images & Video' ? mediaFile : null,
    };
    const res = await saveDraft(data);
    setLoading(false);
    if (res.success) navigate('/home');
    else setError(res.message || 'Failed to save draft.');
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('accessToken');
    navigate('/Login');
  };

  const handleBellClick = async () => {
    setShowNotifs(p => !p);
    if (!showNotifs && notifications.some(n => !n.read)) {
      await markNotificationsRead();
      setNotifications(p => p.map(n => ({ ...n, read: true })));
    }
  };

  return (
    <>
      {/* Navbar */}
      <header className="nav">
        <div className="nav-left">
          <div className="nav-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
            <RedditLogo />
            <span className="nav-logo-text">reddit</span>
          </div>
        </div>
        <div className="nav-center">
          <div className="search-wrap">
            <div className="search-snoo"><RedditLogo /></div>
            <input className="search-input" placeholder="Find anything" />
            <div className="search-divider" />
            <button className="search-ask-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Ask
            </button>
          </div>
        </div>
        <div className="nav-right">
          <button className="nav-icon-btn" title="Messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button className="nav-icon-btn" title="Notifications" style={{ position: 'relative' }} onClick={handleBellClick} ref={notifRef}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {notifications.some(n => !n.read) && (
              <span className="notif-badge">{notifications.filter(n => !n.read).length}</span>
            )}
            {showNotifs && (
              <div className="notif-dropdown" onClick={e => e.stopPropagation()}>
                <div className="notif-dropdown-header">Notifications</div>
                {notifications.length === 0
                  ? <div className="notif-empty">No notifications yet</div>
                  : notifications.map(n => (
                    <div key={n._id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                      <span className="notif-icon">
                        {n.type === 'upvote' && '⬆️'}{n.type === 'comment' && '💬'}{n.type === 'join' && '👥'}
                        {n.type === 'post_approval' && '📋'}{n.type === 'post_approved' && '✅'}{n.type === 'post_rejected' && '❌'}
                      </span>
                      <div>
                        <div className="notif-message">{n.message}</div>
                        <div className="notif-time">{n.createdAt}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </button>
          <button className="nav-create-btn" onClick={() => navigate('/submit')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Create</span>
          </button>
          <button className="nav-avatar" onClick={handleLogout} title="Logout">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </button>
        </div>
      </header>

      {/* Sidebar toggle bubble */}
      <button
        className={`sidebar-bubble ${sidebarOpen ? '' : 'closed'}`}
        onClick={() => setSidebarOpen(o => !o)}
        title="Toggle sidebar"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {sidebarOpen ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
        </svg>
      </button>

      {/* Sidebar */}
      <nav className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-inner">
          {[
            { icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>, label: 'Home' },
            { icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>, label: 'Popular' },
            { icon: <><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>, label: 'Explore' },
          ].map(({ icon, label }) => (
            <button key={label} className="sidebar-nav-item" onClick={() => label === 'Home' && navigate('/home')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
              <span>{label}</span>
            </button>
          ))}
          <hr className="sidebar-divider" />
          {SIDEBAR_SECTIONS.map(section => <SidebarSection key={section.label} section={section} />)}
        </div>
      </nav>

      <div
        className={`main ${sidebarOpen ? '' : 'sidebar-closed'}`}
        style={{ marginLeft: sidebarOpen ? '270px' : '0', paddingTop: 'calc(var(--nav-h) + 20px)' }}
      >
        <div style={{ width: '100%' }}>
          {/* Page header */}
          <div className="sp-page-header">
            <h1 className="sp-page-title">Create post</h1>
            <button className="sp-drafts-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Drafts
            </button>
          </div>

          {/* Community selector */}
          <CommunitySelector
            communities={communities}
            selected={selectedCommunity}
            onSelect={setSelectedCommunity}
          />

          {/* Post form card */}
          <div className="sp-card">
              {/* Tabs */}
              <div className="sp-tabs">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    type="button"
                    className={`sp-tab ${activeTab === tab ? 'active' : ''} ${tab === 'Poll' ? 'disabled' : ''}`}
                    onClick={() => tab !== 'Poll' && setActiveTab(tab)}
                    disabled={tab === 'Poll'}
                  >
                    {tab === 'Text' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>}
                    {tab === 'Images & Video' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
                    {tab === 'Link' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
                    {tab === 'Poll' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                    {tab}
                  </button>
                ))}
              </div>

              <div className="sp-form">
                {/* Title (all tabs) */}
                <div className="sp-title-wrap">
                  <input
                    className="sp-title-input"
                    placeholder="Title *"
                    value={title}
                    onChange={e => setTitle(e.target.value.slice(0, 300))}
                    maxLength={300}
                  />
                  <span className="sp-char-count">{title.length}/300</span>
                </div>

                {/* Flair + tags button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="sp-tag-pill" onClick={() => {
                    setPendingFlair(selectedFlair);
                    setPendingNsfw(nsfwToggle);
                    setPendingBrand(brandToggle);
                    setFlairSearch('');
                    setShowAllFlairs(false);
                    setShowFlairModal(true);
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add flair and tags
                  </button>
                  {selectedFlair && (
                    <span className="sp-selected-flair" style={{ background: selectedFlair.color || '#0079d3' }}>
                      {selectedFlair.name}
                      <button type="button" className="sp-flair-remove" onClick={() => setSelectedFlair(null)}>×</button>
                    </span>
                  )}
                  {nsfwToggle && (
                    <span className="sp-selected-flair" style={{ background: '#ff4500' }}>
                      NSFW
                      <button type="button" className="sp-flair-remove" onClick={() => setNsfwToggle(false)}>×</button>
                    </span>
                  )}
                </div>

                {/* Text tab */}
                {activeTab === 'Text' && (
                  <div className="sp-editor-wrap">
                    <RichToolbar editorRef={editorRef} />
                    <div
                      ref={editorRef}
                      className="sp-editor"
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="Body text (optional)"
                    />
                  </div>
                )}

                {/* Images & Video tab */}
                {activeTab === 'Images & Video' && (
                  <div className="sp-upload-area" onClick={() => document.getElementById('sp-file-input').click()}>
                    <input
                      id="sp-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,video/mp4"
                      style={{ display: 'none' }}
                      onChange={handleMediaChange}
                    />
                    {mediaPreview ? (
                      mediaFile?.type.startsWith('video') ? (
                        <video src={mediaPreview} controls style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 4 }} />
                      ) : (
                        <img src={mediaPreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 4 }} />
                      )
                    ) : (
                      <>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '8px 0 4px' }}>Upload image or video</p>
                        <p style={{ fontSize: 12, color: 'var(--muted)' }}>jpg, png, gif, mp4</p>
                      </>
                    )}
                  </div>
                )}

                {/* Link tab */}
                {activeTab === 'Link' && (
                  <input
                    className="sp-title-input"
                    placeholder="URL *"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    type="url"
                  />
                )}

                {error && <p className="auth-error">{error}</p>}

                {/* Action buttons */}
                <div className="sp-actions">
                  <button type="button" className="sp-draft-btn" onClick={handleDraft} disabled={loading}>
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className={`sp-post-btn ${canPost ? 'active' : ''}`}
                    onClick={handlePost}
                    disabled={!canPost || loading}
                  >
                    {loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
          </div>
        </div>
      </div>
      {/* Flair + Tags Modal */}
      {showFlairModal && (
        <div className="fm-overlay" onClick={() => setShowFlairModal(false)}>
          <div className="fm-modal" onClick={e => e.stopPropagation()}>
            <div className="fm-header">
              <span className="fm-title">Add flair and tags</span>
              <button className="fm-close" onClick={() => setShowFlairModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="fm-body">
              {/* Flair section */}
              <div className="fm-section">
                <div className="fm-section-title">
                  {selectedCommunity ? `r/${selectedCommunity.name} flair` : 'Flair'}
                  <span style={{ color: '#ff4500' }}> *</span>
                </div>
                <div className="fm-search-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="fm-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    className="fm-search"
                    placeholder="Search"
                    value={flairSearch}
                    onChange={e => setFlairSearch(e.target.value)}
                  />
                </div>
                <div className="fm-flair-list">
                  {/* No flair option */}
                  <label className="fm-flair-option">
                    <input
                      type="radio"
                      name="flair"
                      checked={pendingFlair === null}
                      onChange={() => setPendingFlair(null)}
                    />
                    <span className="fm-flair-chip" style={{ background: '#edeff1', color: '#1a1a1b' }}>No flair</span>
                  </label>
                  {communityFlairs
                    .filter(f => f.name.toLowerCase().includes(flairSearch.toLowerCase()))
                    .slice(0, showAllFlairs ? undefined : 5)
                    .map((f, i) => (
                      <label key={i} className="fm-flair-option">
                        <input
                          type="radio"
                          name="flair"
                          checked={pendingFlair?._id === f._id || pendingFlair?.name === f.name}
                          onChange={() => setPendingFlair(f)}
                        />
                        <span className="fm-flair-chip" style={{ background: f.color || '#0079d3', color: '#fff' }}>{f.name}</span>
                      </label>
                    ))
                  }
                  {communityFlairs.length > 5 && !showAllFlairs && (
                    <button type="button" className="fm-view-all" onClick={() => setShowAllFlairs(true)}>View all flairs</button>
                  )}
                  {communityFlairs.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>No flairs available for this community.</p>
                  )}
                </div>
              </div>

              {/* Tags section */}
              <div className="fm-section">
                <div className="fm-section-title">Tags</div>
                <div className="fm-tag-row">
                  <span className="fm-tag-icon">&#x1F51E;</span>
                  <div className="fm-tag-info">
                    <div className="fm-tag-label">Not Safe For Work (NSFW)</div>
                    <div className="fm-tag-sub">Contains mature or adult content</div>
                  </div>
                  <button
                    type="button"
                    className={`fm-toggle ${pendingNsfw ? 'on' : ''}`}
                    onClick={() => setPendingNsfw(p => !p)}
                    aria-label="Toggle NSFW"
                  >
                    <span className="fm-toggle-knob" />
                  </button>
                </div>
                <div className="fm-tag-row">
                  <span className="fm-tag-icon">&#x1F4E2;</span>
                  <div className="fm-tag-info">
                    <div className="fm-tag-label">Brand affiliate</div>
                    <div className="fm-tag-sub">Made for a brand or business</div>
                  </div>
                  <button
                    type="button"
                    className={`fm-toggle ${pendingBrand ? 'on' : ''}`}
                    onClick={() => setPendingBrand(p => !p)}
                    aria-label="Toggle Brand affiliate"
                  >
                    <span className="fm-toggle-knob" />
                  </button>
                </div>
              </div>
            </div>

            <div className="fm-footer">
              <button type="button" className="fm-cancel" onClick={() => setShowFlairModal(false)}>Cancel</button>
              <button
                type="button"
                className={`fm-add ${pendingFlair !== null ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFlair(pendingFlair);
                  setNsfwToggle(pendingNsfw);
                  setBrandToggle(pendingBrand);
                  setShowFlairModal(false);
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
