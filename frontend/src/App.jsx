
import { useState, useEffect } from 'react';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import { getCurrentUser, logoutUser } from './js/auth';

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  const path = window.location.pathname;

  useEffect(() => {
    async function checkSession() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Session check failed:', error);
        setError('Unable to check your login session.');
      } finally {
        setChecking(false);
      }
    }

    checkSession();
  }, []);

  async function handleLogout() {
    try {
      await logoutUser();
      setUser(null);
      setError('');
      window.location.href = '/login';
    } catch (error) {
      setError(error.message);
    }
  }

  if (checking) {
    return <p>Checking login...</p>;
  }

  if (path === '/register') {
    return <Register />;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (user) {
    return <Home user={user} onLogout={handleLogout} />;
  }

  return <Login onLogin={setUser} />;
}

export default App;
