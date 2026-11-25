import { useState } from 'react';
import '../css/Navbar.css';

function Navbar({ user, onLogout, currentPath = '/', navigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function goTo(event, path) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    setMobileMenuOpen(false);

    if (path === '/admin/' || path.startsWith('/admin')) {
      window.location.href = path;
      return;
    }

    if (path.startsWith('/#')) {
      const hash = path.substring(2);
      if (window.location.pathname === '/' || window.location.pathname === '') {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      } else {
        if (navigate) {
          navigate('/');
          setTimeout(() => {
            const el = document.getElementById(hash);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 150);
          return;
        }
      }
    }

    if (navigate) {
      navigate(path);
    } else {
      window.location.href = path;
    }
  }

  const links = [
    { label: 'Home', path: '/' },
    { label: 'Explore Artists', path: '/artists' },
    { label: 'Categories', path: '/#categories' },
    { label: 'About us', path: '/about' },
    { label: 'Contact', path: '/#contact' },
  ];

  if (user?.is_staff || user?.is_superuser || user?.role === 'admin') {
    links.push({ label: 'Admin Dashboard', path: '/admin-dashboard' });
  }

  const isArtist = Boolean(user?.is_artist || user?.artist_profile || user?.role === 'artist');

  // Dynamic user data resolution - strictly from actual database user fields without hardcoding
  const profileName = user?.username || (user?.first_name ? user.first_name : (user?.email ? user.email.split('@')[0] : 'User'));
  const profileInitial = (user?.username || user?.first_name || user?.email || 'U').charAt(0).toUpperCase();
  const avatarUrl = user?.profile_image || user?.avatar || '';

  const targetDashboard = (user?.is_staff || user?.is_superuser || user?.role === 'admin')
    ? '/admin-dashboard'
    : (isArtist && !user?.artist_profile)
      ? '/artist-register'
      : isArtist
        ? '/artist-dashboard'
        : '/customer-dashboard';

  return (
    <header className="site-header">
      <nav className="site-navbar">
        <a href="/" className="navbar-brand" onClick={(event) => goTo(event, '/')}>
          <span className="navbar-brand-white">Talent</span><span className="navbar-brand-orange">Hire</span>
        </a>

        <button
          type="button"
          className="navbar-menu-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        <div className={`navbar-links ${mobileMenuOpen ? 'navbar-links-open' : ''}`}>
          <div className="navbar-nav-group">
            {links.map((link) => (
              <a
                key={link.path}
                href={link.path}
                className={
                  currentPath === link.path ||
                  (link.path === '/about' && (currentPath === '/about' || currentPath === '/about-us'))
                    ? 'navbar-link active'
                    : 'navbar-link'
                }
                onClick={(event) => goTo(event, link.path)}
              >
                {link.label}
              </a>
            ))}
          </div>

          {user ? (
            <div className="navbar-account">
              {/* Notification Bell Icon */}
              <button
                type="button"
                className="navbar-bell-btn"
                onClick={(e) => {
                  if (user?.is_staff || user?.is_superuser || user?.role === 'admin') {
                    goTo(e, '/admin-dashboard');
                  } else if (isArtist) {
                    goTo(e, '/artist-dashboard?tab=notifications');
                  } else {
                    goTo(e, '/customer-dashboard?tab=notifications');
                  }
                }}
                title="Notifications"
                aria-label="View notifications"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="navbar-bell-dot" />
              </button>

              {/* Profile Pill - Functional & Matches UI Reference */}
              <button
                type="button"
                className={`navbar-profile-trigger ${currentPath === targetDashboard || currentPath === '/profile' ? 'active' : ''}`}
                onClick={(e) => goTo(e, targetDashboard)}
                title={`Go to Dashboard (${profileName})`}
                aria-label={`Go to Dashboard (${profileName})`}
              >
                <div className="navbar-avatar-circle">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={profileName} className="navbar-avatar-img" />
                  ) : (
                    <span className="navbar-avatar-initials">{profileInitial}</span>
                  )}
                </div>
                <span className="navbar-profile-name">{profileName}</span>
              </button>

              {mobileMenuOpen && onLogout && (
                <button
                  type="button"
                  className="navbar-logout"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                >
                  Sign Out
                </button>
              )}
            </div>
          ) : (
            <div className="navbar-account">
              <a
                href="/login"
                className="navbar-login"
                onClick={(event) => goTo(event, '/login')}
              >
                Login
              </a>

              <a
                href="/register"
                className="navbar-register"
                onClick={(event) => goTo(event, '/register')}
              >
                Register
              </a>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
