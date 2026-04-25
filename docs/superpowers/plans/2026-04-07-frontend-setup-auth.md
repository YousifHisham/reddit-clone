# Frontend Setup & Auth UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the React frontend with Vite and Tailwind, set up React Router, implement AuthContext with JWT storage, and build the full multi-step registration and login UI.

**Architecture:** Vite + React 18. Routing via React Router v6. Global auth state in AuthContext (JWT in localStorage). Axios instance with interceptor for 401 auto-logout. Feature-based folder structure. IBM Plex Sans font via Google Fonts.

**Tech Stack:** React 18, Vite, Tailwind CSS v3, React Router v6, Axios, socket.io-client, firebase, Vitest, React Testing Library

---

## File Structure

```
frontend/src/
├── context/
│   ├── AuthContext.jsx          # JWT state, login/logout, current user
│   └── ThemeContext.jsx         # dark/light mode toggle
├── services/
│   └── api.js                  # Axios instance with base URL + auth interceptor
├── hooks/
│   └── useAuth.js              # useContext(AuthContext) shorthand
├── features/
│   └── auth/
│       ├── api.js              # sendOtp, verifyOtp, completeProfile, getMe
│       ├── components/
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   └── ProtectedRoute.jsx
│       └── __tests__/
│           └── auth.test.jsx
├── pages/
│   └── NotFoundPage.jsx
├── components/
│   └── LoadingSpinner.jsx
├── App.jsx                     # Router + all routes
└── main.jsx                    # Vite entry point
```

---

### Task 1: Initialize Frontend Project

**Files:**
- Create: `frontend/` (Vite project)
- Create: `frontend/tailwind.config.js`
- Create: `frontend/src/index.css`

- [ ] **Step 1: Create Vite + React project**

```bash
cd "/Users/yousif/ASU/SEMESTER 8/IP/PROJECT/REDDIT CLONE"
npm create vite@latest frontend -- --template react
cd frontend && npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom axios socket.io-client firebase
npm install -D tailwindcss postcss autoprefixer vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind — tailwind.config.js**

```javascript
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        reddit: {
          orange: '#ff4500',
          blue: '#0079d3',
          downvote: '#7193ff',
          bgLight: '#dae0e6',
          bgDark: '#1a1a1b',
          cardLight: '#ffffff',
          cardDark: '#272729',
          borderLight: '#edeff1',
          borderDark: '#343536',
          textLight: '#1c1c1c',
          textDark: '#d7dadc',
          muted: '#878a8c',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Set up index.css**

```css
/* frontend/src/index.css */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-reddit-bgLight dark:bg-reddit-bgDark text-reddit-textLight dark:text-reddit-textDark font-sans;
}
```

- [ ] **Step 5: Configure Vitest in vite.config.js**

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
  },
});
```

- [ ] **Step 6: Create test-setup.js**

```javascript
// frontend/src/test-setup.js
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Add test script to package.json**

In `frontend/package.json`, add to scripts:
```json
"test": "vitest"
```

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "chore: initialize React frontend with Vite, Tailwind CSS, and IBM Plex Sans"
```

---

### Task 2: Axios Instance & API Service

**Files:**
- Create: `frontend/src/services/api.js`

- [ ] **Step 1: Write failing test**

```javascript
// frontend/src/services/__tests__/api.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('API service', () => {
  it('exports an axios instance', async () => {
    const { default: api } = await import('../api.js');
    expect(api.defaults.baseURL).toBe('http://localhost:5000/api');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/services/__tests__/api.test.js
```
Expected: FAIL

- [ ] **Step 3: Create api.js**

```javascript
// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

- [ ] **Step 4: Create .env file**

```
# frontend/.env
VITE_API_URL=http://localhost:5000/api
```

Add `frontend/.env` to `.gitignore` and create `frontend/.env.example`:
```
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/services/__tests__/api.test.js
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/ frontend/.env.example
git commit -m "feat: add Axios instance with JWT interceptor and 401 auto-logout"
```

---

### Task 3: AuthContext & ThemeContext

**Files:**
- Create: `frontend/src/context/AuthContext.jsx`
- Create: `frontend/src/context/ThemeContext.jsx`
- Create: `frontend/src/hooks/useAuth.js`

- [ ] **Step 1: Write failing test**

```javascript
// frontend/src/context/__tests__/AuthContext.test.jsx
import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from '../AuthContext';
import { useAuth } from '../../hooks/useAuth';
import { vi } from 'vitest';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { user: { _id: '1', username: 'testuser' } } }) },
}));

const TestComponent = () => {
  const { user, isAuthenticated } = useAuth();
  return <div>{isAuthenticated ? `Hello ${user.username}` : 'Not logged in'}</div>;
};

describe('AuthContext', () => {
  it('shows not logged in when no token', () => {
    localStorage.removeItem('token');
    render(<AuthProvider><TestComponent /></AuthProvider>);
    expect(screen.getByText('Not logged in')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/context/__tests__/AuthContext.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Create AuthContext.jsx**

```jsx
// frontend/src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
```

- [ ] **Step 4: Create useAuth.js**

```javascript
// frontend/src/hooks/useAuth.js
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
```

- [ ] **Step 5: Create ThemeContext.jsx**

```jsx
// frontend/src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/context/__tests__/AuthContext.test.jsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/context/ frontend/src/hooks/
git commit -m "feat: add AuthContext with JWT persistence and ThemeContext for dark mode"
```

---

### Task 4: App Router Setup

**Files:**
- Modify: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/features/auth/components/ProtectedRoute.jsx`
- Create: `frontend/src/pages/NotFoundPage.jsx`

- [ ] **Step 1: Create ProtectedRoute**

```jsx
// frontend/src/features/auth/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-reddit-orange" /></div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
```

- [ ] **Step 2: Create NotFoundPage**

```jsx
// frontend/src/pages/NotFoundPage.jsx
const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center h-screen gap-4">
    <h1 className="text-4xl font-bold">404</h1>
    <p className="text-reddit-muted">Page not found</p>
    <a href="/" className="text-reddit-blue hover:underline">Go home</a>
  </div>
);
export default NotFoundPage;
```

- [ ] **Step 3: Create App.jsx with all routes**

```jsx
// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import LoginPage from './features/auth/components/LoginPage';
import RegisterPage from './features/auth/components/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

// Lazy imports for remaining pages (add as each plan is implemented)
import { lazy, Suspense } from 'react';
const HomePage = lazy(() => import('./pages/HomePage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const CreatePostPage = lazy(() => import('./pages/CreatePostPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const Fallback = () => <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-reddit-orange" /></div>;

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/r/popular" element={<ProtectedRoute><HomePage sort="popular" /></ProtectedRoute>} />
              <Route path="/r/all" element={<ProtectedRoute><HomePage sort="all" /></ProtectedRoute>} />
              <Route path="/r/:name" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
              <Route path="/r/:name/submit" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
              <Route path="/post/:id" element={<ProtectedRoute><PostDetailPage /></ProtectedRoute>} />
              <Route path="/u/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
              <Route path="/chat/:userId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Update main.jsx**

```jsx
// frontend/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 5: Create placeholder page stubs** (so lazy imports don't crash)

Create these files with minimal content — they'll be filled in later plans:
```jsx
// frontend/src/pages/HomePage.jsx
export default function HomePage() { return <div>Home Feed</div>; }

// frontend/src/pages/CommunityPage.jsx
export default function CommunityPage() { return <div>Community</div>; }

// frontend/src/pages/PostDetailPage.jsx
export default function PostDetailPage() { return <div>Post Detail</div>; }

// frontend/src/pages/CreatePostPage.jsx
export default function CreatePostPage() { return <div>Create Post</div>; }

// frontend/src/pages/ProfilePage.jsx
export default function ProfilePage() { return <div>Profile</div>; }

// frontend/src/pages/SearchPage.jsx
export default function SearchPage() { return <div>Search</div>; }

// frontend/src/pages/ChatPage.jsx
export default function ChatPage() { return <div>Chat</div>; }

// frontend/src/pages/NotificationsPage.jsx
export default function NotificationsPage() { return <div>Notifications</div>; }

// frontend/src/pages/SettingsPage.jsx
export default function SettingsPage() { return <div>Settings</div>; }
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx frontend/src/main.jsx frontend/src/features/auth/components/ProtectedRoute.jsx frontend/src/pages/
git commit -m "feat: set up React Router with all routes and protected route guard"
```

---

### Task 5: Auth Feature API

**Files:**
- Create: `frontend/src/features/auth/api.js`

- [ ] **Step 1: Create auth API functions**

```javascript
// frontend/src/features/auth/api.js
import api from '../../services/api';

export const sendOtp = (email) => api.post('/auth/send-otp', { email });

export const verifyOtp = (email, otp) => api.post('/auth/verify-otp', { email, otp });

export const completeProfile = (data) => api.post('/auth/complete-profile', data);

export const checkUsername = (username) => api.get(`/auth/check-username?username=${username}`);

export const getMe = () => api.get('/auth/me');

export const logout = () => api.post('/auth/logout');
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/auth/api.js
git commit -m "feat: add auth API functions (sendOtp, verifyOtp, completeProfile)"
```

---

### Task 6: Login Page

**Files:**
- Create: `frontend/src/features/auth/components/LoginPage.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// frontend/src/features/auth/__tests__/LoginPage.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import LoginPage from '../components/LoginPage';
import { vi } from 'vitest';
import * as authApi from '../api';

vi.mock('../api');

const renderLogin = () => render(
  <MemoryRouter>
    <AuthContext.Provider value={{ login: vi.fn(), isAuthenticated: false, loading: false }}>
      <LoginPage />
    </AuthContext.Provider>
  </MemoryRouter>
);

describe('LoginPage', () => {
  it('shows email input on step 1', () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('shows OTP input after email submit', async () => {
    authApi.sendOtp = vi.fn().mockResolvedValue({ data: { success: true } });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(screen.getByPlaceholderText(/6-digit/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/features/auth/__tests__/LoginPage.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Create LoginPage.jsx**

```jsx
// frontend/src/features/auth/components/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendOtp, verifyOtp, getMe } from '../api';
import { useAuth } from '../../../hooks/useAuth';

export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await sendOtp(email);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await verifyOtp(email, otp);
      const { token, isNewUser } = res.data;
      localStorage.setItem('token', token);
      const meRes = await getMe();
      login(token, meRes.data.user);
      navigate(isNewUser ? '/register' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark flex items-center justify-center">
      <div className="bg-white dark:bg-reddit-cardDark rounded-lg p-8 w-full max-w-sm shadow-lg">
        <div className="flex justify-center mb-6">
          <img src="/reddit-logo.svg" alt="Reddit" className="h-10" />
        </div>
        <h1 className="text-xl font-bold text-center mb-2">Log In</h1>
        <p className="text-reddit-muted text-sm text-center mb-6">
          By continuing, you agree to our User Agreement and acknowledge our Privacy Policy.
        </p>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-reddit-borderLight dark:border-reddit-borderDark rounded-full px-4 py-2 bg-transparent focus:outline-none focus:border-reddit-blue text-sm"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-reddit-orange text-white rounded-full py-2 font-bold text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-reddit-muted">Enter the 6-digit code sent to <strong>{email}</strong></p>
            <input
              type="text"
              placeholder="6-digit code"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
              required
              className="w-full border border-reddit-borderLight dark:border-reddit-borderDark rounded-full px-4 py-2 bg-transparent focus:outline-none focus:border-reddit-blue text-sm text-center tracking-widest"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-reddit-orange text-white rounded-full py-2 font-bold text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Log In'}
            </button>
            <button type="button" onClick={() => { sendOtp(email); setError(''); }}
              className="w-full text-reddit-blue text-sm hover:underline">
              Resend OTP
            </button>
          </form>
        )}

        <p className="text-center text-sm mt-4 text-reddit-muted">
          New to Reddit? <Link to="/register" className="text-reddit-blue hover:underline font-bold">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/features/auth/__tests__/LoginPage.test.jsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/components/LoginPage.jsx
git commit -m "feat: add Login page with 2-step OTP flow"
```

---

### Task 7: Multi-Step Register Page

**Files:**
- Create: `frontend/src/features/auth/components/RegisterPage.jsx`

- [ ] **Step 1: Write failing test**

```jsx
// frontend/src/features/auth/__tests__/RegisterPage.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import RegisterPage from '../components/RegisterPage';
import { vi } from 'vitest';

const renderRegister = (step = 1) => render(
  <MemoryRouter>
    <AuthContext.Provider value={{ user: { _id: '1' }, login: vi.fn(), updateUser: vi.fn(), isAuthenticated: true, loading: false }}>
      <RegisterPage initialStep={step} />
    </AuthContext.Provider>
  </MemoryRouter>
);

describe('RegisterPage', () => {
  it('shows username input on step 1', () => {
    renderRegister(1);
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
  });

  it('shows gender options on step 2', () => {
    renderRegister(2);
    expect(screen.getByText(/man/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/features/auth/__tests__/RegisterPage.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Create RegisterPage.jsx**

```jsx
// frontend/src/features/auth/components/RegisterPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeProfile, checkUsername } from '../api';
import { useAuth } from '../../../hooks/useAuth';

const INTERESTS = ['Technology', 'Gaming', 'Sports', 'Science', 'Arts', 'Music', 'Movies', 'Food', 'Travel', 'News', 'Finance', 'Health'];
const TAGS_BY_INTEREST = {
  Technology: ['#python', '#webdev', '#AI', '#linux', '#react', '#gaming'],
  Gaming: ['#pcgaming', '#playstation', '#xbox', '#indiegames', '#esports'],
  Sports: ['#nba', '#nfl', '#soccer', '#tennis', '#formula1'],
  Science: ['#space', '#biology', '#physics', '#climate', '#medicine'],
  Arts: ['#drawing', '#photography', '#design', '#architecture', '#painting'],
  Music: ['#hiphop', '#rock', '#pop', '#jazz', '#classical'],
  Movies: ['#movies', '#tvshows', '#anime', '#documentary', '#horror'],
  Food: ['#cooking', '#recipes', '#vegan', '#baking', '#streetfood'],
  Travel: ['#backpacking', '#luxurytravel', '#photography', '#adventure'],
  News: ['#worldnews', '#politics', '#localnews', '#environment'],
  Finance: ['#investing', '#crypto', '#personalfinance', '#stocks'],
  Health: ['#fitness', '#mentalhealth', '#nutrition', '#yoga', '#running'],
};

const GENDERS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say'];

export default function RegisterPage({ initialStep = 1 }) {
  const [step, setStep] = useState(initialStep);
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [gender, setGender] = useState('');
  const [interests, setInterests] = useState([]);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  // Debounced username check
  useEffect(() => {
    if (!username || username.length < 3) { setUsernameAvailable(null); return; }
    const timer = setTimeout(async () => {
      const res = await checkUsername(username);
      setUsernameAvailable(res.data.available);
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const toggleInterest = (interest) => {
    setInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
  };

  const toggleTag = (tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleFinish = async () => {
    setLoading(true); setError('');
    try {
      const res = await completeProfile({ username, gender, interests, tags });
      updateUser(res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const progressSteps = ['Username', 'Gender', 'Interests', 'Tags'];

  return (
    <div className="min-h-screen bg-reddit-bgLight dark:bg-reddit-bgDark flex items-center justify-center p-4">
      <div className="bg-white dark:bg-reddit-cardDark rounded-lg p-8 w-full max-w-md shadow-lg">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="/reddit-logo.svg" alt="Reddit" className="h-8" />
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {progressSteps.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-reddit-orange' : 'bg-reddit-borderLight dark:bg-reddit-borderDark'}`} />
          ))}
        </div>

        {/* Step 1: Username */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Create your username</h2>
            <p className="text-sm text-reddit-muted">This is what people will know you as on Reddit.</p>
            <div className="relative">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-reddit-borderLight dark:border-reddit-borderDark rounded-full px-4 py-2 bg-transparent focus:outline-none focus:border-reddit-blue text-sm"
              />
              {username.length >= 3 && (
                <span className={`absolute right-4 top-2 text-xs ${usernameAvailable ? 'text-green-500' : 'text-red-500'}`}>
                  {usernameAvailable === null ? '...' : usernameAvailable ? '✓ Available' : '✗ Taken'}
                </span>
              )}
            </div>
            <button
              onClick={() => { if (usernameAvailable) setStep(2); }}
              disabled={!usernameAvailable}
              className="w-full bg-reddit-orange text-white rounded-full py-2 font-bold text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Gender */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">What's your gender?</h2>
            <p className="text-sm text-reddit-muted">This helps us personalize your experience. You can skip this.</p>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map(g => (
                <button key={g} onClick={() => setGender(g)}
                  className={`border rounded-full py-2 text-sm font-medium ${gender === g ? 'border-reddit-orange text-reddit-orange bg-orange-50 dark:bg-orange-900/20' : 'border-reddit-borderLight dark:border-reddit-borderDark'}`}>
                  {g}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setGender(''); setStep(3); }} className="flex-1 border border-reddit-borderLight dark:border-reddit-borderDark rounded-full py-2 text-sm">Skip</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-reddit-orange text-white rounded-full py-2 font-bold text-sm">Continue</button>
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">What are you interested in?</h2>
            <p className="text-sm text-reddit-muted">Select at least 3 to personalize your feed.</p>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {INTERESTS.map(interest => (
                <button key={interest} onClick={() => toggleInterest(interest)}
                  className={`border rounded-full px-4 py-1.5 text-sm font-medium ${interests.includes(interest) ? 'bg-reddit-orange text-white border-reddit-orange' : 'border-reddit-borderLight dark:border-reddit-borderDark'}`}>
                  {interest}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(4)} disabled={interests.length < 1}
              className="w-full bg-reddit-orange text-white rounded-full py-2 font-bold text-sm disabled:opacity-50">
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Tags */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Choose topics you like</h2>
            <p className="text-sm text-reddit-muted">Based on your interests. Select as many as you like.</p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {interests.map(interest => (
                <div key={interest}>
                  <p className="text-xs font-bold text-reddit-muted uppercase mb-1">{interest}</p>
                  <div className="flex flex-wrap gap-1">
                    {(TAGS_BY_INTEREST[interest] || []).map(tag => (
                      <button key={tag} onClick={() => toggleTag(tag)}
                        className={`border rounded-full px-3 py-1 text-xs ${tags.includes(tag) ? 'bg-reddit-orange text-white border-reddit-orange' : 'border-reddit-borderLight dark:border-reddit-borderDark'}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button onClick={handleFinish} disabled={loading}
              className="w-full bg-reddit-orange text-white rounded-full py-2 font-bold text-sm disabled:opacity-50">
              {loading ? 'Setting up...' : 'Start exploring Reddit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/features/auth/__tests__/RegisterPage.test.jsx
```
Expected: PASS

- [ ] **Step 5: Run full frontend test suite**

```bash
cd frontend && npx vitest run
```
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/auth/components/RegisterPage.jsx
git commit -m "feat: add 4-step registration page (username, gender, interests, tags)"
```
