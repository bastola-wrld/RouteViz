// Auth Page Module
import React, { useState } from 'react';
import { api } from '../utils/api';
import './Auth.css';

export default function Auth({ onAuthSuccess, onGuestMode }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (mode === 'register' && password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const data = await api.post(endpoint, { email, password });
      localStorage.setItem('rv_token', data.token);
      localStorage.setItem('rv_user', JSON.stringify(data.user));
      onAuthSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-logo">📍</span>
          <h1>RouteViz</h1>
          <p>AI-Powered Route Intelligence</p>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign In</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>New Account</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>

          {mode === 'register' && (
            <div className="input-group">
              <label>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
            </div>
          )}

          {error && <div className="auth-error">Error: {error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <button className="guest-link" onClick={onGuestMode}>Continue as Guest</button>
          <p>Guest users have limited access to AI features.</p>
        </div>
      </div>
    </div>
  );
}
