import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { completeProfile } from '../api/auth';

const INTERESTS = [
  { id: 'gaming', label: '🎮 Gaming' },
  { id: 'technology', label: '💻 Technology' },
  { id: 'science', label: '🔬 Science' },
  { id: 'sports', label: '⚽ Sports' },
  { id: 'music', label: '🎵 Music' },
  { id: 'movies', label: '🎬 Movies & TV' },
  { id: 'news', label: '📰 News & Politics' },
  { id: 'art', label: '🎨 Art & Design' },
  { id: 'food', label: '🍕 Food & Cooking' },
  { id: 'fitness', label: '💪 Fitness & Health' },
  { id: 'travel', label: '✈️ Travel' },
  { id: 'books', label: '📚 Books & Literature' },
  { id: 'finance', label: '💰 Finance & Investing' },
  { id: 'nature', label: '🌿 Nature & Animals' },
  { id: 'humor', label: '😂 Humor & Memes' },
  { id: 'fashion', label: '👗 Fashion & Beauty' },
];

export default function InterestsPage() {
  const [selected, setSelected] = useState([]);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = location.state?.token || localStorage.getItem('accessToken');

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return setError('Please enter a username.');
    if (selected.length < 3) return setError('Please select at least 3 interests.');
    setError('');
    setLoading(true);
    const data = await completeProfile({ username, interests: selected }, token);
    setLoading(false);
    if (data.success) {
      navigate('/home');
    } else {
      setError(data.message || 'Something went wrong.');
    }
  };

  return (
    <div className="auth-container interests-container">
      <div className="auth-card interests-card">
        <div className="auth-logo">
          <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
            <circle cx="10" cy="10" r="10" fill="#FF4500" />
            <path
              d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 .14-.53l-2.38-.5a.27.27 0 0 0-.32.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .57-1.37zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.79 3.58 3.58 0 0 1-2.85-.79.19.19 0 0 1 .27-.27 3.23 3.23 0 0 0 2.58.65 3.23 3.23 0 0 0 2.58-.65.19.19 0 0 1 .27.27zm-.17-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"
              fill="white"
            />
          </svg>
        </div>
        <h1 className="auth-title">What are you into?</h1>
        <p className="auth-subtitle">Select at least 3 interests to personalize your feed.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
              minLength={3}
              maxLength={20}
              required
            />
          </div>

          <div className="interests-grid">
            {INTERESTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`interest-chip ${selected.includes(item.id) ? 'selected' : ''}`}
                onClick={() => toggle(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="interests-count">
            {selected.length} selected {selected.length < 3 && '(min 3)'}
          </p>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="auth-btn"
            disabled={loading || selected.length < 3 || !username.trim()}
          >
            {loading ? 'Setting up...' : 'Continue to Reddit'}
          </button>
        </form>
      </div>
    </div>
  );
}
