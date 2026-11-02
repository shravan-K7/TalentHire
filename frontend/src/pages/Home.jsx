import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../css/Home.css';

function Home({ user, onLogout, navigate }) {
  function handleExploreClick() {
    if (navigate) {
      navigate('/artists');
    } else {
      window.location.href = '/artists';
    }
  }

  function handleCategoryClick(categoryTitle) {
    if (navigate) {
      navigate(`/artists?category=${encodeURIComponent(categoryTitle)}`);
    }
  }

  function handleAboutClick() {
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const categories = [
    {
      title: 'Singers & Vocalists',
      desc: 'Classical, Bollywood, Pop, Jazz, Rock and acoustic solo vocalists for any event.',
      badge: 'Music',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" x2="12" y1="19" y2="22"/>
        </svg>
      ),
    },
    {
      title: 'Dance Groups',
      desc: 'Hip-hop crews, classical fusion, contemporary, and high-energy stage dancers.',
      badge: 'Performance',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ),
    },
    {
      title: 'Live DJs & Producers',
      desc: 'Club, EDM, techno, wedding DJs, and open-format master turntablists.',
      badge: 'Electronic',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
        </svg>
      ),
    },
    {
      title: 'Orchestra & Instrumental',
      desc: 'Symphonies, string quartets, fusion instrumentalists, flautists, and sitar masters.',
      badge: 'Instrumental',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10 8 16 12 10 16 10 8"/>
        </svg>
      ),
    },
    {
      title: 'Anchors & Emcees',
      desc: 'Engaging corporate hosts, bilingual emcees, and energetic stage moderators.',
      badge: 'Hosting',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      title: 'Live Bands & Ensembles',
      desc: 'Indie rock, pop cover bands, sufi fusion, and brass marching ensembles.',
      badge: 'Live Band',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="home-container">
      {/* Full View Navbar */}
      <Navbar user={user} onLogout={onLogout} currentPath="/" navigate={navigate} />

      <main className="main-content">
        {/* Full View Hero Section */}
        <section id="home" className="hero-section">
          {/* Announcement pill badge */}
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            <span>New · TalentHire v2.0</span>
          </div>

          {/* Main Headline */}
          <h1 className="hero-title">
            Book <span className="hero-accent">stunning</span> performers in minutes
          </h1>

          {/* Subtitle */}
          <p className="hero-description">
            Discover verified, stage-ready performers and preview them across real events — then book securely anywhere.
          </p>

          {/* Hero CTA buttons */}
          <div className="hero-actions">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={handleExploreClick}
            >
              <span>START FOR FREE</span>
            </button>

            <button
              type="button"
              className="btn-hero-secondary"
              onClick={handleAboutClick}
            >
              <span>LEARN MORE</span>
            </button>
          </div>

          {/* Social Proof with Clean SVG Stars */}
          <div className="hero-social-proof">
            <div className="stars-wrapper">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="star-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ))}
            </div>
            <span className="social-text">Loved by 12,000+ event organizers & performers</span>
          </div>
        </section>

        {/* Dashboard Banner for Logged In Users */}
        {user && (
          <section className="dashboard-banner-section">
            {user.is_artist || user.artist_profile ? (
              <div className="artist-cta-card artist-dashboard-card">
                <div className="artist-dashboard-header">
                  <div className="artist-status-tag">
                    <span className="live-indicator"></span>
                    <span>Artist Profile Active</span>
                  </div>
                  {user.artist_profile?.is_verified && (
                    <span className="verified-pill">Verified Performer</span>
                  )}
                </div>

                <div className="artist-dashboard-body">
                  <div className="artist-profile-summary">
                    <h2 className="artist-stage-title">
                      {user.artist_profile?.stage_name || user.username}
                    </h2>
                    <p className="artist-category-sub">
                      {user.artist_profile?.category_name || 'Performing Artist'}
                      {user.artist_profile?.location ? ` · ${user.artist_profile.location}` : ''}
                    </p>
                    {user.artist_profile?.starting_price && (
                      <p className="artist-rate-highlight">
                        Starting at ₹{user.artist_profile.starting_price} / event
                      </p>
                    )}
                  </div>

                  <div className="artist-dashboard-actions">
                    <button
                      type="button"
                      className="btn-hero-primary"
                      onClick={() => navigate('/artist-register')}
                    >
                      <span>MANAGE ARTIST PROFILE</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="artist-cta-card">
                <span className="artist-cta-badge">Earn on TalentHire</span>
                <div className="artist-cta-content">
                  <h2 className="artist-cta-title">Become a Performing Artist</h2>
                  <p className="artist-cta-desc">
                    Are you a vocalist, dancer, DJ, musician, or host? Create your verified artist profile, showcase your portfolio, and get booked directly by event organizers with zero middleman friction.
                  </p>
                  <div className="artist-cta-perks">
                    <span>Keep 100% of your listed pricing</span>
                    <span>Direct booking inquiries & contracts</span>
                    <span>Verified badge across performance roster</span>
                  </div>
                </div>
                <div className="artist-cta-footer">
                  <button
                    type="button"
                    className="btn-hero-primary"
                    onClick={() => navigate('/artist-register')}
                  >
                    <span>REGISTER AS AN ARTIST</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Categories Grid Section (Screen Start to End) */}
        <section id="categories" className="categories-section">
          <div className="section-header">
            <span className="section-badge">Live Performance Roster</span>
            <h2 className="section-title">Explore by Performance Category</h2>
            <p className="section-subtitle">
              Browse world-class talent handpicked for quality, stage presence, and professionalism.
            </p>
          </div>

          <div className="categories-grid">
            {categories.map((cat) => (
              <div
                key={cat.title}
                className="category-card"
                onClick={() => handleCategoryClick(cat.title)}
                style={{ cursor: 'pointer' }}
              >
                <div className="category-card-top">
                  <div className="category-icon-box">{cat.icon}</div>
                  <span className="category-badge">{cat.badge}</span>
                </div>
                <div>
                  <h3 className="category-title">{cat.title}</h3>
                  <p className="category-desc">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* About Section - Clean without stats */}
        <section id="about" className="about-section">
          <div className="about-card">
            <div className="about-info">
              <span className="section-badge">Platform Mission</span>
              <h2 className="about-heading">About TalentHire</h2>
              <p className="about-text">
                TalentHire connects visionary event hosts with extraordinary artists. We eliminate booking friction with verified reviews, live audio reels, transparent pricing, and instant contracts.
              </p>
              <button
                type="button"
                className="btn-hero-primary"
                onClick={handleExploreClick}
              >
                <span>EXPLORE ARTISTS</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Full View Footer */}
      <Footer />
    </div>
  );
}

export default Home;
