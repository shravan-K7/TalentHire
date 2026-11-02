import { useState, useCallback, useEffect } from 'react';
import { registerUser, checkUsernameAvailability } from '../js/auth';
import Navbar from '../components/Navbar';
import GoogleSignIn from '../components/GoogleSignIn';
import '../css/Login.css';

function Register({ onLogin, navigate }) {
  const [formData, setFormData] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    const initialRole = roleParam === 'artist' || roleParam === 'customer' ? roleParam : '';
    return {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: initialRole,
    };
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [usernameMessage, setUsernameMessage] = useState('');

  const handleGoogleLogin = useCallback((googleUser, meta) => {
    const chosenRole = meta?.role || googleUser?.role || formData.role;
    if (!chosenRole) {
      setError('Please select whether you want to join as a Customer or Performing Artist before continuing with Google.');
      return;
    }

    setError('');
    setMessage('Google registration successful.');
    const isArtist = chosenRole === 'artist';
    const redirectTo = meta?.redirect_to || (chosenRole === 'admin' ? '/admin/' : isArtist ? '/artist-register' : '/');

    if (chosenRole === 'admin' || googleUser?.is_staff || redirectTo === '/admin/') {
      window.location.href = '/admin/';
      return;
    }

    if (onLogin) {
      onLogin(googleUser, isArtist, redirectTo);
    }
  }, [onLogin, formData.role]);

  const handleGoogleError = useCallback((errorMessage) => {
    setError(errorMessage);
    setMessage('');
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === 'role') {
      setError('');
    }
    if (name === 'username' && value.trim().length < 3) {
      setUsernameStatus('idle');
      setUsernameMessage('');
    }
  }

  function handleRoleChange(selectedRole) {
    setFormData((prev) => ({
      ...prev,
      role: selectedRole,
    }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!formData.role) {
      setError('Please select whether you want to join as a Customer or Performing Artist.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      });

      setMessage(data.message || 'Registration successful! You are now logged in.');
      setError('');

      if (data.user) {
        onLogin(data.user, formData.role === 'artist');
      }
    } catch (err) {
      setError(err.message || 'Unable to register account.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoToLogin(event) {
    if (navigate) {
      event.preventDefault();
      navigate('/login');
    }
  }

  useEffect(() => {
    const username = formData.username.trim();
    if (!username || username.length < 3) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(username);
        if (isMounted) {
          if (res.available) {
            setUsernameStatus('available');
            setUsernameMessage('Username is available');
          } else {
            setUsernameStatus('taken');
            setUsernameMessage(res.message || 'Username is already taken');
          }
        }
      } catch {
        if (isMounted) {
          setUsernameStatus('idle');
        }
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.username]);

  return (
    <div className="auth-page">
      <Navbar currentPath="/register" navigate={navigate} />

      <main className="auth-main">
        <div className="auth-card register-card">
          <div className="auth-header">
            <h1 className="auth-title">Create an Account</h1>
            <p className="auth-subtitle">Join TalentHire to discover performers or get booked for events.</p>
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

          <div className="auth-social">
            <GoogleSignIn
              onLogin={handleGoogleLogin}
              onError={handleGoogleError}
              role={formData.role}
            />
          </div>

          <div className="auth-divider">
            <span>Or register with email</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="role-selector">
              <span className="role-selector-label" id="role-selector-heading">
                I want to join as <span className="required-indicator" aria-hidden="true">*</span>
              </span>
              <div
                className="role-radio-group"
                role="radiogroup"
                aria-labelledby="role-selector-heading"
              >
                <label
                  htmlFor="role-customer"
                  className={`role-radio-card ${formData.role === 'customer' ? 'active' : ''}`}
                  onClick={() => handleRoleChange('customer')}
                >
                  <input
                    type="radio"
                    id="role-customer"
                    name="role"
                    value="customer"
                    checked={formData.role === 'customer'}
                    onChange={handleChange}
                    disabled={loading}
                    className="role-radio-native"
                    required
                  />
                  <span className="role-radio-custom" aria-hidden="true">
                    <span className="role-radio-inner"></span>
                  </span>
                  <div className="role-radio-text">
                    <span className="role-radio-title">Customer</span>
                    <span className="role-radio-desc">Book live performers</span>
                  </div>
                </label>

                <label
                  htmlFor="role-artist"
                  className={`role-radio-card ${formData.role === 'artist' ? 'active' : ''}`}
                  onClick={() => handleRoleChange('artist')}
                >
                  <input
                    type="radio"
                    id="role-artist"
                    name="role"
                    value="artist"
                    checked={formData.role === 'artist'}
                    onChange={handleChange}
                    disabled={loading}
                    className="role-radio-native"
                    required
                  />
                  <span className="role-radio-custom" aria-hidden="true">
                    <span className="role-radio-inner"></span>
                  </span>
                  <div className="role-radio-text">
                    <span className="role-radio-title">Performing Artist</span>
                    <span className="role-radio-desc">Showcase & get booked</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="username"
                  placeholder="Choose a username"
                />
                {usernameMessage && (
                  <small style={{ color: usernameStatus === 'available' ? '#4CAF50' : '#FF5722', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                    {usernameMessage}
                  </small>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <small>Must be at least 8 characters.</small>
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Creating Account...' : (formData.role === 'artist' ? 'Register & Setup Artist Profile' : 'Register')}
            </button>
          </form>

          <p className="auth-footer-prompt">
            Already have an account?{' '}
            <a href="/login" onClick={handleGoToLogin}>
              Login here
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Register;
