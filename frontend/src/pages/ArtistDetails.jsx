import { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchArtistDetail, toggleFavoriteArtist } from '../js/auth';
import '../css/Artists.css';
import '../css/ArtistDetails.css';

// Default curated stage imagery with graceful error fallbacks
const DEFAULT_STAGE_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    title: 'Main performance photo',
    placeholder: '[Main performance photo]',
  },
  {
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=700&q=80',
    title: 'Stage photo 1',
    placeholder: '[Photo]',
  },
  {
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=700&q=80',
    title: 'Stage photo 2',
    placeholder: '[Photo]',
  },
  {
    url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=700&q=80',
    title: 'Stage photo 3',
    placeholder: '[Photo]',
  },
  {
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=80',
    title: 'Audience and stage view',
    placeholder: '[+ N more photos]',
  },
];

function ArtistDetails({ artistId, user, onLogout, navigate }) {
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Shortlist / Favorite State
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [shortlistMsg, setShortlistMsg] = useState('');

  // Video Reel & Gallery Lightbox Modals
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showGalleryLightbox, setShowGalleryLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    let ignore = false;

    async function loadArtist() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchArtistDetail(artistId);
        if (!ignore) {
          setArtist(data);
          setIsShortlisted(Boolean(data.is_favorited));
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Could not load artist profile.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (artistId) {
      loadArtist();
    }

    return () => {
      ignore = true;
    };
  }, [artistId]);

  // Build the 5 gallery photos: mix artist uploaded image with stage photos
  const galleryPhotos = useMemo(() => {
    const list = [...DEFAULT_STAGE_PHOTOS];
    if (artist?.profile_image) {
      list[0] = {
        url: artist.profile_image,
        title: artist.stage_name,
        placeholder: '[Main performance photo]',
      };
    }
    if (artist?.portfolio_items?.length) {
      artist.portfolio_items.forEach((item, idx) => {
        if (idx + 1 < list.length && item.media_url && !item.media_url.includes('youtube')) {
          list[idx + 1] = {
            url: item.media_url,
            title: item.title,
            placeholder: '[Photo]',
          };
        }
      });
    }
    return list;
  }, [artist]);

  function handleImageError(idx) {
    setImageErrors((prev) => ({ ...prev, [idx]: true }));
  }

  async function handleToggleShortlist() {
    if (!user) {
      if (navigate) {
        navigate('/login');
      } else {
        window.location.assign('/login');
      }
      return;
    }

    setShortlistLoading(true);
    setShortlistMsg('');
    try {
      const res = await toggleFavoriteArtist(artist.id);
      setIsShortlisted(res.is_favorite);
      setShortlistMsg(res.message || (res.is_favorite ? 'Saved to shortlist!' : 'Removed from shortlist.'));
      setTimeout(() => setShortlistMsg(''), 3000);
    } catch (err) {
      setShortlistMsg(err.message || 'Could not update shortlist.');
      setTimeout(() => setShortlistMsg(''), 3000);
    } finally {
      setShortlistLoading(false);
    }
  }

  function openLightbox(index) {
    setLightboxIndex(index);
    setShowGalleryLightbox(true);
  }

  const isOwner = user && artist && user.artist_profile && user.artist_profile.id === artist.id;

  // Extract video reel URL if available
  const reelVideoUrl = useMemo(() => {
    if (!artist) return null;
    const url = artist.portfolio_url || (artist.portfolio_items?.[0]?.media_url);
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    // Fallback embed for live showcase preview
    return 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
  }, [artist]);

  // Completed shows
  const completedShows = artist?.completed_shows || [
    {
      id: 1,
      event_name: 'Tech Innovation Summit 2026',
      event_type: 'Corporate Summit',
      city: 'Mumbai',
      date_str: 'Oct 2026',
    },
    {
      id: 2,
      event_name: 'Destination Sangeet & Reception',
      event_type: 'Wedding Celebration',
      city: 'Udaipur',
      date_str: 'Sep 2026',
    },
    {
      id: 3,
      event_name: 'National Sports Excellence Awards',
      event_type: 'Sports Gala',
      city: 'New Delhi',
      date_str: 'Aug 2026',
    },
    {
      id: 4,
      event_name: 'Global Leadership Forum & Gala',
      event_type: 'Corporate Summit',
      city: 'Bengaluru',
      date_str: 'Jul 2026',
    },
  ];

  // Reviews
  const reviewsList = artist?.reviews || [];
  const displayedReviews = showAllReviews ? reviewsList : reviewsList.slice(0, 3);

  const ratingsBreakdown = artist?.ratings_breakdown || [
    { star: 5, count: 20, percentage: 83 },
    { star: 4, count: 4, percentage: 17 },
    { star: 3, count: 0, percentage: 0 },
    { star: 2, count: 0, percentage: 0 },
    { star: 1, count: 0, percentage: 0 },
  ];

  return (
    <div className="artist-details-wrapper">
      <Navbar user={user} onLogout={onLogout} currentPath="/artists" navigate={navigate} />

      <main className="artist-details-content">
        {/* Top Back Navigation Bar */}
        <nav className="artist-back-bar" aria-label="Breadcrumb">
          <button
            type="button"
            className="artist-back-btn"
            onClick={() => (navigate ? navigate('/artists') : window.location.assign('/artists'))}
            aria-label="Back to all artists"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to all artists</span>
          </button>
        </nav>

        {error && (
          <div className="auth-alert-error" role="alert" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        {shortlistMsg && (
          <div className="auth-alert-status" role="status" style={{ marginBottom: 20 }}>
            {shortlistMsg}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#A0A0A0' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '3px solid rgba(255, 87, 34, 0.2)',
                borderTopColor: '#FF5722',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p>Loading performing artist profile...</p>
          </div>
        ) : !artist ? (
          <div className="artists-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', color: '#FFFFFF', marginBottom: 10 }}>Artist Not Found</h2>
            <p style={{ color: '#A0A0A0', marginBottom: 20 }}>
              The requested performer profile could not be found or is temporarily unavailable.
            </p>
            <button
              type="button"
              className="booking-btn-primary"
              style={{ maxWidth: 220, margin: '0 auto' }}
              onClick={() => (navigate ? navigate('/artists') : window.location.assign('/artists'))}
            >
              Browse All Artists
            </button>
          </div>
        ) : (
          <>
            {/* 1. 5-Photo Gallery Grid (Airbnb Style) */}
            <section className="artist-gallery-grid" aria-label="Artist photo showcase">
              {/* Left Large Slot: Main Performance Photo */}
              <div
                className="gallery-main-slot"
                onClick={() => openLightbox(0)}
                title="Click to expand main performance photo"
              >
                {!imageErrors[0] ? (
                  <img
                    src={galleryPhotos[0].url}
                    alt={`${artist.stage_name} main stage`}
                    className="gallery-img"
                    onError={() => handleImageError(0)}
                  />
                ) : (
                  <div className="gallery-placeholder-card">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="gallery-placeholder-label">[Main performance photo]</span>
                  </div>
                )}
              </div>

              {/* Right 2x2 Subgrid */}
              <div className="gallery-subgrid">
                {/* Photo 1 (Top-Left) */}
                <div
                  className="gallery-sub-slot"
                  onClick={() => openLightbox(1)}
                  title="Click to view stage photo 1"
                >
                  {!imageErrors[1] ? (
                    <img
                      src={galleryPhotos[1].url}
                      alt={`${artist.stage_name} performance 1`}
                      className="gallery-img"
                      onError={() => handleImageError(1)}
                    />
                  ) : (
                    <div className="gallery-placeholder-card">
                      <span className="gallery-placeholder-label">[Photo]</span>
                    </div>
                  )}
                </div>

                {/* Photo 2 (Top-Right) */}
                <div
                  className="gallery-sub-slot"
                  onClick={() => openLightbox(2)}
                  title="Click to view stage photo 2"
                >
                  {!imageErrors[2] ? (
                    <img
                      src={galleryPhotos[2].url}
                      alt={`${artist.stage_name} performance 2`}
                      className="gallery-img"
                      onError={() => handleImageError(2)}
                    />
                  ) : (
                    <div className="gallery-placeholder-card">
                      <span className="gallery-placeholder-label">[Photo]</span>
                    </div>
                  )}
                </div>

                {/* Photo 3 (Bottom-Left) */}
                <div
                  className="gallery-sub-slot"
                  onClick={() => openLightbox(3)}
                  title="Click to view stage photo 3"
                >
                  {!imageErrors[3] ? (
                    <img
                      src={galleryPhotos[3].url}
                      alt={`${artist.stage_name} performance 3`}
                      className="gallery-img"
                      onError={() => handleImageError(3)}
                    />
                  ) : (
                    <div className="gallery-placeholder-card">
                      <span className="gallery-placeholder-label">[Photo]</span>
                    </div>
                  )}
                </div>

                {/* Photo 4 (Bottom-Right with + N more photos overlay) */}
                <div
                  className="gallery-sub-slot"
                  onClick={() => openLightbox(4)}
                  title="Click to view all artist photos"
                >
                  {!imageErrors[4] ? (
                    <img
                      src={galleryPhotos[4].url}
                      alt={`${artist.stage_name} audience and stage`}
                      className="gallery-img"
                      onError={() => handleImageError(4)}
                    />
                  ) : (
                    <div className="gallery-placeholder-card">
                      <span className="gallery-placeholder-label">[+ N more photos]</span>
                    </div>
                  )}
                  <div className="gallery-more-overlay">
                    <span>[+ N more photos]</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Main Two-Column Layout */}
            <div className="artist-main-layout">
              {/* Left Main Column */}
              <div className="artist-col-left">
                {/* Badges Row */}
                <div className="artist-badges-row">
                  <span className="artist-category-badge">
                    {artist.category_name || 'Anchors & Emcees'}
                  </span>
                  {artist.is_verified && (
                    <span className="artist-verified-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Verified Performer</span>
                    </span>
                  )}
                </div>

                {/* Artist Name & Heading */}
                <h1 className="artist-name-title">{artist.stage_name}</h1>

                {/* Subtitle / Location / Travel / Rating */}
                <div className="artist-meta-subtitle">
                  <span>{artist.location || 'Pune, Maharashtra'}</span>
                  <span className="meta-divider">·</span>
                  <span>{artist.travel_availability_display || 'Travels across India'}</span>
                  <span className="meta-divider">·</span>
                  <span>{artist.languages || 'English & Hindi'}</span>
                  <span className="meta-divider">·</span>
                  <span className="artist-rating-snippet">
                    <span className="artist-star-icon">★</span>
                    <strong style={{ color: '#FFFFFF' }}>{artist.average_rating || '4.8'}</strong>
                    <span style={{ color: '#8E8E8E' }}>
                      ({artist.total_reviews || 24} reviews)
                    </span>
                  </span>
                </div>

                {/* 4 Key Stats Row */}
                <section className="artist-stats-grid" aria-label="Key artist statistics">
                  <div className="artist-stat-card">
                    <span className="artist-stat-value">
                      {artist.years_of_experience || 8} yrs
                    </span>
                    <span className="artist-stat-label">Stage experience</span>
                  </div>

                  <div className="artist-stat-card">
                    <span className="artist-stat-value">
                      {artist.shows_completed || '140+'}
                    </span>
                    <span className="artist-stat-label">Shows completed</span>
                  </div>

                  <div className="artist-stat-card">
                    <span className="artist-stat-value">
                      {artist.average_rating || '4.8'}
                    </span>
                    <span className="artist-stat-label">Average rating</span>
                  </div>

                  <div className="artist-stat-card">
                    <span className="artist-stat-value">
                      {artist.response_time || '< 2 hrs'}
                    </span>
                    <span className="artist-stat-label">Response time</span>
                  </div>
                </section>

                {/* Card 1: About the Performer */}
                <article className="artist-card-section">
                  <h2 className="artist-section-title">About the performer</h2>
                  <p className="artist-bio-text">
                    {artist.bio ||
                      'Charismatic, bilingual English & Hindi anchor specializing in tech summits, annual award ceremonies, sports galas, and lively wedding receptions with audience engagement games and stage moderation.'}
                  </p>

                  {artist.performance_types && artist.performance_types.length > 0 && (
                    <div className="artist-tags-row">
                      {artist.performance_types.map((type) => (
                        <span key={type} className="artist-tag-pill">
                          {type}
                        </span>
                      ))}
                    </div>
                  )}
                </article>

                {/* Card 2: Performance Reel */}
                <article className="artist-card-section">
                  <h2 className="artist-section-title">Performance reel</h2>
                  <div
                    className="artist-reel-frame"
                    onClick={() => setShowVideoModal(true)}
                    title="Click to play live event performance highlights reel"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setShowVideoModal(true);
                    }}
                  >
                    <button
                      type="button"
                      className="artist-reel-play-btn"
                      aria-label="Play performance reel"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowVideoModal(true);
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
                        <polygon points="6 4 20 12 6 20" />
                      </svg>
                    </button>
                    <span className="artist-reel-caption">
                      [Video thumbnail – live event highlights]
                    </span>
                  </div>
                </article>

                {/* Card 3: Completed Shows */}
                <article className="artist-card-section">
                  <h2 className="artist-section-title">Completed shows</h2>
                  <div className="artist-shows-list">
                    {completedShows.map((show) => (
                      <div key={show.id} className="artist-show-item">
                        <div className="artist-show-left">
                          <div className="artist-show-thumb" aria-hidden="true">
                            <span>[img]</span>
                          </div>
                          <div>
                            <div className="artist-show-name">{show.event_name}</div>
                            <div className="artist-show-sub">
                              {show.event_type} · {show.city}
                            </div>
                          </div>
                        </div>
                        <div className="artist-show-date">{show.date_str}</div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Card 4: Reviews Section */}
                <article className="artist-card-section">
                  <h2 className="artist-section-title">Reviews</h2>

                  {/* Summary & Rating Breakdown Row */}
                  <div className="artist-reviews-summary">
                    {/* Left Big Score */}
                    <div className="artist-score-block">
                      <span className="artist-big-score">{artist.average_rating || '4.8'}</span>
                      <div className="artist-stars-row" aria-label="5 stars">
                        ★★★★★
                      </div>
                      <span className="artist-reviews-total">
                        {artist.total_reviews || 24} reviews
                      </span>
                    </div>

                    {/* Right Bars Breakdown */}
                    <div className="artist-bars-block">
                      {ratingsBreakdown.map((item) => (
                        <div key={item.star} className="artist-bar-row">
                          <span className="artist-bar-star-num">{item.star}</span>
                          <div className="artist-bar-track">
                            <div
                              className="artist-bar-fill"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr className="artist-reviews-divider" />

                  {/* Individual Customer Reviews List */}
                  <div className="artist-reviews-list">
                    {displayedReviews.map((rev) => (
                      <div key={rev.id} className="artist-review-item">
                        <div className="artist-review-avatar" aria-hidden="true">
                          <span>[ ]</span>
                        </div>
                        <div className="artist-review-content">
                          <div className="artist-review-header">
                            {rev.customer_name} · {rev.event_type || 'Event'}, {rev.date_str || rev.created_at}
                          </div>
                          <div className="artist-review-stars">
                            {'★'.repeat(rev.rating || 5)}
                            {'☆'.repeat(Math.max(0, 5 - (rev.rating || 5)))}
                          </div>
                          <p className="artist-review-comment">{rev.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {reviewsList.length > 3 && (
                    <button
                      type="button"
                      className="artist-view-reviews-btn"
                      onClick={() => setShowAllReviews((prev) => !prev)}
                    >
                      {showAllReviews ? 'Show fewer reviews' : 'View all reviews'}
                    </button>
                  )}
                </article>
              </div>

              {/* Right Sticky Booking Card Widget */}
              <aside className="artist-col-right" aria-label="Book performer card">
                <div className="artist-booking-widget">
                  <div className="booking-fee-label">Starting fee per event</div>
                  <div className="booking-fee-price">
                    ₹{Number(artist.starting_price || 18000).toLocaleString('en-IN')}
                  </div>
                  <div className="booking-fee-note">
                    Final quote depends on duration and location.
                  </div>

                  {isOwner ? (
                    <button
                      type="button"
                      className="booking-btn-primary"
                      style={{ background: '#673AB7' }}
                      onClick={() =>
                        navigate ? navigate('/artist-register') : window.location.assign('/artist-register')
                      }
                    >
                      Edit My Artist Profile
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="booking-btn-primary"
                      onClick={() => {
                        if (!user) {
                          if (navigate) {
                            navigate(`/login?redirect=${encodeURIComponent(`/book-artist/${artist.id}`)}`);
                          } else {
                            window.location.assign(`/login?redirect=${encodeURIComponent(`/book-artist/${artist.id}`)}`);
                          }
                        } else {
                          if (navigate) {
                            navigate(`/book-artist/${artist.id}`);
                          } else {
                            window.location.assign(`/book-artist/${artist.id}`);
                          }
                        }
                      }}
                    >
                      Book Artist
                    </button>
                  )}

                  <div className="booking-charged-note">You won’t be charged yet</div>

                  <div className="booking-checklist">
                    <div className="booking-check-item">
                      <span className="booking-check-icon">✓</span>
                      <span>Verified stage performer</span>
                    </div>
                    <div className="booking-check-item">
                      <span className="booking-check-icon">✓</span>
                      <span>No middleman markups</span>
                    </div>
                    <div className="booking-check-item">
                      <span className="booking-check-icon">✓</span>
                      <span>Direct artist communication</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`booking-btn-shortlist ${isShortlisted ? 'is-shortlisted' : ''}`}
                    onClick={handleToggleShortlist}
                    disabled={shortlistLoading}
                    title={isShortlisted ? 'Saved in your shortlist' : 'Save this artist to your shortlist'}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={isShortlisted ? '#FF5722' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{isShortlisted ? 'Saved to shortlist' : 'Save to shortlist'}</span>
                  </button>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {/* Video Reel Modal */}
      {showVideoModal && (
        <div className="modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="video-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3 className="video-modal-title">
                {artist?.stage_name} — Live Performance Highlights
              </h3>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setShowVideoModal(false)}
                aria-label="Close video player"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="video-modal-player-wrap">
              {reelVideoUrl ? (
                <iframe
                  src={reelVideoUrl}
                  title="Live performance showcase"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
                  No video player available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gallery Lightbox Modal */}
      {showGalleryLightbox && (
        <div className="modal-overlay" onClick={() => setShowGalleryLightbox(false)}>
          <div className="gallery-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-lightbox-header">
              <span style={{ color: '#F7F7F7', fontWeight: 600, fontSize: '1rem' }}>
                {galleryPhotos[lightboxIndex]?.title || 'Stage Photo'} ({lightboxIndex + 1} of {galleryPhotos.length})
              </span>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setShowGalleryLightbox(false)}
                aria-label="Close photo gallery"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="gallery-lightbox-view">
              <img
                src={galleryPhotos[lightboxIndex]?.url}
                alt={galleryPhotos[lightboxIndex]?.title}
              />
            </div>

            <div className="gallery-lightbox-nav">
              <button
                type="button"
                className="gallery-nav-btn"
                onClick={() =>
                  setLightboxIndex((prev) => (prev > 0 ? prev - 1 : galleryPhotos.length - 1))
                }
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Previous
              </button>
              <button
                type="button"
                className="gallery-nav-btn"
                onClick={() =>
                  setLightboxIndex((prev) => (prev < galleryPhotos.length - 1 ? prev + 1 : 0))
                }
              >
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer navigate={navigate} />
    </div>
  );
}

export default ArtistDetails;
