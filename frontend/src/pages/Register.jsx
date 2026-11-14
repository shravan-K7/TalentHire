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
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleGoogleLogin = useCallback((googleUser, meta) => {
    const chosenRole = meta?.role || googleUser?.role || formData.role;
    if (!chosenRole) {
      setError('Please select whether you want to join as a Customer or Performing Artist before continuing with Google.');
      return;
    }

    setError('');
    setMessage('Google registration successful.');
    const isArtist = chosenRole === 'artist';

    if (chosenRole === 'admin' || googleUser?.is_staff) {
      window.location.href = '/admin/';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');

    if (onLogin) {
      onLogin(googleUser, isArtist, redirectParam || '/');
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
    if (name === 'username') {
      setError('');
      const trimmed = value.trim();
      if (!trimmed) {
        setUsernameStatus('idle');
        setUsernameMessage('');
        setUsernameSuggestions([]);
      } else if (trimmed.length < 3) {
        setUsernameStatus('too_short');
        setUsernameMessage('Username must be at least 3 characters.');
        setUsernameSuggestions([]);
      } else if (!/^[\w.@+-]+$/.test(trimmed)) {
        setUsernameStatus('invalid');
        setUsernameMessage('Only letters, numbers, and @/./+/-/_ are allowed.');
        setUsernameSuggestions([]);
      } else {
        setUsernameStatus('checking');
        setUsernameMessage('Checking availability...');
        setUsernameSuggestions([]);
      }
    }
  }

  function handlePickSuggestion(suggestedUsername) {
    setFormData((prev) => ({
      ...prev,
      username: suggestedUsername,
    }));
    setUsernameStatus('available');
    setUsernameMessage('Username is available!');
    setUsernameSuggestions([]);
    setError('');
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

    if (formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (usernameStatus === 'invalid') {
      setError('Username can only contain letters, numbers, and @/./+/-/_.');
      return;
    }

    if (usernameStatus === 'taken') {
      setError('The username you entered is already taken. Please pick an available username.');
      return;
    }

    if (usernameStatus === 'checking') {
      setError('Please wait while we verify your username availability.');
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
        const params = new URLSearchParams(window.location.search);
        const redirectParam = params.get('redirect');
        onLogin(data.user, formData.role === 'artist', redirectParam || '/');
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
    const rawUsername = formData.username.trim();
    if (!rawUsername || rawUsername.length < 3 || !/^[\w.@+-]+$/.test(rawUsername)) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(rawUsername, controller.signal);
        if (res.available) {
          setUsernameStatus('available');
          setUsernameMessage('Username is available!');
          setUsernameSuggestions([]);
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(res.message || 'This username is already taken.');
          setUsernameSuggestions(res.suggestions || []);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setUsernameStatus('idle');
          setUsernameMessage('');
        }
      }
    }, 350);

    return () => {
      controller.abort();
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
                <label htmlFor="username">Username *</label>
                <div className={`username-input-wrapper is-${usernameStatus}`}>
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
                  {usernameStatus === 'checking' && (
                    <span className="username-status-icon" title="Checking availability...">
                      <span className="username-status-spinner" />
                    </span>
                  )}
                  {usernameStatus === 'available' && (
                    <span className="username-status-icon" title="Username available" style={{ color: '#4CAF50' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <span className="username-status-icon" title="Username unavailable" style={{ color: '#FF5722' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </span>
                  )}
                </div>

                {usernameMessage && (
                  <div className={`username-status-msg ${usernameStatus}`}>
                    <span>{usernameMessage}</span>
                  </div>
                )}

                {usernameSuggestions.length > 0 && (
                  <div className="username-suggestions-wrap">
                    <span className="username-suggestions-label">Suggestions:</span>
                    {usernameSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        className="username-suggestion-btn"
                        onClick={() => handlePickSuggestion(sug)}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="email">Email *</label>
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
                <label htmlFor="password">Password *</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
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
                <small>Must be at least 8 characters.</small>
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <div className="password-input-wrapper">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
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
