import React, { useState } from 'react';
import { login, register, resetPassword } from 'workout-shared';
import { Dumbbell, Mail, Lock, LogIn, UserPlus, ArrowLeft, Check } from 'lucide-react';
import './AuthScreen.css';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

type AuthMode = 'login' | 'register' | 'reset';

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: '', color: '#e5e7eb', width: '0%' };
    if (pw.length < 6) return { label: 'Too short', color: '#ef4444', width: '20%' };
    if (pw.length < 8) return { label: 'Weak', color: '#f59e0b', width: '40%' };
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score >= 2 && pw.length >= 10) return { label: 'Strong', color: '#22c55e', width: '100%' };
    if (score >= 1) return { label: 'Fair', color: '#f59e0b', width: '60%' };
    return { label: 'Weak', color: '#f59e0b', width: '40%' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        await register(email.trim(), password);
        // With email verification disabled, user is auto-logged in
      } else if (mode === 'login') {
        await login(email.trim(), password);
      } else if (mode === 'reset') {
        await resetPassword(email.trim());
        setResetSent(true);
        setLoading(false);
        return;
      }
      // Auth state change listener in App.tsx handles the transition
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('invalid login') || msg.includes('invalid email or password')) {
        setError('Invalid email or password');
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (msg.includes('password') && msg.includes('6')) {
        setError('Password must be at least 6 characters');
      } else if (msg.includes('valid email') || msg.includes('invalid email')) {
        setError('Please enter a valid email address');
      } else if (msg.includes('rate') || msg.includes('too many')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'An error occurred');
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Dumbbell size={40} className="auth-logo" />
          <h1 className="auth-title">SBS Workout Tracker</h1>
          <p className="auth-subtitle">
            {mode === 'login' && 'Sign in to sync your workouts'}
            {mode === 'register' && 'Create an account to get started'}
            {mode === 'reset' && 'Reset your password'}
          </p>
        </div>

        {mode === 'reset' && resetSent ? (
          <div className="auth-reset-sent">
            <p>Password reset email sent to <strong>{email}</strong>.</p>
            <p>Check your inbox and follow the link to reset your password.</p>
            <button className="auth-link-btn" onClick={() => { setMode('login'); setResetSent(false); }}>
              <ArrowLeft size={16} /> Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <Mail size={18} className="auth-field-icon" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {mode !== 'reset' && (
              <>
                <div className="auth-field">
                  <Lock size={18} className="auth-field-icon" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  />
                </div>
                {mode === 'register' && password.length > 0 && (
                  <div className="auth-password-strength">
                    <div className="auth-strength-bar">
                      <div
                        className="auth-strength-fill"
                        style={{ width: getPasswordStrength(password).width, backgroundColor: getPasswordStrength(password).color }}
                      />
                    </div>
                    <span className="auth-strength-label" style={{ color: getPasswordStrength(password).color }}>
                      {getPasswordStrength(password).label}
                    </span>
                  </div>
                )}
              </>
            )}

            {mode === 'register' && (
              <div className="auth-field">
                <Lock size={18} className="auth-field-icon" />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="auth-spinner" />
              ) : mode === 'login' ? (
                <><LogIn size={18} /> Sign In</>
              ) : mode === 'register' ? (
                <><UserPlus size={18} /> Create Account</>
              ) : (
                <><Mail size={18} /> Send Reset Link</>
              )}
            </button>

            <div className="auth-footer">
              {mode === 'login' && (
                <>
                  <button type="button" className="auth-link-btn" onClick={() => switchMode('register')}>
                    Don't have an account? <strong>Sign up</strong>
                  </button>
                  <button type="button" className="auth-link-btn" onClick={() => switchMode('reset')}>
                    Forgot password?
                  </button>
                </>
              )}
              {mode === 'register' && (
                <button type="button" className="auth-link-btn" onClick={() => switchMode('login')}>
                  Already have an account? <strong>Sign in</strong>
                </button>
              )}
              {mode === 'reset' && (
                <button type="button" className="auth-link-btn" onClick={() => switchMode('login')}>
                  <ArrowLeft size={16} /> Back to sign in
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
