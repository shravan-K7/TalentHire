import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../css/Home.css';

// Default curated fallback artists to ensure flawless presentation matching layout
const DEFAULT_FEATURED_ARTISTS = [
  {
    id: 1,
    stage_name: 'Aarav Sharma',
    category_name: 'Singers',
    location: 'Mumbai, Maharashtra',
    starting_price: '25,000',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 2,
    stage_name: 'DJ Rhythmix',
    category_name: 'DJs',
    location: 'Bengaluru, Karnataka',
    starting_price: '35,000',
    rating: '4.8',
    image: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 3,
    stage_name: 'Elena & The Strings',
    category_name: 'Orchestras',
    location: 'New Delhi, Delhi',
    starting_price: '45,000',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 4,
    stage_name: 'The Acoustic Collective',
    category_name: 'Bands',
    location: 'Goa, India',
    starting_price: '40,000',
    rating: '4.8',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=700&q=80',
  },
];

const CATEGORIES = [
  {
    id: 'singers',
    title: 'Singers',
    targetCategory: 'Singers & Vocalists',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
  },
  {
    id: 'djs',
    title: 'DJs',
    targetCategory: 'Live DJs & Producers',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
  },
  {
    id: 'dance-groups',
    title: 'Dance Groups',
    targetCategory: 'Dance Groups',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <path d="m9 20 3-6 3 6" />
        <path d="m6 8 6 2 6-2" />
        <path d="M12 10v4" />
      </svg>
    ),
  },
  {
    id: 'bands',
    title: 'Bands',
    targetCategory: 'Live Bands & Ensembles',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: 'orchestras',
    title: 'Orchestras',
    targetCategory: 'Orchestra & Instrumental',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 2a2 2 0 0 0-2 2v5H6a2 2 0 0 0-2 2v7a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-7a2 2 0 0 0-2-2h-3V4a2 2 0 0 0-2-2Z" />
        <line x1="12" x2="12" y1="9" y2="17" />
      </svg>
    ),
  },
  {
    id: 'anchors',
    title: 'Anchors',
    targetCategory: 'Anchors & Emcees',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" x2="12" y1="18" y2="22" />
        <line x1="8" x2="16" y1="22" y2="22" />
      </svg>
    ),
  },
  {
    id: 'musicians',
    title: 'Musicians',
    targetCategory: 'Orchestra & Instrumental',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
];

const UPCOMING_PERFORMANCES = [
  {
    id: 1,
    title: 'Sunburn Arena Live - DJ Nucleya',
    dateVenue: 'Nov 18, 2026 · NSCI Dome, Mumbai',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    title: 'Soulful Sufi Symphony - Kabir Ensemble',
    dateVenue: 'Nov 28, 2026 · Siri Fort Auditorium, New Delhi',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    title: 'Echoes of Classical Fusion - Anoushka & Co',
    dateVenue: 'Dec 12, 2026 · Palace Grounds, Bengaluru',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  },
];

function Home({ user, onLogout, navigate }) {
  // Search form fields
  const [eventType, setEventType] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');

  // Featured artists from backend or fallback
  const [featuredArtists, setFeaturedArtists] = useState(DEFAULT_FEATURED_ARTISTS);

  // Check if current user is logged in strictly as a customer (not already registered as performing artist)
  const isCustomerOnly = Boolean(
    user &&
    !user.is_artist &&
    !user.artist_profile &&
    user.role !== 'artist' &&
    user.role !== 'admin'
  );

  useEffect(() => {
    let ignore = false;
    async function loadFeatured() {
      try {
        const res = await fetch('/api/auth/artists/?sort=experience', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.artists && data.artists.length > 0 && !ignore) {
            // Map backend artists, merge with fallback if fewer than 4
            const mapped = data.artists.slice(0, 4).map((a, idx) => ({
              id: a.id,
              stage_name: a.stage_name,
              category_name: a.category_name || 'Performer',
              location: a.location || 'India',
              starting_price: Number(a.starting_price || 25000).toLocaleString('en-IN'),
              rating: '4.9',
              image: a.profile_image || DEFAULT_FEATURED_ARTISTS[idx % DEFAULT_FEATURED_ARTISTS.length].image,
            }));

            if (mapped.length < 4) {
              const padded = [...mapped, ...DEFAULT_FEATURED_ARTISTS.slice(mapped.length, 4)];
              setFeaturedArtists(padded);
            } else {
              setFeaturedArtists(mapped);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load live featured artists, using curated set:', err);
      }
    }

    loadFeatured();
    return () => {
      ignore = true;
    };
  }, []);

  function handleSearchSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const queryParts = [];
    if (city.trim()) queryParts.push(city.trim());
    if (eventType.trim() && eventType !== 'all') queryParts.push(eventType.trim());

    const searchParams = new URLSearchParams();
    if (queryParts.length > 0) {
      searchParams.set('search', queryParts.join(' '));
    }
    if (eventType && eventType !== 'all') {
      searchParams.set('category', eventType);
    }

    const url = `/artists${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    if (navigate) {
      navigate(url);
    } else {
      window.location.assign(url);
    }
  }

  function handleCategoryClick(cat) {
    const categoryTarget = typeof cat === 'string' ? cat : (cat.targetCategory || cat.title);
    const url = `/artists?category=${encodeURIComponent(categoryTarget)}`;
    if (navigate) {
      navigate(url);
    } else {
      window.location.assign(url);
    }
  }

  function handleArtistClick(artistId) {
    const url = `/artists/${artistId}`;
    if (navigate) {
      navigate(url);
    } else {
      window.location.assign(url);
    }
  }

  return (
    <div className="home-layout-container">
      {/* 1. Header / Navbar */}
      <Navbar user={user} onLogout={onLogout} currentPath="/" navigate={navigate} />

      <main className="home-layout-main">
        {/* =================================================================
            PAGE 1: HERO SECTION
            ================================================================= */}
        <section className="layout-hero-section" id="home">
          <div className="layout-hero-container">
            {/* Left Content Column */}
            <div className="layout-hero-left">
              {/* Subtle top tags */}
              <div className="hero-eyebrow-tags">
                Weddings · Festivals · Corporate · Private
              </div>

              {/* Main Headline */}
              <h1 className="hero-main-heading">
                Find the Perfect<br />
                Artist for Your<br />
                Event.
              </h1>

              {/* Lead Paragraph */}
              <p className="hero-lead-text">
                TalentHire connects you with singers, DJs, dance groups, bands and more. Compare profiles, preview performances and send a booking request in minutes.
              </p>

              {/* Search Widget Box */}
              <form className="hero-search-bar" onSubmit={handleSearchSubmit}>
                <div className="hero-search-field">
                  <label htmlFor="search-event-type">Event type</label>
                  <select
                    id="search-event-type"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                  >
                    <option value="">Select type</option>
                    <option value="Wedding">Weddings</option>
                    <option value="Festival">Festivals</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Private">Private Party</option>
                    <option value="Concert">Concert / Gig</option>
                  </select>
                </div>

                <div className="hero-search-divider" />

                <div className="hero-search-field">
                  <label htmlFor="search-city">City / District</label>
                  <input
                    id="search-city"
                    type="text"
                    placeholder="Enter city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="hero-search-divider" />

                <div className="hero-search-field">
                  <label htmlFor="search-date">Date</label>
                  <input
                    id="search-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <button type="submit" className="hero-search-btn">
                  Search
                </button>
              </form>

              {/* Hero Action Buttons Below Search */}
              <div className="hero-sub-actions">
                <button
                  type="button"
                  className="btn-explore-artists"
                  onClick={() => (navigate ? navigate('/artists') : window.location.assign('/artists'))}
                >
                  Explore Artists
                </button>

                <button
                  type="button"
                  className="btn-join-artist-link"
                  onClick={() => {
                    const target = user
                      ? (user.is_artist || user.role === 'artist' ? '/artist-dashboard' : '/customer-dashboard?tab=artist-register')
                      : '/register?role=artist';
                    if (navigate) {
                      navigate(target);
                    } else {
                      window.location.assign(target);
                    }
                  }}
                >
                  Join as an Artist
                </button>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="layout-hero-right">
              <div className="hero-image-card">
                <img
                  src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80"
                  alt="Live stage performance"
                  className="hero-image-img"
                />
                <div className="hero-image-overlay">
                  <span className="hero-image-label">[HERO IMAGE – live stage performance]</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            PAGE 1: ARTIST CATEGORIES
            ================================================================= */}
        <section className="layout-section categories-section" id="categories">
          <div className="section-title-wrap">
            <h2 className="section-main-heading">Artist Categories</h2>
            <p className="section-sub-heading">Browse by the kind of performance your event needs.</p>
          </div>

          <div className="categories-tiles-grid">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="category-tile-card"
                onClick={() => handleCategoryClick(cat)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCategoryClick(cat)}
              >
                <div className="category-tile-icon-box">
                  {cat.icon}
                </div>
                <span className="category-tile-name">{cat.title}</span>
              </div>
            ))}
          </div>
        </section>

        {/* =================================================================
            PAGE 1 & 2: FEATURED ARTISTS
            ================================================================= */}
        <section className="layout-section featured-artists-section" id="featured-artists">
          <div className="section-title-row">
            <div className="section-title-wrap">
              <h2 className="section-main-heading">Featured Artists</h2>
              <p className="section-sub-heading">Hand-picked performers, verified by our team.</p>
            </div>
            <button
              type="button"
              className="section-view-all-link"
              onClick={() => (navigate ? navigate('/artists') : window.location.assign('/artists'))}
            >
              View all
            </button>
          </div>

          <div className="featured-artists-grid">
            {featuredArtists.map((artist) => (
              <article key={artist.id} className="featured-artist-card">
                {/* Photo container */}
                <div
                  className="featured-artist-photo-box"
                  onClick={() => handleArtistClick(artist.id)}
                  role="button"
                  tabIndex={0}
                >
                  {artist.image ? (
                    <img src={artist.image} alt={artist.stage_name} className="featured-artist-photo" />
                  ) : (
                    <div className="featured-artist-placeholder-photo">
                      <span>[Artist photo]</span>
                    </div>
                  )}
                </div>

                {/* Card Information */}
                <div className="featured-artist-info">
                  <h3 className="featured-artist-name" onClick={() => handleArtistClick(artist.id)}>
                    {artist.stage_name}
                  </h3>
                  <p className="featured-artist-category">{artist.category_name}</p>
                  <p className="featured-artist-location">{artist.location}</p>

                  <div className="featured-artist-meta-row">
                    <span className="featured-artist-price">From ₹{artist.starting_price}</span>
                    <span className="featured-artist-rating">
                      <span className="rating-star">★</span> {artist.rating}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn-view-profile-purple"
                    onClick={() => handleArtistClick(artist.id)}
                  >
                    View Profile
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* =================================================================
            PAGE 2: HOW IT WORKS
            ================================================================= */}
        <section className="layout-section how-it-works-section" id="how-it-works">
          <div className="section-title-wrap">
            <h2 className="section-main-heading">How It Works</h2>
            <p className="section-sub-heading">Four simple steps from search to stage.</p>
          </div>

          <div className="how-it-works-grid">
            <div className="step-card">
              <div className="step-number-badge">1</div>
              <h3 className="step-title">Explore Artists</h3>
              <p className="step-desc">Browse by category, city and budget.</p>
            </div>

            <div className="step-card">
              <div className="step-number-badge">2</div>
              <h3 className="step-title">Choose Your Favourite</h3>
              <p className="step-desc">Watch previews and compare profiles.</p>
            </div>

            <div className="step-card">
              <div className="step-number-badge">3</div>
              <h3 className="step-title">Send a Booking Request</h3>
              <p className="step-desc">Share your date, venue and requirements.</p>
            </div>

            <div className="step-card">
              <div className="step-number-badge">4</div>
              <h3 className="step-title">Confirm and Enjoy</h3>
              <p className="step-desc">Lock in the booking and enjoy the show.</p>
            </div>
          </div>
        </section>

        {/* =================================================================
            PAGE 2: POPULAR ARTISTS & UPCOMING PERFORMANCES
            ================================================================= */}
        <section className="layout-section upcoming-performances-section">
          <div className="section-title-wrap">
            <h2 className="section-main-heading">Popular Artists & Upcoming Performances</h2>
            <p className="section-sub-heading">Most booked this month, and shows you can catch live.</p>
          </div>

          <div className="upcoming-performances-grid">
            {UPCOMING_PERFORMANCES.map((event) => (
              <div key={event.id} className="upcoming-performance-card">
                <div className="upcoming-performance-image-box">
                  <img src={event.image} alt={event.title} className="upcoming-performance-image" />
                  <div className="upcoming-performance-overlay">
                    <span>[Event / artist image]</span>
                  </div>
                </div>
                <div className="upcoming-performance-info">
                  <h3 className="upcoming-performance-title">{event.title}</h3>
                  <p className="upcoming-performance-venue">{event.dateVenue}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =================================================================
            ARE YOU A PERFORMING ARTIST? (CTA BANNER)
            Shown only for logged-in customers (not registered performing artists)
            ================================================================= */}
        {isCustomerOnly && (
          <section className="layout-section artist-cta-banner-section">
            <div className="artist-purple-banner">
              <div className="artist-purple-banner-content">
                <h2 className="artist-purple-banner-title">Are you a performing artist?</h2>
                <p className="artist-purple-banner-subtitle">
                  Create your profile, get discovered and manage bookings in one place.
                </p>
              </div>
              <div className="artist-purple-banner-action">
                <button
                  type="button"
                  className="btn-banner-register-orange"
                  onClick={() => {
                    const target = '/customer-dashboard?tab=artist-register';
                    if (navigate) {
                      navigate(target);
                    } else {
                      window.location.assign(target);
                    }
                  }}
                >
                  Register as an Artist
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 11. Footer (Page 3) */}
      <Footer navigate={navigate} />
    </div>
  );
}

export default Home;
