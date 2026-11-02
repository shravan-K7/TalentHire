import { useState, useCallback } from 'react';
import { loginUser } from '../js/auth';
import Navbar from '../components/Navbar';
import GoogleSignIn from '../components/GoogleSignIn';
import '../css/Login.css';

function Login({ onLogin, navigate }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = useCallback(async (googleUser, meta) => {
    setError('');
    setMessage('Google login successful.');

    const role = meta?.role || googleUser?.role;
    const redirectTo = meta?.redirect_to || (role === 'admin' ? '/admin/' : role === 'artist' ? '/artist-register' : '/');

    // Route dynamically based on detected account role
    if (role === 'admin' || googleUser?.is_staff || googleUser?.is_superuser || redirectTo === '/admin/') {
      window.location.href = '/admin/';
      return;
    }

    if (onLogin) {
      onLogin(
        googleUser,
        role === 'artist',
        redirectTo
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

      // Unified single-entry dynamic role routing:
      // Admins -> Django Admin console (/admin/)
      // Performing Artists -> Artist Registration & Dashboard (/artist-register)
      // Customers -> Home / Discovery (/)
      if (data.redirect_to === '/admin/' || data.role === 'admin' || data.user?.role === 'admin' || data.user?.is_staff) {
        window.location.href = '/admin/';
        return;
      }

      if (onLogin) {
        onLogin(data.user, data.role === 'artist', data.redirect_to);
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
              <label htmlFor="usernameOrEmail">Username or Email</label>
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
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={loading}
                placeholder="••••••••"
                required
              />
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
