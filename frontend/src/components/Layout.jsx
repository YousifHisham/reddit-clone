import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMe, logout } from '../api/auth';
import { getCommunities } from '../api/communities';

const RedditLogo = () => (
  <svg width="32" height="32" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="10" fill="#ff4500"/>
    <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
  </svg>
);

const COMMUNITY_COLORS = ['#ff4500','#0079d3','#46d160','#9b59b6','#e74c3c','#f39c12'];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [communities, setCommunities] = useState([]);
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const menuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) getMe().then(d => { if (d.success) setCurrentUser(d.user); });
    getCommunities().then(d => { if (d.success) setCommunities(d.communities.slice(0, 5)); });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('accessToken');
    navigate('/Login');
  };

  const navItems = [
    { label: 'Home', path: '/home', icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
    { label: 'Popular', path: '/popular', icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> },
    { label: 'Explore', path: '/search', icon: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></> },
  ];

  return (
    <>
      {/* Navbar */}
      <header className="nav">
        <div className="nav-left">
          <div className="nav-logo" onClick={() => navigate('/home')}>
            <RedditLogo />
            <span className="nav-logo-text">reddit</span>
          </div>
        </div>

        <div className="nav-center">
          <form onSubmit={handleSearch} className="search-wrap">
            <div className="search-snoo">
              <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
                <circle cx="10" cy="10" r="10" fill="#FF4500" />
                <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 .14-.53l-2.38-.5a.27.27 0 0 0-.32.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .57-1.37zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.79 3.58 3.58 0 0 1-2.85-.79.19.19 0 0 1 .27-.27 3.23 3.23 0 0 0 2.58.65 3.23 3.23 0 0 0 2.58-.65.19.19 0 0 1 .27.27zm-.17-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white" />
              </svg>
            </div>
            <input
              className="search-input"
              placeholder="Find anything"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="search-divider" />
            <button type="button" className="search-ask-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Ask
            </button>
          </form>
        </div>

        <div className="nav-right">
          <button className="nav-icon-btn" title="Chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button className="nav-icon-btn" title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          <button className="nav-create-btn" onClick={() => navigate('/submit')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Create</span>
          </button>
          {currentUser ? (
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button className="nav-avatar" onClick={() => setUserMenuOpen(o => !o)} title={currentUser.username}>
                {currentUser.username[0].toUpperCase()}
              </button>
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 150, minWidth: 200, overflow: 'hidden',
                }}>
                  <button onClick={() => { setUserMenuOpen(false); navigate(`/u/${currentUser.username}`); }} className="post-dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    u/{currentUser.username}
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)' }} />
                  <button onClick={handleLogout} className="post-dropdown-item post-dropdown-delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="nav-create-btn" onClick={() => navigate('/Login')}>Log In</button>
          )}
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
          {navItems.map(({ label, path, icon }) => (
            <button
              key={label}
              className={`sidebar-nav-item ${location.pathname === path ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
              <span>{label}</span>
            </button>
          ))}

          <hr className="sidebar-divider" />

          {/* Communities section */}
          <button className="sidebar-section-header" onClick={() => setCommunitiesOpen(o => !o)}>
            <span>COMMUNITIES</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: communitiesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div className="sidebar-section-items" style={{ maxHeight: communitiesOpen ? '500px' : '0' }}>
            <button className="sidebar-sub-item" onClick={() => navigate('/home')}>
              <span className="community-dot" style={{ background: '#ff4500', fontSize: 14 }}>+</span>
              <span>Create Community</span>
            </button>
            {communities.map((c, i) => (
              <button key={c._id} className="sidebar-sub-item" onClick={() => navigate(`/r/${c.name}`)}>
                <span className="community-dot" style={{ background: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length] }}>
                  {c.name[0].toUpperCase()}
                </span>
                <span>r/{c.name}</span>
              </button>
            ))}
          </div>

          <hr className="sidebar-divider" />

          {/* Resources */}
          <button className="sidebar-section-header">
            <span>RESOURCES</span>
          </button>
          {['Help', 'About Reddit'].map(item => (
            <button key={item} className="sidebar-sub-item">
              <span>{item}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <div
        style={{
          paddingTop: 'var(--nav-h)',
          minHeight: '100vh',
          background: 'var(--bg-page)',
          marginLeft: sidebarOpen ? '270px' : '0',
          transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {children}
      </div>
    </>
  );
}
