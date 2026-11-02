import { useState, useEffect, useRef } from 'react';
import '../css/Navbar.css';

function Navbar({ user, onLogout, currentPath = '/', navigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function goTo(event, path) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);

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
    { label: 'Categories', path: '/#categories' },
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

              {/* Profile Icon / Avatar with Dropdown */}
              <div className="navbar-profile-container" ref={profileMenuRef}>
                <button
                  type="button"
                  className={`navbar-profile-trigger ${profileMenuOpen ? 'active' : ''}`}
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  title={`Profile: ${displayName}`}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="navbar-avatar-circle">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="navbar-avatar-img" />
                    ) : (
                      <span className="navbar-avatar-initials">{initials}</span>
                    )}
                  </div>
                  <span className="navbar-profile-name">{displayName.split(' ')[0]}</span>
                  <svg className={`navbar-caret ${profileMenuOpen ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {profileMenuOpen && (
                  <div className="navbar-dropdown-menu" role="menu">
                    <div className="navbar-dropdown-header">
                      <div className="navbar-dropdown-avatar">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <div className="navbar-dropdown-userinfo">
                        <strong className="navbar-dropdown-name">{displayName}</strong>
                        <span className="navbar-dropdown-email">{user.email || user.username}</span>
                        <span className={`navbar-role-pill ${isArtist ? 'artist' : 'customer'}`}>
                          {isArtist ? 'Artist' : 'Customer'}
                        </span>
                      </div>
                    </div>

                    <div className="navbar-dropdown-divider" />

                    {isArtist ? (
                      <>
                        <button
                          type="button"
                          className="navbar-dropdown-item"
                          onClick={(e) => goTo(e, '/artist-register')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          Artist Dashboard
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="navbar-dropdown-item"
                          onClick={(e) => goTo(e, '/profile')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                          </svg>
                          Customer Profile
                        </button>

                        <button
                          type="button"
                          className="navbar-dropdown-item"
                          onClick={(e) => goTo(e, '/profile?tab=bookings')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          My Bookings
                        </button>

                        <button
                          type="button"
                          className="navbar-dropdown-item"
                          onClick={(e) => goTo(e, '/profile?tab=payments')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                            <line x1="1" y1="10" x2="23" y2="10" />
                          </svg>
                          Payment History
                        </button>

                        <button
                          type="button"
                          className="navbar-dropdown-item"
                          onClick={(e) => goTo(e, '/profile?tab=settings')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                          </svg>
                          Settings
                        </button>
                      </>
                    )}

                    <div className="navbar-dropdown-divider" />

                    <button
                      type="button"
                      className="navbar-dropdown-item logout"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
