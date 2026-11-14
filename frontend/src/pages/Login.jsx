import { useState, useCallback } from 'react';
import { loginUser } from '../js/auth';
import Navbar from '../components/Navbar';
import GoogleSignIn from '../components/GoogleSignIn';
import '../css/Login.css';

function Login({ onLogin, navigate }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = useCallback(async (googleUser, meta) => {
    setError('');
    setMessage('Google login successful.');

    const role = meta?.role || googleUser?.role;
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');

    if (role === 'admin' || googleUser?.is_staff || googleUser?.is_superuser) {
      window.location.href = '/admin/';
      return;
    }

    if (onLogin) {
      onLogin(
        googleUser,
        role === 'artist',
        redirectParam || '/'
      );
    }
  }, [onLogin]);

  const handleGoogleError = useCallback((errorMessage) => {
    setError(errorMessage);
    setMessage('');
  }, []);

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const data = await loginUser(usernameOrEmail.trim(), password);
      setPassword('');
      setMessage(data.message || 'Login successful.');

      if (data.redirect_to === '/admin/' || data.role === 'admin' || data.user?.role === 'admin' || data.user?.is_staff) {
        window.location.href = '/admin/';
        return;
      }

      if (onLogin) {
        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get('redirect');
        onLogin(data.user, data.role === 'artist', redirectParam || '/');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoToRegister(event) {
    if (navigate) {
      event.preventDefault();
      navigate('/register');
    }
  }

  return (
    <div className="auth-page">
      <Navbar currentPath="/login" navigate={navigate} />

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            {/*  */}
          </div>

          {error && (
            <div className="auth-alert-error" role="alert">
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="auth-alert-status" role="status">
              {message}
            </div>
          )}

          {/* Social Sign-In */}
          <div className="auth-social">
            <GoogleSignIn
              onLogin={handleGoogleLogin}
              onError={handleGoogleError}
            />
          </div>

          <div className="auth-divider">
            <span>Or sign in with username or email</span>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-field">
              <label htmlFor="usernameOrEmail">Username or Email *</label>
              <input
                id="usernameOrEmail"
                type="text"
                value={usernameOrEmail}
                onChange={(event) => setUsernameOrEmail(event.target.value)}
                autoComplete="username"
                disabled={loading}
                placeholder="e.g. alex or alex@example.com"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password *</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>

          <p className="auth-footer-prompt">
            Don't have an account?{' '}
            <a href="/register" onClick={handleGoToRegister}>
              Create an account
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
