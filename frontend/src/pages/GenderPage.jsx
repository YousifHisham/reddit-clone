import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const GENDERS = [
  { id: 'man', label: 'Man' },
  { id: 'woman', label: 'Woman' },
  { id: 'nonbinary', label: 'Nonbinary' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function GenderPage() {
  const [selected, setSelected] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const token = location.state?.token || localStorage.getItem('accessToken');

  const proceed = (gender) =>
    navigate('/interests', { state: { token, gender } });

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--bg)', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '32px 40px 40px', boxShadow: '0 4px 32px rgba(0,0,0,0.3)', position: 'relative' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => proceed('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '14px', fontWeight: '700', fontFamily: 'var(--font)' }}
          >
            Skip
          </button>
        </div>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
            <circle cx="10" cy="10" r="10" fill="#FF4500" />
            <path
              d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 .14-.53l-2.38-.5a.27.27 0 0 0-.32.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .57-1.37zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.79 3.58 3.58 0 0 1-2.85-.79.19.19 0 0 1 .27-.27 3.23 3.23 0 0 0 2.58.65 3.23 3.23 0 0 0 2.58-.65.19.19 0 0 1 .27.27zm-.17-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"
              fill="white"
            />
          </svg>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)', textAlign: 'center', margin: '0 0 8px' }}>
          Tell us about you
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center', margin: '0 0 28px', lineHeight: '1.5' }}>
          Personalizing your recommendations helps us find the best content for you.
        </p>

        {/* Gender options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
          {GENDERS.map((g) => {
            const isSelected = selected === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelected(g.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 16px', borderRadius: '12px',
                  border: `1px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`,
                  background: isSelected ? 'rgba(255,69,0,0.08)' : 'var(--pill-bg)',
                  cursor: 'pointer', fontFamily: 'var(--font)',
                  transition: 'border-color 0.15s, background 0.15s', textAlign: 'left',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isSelected ? 'var(--orange)' : 'var(--muted)'}`,
                  background: isSelected ? 'var(--orange)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                  {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                </div>
                <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text)' }}>{g.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => proceed(selected)}
          disabled={!selected}
          style={{
            width: '100%', padding: '14px', borderRadius: '999px', border: 'none',
            background: selected ? 'var(--orange)' : 'var(--border)',
            color: selected ? '#fff' : 'var(--muted)',
            fontSize: '16px', fontWeight: '700',
            cursor: selected ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font)', transition: 'background 0.2s',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
