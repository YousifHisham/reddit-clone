import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOtp, sendOtp } from '../api/auth';

export default function OtpPage() {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const refs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) navigate('/');
    refs.current[0]?.focus();
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    if (value && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      refs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length < 6) return;
    setError('');
    setLoading(true);
    const data = await verifyOtp(email, otp);
    setLoading(false);
    if (data.success) {
      localStorage.setItem('accessToken', data.accessToken);
      if (data.isNewUser) {
        navigate('/gender', { state: { token: data.accessToken } });
      } else {
        navigate('/home');
      }
    } else {
      setError(data.message || 'Invalid OTP. Try again.');
      setDigits(Array(6).fill(''));
      refs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    setResent(false);
    await sendOtp(email);
    setResent(true);
    setDigits(Array(6).fill(''));
    refs.current[0]?.focus();
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
        <h1 className="auth-title">Enter verification code</h1>
        <p className="auth-subtitle">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="otp-boxes" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`otp-box ${d ? 'filled' : ''}`}
              />
            ))}
          </div>
          {error && <p className="auth-error">{error}</p>}
          {resent && <p className="auth-success">Code resent!</p>}
          <button
            type="submit"
            className="auth-btn"
            disabled={loading || digits.join('').length < 6}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
        <p className="auth-link">
          Didn&apos;t receive a code?{' '}
          <button className="link-btn" onClick={handleResend}>
            Resend
          </button>
        </p>
        <p className="auth-link">
          <button className="link-btn" onClick={() => navigate('/')}>
            ← Change email
          </button>
        </p>
      </div>
    </div>
  );
}
