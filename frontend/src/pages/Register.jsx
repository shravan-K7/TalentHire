import { useState, useCallback } from 'react';
import { registerUser } from '../js/auth';
import GoogleSignIn from '../components/GoogleSignIn';

function Register({ onLogin, navigate }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = useCallback((user) => {
    setError('');
    setMessage('Google login successful.');
    onLogin(user);
  }, [onLogin]);

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
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');

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
      });

      setMessage(data.message || 'Registration successful! You are now logged in.');
      setError('');

      if (data.user) {
        onLogin(data.user);
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

  return (
    <main>
      <header>
        <h1>TalentHire</h1>
        <h2>Create an Account</h2>
        <p>Register to discover and book talented artists and performers.</p>
      </header>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert"><strong>Error: </strong>{error}</p>}

      <section>
        <GoogleSignIn
          onLogin={handleGoogleLogin}
          onError={handleGoogleError}
        />
      </section>

      <p>Or register with your email</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username</label>
          <br />
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={loading}
            autoComplete="username"
          />
        </div>
        <br />

        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>
        <br />

        <div>
          <label htmlFor="password">Password</label>
          <br />
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
          />
          <br />
          <small>Must be at least 8 characters.</small>
        </div>
        <br />

        <div>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <br />
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
          />
        </div>
        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <p>
        Already have an account?{' '}
        <a href="/login" onClick={handleGoToLogin}>
          Login here
        </a>
      </p>
    </main>
  );
}

export default Register;
