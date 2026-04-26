import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement actual login API call
      console.log('Login attempt:', { email, password, rememberMe });
      // For now, just show a message
      setError('Authentication backend coming soon');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithout = () => {
    // TODO: Set temporary session/demo mode
    console.log('Continue without registering');
    window.location.href = '/dashboard';
  };

  return (
    <main className="auth-container">
      <div className="auth-card">
        <Link href="/">
          <h2 className="auth-logo">X-CRM</h2>
        </Link>

        <form onSubmit={handleSubmit} className="auth-form">
          <h1 className="auth-title">Sign In</h1>
          <p className="auth-subtitle">Access your CRM dashboard</p>

          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <div className="password-header">
              <label htmlFor="password" className="form-label">Password</label>
              <Link href="#" className="forgot-password">
                Forgot?
              </Link>
            </div>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="checkbox-group">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
              className="checkbox-input"
            />
            <label htmlFor="rememberMe" className="checkbox-label">
              Remember me for 30 days
            </label>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-divider"></div>

        <button
          onClick={handleContinueWithout}
          className="auth-button-secondary"
        >
          Continue Without Registering
        </button>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link href="/signup" className="auth-link">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
