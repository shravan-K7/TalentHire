import { useState, useCallback } from 'react';
import { loginUser } from '../js/auth';
import '../css/Login.css';
import GoogleSignIn from '../components/GoogleSignIn';

function Login({ onLogin, navigate }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
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

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const data = await loginUser(usernameOrEmail.trim(), password);
      setPassword('');
      setMessage(data.message || 'Login successful.');
      onLogin(data.user);
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
    <main>
      <header>
        <h1>TalentHire</h1>
        <h2>Sign In</h2>
        <p>Sign in to discover and book performers for your events.</p>
      </header>

      {error && <p role="alert"><strong>Error: </strong>{error}</p>}
      {message && <p role="status">{message}</p>}

      <section>
        <GoogleSignIn
          onLogin={handleGoogleLogin}
          onError={handleGoogleError}
        />
      </section>

      <p>Or sign in with your username / email</p>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="usernameOrEmail">
            Username or Email
          </label>
          <br />
          <input
            id="usernameOrEmail"
            type="text"
            value={usernameOrEmail}
            onChange={(event) => setUsernameOrEmail(event.target.value)}
            autoComplete="username"
            disabled={loading}
            required
          />
        </div>
        <br />

        <div>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={loading}
            required
          />
        </div>
        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>

      <p>
        Don't have an account?{' '}
        <a href="/register" onClick={handleGoToRegister}>
          Create an account
        </a>
      </p>
    </main>
  );
}

export default Login;
