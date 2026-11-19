import { useState, useCallback, useEffect } from 'react';
import { registerUser, checkUsernameAvailability } from '../js/auth';
import Navbar from '../components/Navbar';
import GoogleSignIn from '../components/GoogleSignIn';
import '../css/Login.css';

function Register({ onLogin, navigate, currentPath }) {
  const getSearchParams = useCallback(() => {
    if (currentPath && currentPath.includes('?')) {
      return new URLSearchParams(currentPath.substring(currentPath.indexOf('?')));
    }
    return new URLSearchParams(window.location.search);
  }, [currentPath]);

  const [formData, setFormData] = useState(() => {
    const params = currentPath && currentPath.includes('?')
      ? new URLSearchParams(currentPath.substring(currentPath.indexOf('?')))
      : new URLSearchParams(window.location.search);
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
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const handleGoogleLogin = useCallback((googleUser, meta) => {
    const chosenRole = meta?.role || googleUser?.role || formData.role;
    if (!chosenRole) {
      setError('Please select whether you want to join as a Customer or Performing Artist before continuing with Google.');
      return;
    }

    setError('');
    setMessage('Google registration successful.');
    const isArtist = chosenRole === 'artist';
    const isAdmin = Boolean(chosenRole === 'admin' || googleUser?.is_staff || googleUser?.is_superuser);
    const redirectParam = getSearchParams().get('redirect');

    if (onLogin) {
      const destination = redirectParam || (isAdmin ? '/admin-dashboard' : isArtist ? '/artist-dashboard' : '/customer-dashboard');
      onLogin(googleUser, isArtist, destination);
    }
  }, [onLogin, formData.role, getSearchParams]);

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
    if (name === 'password') {
      setPasswordTouched(true);
      setError('');
    }
    if (name === 'confirmPassword') {
      setConfirmPasswordTouched(true);
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

    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    if (formData.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
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
        const redirectParam = getSearchParams().get('redirect');
        onLogin(data.user, formData.role === 'artist', redirectParam || '/');
      }
    } catch (err) {
      setError(err.message || 'Unable to register account.');
    } finally {
      setLoading(false);
    }
  }

  const redirectParam = getSearchParams().get('redirect');
  const isBookingRedirect = Boolean(
    redirectParam && (redirectParam.startsWith('/book-artist') || redirectParam.startsWith('/booking'))
  );

  function handleGoToLogin(event) {
    if (navigate) {
      event.preventDefault();
      const targetRedirect = getSearchParams().get('redirect');
      navigate(targetRedirect ? `/login?redirect=${encodeURIComponent(targetRedirect)}` : '/login');
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

  // Live Password Checker & Strength Calculations
  const passwordValue = formData.password;
  const confirmPasswordValue = formData.confirmPassword;

  const passwordCriteria = {
    hasMinLength: passwordValue.length >= 8,
    hasUpperLower: /[A-Z]/.test(passwordValue) && /[a-z]/.test(passwordValue),
    hasNumber: /[0-9]/.test(passwordValue),
    hasSpecial: /[^A-Za-z0-9]/.test(passwordValue),
  };

  const metCriteriaCount = Object.values(passwordCriteria).filter(Boolean).length;

  let passwordStrength = {
    score: 0,
    level: 'none',
    label: '',
  };

  if (passwordValue.length > 0) {
    if (passwordValue.length < 8) {
      passwordStrength = {
        score: 1,
        level: 'weak',
        label: 'Too short',
      };
    } else if (metCriteriaCount <= 2) {
      passwordStrength = {
        score: 2,
        level: 'fair',
        label: 'Fair',
      };
    } else if (metCriteriaCount === 3) {
      passwordStrength = {
        score: 3,
        level: 'good',
        label: 'Good',
      };
    } else if (metCriteriaCount === 4) {
      if (passwordValue.length >= 12) {
        passwordStrength = {
          score: 4,
          level: 'very-strong',
          label: 'Very Strong',
        };
      } else {
        passwordStrength = {
          score: 4,
          level: 'strong',
          label: 'Strong',
        };
      }
    }
  }

  const isAllPasswordCriteriaMet = passwordCriteria.hasMinLength && metCriteriaCount === 4;

  const isConfirmEntered = confirmPasswordValue.length > 0;
  const isPasswordEntered = passwordValue.length > 0;
  const isPasswordMatch = isConfirmEntered && isPasswordEntered && confirmPasswordValue === passwordValue;
  const isPasswordMismatch = isConfirmEntered && (!isPasswordEntered || confirmPasswordValue !== passwordValue);

  return (
    <div className="auth-page">
      <Navbar currentPath="/register" navigate={navigate} />

      <main className="auth-main">
        <div className="auth-card register-card">
          <div className="auth-header">
            <h1 className="auth-title">Create an Account</h1>
            <p className="auth-subtitle">Join TalentHire to discover performers or get booked for events.</p>
          </div>

          {isBookingRedirect && !error && !message && (
            <div
              className="auth-alert-status"
              role="status"
              style={{
                background: 'rgba(255, 87, 34, 0.15)',
                border: '1px solid #FF5722',
                color: '#FF7043',
                marginBottom: '16px',
              }}
            >
              Please register or log in to proceed with booking your artist.
            </div>
          )}

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
                <div
                  className={`password-input-wrapper ${
                    isAllPasswordCriteriaMet ? 'has-status-icon is-all-met' : ''
                  }`}
                >
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setPasswordTouched(true)}
                    required
                    disabled={loading}
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />
                  {isAllPasswordCriteriaMet && (
                    <span
                      className="password-status-icon is-valid"
                      title="All password requirements satisfied"
                      aria-hidden="true"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
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

                {passwordTouched || formData.password.length > 0 ? (
                  <div className="password-checker-container" aria-live="polite">
                    <div className="password-strength-header">
                      <div
                        className="password-strength-bars"
                        role="progressbar"
                        aria-valuenow={passwordStrength.score}
                        aria-valuemin={0}
                        aria-valuemax={4}
                        aria-label={`Password strength: ${passwordStrength.label || 'None'}`}
                      >
                        <div className={`strength-bar ${passwordStrength.score >= 1 ? `active strength-${passwordStrength.level}` : ''}`} />
                        <div className={`strength-bar ${passwordStrength.score >= 2 ? `active strength-${passwordStrength.level}` : ''}`} />
                        <div className={`strength-bar ${passwordStrength.score >= 3 ? `active strength-${passwordStrength.level}` : ''}`} />
                        <div className={`strength-bar ${passwordStrength.score >= 4 ? `active strength-${passwordStrength.level}` : ''}`} />
                      </div>
                      {passwordStrength.label && (
                        <span className={`password-strength-label strength-${passwordStrength.level}`}>
                          {passwordStrength.label}
                        </span>
                      )}
                    </div>

                    <ul className="password-criteria-list" aria-label="Password requirements">
                      <li className={`criteria-item ${passwordCriteria.hasMinLength ? 'met' : 'unmet'}`}>
                        <span className="criteria-icon" aria-hidden="true">
                          {passwordCriteria.hasMinLength ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span className="criteria-bullet" />
                          )}
                        </span>
                        <span>At least 8 characters</span>
                      </li>

                      <li className={`criteria-item ${passwordCriteria.hasUpperLower ? 'met' : 'unmet'}`}>
                        <span className="criteria-icon" aria-hidden="true">
                          {passwordCriteria.hasUpperLower ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span className="criteria-bullet" />
                          )}
                        </span>
                        <span>Uppercase & lowercase letters</span>
                      </li>

                      <li className={`criteria-item ${passwordCriteria.hasNumber ? 'met' : 'unmet'}`}>
                        <span className="criteria-icon" aria-hidden="true">
                          {passwordCriteria.hasNumber ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span className="criteria-bullet" />
                          )}
                        </span>
                        <span>At least 1 number (0-9)</span>
                      </li>

                      <li className={`criteria-item ${passwordCriteria.hasSpecial ? 'met' : 'unmet'}`}>
                        <span className="criteria-icon" aria-hidden="true">
                          {passwordCriteria.hasSpecial ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span className="criteria-bullet" />
                          )}
                        </span>
                        <span>At least 1 special character (!@#$%...)</span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <small>Must be at least 8 characters.</small>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <div
                  className={`password-input-wrapper ${
                    isConfirmEntered ? 'has-status-icon' : ''
                  } ${
                    isPasswordMatch ? 'is-match' : isPasswordMismatch ? 'is-mismatch' : ''
                  }`}
                >
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onFocus={() => setConfirmPasswordTouched(true)}
                    required
                    disabled={loading}
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                  />
                  {isConfirmEntered && (
                    <span
                      className={`password-status-icon ${isPasswordMatch ? 'is-match' : 'is-mismatch'}`}
                      title={isPasswordMatch ? 'Passwords match' : 'Passwords do not match'}
                      aria-hidden="true"
                    >
                      {isPasswordMatch ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      )}
                    </span>
                  )}
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

                {isConfirmEntered ? (
                  <div
                    className={`password-match-msg ${isPasswordMatch ? 'matched' : 'mismatched'}`}
                    role="status"
                    aria-live="polite"
                  >
                    <span className="password-match-icon" aria-hidden="true">
                      {isPasswordMatch ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      )}
                    </span>
                    <span>
                      {!isPasswordEntered
                        ? 'Please enter your password first.'
                        : isPasswordMatch
                        ? 'Passwords match perfectly.'
                        : 'Passwords do not match yet.'}
                    </span>
                  </div>
                ) : isPasswordEntered && confirmPasswordTouched ? (
                  <div className="password-match-msg hint" role="status">
                    <span>Please re-enter your password above to confirm.</span>
                  </div>
                ) : (
                  <small>Must match the password entered above.</small>
                )}
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
