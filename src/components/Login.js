import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = ({ onRegisterClick }) => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, setError, error } = useAuth();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/api/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send verification code');
      }

      setCodeSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/api/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid verification code');
      }

      const userData = await response.json();
      login(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h2>Login to Quick Order</h2>
      {error && <div className="auth-error">{error}</div>}
      
      {!codeSent ? (
        // Step 1: Enter email and request verification code
        <form onSubmit={handleSendCode} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Sending Code...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        // Step 2: Enter verification code
        <form onSubmit={handleVerifyCode} className="auth-form">
          <p className="verification-message">
            A verification code has been sent to {email}
          </p>
          <div className="form-group">
            <label htmlFor="verificationCode">Verification Code</label>
            <input
              type="text"
              id="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button 
            type="button" 
            className="resend-button"
            onClick={handleSendCode}
            disabled={loading}
          >
            Resend Code
          </button>
        </form>
      )}
      
      <div className="auth-switch">
        Don't have an account?{' '}
        <button onClick={onRegisterClick} className="auth-switch-button">
          Register
        </button>
      </div>
    </div>
  );
};

export default Login;