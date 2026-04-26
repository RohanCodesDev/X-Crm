import { useState } from 'react';
import Link from 'next/link';

const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#dc2626', '#ea580c', '#f59e0b', '#84cc16', '#16a34a'];

  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)]
  };
};

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!agreedToTerms) {
      setError('You must agree to the terms and conditions');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (passwordStrength.score < 2) {
      setError('Password is too weak. Use uppercase, lowercase, numbers, and symbols');
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement actual signup API call
      console.log('Signup attempt:', { email, name, password });
      setSuccess('Account creation coming soon. Use Sign In for now.');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <div className="auth-card">
        <Link href="/">
          <h2 className="auth-logo">X-CRM</h2>
        </Link>

        <form onSubmit={handleSubmit} className="auth-form">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join X-CRM today</p>

          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}
          {success && (
            <div className="auth-success">
              <span className="success-icon">✓</span>
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name" className="form-label">Full Name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              autoComplete="name"
            />
          </div>

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
              {password && (
                <span className="strength-indicator" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              )}
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
                autoComplete="new-password"
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
            {password && (
              <div className="strength-bar">
                <div 
                  className="strength-fill"
                  style={{ 
                    width: `${((passwordStrength.score + 1) / 5) * 100}%`,
                    backgroundColor: passwordStrength.color
                  }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="checkbox-group">
            <input
              id="terms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={loading}
              className="checkbox-input"
            />
            <label htmlFor="terms" className="checkbox-label">
              I agree to the{' '}
              <span className="checkbox-link">Terms and Conditions</span>
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="auth-link">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
