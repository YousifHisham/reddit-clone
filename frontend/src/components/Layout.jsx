import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, logout } from '../api/auth';

const RedditLogo = () => (
  <svg width="32" height="32" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="10" fill="#ff4500"/>
    <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
  </svg>
);

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) getMe().then(d => { if (d.success) setCurrentUser(d.user); });
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

  return (
    <>
      <header className="nav">
        <div className="nav-left">
          <div className="nav-logo" onClick={() => navigate('/home')}>
            <RedditLogo />
            <span className="nav-logo-text">reddit</span>
          </div>
        </div>

        <div className="nav-center">
          <form onSubmit={handleSearch} className="search-wrap">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              className="search-input"
              placeholder="Search Reddit"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="nav-right">
          {currentUser ? (
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button className="nav-avatar" onClick={() => setUserMenuOpen(o => !o)} title={currentUser.username}>
                {currentUser.username[0].toUpperCase()}
              </button>
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 4,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 150, minWidth: 200, overflow: 'hidden',
                }}>
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate(`/u/${currentUser.username}`); }}
                    className="post-dropdown-item"
                  >
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

      <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: '#dae0e6' }}>
        {children}
      </div>
    </>
  );
}
