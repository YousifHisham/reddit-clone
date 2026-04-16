# Frontend Core UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the main Reddit-replica UI: Navbar, left sidebar, post card, vote buttons, home feed, community page, post detail with comments, and create post page.

**Architecture:** Shared components in `components/`. Feature components in `features/`. Pages in `pages/` import and compose these. All data fetching via feature `api.js` files. Tailwind CSS with Reddit color tokens.

**Tech Stack:** React 18, React Router, Tailwind CSS, Axios, Vitest, React Testing Library

**Prerequisite:** `frontend-setup-auth` plan complete.

---

## File Structure

```
frontend/src/
├── components/
│   ├── Navbar.jsx              # top navigation bar
│   ├── LeftSidebar.jsx         # Reddit-style left sidebar
│   ├── VoteButtons.jsx         # upvote/score/downvote column
│   ├── PostCard.jsx            # post card used in feed + community
│   ├── Flair.jsx               # colored flair badge
│   ├── SortTabs.jsx            # Best/Hot/New/Top/Rising tabs
│   ├── Modal.jsx               # reusable modal wrapper
│   ├── Avatar.jsx              # user/community avatar with fallback
│   └── LoadingSpinner.jsx
├── features/
│   ├── communities/
│   │   ├── api.js
│   │   └── components/
│   │       └── CommunityCard.jsx
│   ├── posts/
│   │   ├── api.js
│   │   └── components/
│   │       ├── PostList.jsx
│   │       ├── CreatePostForm.jsx
│   │       └── AISummaryModal.jsx
│   └── comments/
│       ├── api.js
│       └── components/
│           ├── CommentThread.jsx
│           └── CommentForm.jsx
└── pages/
    ├── HomePage.jsx            # personalized feed
    ├── CommunityPage.jsx       # r/:name
    ├── PostDetailPage.jsx      # /post/:id
    └── CreatePostPage.jsx      # /r/:name/submit
```

---

### Task 1: Shared UI Components

**Files:**
- Create: `frontend/src/components/Avatar.jsx`
- Create: `frontend/src/components/LoadingSpinner.jsx`
- Create: `frontend/src/components/Flair.jsx`
- Create: `frontend/src/components/Modal.jsx`

- [ ] **Step 1: Create Avatar**

```jsx
// frontend/src/components/Avatar.jsx
export default function Avatar({ src, name = '', size = 8, className = '' }) {
  const initials = name.slice(0, 2).toUpperCase();
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (src) {
    return <img src={src} alt={name} className={`w-${size} h-${size} rounded-full object-cover ${className}`} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-white text-xs font-bold ${className}`}>
      {initials || '?'}
    </div>
  );
}
```

- [ ] **Step 2: Create LoadingSpinner**

```jsx
// frontend/src/components/LoadingSpinner.jsx
export default function LoadingSpinner({ size = 8 }) {
  return (
    <div className="flex justify-center items-center py-8">
      <div className={`animate-spin rounded-full w-${size} h-${size} border-b-2 border-reddit-orange`} />
    </div>
  );
}
```

- [ ] **Step 3: Create Flair**

```jsx
// frontend/src/components/Flair.jsx
export default function Flair({ text }) {
  if (!text) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
      {text}
    </span>
  );
}
```

- [ ] **Step 4: Create Modal**

```jsx
// frontend/src/components/Modal.jsx
import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-reddit-cardDark rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-reddit-borderLight dark:border-reddit-borderDark">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-reddit-muted hover:text-reddit-textLight dark:hover:text-reddit-textDark text-xl">✕</button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Avatar.jsx frontend/src/components/LoadingSpinner.jsx frontend/src/components/Flair.jsx frontend/src/components/Modal.jsx
git commit -m "feat: add Avatar, LoadingSpinner, Flair, and Modal shared components"
```

---

### Task 2: VoteButtons & SortTabs

**Files:**
- Create: `frontend/src/components/VoteButtons.jsx`
- Create: `frontend/src/components/SortTabs.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// frontend/src/components/__tests__/VoteButtons.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import VoteButtons from '../VoteButtons';
import { vi } from 'vitest';

describe('VoteButtons', () => {
  it('renders upvote score and downvote', () => {
    render(<VoteButtons upvotes={42} downvotes={3} userVote={null} onUpvote={vi.fn()} onDownvote={vi.fn()} />);
    expect(screen.getByText('39')).toBeInTheDocument(); // net score
  });

  it('calls onUpvote when upvote clicked', () => {
    const onUpvote = vi.fn();
    render(<VoteButtons upvotes={10} downvotes={2} userVote={null} onUpvote={onUpvote} onDownvote={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('upvote'));
    expect(onUpvote).toHaveBeenCalledOnce();
  });

  it('highlights upvote button when userVote is up', () => {
    render(<VoteButtons upvotes={10} downvotes={2} userVote="up" onUpvote={vi.fn()} onDownvote={vi.fn()} />);
    expect(screen.getByLabelText('upvote')).toHaveClass('text-reddit-orange');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/components/__tests__/VoteButtons.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Create VoteButtons.jsx**

```jsx
// frontend/src/components/VoteButtons.jsx
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

export default function VoteButtons({ upvotes, downvotes, userVote, onUpvote, onDownvote, vertical = true }) {
  const score = (upvotes || 0) - (downvotes || 0);
  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n;

  return (
    <div className={`flex ${vertical ? 'flex-col' : 'flex-row'} items-center gap-1`}>
      <button
        aria-label="upvote"
        onClick={onUpvote}
        className={`p-1 rounded hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark ${userVote === 'up' ? 'text-reddit-orange' : 'text-reddit-muted hover:text-reddit-orange'}`}
      >
        <ArrowUpIcon className="w-5 h-5" />
      </button>
      <span className={`text-xs font-bold ${userVote === 'up' ? 'text-reddit-orange' : userVote === 'down' ? 'text-reddit-downvote' : ''}`}>
        {fmt(score)}
      </span>
      <button
        aria-label="downvote"
        onClick={onDownvote}
        className={`p-1 rounded hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark ${userVote === 'down' ? 'text-reddit-downvote' : 'text-reddit-muted hover:text-reddit-downvote'}`}
      >
        <ArrowDownIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Install heroicons**

```bash
cd frontend && npm install @heroicons/react
```

- [ ] **Step 5: Create SortTabs.jsx**

```jsx
// frontend/src/components/SortTabs.jsx
const TABS = ['best', 'hot', 'new', 'top', 'rising'];

export default function SortTabs({ active, onChange }) {
  return (
    <div className="flex gap-1 bg-white dark:bg-reddit-cardDark rounded-md px-2 py-1">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-1.5 rounded text-sm font-medium capitalize ${active === tab ? 'bg-reddit-borderLight dark:bg-reddit-borderDark text-reddit-textLight dark:text-reddit-textDark' : 'text-reddit-muted hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/components/__tests__/VoteButtons.test.jsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/VoteButtons.jsx frontend/src/components/SortTabs.jsx
git commit -m "feat: add VoteButtons and SortTabs components"
```

---

### Task 3: PostCard Component

**Files:**
- Create: `frontend/src/features/posts/api.js`
- Create: `frontend/src/components/PostCard.jsx`

- [ ] **Step 1: Create posts api.js**

```javascript
// frontend/src/features/posts/api.js
import api from '../../services/api';

export const getFeed = (sort = 'best', page = 1) => api.get(`/posts/feed?sort=${sort}&page=${page}`);
export const getPost = (id) => api.get(`/posts/${id}`);
export const createPost = (data) => api.post('/posts', data);
export const deletePost = (id) => api.delete(`/posts/${id}`);
export const upvotePost = (id) => api.post(`/posts/${id}/upvote`);
export const downvotePost = (id) => api.post(`/posts/${id}/downvote`);
export const getCommunityPosts = (communityId, sort = 'new') => api.get(`/communities/${communityId}/posts?sort=${sort}`);
export const summarizePost = (id) => api.post(`/ai/summarize/${id}`);
```

- [ ] **Step 2: Write failing test**

```jsx
// frontend/src/components/__tests__/PostCard.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PostCard from '../PostCard';
import { vi } from 'vitest';

const mockPost = {
  _id: '1',
  title: 'Test Post Title',
  content: 'Post content here',
  upvotes: 42,
  downvotes: 3,
  commentCount: 7,
  author: { _id: 'a1', username: 'testuser', profilePicture: '' },
  community: { _id: 'c1', name: 'testcomm', icon: '' },
  flair: 'Discussion',
  createdAt: new Date().toISOString(),
};

describe('PostCard', () => {
  it('renders post title', () => {
    render(<MemoryRouter><PostCard post={mockPost} /></MemoryRouter>);
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
  });

  it('renders community name', () => {
    render(<MemoryRouter><PostCard post={mockPost} /></MemoryRouter>);
    expect(screen.getByText(/r\/testcomm/)).toBeInTheDocument();
  });

  it('renders comment count', () => {
    render(<MemoryRouter><PostCard post={mockPost} /></MemoryRouter>);
    expect(screen.getByText(/7 Comments/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/components/__tests__/PostCard.test.jsx
```
Expected: FAIL

- [ ] **Step 4: Create PostCard.jsx**

```jsx
// frontend/src/components/PostCard.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import VoteButtons from './VoteButtons';
import Flair from './Flair';
import Avatar from './Avatar';
import { upvotePost, downvotePost } from '../features/posts/api';
import { useAuth } from '../hooks/useAuth';
import { ChatBubbleLeftIcon, ShareIcon, BookmarkIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

export default function PostCard({ post: initialPost, compact = false }) {
  const [post, setPost] = useState(initialPost);
  const [saved, setSaved] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const userVote = () => {
    const { user } = useAuth ? useAuth() : {};
    if (!user) return null;
    if (post.upvoters?.includes(user._id)) return 'up';
    if (post.downvoters?.includes(user._id)) return 'down';
    return null;
  };

  const handleUpvote = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    const res = await upvotePost(post._id);
    setPost(p => ({ ...p, upvotes: res.data.upvotes, downvotes: res.data.downvotes }));
  };

  const handleDownvote = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    const res = await downvotePost(post._id);
    setPost(p => ({ ...p, upvotes: res.data.upvotes, downvotes: res.data.downvotes }));
  };

  const handleShare = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(window.location.origin + `/post/${post._id}`);
  };

  return (
    <div
      className="flex bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded hover:border-reddit-muted cursor-pointer"
      onClick={() => navigate(`/post/${post._id}`)}
    >
      {/* Vote column */}
      <div className="flex flex-col items-center bg-reddit-bgLight dark:bg-[#161617] p-2 rounded-l w-10 min-w-[40px]" onClick={e => e.stopPropagation()}>
        <VoteButtons
          upvotes={post.upvotes}
          downvotes={post.downvotes}
          userVote={null}
          onUpvote={handleUpvote}
          onDownvote={handleDownvote}
        />
      </div>

      {/* Content */}
      <div className="flex-1 p-2">
        {/* Meta */}
        <div className="flex items-center gap-1 text-xs text-reddit-muted mb-1">
          <Avatar src={post.community?.icon} name={post.community?.name} size={5} />
          <Link to={`/r/${post.community?.name}`} onClick={e => e.stopPropagation()}
            className="font-bold text-reddit-textLight dark:text-reddit-textDark hover:underline">
            r/{post.community?.name}
          </Link>
          <span>•</span>
          <span>Posted by</span>
          <Link to={`/u/${post.author?.username}`} onClick={e => e.stopPropagation()} className="hover:underline">
            u/{post.author?.username}
          </Link>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">{post.title}</h3>
            {post.flair && <div className="mb-1"><Flair text={post.flair} /></div>}
            {!compact && post.content && (
              <p className="text-xs text-reddit-muted line-clamp-2">{post.content}</p>
            )}
          </div>
          {post.image && (
            <img src={post.image} alt="" className="w-20 h-16 object-cover rounded ml-2 flex-shrink-0" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
          <Link to={`/post/${post._id}`}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-reddit-muted hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark">
            <ChatBubbleLeftIcon className="w-4 h-4" />
            {post.commentCount} Comments
          </Link>
          <button onClick={handleShare}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-reddit-muted hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark">
            <ShareIcon className="w-4 h-4" /> Share
          </button>
          <button onClick={(e) => { e.stopPropagation(); setSaved(s => !s); }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-reddit-muted hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark">
            {saved ? <BookmarkSolidIcon className="w-4 h-4 text-reddit-orange" /> : <BookmarkIcon className="w-4 h-4" />}
            {saved ? 'Saved' : 'Save'}
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded text-xs text-reddit-muted hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark">
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Install date-fns**

```bash
cd frontend && npm install date-fns
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/components/__tests__/PostCard.test.jsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/PostCard.jsx frontend/src/features/posts/api.js
git commit -m "feat: add PostCard component with voting, share, and save actions"
```

---

### Task 4: Navbar

**Files:**
- Create: `frontend/src/components/Navbar.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// frontend/src/components/__tests__/Navbar.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import Navbar from '../Navbar';
import { vi } from 'vitest';

const renderNavbar = (isAuthenticated = true) => render(
  <MemoryRouter>
    <ThemeContext.Provider value={{ isDark: false, toggleTheme: vi.fn() }}>
      <AuthContext.Provider value={{
        isAuthenticated,
        user: isAuthenticated ? { username: 'testuser', postKarma: 100, profilePicture: '' } : null,
        logout: vi.fn(),
        loading: false,
      }}>
        <Navbar />
      </AuthContext.Provider>
    </ThemeContext.Provider>
  </MemoryRouter>
);

describe('Navbar', () => {
  it('shows Log In and Sign Up when not authenticated', () => {
    renderNavbar(false);
    expect(screen.getByText('Log In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('shows username karma when authenticated', () => {
    renderNavbar(true);
    expect(screen.getByText(/testuser/i)).toBeInTheDocument();
  });

  it('has a search input', () => {
    renderNavbar(true);
    expect(screen.getByPlaceholderText(/search reddit/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/components/__tests__/Navbar.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Create Navbar.jsx**

```jsx
// frontend/src/components/Navbar.jsx
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import Avatar from './Avatar';
import {
  MagnifyingGlassIcon, PlusIcon, BellIcon, ChatBubbleLeftIcon,
  ChevronDownIcon, SunIcon, MoonIcon, ArrowRightOnRectangleIcon,
  UserIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-reddit-cardDark border-b border-reddit-borderLight dark:border-reddit-borderDark h-12 flex items-center px-4 gap-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 bg-reddit-orange rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <span className="font-bold text-lg hidden md:block">reddit</span>
      </Link>

      {/* Home dropdown */}
      <div className="hidden md:flex items-center gap-1 border border-transparent hover:border-reddit-borderLight dark:hover:border-reddit-borderDark rounded px-2 py-1 cursor-pointer text-sm">
        Home <ChevronDownIcon className="w-4 h-4" />
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-reddit-muted" />
          <input
            type="text"
            placeholder="Search Reddit"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-reddit-bgLight dark:bg-[#272729] border border-reddit-borderLight dark:border-reddit-borderDark rounded-full text-sm focus:outline-none focus:border-reddit-blue focus:bg-white dark:focus:bg-reddit-cardDark"
          />
        </div>
      </form>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto flex-shrink-0">
        {isAuthenticated ? (
          <>
            <Link to="/r/testcomm/submit"
              className="hidden md:flex items-center gap-1 border border-reddit-borderLight dark:border-reddit-borderDark rounded-full px-3 py-1 text-sm hover:border-reddit-muted text-reddit-muted">
              <PlusIcon className="w-4 h-4" /> Create
            </Link>
            <Link to="/chat" className="p-1.5 rounded hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark text-reddit-muted">
              <ChatBubbleLeftIcon className="w-6 h-6" />
            </Link>
            <Link to="/notifications" className="p-1.5 rounded hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark text-reddit-muted">
              <BellIcon className="w-6 h-6" />
            </Link>
            {/* Avatar dropdown */}
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropdownOpen(p => !p)}
                className="flex items-center gap-1.5 border border-transparent hover:border-reddit-borderLight dark:hover:border-reddit-borderDark rounded px-2 py-1"
              >
                <Avatar src={user?.profilePicture} name={user?.username} size={7} />
                <div className="hidden md:block text-left">
                  <p className="text-xs font-medium leading-none">{user?.username}</p>
                  <p className="text-xs text-reddit-muted">{(user?.postKarma || 0) + (user?.commentKarma || 0)} karma</p>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-reddit-muted" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded shadow-lg py-1 z-50">
                  <Link to={`/u/${user?.username}`} onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-reddit-bgLight dark:hover:bg-[#1a1a1b]">
                    <UserIcon className="w-4 h-4" /> Profile
                  </Link>
                  <Link to="/settings" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-reddit-bgLight dark:hover:bg-[#1a1a1b]">
                    <Cog6ToothIcon className="w-4 h-4" /> Settings
                  </Link>
                  <button onClick={toggleTheme}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-reddit-bgLight dark:hover:bg-[#1a1a1b] w-full text-left">
                    {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <hr className="border-reddit-borderLight dark:border-reddit-borderDark my-1" />
                  <button onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-reddit-bgLight dark:hover:bg-[#1a1a1b] w-full text-left text-red-500">
                    <ArrowRightOnRectangleIcon className="w-4 h-4" /> Log Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="border border-reddit-blue text-reddit-blue rounded-full px-4 py-1 text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20">
              Log In
            </Link>
            <Link to="/register" className="bg-reddit-orange text-white rounded-full px-4 py-1 text-sm font-bold hover:bg-orange-600">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/components/__tests__/Navbar.test.jsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Navbar.jsx
git commit -m "feat: add Navbar with search, auth state, dark mode toggle, and user dropdown"
```

---

### Task 5: Left Sidebar

**Files:**
- Create: `frontend/src/components/LeftSidebar.jsx`
- Create: `frontend/src/features/communities/api.js`

- [ ] **Step 1: Create communities api.js**

```javascript
// frontend/src/features/communities/api.js
import api from '../../services/api';

export const getCommunity = (id) => api.get(`/communities/${id}`);
export const getCommunityByName = (name) => api.get(`/communities/search?q=${name}`);
export const listCommunities = () => api.get('/communities');
export const searchCommunities = (q) => api.get(`/communities/search?q=${q}`);
export const createCommunity = (data) => api.post('/communities', data);
export const joinCommunity = (id) => api.post(`/communities/${id}/join`);
export const leaveCommunity = (id) => api.post(`/communities/${id}/leave`);
```

- [ ] **Step 2: Create LeftSidebar.jsx**

```jsx
// frontend/src/components/LeftSidebar.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { listCommunities } from '../features/communities/api';
import Avatar from './Avatar';
import {
  HomeIcon, FireIcon, NewspaperIcon, MagnifyingGlassIcon,
  PlusCircleIcon, ClockIcon, UsersIcon, InformationCircleIcon,
  MegaphoneIcon, CodeBracketIcon, QuestionMarkCircleIcon,
  BookOpenIcon, BriefcaseIcon, NewspaperIcon as PressIcon,
} from '@heroicons/react/24/outline';

const NAV_ITEMS = [
  { label: 'Home', icon: HomeIcon, to: '/' },
  { label: 'Popular', icon: FireIcon, to: '/r/popular' },
  { label: 'News', icon: NewspaperIcon, to: '/search?q=news&type=communities' },
  { label: 'Explore', icon: MagnifyingGlassIcon, to: '/search' },
];

const RESOURCES = [
  { label: 'About Reddit', icon: InformationCircleIcon, href: '#' },
  { label: 'Advertise', icon: MegaphoneIcon, href: '#' },
  { label: 'Developer Platform', icon: CodeBracketIcon, href: '#' },
  { label: 'Reddit Pro', icon: FireIcon, href: '#', badge: 'BETA' },
  { label: 'Help', icon: QuestionMarkCircleIcon, href: '#' },
  { label: 'Blog', icon: BookOpenIcon, href: '#' },
  { label: 'Careers', icon: BriefcaseIcon, href: '#' },
  { label: 'Press', icon: PressIcon, href: '#' },
];

export default function LeftSidebar() {
  const { isAuthenticated } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const location = useLocation();

  useEffect(() => {
    listCommunities().then(res => setCommunities(res.data.communities.slice(0, 10))).catch(() => {});
  }, []);

  const isActive = (to) => location.pathname === to;

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="fixed top-12 left-0 w-64 h-[calc(100vh-48px)] overflow-y-auto py-4 px-3 space-y-1">
        {/* Top Nav */}
        {NAV_ITEMS.map(({ label, icon: Icon, to }) => (
          <Link key={label} to={to}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium ${isActive(to) ? 'bg-reddit-borderLight dark:bg-reddit-borderDark' : 'hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark text-reddit-muted'}`}>
            <Icon className="w-5 h-5" /> {label}
          </Link>
        ))}
        <Link to="/create-community"
          className="flex items-center gap-3 px-3 py-2 rounded text-sm font-medium hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark text-reddit-muted">
          <PlusCircleIcon className="w-5 h-5" /> Start a community
        </Link>

        <hr className="border-reddit-borderLight dark:border-reddit-borderDark my-2" />

        {/* Recent */}
        <p className="px-3 text-xs font-bold text-reddit-muted uppercase tracking-wide">Recent</p>
        {communities.slice(0, 3).map(c => (
          <Link key={c._id} to={`/r/${c.name}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark text-reddit-muted">
            <Avatar src={c.icon} name={c.name} size={5} />
            r/{c.name}
          </Link>
        ))}

        <hr className="border-reddit-borderLight dark:border-reddit-borderDark my-2" />

        {/* Communities */}
        <div className="flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-reddit-muted" />
            <p className="text-xs font-bold text-reddit-muted uppercase tracking-wide">Communities</p>
          </div>
          <Link to="/create-community" className="text-reddit-blue text-xs hover:underline">Manage</Link>
        </div>
        {communities.slice(0, showAll ? 10 : 5).map(c => (
          <Link key={c._id} to={`/r/${c.name}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark">
            <Avatar src={c.icon} name={c.name} size={5} />
            r/{c.name}
          </Link>
        ))}
        {communities.length > 5 && (
          <button onClick={() => setShowAll(p => !p)} className="px-3 text-xs text-reddit-blue hover:underline">
            {showAll ? 'See less' : 'See more ▾'}
          </button>
        )}

        <hr className="border-reddit-borderLight dark:border-reddit-borderDark my-2" />

        {/* Resources */}
        <p className="px-3 text-xs font-bold text-reddit-muted uppercase tracking-wide">Resources</p>
        {RESOURCES.map(({ label, icon: Icon, href, badge }) => (
          <a key={label} href={href}
            className="flex items-center gap-3 px-3 py-2 rounded text-sm hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark text-reddit-muted">
            <Icon className="w-5 h-5" />
            {label}
            {badge && <span className="ml-auto text-xs bg-reddit-orange text-white rounded px-1">{badge}</span>}
          </a>
        ))}

        {/* Footer */}
        <div className="px-3 pt-4 pb-8">
          <p className="text-xs text-reddit-muted leading-relaxed">
            <a href="#" className="hover:underline">Best of Reddit</a> · <a href="#" className="hover:underline">Reddit Rules</a> · <a href="#" className="hover:underline">Privacy Policy</a> · <a href="#" className="hover:underline">User Agreement</a> · <a href="#" className="hover:underline">Accessibility</a>
          </p>
          <p className="text-xs text-reddit-muted mt-1">Reddit Inc © 2026. All rights reserved.</p>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/LeftSidebar.jsx frontend/src/features/communities/api.js
git commit -m "feat: add LeftSidebar with nav, communities list, resources, and footer"
```

---

### Task 6: Home Feed Page

**Files:**
- Modify: `frontend/src/pages/HomePage.jsx`

- [ ] **Step 1: Rewrite HomePage.jsx**

```jsx
// frontend/src/pages/HomePage.jsx
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import LeftSidebar from '../components/LeftSidebar';
import PostCard from '../components/PostCard';
import SortTabs from '../components/SortTabs';
import LoadingSpinner from '../components/LoadingSpinner';
import { getFeed } from '../features/posts/api';

export default function HomePage({ sort: initialSort = 'best' }) {
  const [posts, setPosts] = useState([]);
  const [sort, setSort] = useState(initialSort);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    getFeed(sort, 1).then(res => {
      setPosts(res.data.posts);
      setPage(1);
    }).catch(() => setPosts([])).finally(() => setLoading(false));
  }, [sort]);

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark">
      <Navbar />
      <div className="flex max-w-5xl mx-auto pt-14 px-4 gap-6">
        <LeftSidebar />
        <main className="flex-1 min-w-0 py-4 space-y-2">
          {/* Create post bar */}
          <div className="flex items-center gap-2 bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-2">
            <div className="w-8 h-8 rounded bg-reddit-bgLight dark:bg-[#272729]" />
            <input
              placeholder="Create Post"
              readOnly
              onClick={() => window.location.href = '/r/popular/submit'}
              className="flex-1 bg-reddit-bgLight dark:bg-[#272729] rounded border border-reddit-borderLight dark:border-reddit-borderDark px-3 py-1.5 text-sm cursor-pointer"
            />
          </div>

          <SortTabs active={sort} onChange={setSort} />

          {loading ? <LoadingSpinner /> : posts.map(post => (
            <PostCard key={post._id} post={post} />
          ))}

          {!loading && posts.length === 0 && (
            <div className="text-center py-16 text-reddit-muted">
              <p className="text-lg font-medium">No posts yet</p>
              <p className="text-sm">Join some communities to see posts here!</p>
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <aside className="w-80 flex-shrink-0 hidden xl:block py-4">
          <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-4 space-y-3">
            <div className="h-12 bg-reddit-orange rounded" />
            <h2 className="font-bold">Home</h2>
            <p className="text-sm text-reddit-muted">Your personal Reddit frontpage. Come here to check in with your favorite communities.</p>
            <hr className="border-reddit-borderLight dark:border-reddit-borderDark" />
            <button className="w-full bg-reddit-orange text-white rounded-full py-1.5 text-sm font-bold">Create Post</button>
            <button className="w-full border border-reddit-orange text-reddit-orange rounded-full py-1.5 text-sm font-bold">Create Community</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/HomePage.jsx
git commit -m "feat: build Home feed page with sort tabs, post list, and sidebars"
```

---

### Task 7: Community Page

**Files:**
- Modify: `frontend/src/pages/CommunityPage.jsx`

- [ ] **Step 1: Rewrite CommunityPage.jsx**

```jsx
// frontend/src/pages/CommunityPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LeftSidebar from '../components/LeftSidebar';
import PostCard from '../components/PostCard';
import SortTabs from '../components/SortTabs';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import { searchCommunities, joinCommunity, leaveCommunity } from '../features/communities/api';
import { getCommunityPosts } from '../features/posts/api';
import { useAuth } from '../hooks/useAuth';

export default function CommunityPage() {
  const { name } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [sort, setSort] = useState('hot');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    searchCommunities(name).then(res => {
      const found = res.data.communities.find(c => c.name === name.toLowerCase());
      if (found) setCommunity(found);
    });
  }, [name]);

  useEffect(() => {
    if (!community) return;
    setLoading(true);
    getCommunityPosts(community._id, sort)
      .then(res => setPosts(res.data.posts))
      .finally(() => setLoading(false));
  }, [community, sort]);

  const isMember = community?.members?.includes(user?._id);

  const handleJoinLeave = async () => {
    if (!isAuthenticated) return;
    setJoining(true);
    try {
      if (isMember) {
        await leaveCommunity(community._id);
        setCommunity(p => ({ ...p, memberCount: p.memberCount - 1, members: p.members.filter(id => id !== user._id) }));
      } else {
        await joinCommunity(community._id);
        setCommunity(p => ({ ...p, memberCount: p.memberCount + 1, members: [...p.members, user._id] }));
      }
    } finally { setJoining(false); }
  };

  if (!community) return <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark"><Navbar /><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark">
      <Navbar />
      {/* Banner */}
      <div className="h-20 mt-12" style={{ background: community.banner ? `url(${community.banner})` : '#ff4500' }}>
        {community.banner && <img src={community.banner} alt="" className="w-full h-full object-cover" />}
      </div>

      {/* Community header */}
      <div className="bg-white dark:bg-reddit-cardDark">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-end gap-4 pb-3 -mt-4">
            <Avatar src={community.icon} name={community.name} size={16} className="border-4 border-white dark:border-reddit-cardDark" />
            <div className="flex items-center gap-4 pb-1 flex-1">
              <div>
                <h1 className="text-2xl font-bold">r/{community.name}</h1>
              </div>
              <button onClick={handleJoinLeave} disabled={joining}
                className={`ml-auto rounded-full px-5 py-1.5 font-bold text-sm ${isMember ? 'border border-reddit-blue text-reddit-blue hover:bg-blue-50' : 'bg-reddit-blue text-white hover:bg-blue-700'}`}>
                {joining ? '...' : isMember ? 'Joined' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex max-w-5xl mx-auto px-4 gap-6 py-4">
        <LeftSidebar />
        <main className="flex-1 min-w-0 space-y-2">
          {/* Create post bar */}
          <div className="flex items-center gap-2 bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-2">
            <div className="w-8 h-8 rounded bg-reddit-bgLight dark:bg-[#272729]" />
            <Link to={`/r/${name}/submit`}
              className="flex-1 bg-reddit-bgLight dark:bg-[#272729] rounded border border-reddit-borderLight dark:border-reddit-borderDark px-3 py-1.5 text-sm text-reddit-muted">
              Create Post
            </Link>
          </div>
          <SortTabs active={sort} onChange={setSort} />
          {loading ? <LoadingSpinner /> : posts.map(post => <PostCard key={post._id} post={post} />)}
        </main>

        {/* Right sidebar */}
        <aside className="w-72 flex-shrink-0 hidden xl:block space-y-3">
          <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded overflow-hidden">
            <div className="h-8 bg-reddit-orange" />
            <div className="p-3 space-y-2">
              <h3 className="font-bold">About Community</h3>
              <p className="text-sm text-reddit-muted">{community.description}</p>
              <div className="flex gap-6 text-sm">
                <div><p className="font-bold">{community.memberCount?.toLocaleString()}</p><p className="text-reddit-muted text-xs">Members</p></div>
              </div>
              <p className="text-xs text-reddit-muted">Created {new Date(community.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <hr className="border-reddit-borderLight dark:border-reddit-borderDark" />
              <Link to={`/r/${name}/submit`} className="block w-full bg-reddit-orange text-white rounded-full py-1.5 text-sm font-bold text-center">Create Post</Link>
            </div>
          </div>
          {community.rules && (
            <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-3">
              <h3 className="font-bold mb-2">Community Rules</h3>
              <p className="text-sm text-reddit-muted whitespace-pre-line">{community.rules}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/CommunityPage.jsx
git commit -m "feat: build Community page with banner, join/leave, posts feed, and about sidebar"
```

---

### Task 8: Post Detail Page

**Files:**
- Modify: `frontend/src/pages/PostDetailPage.jsx`
- Create: `frontend/src/features/comments/api.js`
- Create: `frontend/src/features/comments/components/CommentThread.jsx`
- Create: `frontend/src/features/comments/components/CommentForm.jsx`
- Create: `frontend/src/features/posts/components/AISummaryModal.jsx`

- [ ] **Step 1: Create comments api.js**

```javascript
// frontend/src/features/comments/api.js
import api from '../../services/api';

export const getComments = (postId, sort = 'best') => api.get(`/comments/post/${postId}?sort=${sort}`);
export const createComment = (data) => api.post('/comments', data);
export const deleteComment = (id) => api.delete(`/comments/${id}`);
export const upvoteComment = (id) => api.post(`/comments/${id}/upvote`);
```

- [ ] **Step 2: Create CommentForm.jsx**

```jsx
// frontend/src/features/comments/components/CommentForm.jsx
import { useState } from 'react';
import { createComment } from '../api';
import { useAuth } from '../../../hooks/useAuth';
import Avatar from '../../../components/Avatar';

export default function CommentForm({ postId, parentCommentId = null, onSubmit, placeholder = 'What are your thoughts?' }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await createComment({ content, post: postId, parentComment: parentCommentId });
      setContent('');
      onSubmit?.(res.data.comment);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-start gap-2">
        <Avatar src={user?.profilePicture} name={user?.username} size={7} />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full border border-reddit-borderLight dark:border-reddit-borderDark rounded p-2 text-sm bg-transparent focus:outline-none focus:border-reddit-blue resize-none"
          />
          <div className="flex justify-end mt-1">
            <button type="submit" disabled={!content.trim() || loading}
              className="bg-reddit-orange text-white rounded-full px-4 py-1 text-sm font-bold disabled:opacity-50">
              {loading ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create CommentThread.jsx**

```jsx
// frontend/src/features/comments/components/CommentThread.jsx
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import Avatar from '../../../components/Avatar';
import { upvoteComment, deleteComment } from '../api';
import { useAuth } from '../../../hooks/useAuth';
import CommentForm from './CommentForm';
import { ArrowUpIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

export default function CommentThread({ comment, replies = [], postId, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [localReplies, setLocalReplies] = useState(replies);
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const { user } = useAuth();

  const handleUpvote = async () => {
    const res = await upvoteComment(comment._id);
    setUpvotes(res.data.upvotes);
  };

  const handleDelete = async () => {
    await deleteComment(comment._id);
    onDelete?.(comment._id);
  };

  const handleReplySubmit = (newReply) => {
    setLocalReplies(p => [...p, newReply]);
    setShowReply(false);
  };

  return (
    <div className="flex gap-2">
      {/* Collapse line */}
      <div className="flex flex-col items-center">
        <button onClick={() => setCollapsed(p => !p)} className="text-reddit-muted hover:text-reddit-textLight">
          {collapsed ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
        {!collapsed && <div className="w-px bg-reddit-borderLight dark:bg-reddit-borderDark flex-1 mt-1 cursor-pointer hover:bg-reddit-orange" onClick={() => setCollapsed(true)} />}
      </div>

      <div className="flex-1 min-w-0">
        {/* Comment header */}
        <div className="flex items-center gap-2 text-xs text-reddit-muted mb-1">
          <Avatar src={comment.author?.profilePicture} name={comment.author?.username} size={5} />
          <Link to={`/u/${comment.author?.username}`} className="font-bold hover:underline text-reddit-textLight dark:text-reddit-textDark">
            {comment.author?.username}
          </Link>
          <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
        </div>

        {!collapsed && (
          <>
            <p className="text-sm mb-2">{comment.content}</p>
            <div className="flex items-center gap-2 text-xs text-reddit-muted">
              <button onClick={handleUpvote} className="flex items-center gap-1 hover:text-reddit-orange">
                <ArrowUpIcon className="w-3.5 h-3.5" /> {upvotes}
              </button>
              <button onClick={() => setShowReply(p => !p)} className="hover:text-reddit-textLight">Reply</button>
              {user?._id === comment.author?._id && (
                <button onClick={handleDelete} className="hover:text-red-500">Delete</button>
              )}
            </div>

            {showReply && (
              <div className="mt-2">
                <CommentForm postId={postId} parentCommentId={comment._id} onSubmit={handleReplySubmit} placeholder="Write a reply..." />
              </div>
            )}

            {/* Replies */}
            {localReplies.length > 0 && (
              <div className="mt-3 space-y-3 pl-2">
                {localReplies.map(reply => (
                  <CommentThread key={reply._id} comment={reply} replies={[]} postId={postId} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create AISummaryModal.jsx**

```jsx
// frontend/src/features/posts/components/AISummaryModal.jsx
import { useState } from 'react';
import Modal from '../../../components/Modal';
import { summarizePost } from '../api';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function AISummaryModal({ postId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpen = async () => {
    setIsOpen(true);
    if (summary) return;
    setLoading(true); setError('');
    try {
      const res = await summarizePost(postId);
      setSummary(res.data.summary);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate summary');
    } finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={handleOpen}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-reddit-muted hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark">
        <SparklesIcon className="w-4 h-4" /> Summarize
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="AI Summary">
        {loading && <div className="text-center py-4 text-reddit-muted">Generating summary...</div>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {summary && <p className="text-sm leading-relaxed">{summary}</p>}
      </Modal>
    </>
  );
}
```

- [ ] **Step 5: Rewrite PostDetailPage.jsx**

```jsx
// frontend/src/pages/PostDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '../components/Navbar';
import LeftSidebar from '../components/LeftSidebar';
import VoteButtons from '../components/VoteButtons';
import Flair from '../components/Flair';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import SortTabs from '../components/SortTabs';
import CommentThread from '../features/comments/components/CommentThread';
import CommentForm from '../features/comments/components/CommentForm';
import AISummaryModal from '../features/posts/components/AISummaryModal';
import { getPost, upvotePost, downvotePost } from '../features/posts/api';
import { getComments } from '../features/comments/api';
import { ShareIcon } from '@heroicons/react/24/outline';

export default function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [replies, setReplies] = useState([]);
  const [sort, setSort] = useState('best');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPost(id), getComments(id, sort)])
      .then(([postRes, commentsRes]) => {
        setPost(postRes.data.post);
        setComments(commentsRes.data.comments);
        setReplies(commentsRes.data.replies);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!post) return;
    getComments(id, sort).then(res => {
      setComments(res.data.comments);
      setReplies(res.data.replies);
    });
  }, [sort]);

  const getRepliesForComment = (commentId) => replies.filter(r => r.parentComment === commentId);

  if (loading) return <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark"><Navbar /><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark">
      <Navbar />
      <div className="flex max-w-5xl mx-auto pt-14 px-4 gap-6">
        <LeftSidebar />
        <main className="flex-1 min-w-0 py-4 space-y-4">
          {/* Post */}
          <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded">
            <div className="flex gap-4 p-4">
              <div className="flex-shrink-0">
                <VoteButtons
                  upvotes={post.upvotes}
                  downvotes={post.downvotes}
                  userVote={null}
                  onUpvote={async () => { const r = await upvotePost(id); setPost(p => ({ ...p, ...r.data })); }}
                  onDownvote={async () => { const r = await downvotePost(id); setPost(p => ({ ...p, ...r.data })); }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs text-reddit-muted mb-2">
                  <Avatar src={post.community?.icon} name={post.community?.name} size={5} />
                  <span className="font-bold text-reddit-textLight dark:text-reddit-textDark">r/{post.community?.name}</span>
                  <span>•</span>
                  <span>Posted by u/{post.author?.username}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                </div>
                <h1 className="text-xl font-semibold mb-1">{post.title}</h1>
                {post.flair && <div className="mb-2"><Flair text={post.flair} /></div>}
                {post.image && <img src={post.image} alt="" className="max-w-full rounded mb-2" />}
                {post.content && <p className="text-sm text-reddit-textLight dark:text-reddit-textDark">{post.content}</p>}
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => navigator.clipboard.writeText(window.location.href)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-reddit-muted hover:bg-reddit-borderLight dark:hover:bg-reddit-borderDark">
                    <ShareIcon className="w-4 h-4" /> Share
                  </button>
                  <AISummaryModal postId={id} />
                </div>
              </div>
            </div>
          </div>

          {/* Comment form */}
          <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-4">
            <CommentForm postId={id} onSubmit={c => setComments(p => [c, ...p])} />
          </div>

          {/* Sort + comments */}
          <div className="bg-white dark:bg-reddit-cardDark border border-reddit-borderLight dark:border-reddit-borderDark rounded p-4 space-y-4">
            <SortTabs active={sort} onChange={setSort} />
            {comments.map(comment => (
              <CommentThread
                key={comment._id}
                comment={comment}
                replies={getRepliesForComment(comment._id.toString())}
                postId={id}
                onDelete={(cid) => setComments(p => p.filter(c => c._id !== cid))}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/PostDetailPage.jsx frontend/src/features/comments/ frontend/src/features/posts/components/
git commit -m "feat: build Post detail page with comments, nested replies, voting, and AI summary"
```

---

### Task 9: Create Post Page

**Files:**
- Modify: `frontend/src/pages/CreatePostPage.jsx`

- [ ] **Step 1: Rewrite CreatePostPage.jsx**

```jsx
// frontend/src/pages/CreatePostPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LeftSidebar from '../components/LeftSidebar';
import { createPost } from '../features/posts/api';
import { searchCommunities } from '../features/communities/api';
import { PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const TABS = ['text', 'image'];

export default function CreatePostPage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [flair, setFlair] = useState('');
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (name) {
      searchCommunities(name).then(res => {
        const found = res.data.communities.find(c => c.name === name.toLowerCase());
        if (found) setCommunity(found);
      });
    }
  }, [name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!community) { setError('Select a community'); return; }
    setLoading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('community', community._id);
      if (flair) formData.append('flair', flair);
      if (image) formData.append('image', image);
      const res = await createPost(formData);
      navigate(`/post/${res.data.post._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark">
      <Navbar />
      <div className="flex max-w-5xl mx-auto pt-14 px-4 gap-6">
        <LeftSidebar />
        <main className="flex-1 min-w-0 py-4">
          <h1 className="text-lg font-bold mb-4 border-b border-reddit-borderLight dark:border-reddit-borderDark pb-2">Create a post</h1>

          {/* Tabs */}
          <div className="flex border border-reddit-borderLight dark:border-reddit-borderDark rounded-t overflow-hidden mb-0">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium capitalize border-b-2 ${tab === t ? 'border-reddit-textLight dark:border-reddit-textDark' : 'border-transparent text-reddit-muted'}`}>
                {t === 'text' ? <DocumentTextIcon className="w-5 h-5" /> : <PhotoIcon className="w-5 h-5" />}
                {t === 'text' ? 'Post' : 'Image'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-reddit-cardDark border border-t-0 border-reddit-borderLight dark:border-reddit-borderDark rounded-b p-4 space-y-3">
            {/* Community selector */}
            <div className="text-sm text-reddit-muted">
              Posting to: <span className="font-bold text-reddit-textLight dark:text-reddit-textDark">{community ? `r/${community.name}` : 'Select a community'}</span>
            </div>

            {/* Title */}
            <div>
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={300}
                required
                className="w-full border border-reddit-borderLight dark:border-reddit-borderDark rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-reddit-blue"
              />
              <p className="text-right text-xs text-reddit-muted mt-1">{title.length}/300</p>
            </div>

            {/* Content or Image */}
            {tab === 'text' ? (
              <textarea
                placeholder="Text (optional)"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={6}
                className="w-full border border-reddit-borderLight dark:border-reddit-borderDark rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-reddit-blue resize-none"
              />
            ) : (
              <div className="border-2 border-dashed border-reddit-borderLight dark:border-reddit-borderDark rounded p-8 text-center">
                <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} className="hidden" id="image-upload" />
                <label htmlFor="image-upload" className="cursor-pointer">
                  {image ? (
                    <img src={URL.createObjectURL(image)} alt="Preview" className="max-h-64 mx-auto rounded" />
                  ) : (
                    <>
                      <PhotoIcon className="w-12 h-12 text-reddit-muted mx-auto mb-2" />
                      <p className="text-sm text-reddit-muted">Drag and drop or click to upload</p>
                    </>
                  )}
                </label>
              </div>
            )}

            {/* Flair */}
            {community?.flairs?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {community.flairs.map(f => (
                  <button key={f} type="button" onClick={() => setFlair(f === flair ? '' : f)}
                    className={`border rounded-full px-3 py-1 text-xs ${flair === f ? 'bg-reddit-blue text-white border-reddit-blue' : 'border-reddit-borderLight dark:border-reddit-borderDark text-reddit-muted'}`}>
                    {f}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => navigate(-1)}
                className="border border-reddit-borderLight dark:border-reddit-borderDark rounded-full px-4 py-1.5 text-sm font-bold">
                Cancel
              </button>
              <button type="submit" disabled={loading || !title.trim()}
                className="bg-reddit-orange text-white rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-50">
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run full frontend test suite**

```bash
cd frontend && npx vitest run
```
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/CreatePostPage.jsx
git commit -m "feat: build Create Post page with text/image tabs, flair selector, and community display"
```
