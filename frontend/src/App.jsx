import { useState, useEffect, useCallback } from 'react';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import { getCurrentUser, logoutUser } from './js/auth';

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Sync client-side navigation with browser history
  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname);
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback((path) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
      setCurrentPath(path);
    }
  }, []);

  async function checkSession() {
    setChecking(true);
    setSessionError('');

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.warn('Session check failed:', err);
      setUser(null);
      setSessionError('Could not verify existing session. Please sign in.');
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function initialCheck() {
      try {
        const currentUser = await getCurrentUser();
        if (!ignore) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn('Session check failed:', err);
        if (!ignore) {
          setUser(null);
          setSessionError('Could not verify existing session. Please sign in.');
        }
      } finally {
        if (!ignore) {
          setChecking(false);
        }
      }
    }

    initialCheck();

    return () => {
      ignore = true;
    };
  }, []);


  function handleLoginSuccess(loggedInUser) {
    setUser(loggedInUser);
    setSessionError('');
    navigate('/');
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setSessionError('');
      navigate('/login');
    }
  }

  if (checking) {
    return (
      <main>
        <p>Loading TalentHire...</p>
      </main>
    );
  }

  return (
    <>
      {sessionError && (
        <aside role="status">
          <small>{sessionError}</small>{' '}
          <button type="button" onClick={checkSession}>
            Retry
          </button>
        </aside>
      )}

      {user ? (
        <Home user={user} onLogout={handleLogout} />
      ) : currentPath === '/register' ? (
        <Register onLogin={handleLoginSuccess} navigate={navigate} />
      ) : (
        <Login onLogin={handleLoginSuccess} navigate={navigate} />
      )}
    </>
  );
}

export default App;
