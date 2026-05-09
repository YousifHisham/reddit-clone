import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { completeProfile } from '../api/auth';

const INTERESTS = [
  { id: 'art',          label: 'Art',          emoji: '🎨' },
  { id: 'fashion',      label: 'Beauty',        emoji: '💄' },
  { id: 'finance',      label: 'Career',        emoji: '💼' },
  { id: 'movies',       label: 'Entertainment', emoji: '🎬' },
  { id: 'finance2',     label: 'Finance',       emoji: '📊' },
  { id: 'food',         label: 'Food',          emoji: '🍕' },
  { id: 'gaming',       label: 'Gaming',        emoji: '🎮' },
  { id: 'news',         label: 'News',          emoji: '📰' },
  { id: 'sports',       label: 'Sports',        emoji: '⚾' },
  { id: 'technology',   label: 'Technology',    emoji: '💻' },
  { id: 'travel',       label: 'Travel',        emoji: '📍' },
  { id: 'fitness',      label: 'Wellness',      emoji: '🌱' },
];

export default function InterestsPage() {
  const [selected, setSelected] = useState([]);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = location.state?.token || localStorage.getItem('accessToken');
  const gender = location.state?.gender || '';

  const toggle = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!username.trim()) return setError('Please enter a username.');
    if (selected.length < 3) return setError('Please select at least 3 interests.');
    setError('');
    setLoading(true);
    const data = await completeProfile({ username, gender, interests: selected }, token);
    setLoading(false);
    if (data.success) navigate('/home');
    else setError(data.message || 'Something went wrong.');
  };

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '32px 40px 40px', boxShadow: '0 4px 32px rgba(0,0,0,0.3)', position: 'relative' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font)' }}>
            Skip
          </button>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', textAlign: 'center', margin: '0 0 8px' }}>Choose your interests</h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center', margin: '0 0 28px', lineHeight: '1.5' }}>
          Your choices will determine the options you see next.
        </p>

        {/* Username input */}
        <input
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '20px', padding: '10px 16px', fontSize: '14px', outline: 'none', background: 'var(--pill-bg)', color: 'var(--text)', marginBottom: '20px', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
          minLength={3}
          maxLength={20}
        />

        {/* Interests grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {INTERESTS.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontFamily: 'var(--font)',
                }}
              >
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  border: `2px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`,
                  background: isSelected ? 'rgba(255,69,0,0.12)' : 'var(--pill-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', transition: 'border-color 0.15s, background 0.15s',
                }}>
                  {item.emoji}
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: isSelected ? 'var(--orange)' : 'var(--text)', textAlign: 'center' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {error && <p style={{ color: '#ff4500', fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}

        {/* Continue button */}
        <button
          onClick={handleSubmit}
          disabled={loading || selected.length < 3 || !username.trim()}
          style={{
            width: '100%', padding: '14px', borderRadius: '999px', border: 'none',
            background: selected.length >= 3 && username.trim() ? 'var(--orange)' : 'var(--border)',
            color: selected.length >= 3 && username.trim() ? '#fff' : 'var(--muted)',
            fontSize: '16px', fontWeight: '700', cursor: selected.length >= 3 && username.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font)', transition: 'background 0.2s',
          }}
        >
          {loading ? 'Setting up...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
