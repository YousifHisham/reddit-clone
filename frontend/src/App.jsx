import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EmailPage from './pages/EmailPage';
import OtpPage from './pages/OtpPage';
import InterestsPage from './pages/InterestsPage';
import HomePage from './pages/HomePage';
import SubmitPage from './pages/SubmitPage';
import PostDetailPage from './pages/PostDetailPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  return token ? children : <Navigate to="/Login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/Login" element={<EmailPage />} />
        <Route path="/verify-otp" element={<OtpPage />} />
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
        <Route path="*" element={<Navigate to="/Login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
