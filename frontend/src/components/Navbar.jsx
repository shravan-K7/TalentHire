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

    if (path.startsWith('/#') && window.location.pathname === '/') {
      return;
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
    { label: 'About', path: '/#about' },
  ];

  if (user?.is_staff || user?.is_superuser) {
    links.push({ label: 'Admin Console', path: '/admin/' });
  }

  if (user?.is_artist || user?.artist_profile) {
    links.push({ label: 'Artist Dashboard', path: '/artist-register' });
  }

  const isArtist = Boolean(user?.is_artist || user?.artist_profile);
  const displayName = user
    ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user.username || user.email || 'User'))
    : '';
  const initials = displayName
    ? displayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  const avatarUrl = user?.profile_image || user?.avatar || '';

  return (
    <header className="site-header">
      <nav className="site-navbar">
        <a href="/" className="navbar-brand" onClick={(event) => goTo(event, '/')}>
          <span className="navbar-brand-text">TalentHire</span>
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
                  currentPath === link.path ? 'navbar-link active' : 'navbar-link'
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
                onClick={(e) => goTo(e, isArtist ? '/artist-register' : '/profile?tab=notifications')}
                title="Notifications"
                aria-label="View notifications"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="navbar-bell-dot" />
              </button>

              {/* Profile Button - Direct click navigates to dashboard */}
              <button
                type="button"
                className={`navbar-profile-trigger ${currentPath === '/profile' || currentPath === '/artist-register' ? 'active' : ''}`}
                onClick={(e) => goTo(e, isArtist ? '/artist-register' : '/profile')}
                title={`Go to Dashboard (${displayName})`}
                aria-label="Go to Dashboard"
              >
                <div className="navbar-avatar-circle">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="navbar-avatar-img" />
                  ) : (
                    <span className="navbar-avatar-initials">{initials}</span>
                  )}
                </div>
                <span className="navbar-profile-name">{displayName.split(' ')[0]}</span>
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
                SIGN IN
              </a>

              <a
                href="/register"
                className="navbar-register"
                onClick={(event) => goTo(event, '/register')}
              >
                GET STARTED
              </a>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
