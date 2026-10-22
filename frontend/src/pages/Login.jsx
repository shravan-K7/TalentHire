
import { useState } from 'react';
import { loginUser } from '../js/auth';
import '../css/Login.css';

function Login({ onLogin }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setMessage('');

    try {
      const data = await loginUser(usernameOrEmail, password);

      // Update the user state managed by App.jsx
      onLogin(data.user);

      setPassword('');
      setMessage(data.message || 'Login successful.');
    } catch (error) {
      setMessage(error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>TalentHire Login</h1>

      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="usernameOrEmail">
            Username or Email
          </label>

          <input
            id="usernameOrEmail"
            type="text"
            value={usernameOrEmail}
            onChange={(event) =>
              setUsernameOrEmail(event.target.value)
            }
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p>
        Don't have an account?{' '}
        <a href="/register">Create an account</a>
      </p>

      <p role="status">{message}</p>
    </main>
  );
}

export default Login;
