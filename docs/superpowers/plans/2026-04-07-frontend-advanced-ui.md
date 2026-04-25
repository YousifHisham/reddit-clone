# Frontend Advanced UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build user profile, search, real-time chat, notifications, settings, dark mode toggle, and full mobile responsive layout including bottom nav bar.

**Architecture:** All pages follow same layout shell (Navbar + LeftSidebar + main + optional right sidebar). Chat uses Socket.io client. Notifications use Socket.io + Firebase FCM service worker. Mobile layout switches to bottom nav bar via Tailwind breakpoints.

**Tech Stack:** React 18, React Router, Tailwind CSS, Socket.io-client, Firebase SDK, Vitest, React Testing Library

**Prerequisite:** `frontend-core-ui` plan complete.

---

## File Structure

```
frontend/src/
├── features/
│   ├── users/
│   │   ├── api.js
│   │   └── components/
│   │       └── EditProfileModal.jsx
│   ├── chat/
│   │   ├── socket.js           # Socket.io client instance
│   │   └── api.js
│   └── notifications/
│       ├── api.js
│       ├── firebase.js         # FCM setup + service worker registration
│       └── components/
│           └── NotificationItem.jsx
├── components/
│   └── BottomNav.jsx           # mobile bottom navigation
└── pages/
    ├── ProfilePage.jsx
    ├── SearchPage.jsx
    ├── ChatPage.jsx
    ├── NotificationsPage.jsx
    └── SettingsPage.jsx
```

---

### Task 1: Users Feature API & Edit Profile Modal

**Files:**
- Create: `frontend/src/features/users/api.js`
- Create: `frontend/src/features/users/components/EditProfileModal.jsx`

- [ ] **Step 1: Create users api.js**

```javascript
// frontend/src/features/users/api.js
import api from '../../services/api';

export const getUserProfile = (id) => api.get(`/users/${id}`);
export const updateProfile = (id, data) => api.put(`/users/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const searchUsers = (q) => api.get(`/users/search?q=${q}`);
export const getSavedPosts = (id) => api.get(`/users/${id}/saved`);
export const savePost = (userId, postId) => api.post(`/users/${userId}/save/${postId}`);
export const unsavePost = (userId, postId) => api.delete(`/users/${userId}/save/${postId}`);
export const updateFcmToken = (userId, fcmToken) => api.put(`/users/${userId}/fcm-token`, { fcmToken });
```

- [ ] **Step 2: Create EditProfileModal.jsx**

```jsx
// frontend/src/features/users/components/EditProfileModal.jsx
import { useState } from 'react';
import Modal from '../../../components/Modal';
import { updateProfile } from '../api';
import { useAuth } from '../../../hooks/useAuth';

export default function EditProfileModal({ isOpen, onClose, onSave }) {
  const { user, updateUser } = useAuth();
  const [bio, setBio] = useState(user?.bio || '');
  const [picture, setPicture] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('bio', bio);
      if (picture) formData.append('profilePicture', picture);
      const res = await updateProfile(user._id, formData);
      updateUser(res.data.user);
      onSave?.(res.data.user);
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-reddit-muted block mb-1">Profile Picture</label>
          <input type="file" accept="image/*" onChange={e => setPicture(e.target.files[0])}
            className="w-full text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-reddit-muted block mb-1">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={200}
            className="w-full border border-reddit-borderLight dark:border-reddit-borderDark rounded p-2 text-sm bg-transparent focus:outline-none focus:border-reddit-blue resize-none" />
          <p className="text-right text-xs text-reddit-muted">{bio.length}/200</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="border border-reddit-borderLight dark:border-reddit-borderDark rounded-full px-4 py-1.5 text-sm">Cancel</button>
          <button type="submit" disabled={loading} className="bg-reddit-orange text-white rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/users/
git commit -m "feat: add users API and EditProfileModal"
```

---

### Task 2: Profile Page

**Files:**
- Modify: `frontend/src/pages/ProfilePage.jsx`

- [ ] **Step 1: Rewrite ProfilePage.jsx**

```jsx
// frontend/src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '../components/Navbar';
import LeftSidebar from '../components/LeftSidebar';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import EditProfileModal from '../features/users/components/EditProfileModal';
import { getUserProfile } from '../features/users/api';
import { useAuth } from '../hooks/useAuth';
import { CakeIcon, PencilIcon } from '@heroicons/react/24/outline';

const TABS = ['Overview', 'Posts', 'Comments', 'About'];

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Find user by username via search
    import('../features/users/api').then(({ searchUsers }) => {
      searchUsers(username).then(res => {
        const found = res.data.users.find(u => u.username === username);
        if (found) {
          getUserProfile(found._id).then(r => setProfile(r.data.user));
        }
      }).finally(() => setLoading(false));
    });
  }, [username]);

  const isOwnProfile = currentUser?.username === username;
  const totalKarma = (profile?.postKarma || 0) + (profile?.commentKarma || 0);

  if (loading) return <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark"><Navbar /><LoadingSpinner /></div>;
  if (!profile) return <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark"><Navbar /><p className="text-center mt-20 text-reddit-muted">User not found</p></div>;

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark">
      <Navbar />
      {/* Banner */}
      <div className="h-20 mt-12 bg-gradient-to-r from-reddit-orange to-orange-400" />
      <div className="bg-white dark:bg-reddit-cardDark border-b border-reddit-borderLight dark:border-reddit-borderDark">
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="flex items-end gap-4 -mt-8">
            <Avatar src={profile.profilePicture} name={profile.username} size={20} className="border-4 border-white dark:border-reddit-cardDark" />
            <div className="flex-1 flex items-end justify-between pb-1">
              <div>
                <h1 className="text-2xl font-bold">u/{profile.username}</h1>
                <p className="text-sm text-reddit-muted">{totalKarma.toLocaleString()} karma</p>
              </div>
              {isOwnProfile && (
                <button onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1 border border-reddit-borderLight dark:border-reddit-borderDark rounded-full px-3 py-1 text-sm hover:border-reddit-muted">
                  <PencilIcon className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-full ${activeTab === tab ? 'bg-reddit-borderLight dark:bg-reddit-borderDark' : 'text-reddit-muted hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex max-w-5xl mx-auto px-4 gap-6 py-4">
        <LeftSidebar />
        <main className="flex-1 min-w-0">
          {activeTab === 'About' && (
            <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-4 space-y-3">
              <p className="text-sm">{profile.bio || 'No bio yet.'}</p>
              <div className="flex gap-6 text-sm">
                <div><p className="font-bold">{(profile.postKarma || 0).toLocaleString()}</p><p className="text-reddit-muted text-xs">Post Karma</p></div>
                <div><p className="font-bold">{(profile.commentKarma || 0).toLocaleString()}</p><p className="text-reddit-muted text-xs">Comment Karma</p></div>
              </div>
              <div className="flex items-center gap-2 text-sm text-reddit-muted">
                <CakeIcon className="w-4 h-4" />
                <span>Cake day {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          )}
          {(activeTab === 'Overview' || activeTab === 'Posts') && (
            <p className="text-reddit-muted text-sm text-center py-8">No posts yet.</p>
          )}
          {activeTab === 'Comments' && (
            <p className="text-reddit-muted text-sm text-center py-8">No comments yet.</p>
          )}
        </main>

        {/* Right sidebar */}
        <aside className="w-72 flex-shrink-0 hidden xl:block">
          <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar src={profile.profilePicture} name={profile.username} size={12} />
              <div>
                <p className="font-bold">u/{profile.username}</p>
                <p className="text-xs text-reddit-muted">{totalKarma.toLocaleString()} karma</p>
              </div>
            </div>
            <hr className="border-reddit-borderLight dark:border-reddit-borderDark" />
            <div className="flex gap-6 text-sm">
              <div><p className="font-bold">{(profile.postKarma || 0).toLocaleString()}</p><p className="text-reddit-muted text-xs">Post Karma</p></div>
              <div><p className="font-bold">{(profile.commentKarma || 0).toLocaleString()}</p><p className="text-reddit-muted text-xs">Comment Karma</p></div>
            </div>
            <div className="flex items-center gap-2 text-sm text-reddit-muted">
              <CakeIcon className="w-4 h-4" />
              {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </aside>
      </div>

      <EditProfileModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSave={setProfile} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ProfilePage.jsx
git commit -m "feat: build Profile page with banner, karma, tabs, and edit modal"
```

---

### Task 3: Search Page

**Files:**
- Modify: `frontend/src/pages/SearchPage.jsx`

- [ ] **Step 1: Rewrite SearchPage.jsx**

```jsx
// frontend/src/pages/SearchPage.jsx
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LeftSidebar from '../components/LeftSidebar';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import { searchCommunities } from '../features/communities/api';
import { searchUsers } from '../features/users/api';
import api from '../services/api';

const TYPES = ['Posts', 'Communities', 'People'];

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [type, setType] = useState('Posts');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    const fetch = type === 'Posts'
      ? api.get(`/posts/feed?sort=new`).then(r => r.data.posts.filter(p => p.title.toLowerCase().includes(q.toLowerCase())))
      : type === 'Communities'
        ? searchCommunities(q).then(r => r.data.communities)
        : searchUsers(q).then(r => r.data.users);
    fetch.then(setResults).catch(() => setResults([])).finally(() => setLoading(false));
  }, [q, type]);

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark">
      <Navbar />
      <div className="flex max-w-5xl mx-auto pt-14 px-4 gap-6">
        <LeftSidebar />
        <main className="flex-1 min-w-0 py-4 space-y-3">
          <h1 className="text-lg font-bold">Search results for "{q}"</h1>
          {/* Type filter */}
          <div className="flex border-b border-reddit-borderLight dark:border-reddit-borderDark">
            {TYPES.map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${type === t ? 'border-reddit-textLight dark:border-reddit-textDark' : 'border-transparent text-reddit-muted'}`}>
                {t}
              </button>
            ))}
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              {type === 'Posts' && results.map(post => <PostCard key={post._id} post={post} />)}
              {type === 'Communities' && results.map(c => (
                <Link key={c._id} to={`/r/${c.name}`}
                  className="flex items-center gap-3 bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-4 hover:border-reddit-muted">
                  <Avatar src={c.icon} name={c.name} size={10} />
                  <div>
                    <p className="font-bold">r/{c.name}</p>
                    <p className="text-sm text-reddit-muted">{c.memberCount?.toLocaleString()} members • {c.description?.slice(0, 80)}</p>
                  </div>
                </Link>
              ))}
              {type === 'People' && results.map(u => (
                <Link key={u._id} to={`/u/${u.username}`}
                  className="flex items-center gap-3 bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-4 hover:border-reddit-muted">
                  <Avatar src={u.profilePicture} name={u.username} size={10} />
                  <div>
                    <p className="font-bold">u/{u.username}</p>
                    <p className="text-sm text-reddit-muted">{u.postKarma?.toLocaleString()} karma</p>
                  </div>
                </Link>
              ))}
              {results.length === 0 && <p className="text-reddit-muted text-sm text-center py-8">No results found for "{q}"</p>}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/SearchPage.jsx
git commit -m "feat: build Search page with Posts/Communities/People filter tabs"
```

---

### Task 4: Socket.io Client & Chat API

**Files:**
- Create: `frontend/src/features/chat/socket.js`
- Create: `frontend/src/features/chat/api.js`

- [ ] **Step 1: Create socket.js**

```javascript
// frontend/src/features/chat/socket.js
import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = () => {
  const token = localStorage.getItem('token');
  if (!token || socket?.connected) return socket;
  socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
    auth: { token },
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
```

- [ ] **Step 2: Create chat api.js**

```javascript
// frontend/src/features/chat/api.js
import api from '../../services/api';

export const getConversations = () => api.get('/chat/conversations');
export const getMessages = (userId) => api.get(`/chat/messages/${userId}`);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/chat/
git commit -m "feat: add Socket.io client connection and chat API functions"
```

---

### Task 5: Chat Page

**Files:**
- Modify: `frontend/src/pages/ChatPage.jsx`

- [ ] **Step 1: Rewrite ChatPage.jsx**

```jsx
// frontend/src/pages/ChatPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import LoadingSpinner from '../components/LoadingSpinner';
import { getConversations, getMessages } from '../features/chat/api';
import { connectSocket } from '../features/chat/socket';
import { useAuth } from '../hooks/useAuth';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

export default function ChatPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = connectSocket();
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('receive_message', (msg) => {
      setMessages(p => [...p, msg]);
    });
    socket.on('typing', ({ userId: uid, isTyping }) => {
      if (uid !== user?._id) setTyping(isTyping);
    });

    getConversations().then(res => setConversations(res.data.conversations)).finally(() => setLoading(false));

    return () => { socket.off('receive_message'); socket.off('typing'); };
  }, []);

  useEffect(() => {
    if (!userId || !socketRef.current) return;
    setLoading(true);
    getMessages(userId).then(res => {
      setMessages(res.data.messages);
      const conv = conversations.find(c => c.user?._id === userId);
      setActiveUser(conv?.user);
      socketRef.current.emit('join_chat', { otherUserId: userId });
    }).finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !userId) return;
    socketRef.current?.emit('send_message', { receiverId: userId, content: input });
    setInput('');
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    socketRef.current?.emit('typing', { receiverId: userId, isTyping: e.target.value.length > 0 });
  };

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark flex flex-col">
      <Navbar />
      <div className="flex flex-1 max-w-5xl mx-auto w-full pt-12 border-x border-reddit-borderLight dark:border-reddit-borderDark">
        {/* Conversation list */}
        <aside className={`w-72 flex-shrink-0 border-r border-reddit-borderLight dark:border-reddit-borderDark bg-white dark:bg-reddit-cardDark ${userId ? 'hidden md:block' : 'block'}`}>
          <div className="p-3 border-b border-reddit-borderLight dark:border-reddit-borderDark">
            <h2 className="font-bold">Messages</h2>
          </div>
          {loading ? <LoadingSpinner /> : conversations.map(({ user: u, lastMessage, unreadCount }) => (
            <Link key={u?._id} to={`/chat/${u?._id}`}
              className={`flex items-center gap-3 p-3 hover:bg-reddit-bgLight dark:hover:bg-[#1a1a1b] ${userId === u?._id ? 'bg-reddit-bgLight dark:bg-[#1a1a1b]' : ''}`}>
              <Avatar src={u?.profilePicture} name={u?.username} size={9} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{u?.username}</p>
                  {unreadCount > 0 && <span className="bg-reddit-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>}
                </div>
                <p className="text-xs text-reddit-muted truncate">{lastMessage?.content}</p>
              </div>
            </Link>
          ))}
        </aside>

        {/* Message thread */}
        <main className={`flex-1 flex flex-col ${!userId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {!userId ? (
            <p className="text-reddit-muted">Select a conversation</p>
          ) : (
            <>
              {/* Thread header */}
              <div className="p-3 border-b border-reddit-borderLight dark:border-reddit-borderDark bg-white dark:bg-reddit-cardDark flex items-center gap-3">
                <Link to="/chat" className="md:hidden text-reddit-muted">←</Link>
                <Avatar src={activeUser?.profilePicture} name={activeUser?.username} size={8} />
                <Link to={`/u/${activeUser?.username}`} className="font-bold hover:underline">{activeUser?.username}</Link>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-reddit-bgLight dark:bg-reddit-bgDark">
                {messages.map(msg => {
                  const isOwn = msg.sender?._id === user?._id || msg.sender === user?._id;
                  return (
                    <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-reddit-orange text-white rounded-br-none' : 'bg-white dark:bg-reddit-cardDark rounded-bl-none'}`}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-orange-200' : 'text-reddit-muted'}`}>
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {typing && <p className="text-xs text-reddit-muted italic">typing...</p>}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-3 border-t border-reddit-borderLight dark:border-reddit-borderDark bg-white dark:bg-reddit-cardDark flex gap-2">
                <input
                  value={input}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-1 bg-reddit-bgLight dark:bg-[#272729] rounded-full px-4 py-2 text-sm focus:outline-none"
                />
                <button type="submit" disabled={!input.trim()} className="bg-reddit-orange text-white rounded-full p-2 disabled:opacity-50">
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ChatPage.jsx
git commit -m "feat: build real-time Chat page with Socket.io, typing indicator, and mobile layout"
```

---

### Task 6: Firebase FCM Setup & Notifications

**Files:**
- Create: `frontend/src/features/notifications/firebase.js`
- Create: `frontend/public/firebase-messaging-sw.js`
- Create: `frontend/src/features/notifications/api.js`
- Create: `frontend/src/features/notifications/components/NotificationItem.jsx`

- [ ] **Step 1: Create Firebase setup**

```javascript
// frontend/src/features/notifications/firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { updateFcmToken } from '../users/api';
import { useAuth } from '../../hooks/useAuth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async (userId) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
    if (token) await updateFcmToken(userId, token);
  } catch (err) {
    console.error('FCM permission error:', err);
  }
};

export const onForegroundMessage = (callback) => {
  return onMessage(messaging, callback);
};
```

- [ ] **Step 2: Create Firebase service worker**

```javascript
// frontend/public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY,
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/reddit-logo.svg',
  });
});
```

- [ ] **Step 3: Create notifications api.js**

```javascript
// frontend/src/features/notifications/api.js
import api from '../../services/api';

export const getNotifications = () => api.get('/notifications');
export const markRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllRead = () => api.put('/notifications/read-all');
```

- [ ] **Step 4: Create NotificationItem.jsx**

```jsx
// frontend/src/features/notifications/components/NotificationItem.jsx
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../../../components/Avatar';

const typeText = {
  upvote: 'upvoted your post',
  comment: 'commented on your post',
  reply: 'replied to your comment',
};

export default function NotificationItem({ notification, onMarkRead }) {
  return (
    <div
      onClick={() => onMarkRead(notification._id)}
      className={`flex items-start gap-3 p-4 hover:bg-reddit-bgLight dark:hover:bg-[#1a1a1b] cursor-pointer border-b border-reddit-borderLight dark:border-reddit-borderDark ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
    >
      {!notification.read && <div className="w-2 h-2 bg-reddit-blue rounded-full mt-1.5 flex-shrink-0" />}
      <Avatar src={notification.triggeredBy?.profilePicture} name={notification.triggeredBy?.username} size={8} />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <Link to={`/u/${notification.triggeredBy?.username}`} className="font-bold hover:underline">
            u/{notification.triggeredBy?.username}
          </Link>
          {' '}{typeText[notification.type]}
          {notification.post && (
            <>
              {': '}
              <Link to={`/post/${notification.post._id}`} className="font-bold hover:underline text-reddit-blue">
                {notification.post.title}
              </Link>
            </>
          )}
        </p>
        <p className="text-xs text-reddit-muted mt-0.5">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/notifications/ frontend/public/firebase-messaging-sw.js
git commit -m "feat: add Firebase FCM setup, service worker, and NotificationItem component"
```

---

### Task 7: Notifications Page

**Files:**
- Modify: `frontend/src/pages/NotificationsPage.jsx`

- [ ] **Step 1: Rewrite NotificationsPage.jsx**

```jsx
// frontend/src/pages/NotificationsPage.jsx
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import LeftSidebar from '../components/LeftSidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import NotificationItem from '../features/notifications/components/NotificationItem';
import { getNotifications, markRead, markAllRead } from '../features/notifications/api';
import { connectSocket } from '../features/chat/socket';
import { useAuth } from '../hooks/useAuth';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    getNotifications().then(res => setNotifications(res.data.notifications)).finally(() => setLoading(false));

    // Listen for real-time notifications
    const socket = connectSocket();
    socket?.on('new_notification', (notif) => {
      setNotifications(p => [notif, ...p]);
    });

    return () => { socket?.off('new_notification'); };
  }, []);

  const handleMarkRead = async (id) => {
    await markRead(id);
    setNotifications(p => p.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications(p => p.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark">
      <Navbar />
      <div className="flex max-w-5xl mx-auto pt-14 px-4 gap-6">
        <LeftSidebar />
        <main className="flex-1 min-w-0 py-4">
          <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-reddit-borderLight dark:border-reddit-borderDark">
              <h1 className="font-bold text-lg">Notifications {unreadCount > 0 && <span className="text-reddit-orange">({unreadCount})</span>}</h1>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-sm text-reddit-blue hover:underline">
                  Mark all as read
                </button>
              )}
            </div>
            {loading ? <LoadingSpinner /> : (
              notifications.length === 0 ? (
                <p className="text-reddit-muted text-sm text-center py-12">No notifications yet.</p>
              ) : (
                notifications.map(n => (
                  <NotificationItem key={n._id} notification={n} onMarkRead={handleMarkRead} />
                ))
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire FCM permission request on login**

In `frontend/src/context/AuthContext.jsx`, add after login:
```javascript
import { requestNotificationPermission } from '../features/notifications/firebase';

// Inside login():
const login = (token, userData) => {
  localStorage.setItem('token', token);
  setUser(userData);
  requestNotificationPermission(userData._id);
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/NotificationsPage.jsx frontend/src/context/AuthContext.jsx
git commit -m "feat: build Notifications page with real-time Socket.io + FCM permission request on login"
```

---

### Task 8: Settings Page

**Files:**
- Modify: `frontend/src/pages/SettingsPage.jsx`

- [ ] **Step 1: Rewrite SettingsPage.jsx**

```jsx
// frontend/src/pages/SettingsPage.jsx
import { useState } from 'react';
import Navbar from '../components/Navbar';
import LeftSidebar from '../components/LeftSidebar';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { updateProfile } from '../features/users/api';

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData();
    formData.append('bio', bio);
    const res = await updateProfile(user._id, formData);
    updateUser(res.data.user);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark">
      <Navbar />
      <div className="flex max-w-5xl mx-auto pt-14 px-4 gap-6">
        <LeftSidebar />
        <main className="flex-1 min-w-0 py-4 space-y-4">
          <h1 className="text-xl font-bold">Settings</h1>

          {/* Account */}
          <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-4 space-y-4">
            <h2 className="font-bold text-sm uppercase text-reddit-muted">Account</h2>
            <div>
              <p className="text-sm text-reddit-muted">Username</p>
              <p className="font-medium">u/{user?.username}</p>
            </div>
            <div>
              <p className="text-sm text-reddit-muted">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>

          {/* Profile */}
          <form onSubmit={handleSave} className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-4 space-y-4">
            <h2 className="font-bold text-sm uppercase text-reddit-muted">Profile</h2>
            <div>
              <label className="text-sm text-reddit-muted block mb-1">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={200}
                className="w-full border border-reddit-borderLight dark:border-reddit-borderDark rounded p-2 text-sm bg-transparent focus:outline-none focus:border-reddit-blue resize-none" />
            </div>
            <button type="submit" disabled={saving}
              className="bg-reddit-orange text-white rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-50">
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Preferences */}
          <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-4 space-y-3">
            <h2 className="font-bold text-sm uppercase text-reddit-muted">Preferences</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Dark Mode</p>
                <p className="text-xs text-reddit-muted">Use dark theme</p>
              </div>
              <button onClick={toggleTheme}
                className={`w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-reddit-orange' : 'bg-reddit-borderLight'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white dark:bg-reddit-cardDark border border-red-200 dark:border-red-900 rounded p-4">
            <h2 className="font-bold text-sm uppercase text-red-500 mb-3">Danger Zone</h2>
            <button onClick={logout} className="border border-red-500 text-red-500 rounded-full px-4 py-1.5 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20">
              Log Out
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/SettingsPage.jsx
git commit -m "feat: build Settings page with profile edit, dark mode toggle, and logout"
```

---

### Task 9: Mobile Bottom Navigation Bar

**Files:**
- Create: `frontend/src/components/BottomNav.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create BottomNav.jsx**

```jsx
// frontend/src/components/BottomNav.jsx
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, MagnifyingGlassIcon, PlusCircleIcon, BellIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeSolid, MagnifyingGlassIcon as SearchSolid, BellIcon as BellSolid, ChatBubbleLeftIcon as ChatSolid } from '@heroicons/react/24/solid';

const ITEMS = [
  { to: '/', label: 'Home', Icon: HomeIcon, ActiveIcon: HomeSolid },
  { to: '/search', label: 'Search', Icon: MagnifyingGlassIcon, ActiveIcon: SearchSolid },
  { to: '/r/popular/submit', label: 'Create', Icon: PlusCircleIcon, ActiveIcon: PlusCircleIcon, isCreate: true },
  { to: '/notifications', label: 'Notifications', Icon: BellIcon, ActiveIcon: BellSolid },
  { to: '/chat', label: 'Chat', Icon: ChatBubbleLeftIcon, ActiveIcon: ChatSolid },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-reddit-cardDark border-t border-reddit-borderLight dark:border-reddit-borderDark flex lg:hidden">
      {ITEMS.map(({ to, label, Icon, ActiveIcon, isCreate }) => {
        const active = pathname === to;
        return (
          <Link key={to} to={to} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5">
            {isCreate
              ? <PlusCircleIcon className="w-7 h-7 text-reddit-muted" />
              : active
                ? <ActiveIcon className="w-6 h-6 text-reddit-textLight dark:text-reddit-textDark" />
                : <Icon className="w-6 h-6 text-reddit-muted" />
            }
            <span className={`text-xs ${active ? 'text-reddit-textLight dark:text-reddit-textDark font-medium' : 'text-reddit-muted'}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Add BottomNav and mobile padding to App.jsx**

In `frontend/src/App.jsx`, wrap all protected routes content:
```jsx
import BottomNav from './components/BottomNav';

// Add inside AuthProvider, after BrowserRouter:
// Wrap routes in a div that adds pb-16 on mobile for bottom nav
// Add <BottomNav /> after <Routes>:

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="pb-16 lg:pb-0">
            <Suspense fallback={<Fallback />}>
              <Routes>
                {/* ... all existing routes unchanged ... */}
              </Routes>
            </Suspense>
          </div>
          <BottomNav />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Add mobile padding to pages**

In `frontend/src/index.css`, add:
```css
@media (max-width: 1024px) {
  .sidebar-hidden {
    display: none;
  }
}
```

- [ ] **Step 4: Run full test suite**

```bash
cd frontend && npx vitest run
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/BottomNav.jsx frontend/src/App.jsx
git commit -m "feat: add mobile bottom navigation bar with active state indicators"
```

---

### Task 10: Push Notifications Bell Badge in Navbar

**Files:**
- Modify: `frontend/src/components/Navbar.jsx`

- [ ] **Step 1: Add real-time notification badge**

In `frontend/src/components/Navbar.jsx`, add unread count state:
```jsx
import { useState, useEffect } from 'react';
import { getNotifications } from '../features/notifications/api';
import { connectSocket } from '../features/chat/socket';

// Inside Navbar component:
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  if (!isAuthenticated) return;
  getNotifications().then(res => {
    setUnreadCount(res.data.notifications.filter(n => !n.read).length);
  }).catch(() => {});

  const socket = connectSocket();
  socket?.on('new_notification', () => setUnreadCount(p => p + 1));
  return () => socket?.off('new_notification');
}, [isAuthenticated]);

// Replace the bell Link with:
<Link to="/notifications" className="relative p-1.5 rounded hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark text-reddit-muted">
  <BellIcon className="w-6 h-6" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-reddit-orange text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</Link>
```

- [ ] **Step 2: Run full test suite**

```bash
cd frontend && npx vitest run
```
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Navbar.jsx
git commit -m "feat: add real-time notification badge on Navbar bell icon"
```

---

### Final Step: Push all branches and open PRs

- [ ] **Push feature branch**

```bash
git push origin feature/frontend-advanced-ui
```

- [ ] **Open PR into dev on GitHub**

```bash
gh pr create --title "feat: complete frontend advanced UI (profile, search, chat, notifications, mobile)" --body "Completes all frontend features:
- User profile page with edit modal
- Search page (posts/communities/people)
- Real-time chat with Socket.io
- Notifications with FCM badge
- Settings page
- Mobile bottom navigation bar"
```
