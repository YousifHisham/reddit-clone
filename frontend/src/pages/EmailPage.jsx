import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp } from '../api/auth';

export default function EmailPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const data = await sendOtp(email);
    setLoading(false);
    if (data.success) {
      navigate('/verify-otp', { state: { email } });
    } else {
      setError(data.message || 'Failed to send OTP. Try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
            <circle cx="10" cy="10" r="10" fill="#FF4500" />
            <path
              d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.08 2.13.45a1 1 0 1 0 .14-.53l-2.38-.5a.27.27 0 0 0-.32.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .57-1.37zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.79 3.58 3.58 0 0 1-2.85-.79.19.19 0 0 1 .27-.27 3.23 3.23 0 0 0 2.58.65 3.23 3.23 0 0 0 2.58-.65.19.19 0 0 1 .27.27zm-.17-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"
              fill="white"
            />
          </svg>
        </div>
        <h1 className="auth-title">Log in or sign up</h1>
        <p className="auth-subtitle">By continuing, you agree to our User Agreement and acknowledge that you understand the Privacy Policy.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
              autoFocus
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-btn" disabled={loading || !email}>
            {loading ? 'Sending...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
