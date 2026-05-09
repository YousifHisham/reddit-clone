import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMe, logout } from '../api/auth';
import { getCommunities, handleJoinRequest } from '../api/communities';
import { getNotifications, markNotificationsRead, approvePost, rejectPost } from '../api/notifications';
import { getThreads, getMessages, sendMessage, markThreadRead, searchUsers } from '../api/messages';
import { search } from '../api/search';
import CreateCommunityModal from './CreateCommunityModal';

const RedditLogo = () => (
  <svg width="32" height="32" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="10" fill="#ff4500"/>
    <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
  </svg>
);

const COMMUNITY_COLORS = ['#ff4500','#0079d3','#46d160','#9b59b6','#e74c3c','#f39c12'];

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ChatPanel({ currentUser, onClose, showToast }) {
  const [view, setView] = useState('threads');
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ unread: false });
  const [pendingFilters, setPendingFilters] = useState({ unread: false });
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

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [communities, setCommunities] = useState([]);
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  // Chat
  const [showChat, setShowChat] = useState(false);
  const chatRef = useRef(null);

  // Toast
  const [toast, setToast] = useState('');

  // Search
  const [searchResults, setSearchResults] = useState({ communities: [], users: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  const menuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      getMe().then(d => { if (d.success) setCurrentUser(d.user); });
      getNotifications().then(d => { if (d.success) setNotifications(d.notifications); });
    }
    getCommunities().then(d => { if (d.success) setCommunities(d.communities.slice(0, 10)); });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (chatRef.current && !chatRef.current.contains(e.target)) setShowChat(false);
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      setShowSearchDropdown(false);
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('accessToken');
    navigate('/Login');
  };

  const handleBellClick = async () => {
    setShowNotifs(prev => !prev);
    if (!showNotifs && notifications.some(n => !n.read)) {
      await markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const navItems = [
    { label: 'Home', path: '/home', icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
    { label: 'Popular', path: '/popular', icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> },
    { label: 'Explore', path: '/explore', icon: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></> },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

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
          <div className="search-container" ref={searchContainerRef}>
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
                onFocus={() => {
                  if (searchQuery.trim() && (searchResults.communities.length > 0 || searchResults.users.length > 0))
                    setShowSearchDropdown(true);
                }}
              />
              <div className="search-divider" />
              <button type="submit" className="search-ask-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
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
          {/* Chat button */}
          <div style={{ position: 'relative' }} ref={chatRef}>
            <button className="nav-icon-btn" title="Messages" onClick={() => setShowChat(s => !s)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
            {showChat && currentUser && (
              <ChatPanel currentUser={currentUser} onClose={() => setShowChat(false)} showToast={showToast} />
            )}
          </div>

          {/* Notifications button */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button className="nav-icon-btn" title="Notifications" style={{ position: 'relative' }} onClick={handleBellClick}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount}</span>
              )}
            </button>
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
                            <button className="notif-approve-btn" onClick={async (e) => {
                              e.stopPropagation();
                              const res = await approvePost(n.postId);
                              if (res.success) {
                                setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true, type: 'post_approved' } : x));
                                showToast('Post approved');
                              }
                            }}>✅ Approve</button>
                            <button className="notif-reject-btn" onClick={async (e) => {
                              e.stopPropagation();
                              const res = await rejectPost(n.postId);
                              if (res.success) {
                                setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true, type: 'post_rejected' } : x));
                                showToast('Post rejected');
                              }
                            }}>❌ Reject</button>
                          </div>
                        )}
                        {n.type === 'join_request' && n.communityId && n.requesterId && (
                          <div className="notif-approval-actions">
                            <button className="notif-approve-btn" onClick={async (e) => {
                              e.stopPropagation();
                              const res = await handleJoinRequest(n.communityId, n.requesterId, 'approved');
                              if (res.success) {
                                setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true, type: 'join_approved' } : x));
                                showToast('Join request approved');
                              }
                            }}>✅ Approve</button>
                            <button className="notif-reject-btn" onClick={async (e) => {
                              e.stopPropagation();
                              const res = await handleJoinRequest(n.communityId, n.requesterId, 'rejected');
                              if (res.success) {
                                setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true, type: 'join_rejected' } : x));
                                showToast('Join request rejected');
                              }
                            }}>❌ Reject</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

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
                  <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }} className="post-dropdown-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    Settings
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

          <button className="sidebar-nav-item" onClick={() => setShowCreateCommunity(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <span>Start a Community</span>
          </button>

          <hr className="sidebar-divider" />

          {communities.length > 0 && (
            <>
              <button className="sidebar-section-header" onClick={() => setCommunitiesOpen(o => !o)}>
                <span>COMMUNITIES</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: communitiesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div className="sidebar-section-items" style={{ maxHeight: communitiesOpen ? '600px' : '0', overflow: 'hidden', transition: 'max-height 0.2s' }}>
                {communities.map((c, i) => (
                  <button key={c._id} className="sidebar-sub-item" onClick={() => navigate(`/r/${c.name}`)}>
                    <span className="community-dot" style={{ background: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length] }}>
                      {c.name[0].toUpperCase()}
                    </span>
                    <span>r/{c.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>

      {showCreateCommunity && (
        <CreateCommunityModal
          onClose={() => setShowCreateCommunity(false)}
          onCreated={c => { setShowCreateCommunity(false); navigate(`/r/${c.name}`); }}
        />
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

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
