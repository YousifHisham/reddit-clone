import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import EmailPage from './pages/EmailPage';
import OtpPage from './pages/OtpPage';
import GenderPage from './pages/GenderPage';
import InterestsPage from './pages/InterestsPage';
import HomePage from './pages/HomePage';
import SubmitPage from './pages/SubmitPage';
import PostDetailPage from './pages/PostDetailPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import AvatarEditPage from './pages/AvatarEditPage';
import PopularPage from './pages/PopularPage';
import ExplorePage from './pages/ExplorePage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  return token ? children : <Navigate to="/Login" replace />;
}

export default function App() {
  if (!document.documentElement.getAttribute('data-theme')) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
    <BrowserRouter>
      <Routes>
        <Route path="/Login" element={<EmailPage />} />
        <Route path="/verify-otp" element={<OtpPage />} />
        <Route path="/gender" element={<GenderPage />} />
        <Route path="/interests" element={<InterestsPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit"
          element={
            <ProtectedRoute>
              <SubmitPage />
            </ProtectedRoute>
          }
        />
        <Route path="/post/:id" element={<PostDetailPage />} />
        <Route path="/r/:name" element={<CommunityPage />} />
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/popular" element={<PopularPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route
          path="/avatar/edit"
          element={
            <ProtectedRoute>
              <AvatarEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/Login" replace />} />
      </Routes>
    </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
