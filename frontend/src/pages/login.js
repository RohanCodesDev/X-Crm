import { useEffect, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import ThemeToggle from '../components/toggle';
import GoogleButton from '../components/google-button';

export default function LoginPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(true);

  function initializeGoogleButton() {
    if (!window.google || !googleClientId) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (!response?.credential) {
          setError('Google sign-in failed. Please try again.');
          return;
        }

        localStorage.removeItem('xcrmDemoMode');
        localStorage.setItem('xcrmGoogleIdToken', response.credential);
        window.location.href = '/dashboard';
      }
    });

    window.google.accounts.id.renderButton(document.getElementById('google-signin-button'), {
      theme: 'outline',
      size: 'large',
      width: '320',
      text: 'signin_with'
    });

    setGoogleReady(true);
    setGoogleLoading(false);
  }

  useEffect(() => {
    if (!googleClientId) {
      setError('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend environment.');
      setGoogleLoading(false);
    }
  }, [googleClientId]);

  const handleContinueWithout = () => {
    localStorage.removeItem('xcrmGoogleIdToken');
    localStorage.setItem('xcrmDemoMode', 'true');
    window.location.href = '/dashboard';
  };

  async function handleEmailLogin(event) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.removeItem('xcrmDemoMode');
      localStorage.setItem('xcrmGoogleIdToken', data.token);
      window.location.href = '/dashboard';
    } catch (loginError) {
      setError(loginError.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => initializeGoogleButton()}
        onError={() => {
          setGoogleLoading(false);
          setError('Could not load Google sign-in script.');
        }}
      />

      <div className="auth-toggle-wrap">
        <ThemeToggle />
      </div>

      <div className="auth-grid">
        <section className="auth-panel auth-brand-panel">
          <Link href="/" className="auth-logo-link">
            <img src="/logo.png" alt="X-CRM Logo" className="auth-logo-img" style={{ height: '130px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          </Link>
          <p className="auth-kicker">Lead Intelligence Workspace</p>
          <h1 className="auth-hero-title">Close the loop between forms and revenue.</h1>
          <p className="auth-hero-subtitle">
            Connect Google Forms, classify intent, and route every qualified response to the right follow-up.
          </p>
          <div className="auth-highlights">
            <div className="auth-highlight-item">Permission-based form access</div>
            <div className="auth-highlight-item">Unified response dashboard</div>
            <div className="auth-highlight-item">Fast Google sign-in onboarding</div>
          </div>
        </section>

        <section className="auth-panel auth-form-panel">
          <p className="auth-kicker-label">Welcome back</p>
          <h3 className="auth-title">Sign in to your workspace</h3>
          <p className="auth-subtitle">Sign in with email or Google to view and edit forms by access level.</p>

          {error ? (
            <div className="auth-error">
              <span className="error-icon">!</span>
              {error}
            </div>
          ) : null}

          <div id="google-signin-button" style={{ display: 'none' }} />

          <GoogleButton onClick={() => {
            if (!googleReady) {
              setError('Google Sign-In is still loading. Please try again.');
              return;
            }
            const gBtn = document.querySelector('#google-signin-button div[role=button]');
            if (gBtn) {
              gBtn.click();
            } else {
              setError('Could not find Google Sign-In button. Please try again.');
            }
          }} disabled={!googleReady} />

          {googleLoading && !error ? <p className="auth-meta">Loading Google Sign-In...</p> : null}
          {googleReady ? <p className="auth-meta">Successful sign-in redirects you to dashboard automatically.</p> : null}

          <div className="auth-divider">or</div>

          <form onSubmit={handleEmailLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">Email</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="auth-action-row">
              <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner spinner-inline"></span>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          <div className="auth-divider">or</div>

          <div className="auth-action-row">
            <button type="button" className="auth-btn auth-btn-secondary" onClick={handleContinueWithout}>
              Continue in Demo Mode
            </button>
          </div>

          <div className="auth-footer">
            <p>
              New here? <Link href="/signup" className="auth-link">Create account profile</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
