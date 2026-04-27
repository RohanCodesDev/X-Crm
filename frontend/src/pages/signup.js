import { useState } from 'react';
import Link from 'next/link';
import { Button3D } from '../components/buttons';

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
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Founder');
  const [wantsUpdates, setWantsUpdates] = useState(true);
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

    if (!name || !company || !email || !password || !confirmPassword) {
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
      const response = await fetch(`${apiBase}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          company: company.trim(),
          role,
          marketingOptIn: wantsUpdates
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      localStorage.removeItem('xcrmDemoMode');
      localStorage.setItem('xcrmGoogleIdToken', data.token);
      setSuccess('Account created successfully. Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 700);
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-grid signup-grid">
        <section className="auth-panel auth-brand-panel">
          <Link href="/" className="auth-logo-link">
            <img src="/logo.png" alt="X-CRM Logo" className="auth-logo-img" style={{ height: '130px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          </Link>
          <p className="auth-kicker">Get Setup In Minutes</p>
          <h1 className="auth-hero-title">Build your team-ready CRM layer on top of forms.</h1>
          <p className="auth-hero-subtitle">
            Organize responses, assign follow-ups, and keep ownership clear across your full pipeline.
          </p>
          <div className="auth-highlights">
            <div className="auth-highlight-item">Create and manage multiple form connections</div>
            <div className="auth-highlight-item">Share VIEW and EDIT roles instantly</div>
            <div className="auth-highlight-item">Scale from solo founder to sales team</div>
          </div>
        </section>

        <section className="auth-panel auth-form-panel">
          <p className="auth-badge">Create profile</p>
          <h3 className="auth-title">Start your workspace</h3>
          <p className="auth-subtitle">Complete your details now. You can wire this screen to API signup next.</p>

          <form onSubmit={handleSubmit} className="auth-form">

          {error ? (
            <div className="auth-error">
              <span className="error-icon">!</span>
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="auth-success">
              <span className="success-icon">+</span>
              {success}
            </div>
          ) : null}

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
            <label htmlFor="company" className="form-label">Company Name</label>
            <input
              id="company"
              type="text"
              className="form-input"
              placeholder="Acme Labs"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              disabled={loading}
              autoComplete="organization"
            />
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label">Primary Role</label>
            <select
              id="role"
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
            >
              <option>Founder</option>
              <option>Sales Lead</option>
              <option>Operations</option>
              <option>Marketing</option>
              <option>Support</option>
            </select>
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
                {showPassword ? 'Hide' : 'Show'}
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

          <div className="checkbox-group">
            <input
              id="updates"
              type="checkbox"
              checked={wantsUpdates}
              onChange={(e) => setWantsUpdates(e.target.checked)}
              disabled={loading}
              className="checkbox-input"
            />
            <label htmlFor="updates" className="checkbox-label">
              Send me product updates and onboarding tips
            </label>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', width: '100%' }}>
            <Button3D type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? (
                <>
                  <span className="spinner" style={{ marginRight: '8px' }}></span>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button3D>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="auth-link">
              Sign in instead
            </Link>
          </p>
        </div>
        </section>
      </div>
    </main>
  );
}
