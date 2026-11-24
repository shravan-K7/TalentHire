import { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchArtistDetail, toggleFavoriteArtist } from '../js/auth';
import '../css/Artists.css';
import '../css/ArtistDetails.css';

// Default curated stage imagery matching the design reference
const DEFAULT_STAGE_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    title: 'Live Concert Performance',
  },
  {
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=700&q=80',
    title: 'Live Event - Close Up',
  },
  {
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=700&q=80',
    title: 'Corporate Event Setup',
  },
  {
    url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=700&q=80',
    title: 'Orchestra Performance',
  },
  {
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=80',
    title: 'Festival Crowd',
  },
];

// Curated performance reel fallbacks matching the design reference
const DEFAULT_REEL_ITEMS = [
  {
    id: 'def-reel-1',
    title: 'Live Concert Highlights',
    duration: '03:24',
    thumbnail_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=700&q=80',
    youtube_embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
  },
  {
    id: 'def-reel-2',
    title: 'Wedding Performance',
    duration: '02:46',
    thumbnail_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=700&q=80',
    youtube_embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
  },
  {
    id: 'def-reel-3',
    title: 'Orchestra Collaboration',
    duration: '04:10',
    thumbnail_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=700&q=80',
    youtube_embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
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
  const [activeVideo, setActiveVideo] = useState(null);
  const [showGalleryLightbox, setShowGalleryLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  // Custom Quote Modal State
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    eventType: 'Wedding Reception',
    eventDate: '',
    venue: '',
    audience: '200',
    message: '',
  });

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

  // Build the 5 Hero Gallery photos: featured photo first, followed by photo gallery items
  const heroPhotos = useMemo(() => {
    const list = [...DEFAULT_STAGE_PHOTOS];

    // Priority 1: explicitly selected featured item
    if (artist?.featured_item?.media_url) {
      list[0] = {
        url: artist.featured_item.media_url,
        title: artist.featured_item.title || artist.stage_name,
      };
    } else if (artist?.photos?.length) {
      list[0] = {
        url: artist.photos[0].media_url,
        title: artist.photos[0].title || artist.stage_name,
      };
    } else if (artist?.profile_image) {
      list[0] = {
        url: artist.profile_image,
        title: artist.stage_name,
      };
    }

    // Slots 1 to 4 from uploaded photos
    if (artist?.photos?.length) {
      const remainingUploaded = artist.photos.filter(
        (p) => p.media_url !== list[0]?.url
      );
      remainingUploaded.forEach((item, idx) => {
        if (idx + 1 < list.length && item.media_url) {
          list[idx + 1] = {
            url: item.media_url,
            title: item.title || `Stage photo ${idx + 1}`,
          };
        }
      });
    }

    return list;
  }, [artist]);

  // All photos for lightbox viewing
  const allLightboxPhotos = useMemo(() => {
    if (artist?.photos && artist.photos.length > 0) {
      const seen = new Set();
      const combined = [];
      if (artist.featured_item?.media_url) {
        seen.add(artist.featured_item.media_url);
        combined.push({
          url: artist.featured_item.media_url,
          title: artist.featured_item.title || artist.stage_name,
        });
      }
      artist.photos.forEach((p) => {
        if (p.media_url && !seen.has(p.media_url)) {
          seen.add(p.media_url);
          combined.push({
            url: p.media_url,
            title: p.title || 'Stage Photo',
          });
        }
      });
      if (combined.length > 0) return combined;
    }
    return heroPhotos;
  }, [artist, heroPhotos]);

  // Additional photos count for hero slot 4 overlay (+ 3 More Photos)
  const morePhotosCount = useMemo(() => {
    if (artist?.photos && artist.photos.length > 4) {
      return artist.photos.length - 4;
    }
    return 3; // matching reference showcase default
  }, [artist]);

  // Performance Reel items
  const reelItems = useMemo(() => {
    if (artist?.performance_reel && artist.performance_reel.length > 0) {
      return artist.performance_reel;
    }
    return DEFAULT_REEL_ITEMS;
  }, [artist]);

  // Photo Gallery section items (4 photos)
  const photoGalleryItems = useMemo(() => {
    if (artist?.photos && artist.photos.length >= 4) {
      return artist.photos.slice(0, 4);
    }
    if (artist?.photos && artist.photos.length > 0) {
      // pad with default photos up to 4
      const padded = [...artist.photos];
      for (let i = 1; i < DEFAULT_STAGE_PHOTOS.length && padded.length < 4; i++) {
        padded.push({
          id: `def-p-${i}`,
          media_url: DEFAULT_STAGE_PHOTOS[i].url,
          title: DEFAULT_STAGE_PHOTOS[i].title,
        });
      }
      return padded;
    }
    return DEFAULT_STAGE_PHOTOS.slice(1, 5).map((p, idx) => ({
      id: `def-p-${idx}`,
      media_url: p.url,
      title: p.title,
    }));
  }, [artist]);

  // Completed Shows
  const completedShows = useMemo(() => {
    if (artist?.completed_shows && artist.completed_shows.length > 0) {
      return artist.completed_shows;
    }
    return [
      {
        id: 1,
        event_name: 'Wedding Reception - Kannur',
        date_str: 'Dec 12, 2026',
      },
      {
        id: 2,
        event_name: 'Corporate Event - Mangalore',
        date_str: 'Dec 05, 2026',
      },
      {
        id: 3,
        event_name: 'College Fest - Kasaragod',
        date_str: 'Nov 20, 2026',
      },
    ];
  }, [artist]);

  // Reviews
  const reviewsList = useMemo(() => {
    if (artist?.reviews && artist.reviews.length > 0) {
      return artist.reviews;
    }
    return [
      {
        id: 101,
        customer_name: 'Anil Mathew',
        event_type: 'Corporate Event',
        date_str: 'Dec 05, 2026',
        rating: 5,
        comment: 'Excellent performance and great audience engagement!',
      },
      {
        id: 102,
        customer_name: 'Neha S',
        event_type: 'Wedding Reception',
        date_str: 'Dec 12, 2026',
        rating: 5,
        comment: 'Very professional and talented. Highly recommended!',
      },
    ];
  }, [artist]);

  function handleImageError(idx) {
    setImageErrors((prev) => ({ ...prev, [idx]: true }));
  }

  async function handleToggleShortlist() {
    if (!user) {
      const dest = `/login?redirect=${encodeURIComponent(`/artists/${artistId}`)}`;
      if (navigate) navigate(dest);
      else window.location.assign(dest);
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
    setLightboxIndex(index % allLightboxPhotos.length);
    setShowGalleryLightbox(true);
  }

  function handlePlayVideo(item) {
    let embedUrl = item.youtube_embed_url;
    if (!embedUrl && item.youtube_url) {
      const match = item.youtube_url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
      );
      if (match) {
        embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
      }
    }
    setActiveVideo({
      title: item.title,
      embedUrl,
      mediaUrl: item.media_url,
      itemType: item.item_type,
    });
  }

  const isOwner = user && artist && user.artist_profile && user.artist_profile.id === artist.id;

  return (
    <div className="artist-details-wrapper">
      <Navbar user={user} onLogout={onLogout} currentPath="/artists" navigate={navigate} />

      <main className="artist-details-content">
        {/* Top Breadcrumb Navigation */}
        <nav className="artist-breadcrumb-nav" aria-label="Breadcrumb">
          <button
            type="button"
            className="artist-breadcrumb-link"
            onClick={() => (navigate ? navigate('/artists') : window.location.assign('/artists'))}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Explore Artists</span>
          </button>
          <span className="artist-breadcrumb-sep">›</span>
          <span className="artist-breadcrumb-muted">
            {artist?.category_name || 'Singers & Vocalists'}
          </span>
          <span className="artist-breadcrumb-sep">›</span>
          <span className="artist-breadcrumb-current">
            {artist?.stage_name || 'Performer Profile'}
          </span>
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
            {/* 1. Hero Gallery Collage (Top 5 Photos) */}
            <section className="artist-gallery-grid" aria-label="Artist photo showcase">
              {/* Left Large Slot: Featured / Main Performance Photo */}
              <div
                className="gallery-main-slot"
                onClick={() => openLightbox(0)}
                title="Click to view full image"
              >
                {!imageErrors[0] ? (
                  <img
                    src={heroPhotos[0].url}
                    alt={`${artist.stage_name} featured performance`}
                    className="gallery-img"
                    onError={() => handleImageError(0)}
                  />
                ) : (
                  <div className="gallery-placeholder-card">
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
                      src={heroPhotos[1]?.url}
                      alt={`${artist.stage_name} photo 1`}
                      className="gallery-img"
                      onError={() => handleImageError(1)}
                    />
                  ) : (
                    <div className="gallery-placeholder-card">
                      <span className="gallery-placeholder-label">[Photo 1]</span>
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
                      src={heroPhotos[2]?.url}
                      alt={`${artist.stage_name} photo 2`}
                      className="gallery-img"
                      onError={() => handleImageError(2)}
                    />
                  ) : (
                    <div className="gallery-placeholder-card">
                      <span className="gallery-placeholder-label">[Photo 2]</span>
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
                      src={heroPhotos[3]?.url}
                      alt={`${artist.stage_name} photo 3`}
                      className="gallery-img"
                      onError={() => handleImageError(3)}
                    />
                  ) : (
                    <div className="gallery-placeholder-card">
                      <span className="gallery-placeholder-label">[Photo 3]</span>
                    </div>
                  )}
                </div>

                {/* Photo 4 (Bottom-Right with + N More Photos overlay) */}
                <div
                  className="gallery-sub-slot"
                  onClick={() => openLightbox(4)}
                  title="Click to view full photo gallery"
                >
                  {!imageErrors[4] ? (
                    <img
                      src={heroPhotos[4]?.url}
                      alt={`${artist.stage_name} photo 4`}
                      className="gallery-img"
                      onError={() => handleImageError(4)}
                    />
                  ) : (
                    <div className="gallery-placeholder-card">
                      <span className="gallery-placeholder-label">[Photo 4]</span>
                    </div>
                  )}
                  <div className="gallery-more-overlay">
                    <span>+ {morePhotosCount} More Photos</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Main Two-Column Layout */}
            <div className="artist-main-layout">
              {/* Left Column */}
              <div className="artist-col-left">
                {/* Badges Row */}
                <div className="artist-badges-row">
                  <span className="artist-category-badge">
                    {artist.category_name || 'Singers & Vocalists'}
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

                {/* Artist Stage Name */}
                <h1 className="artist-name-title">{artist.stage_name}</h1>

                {/* Subtitle Line */}
                <div className="artist-meta-subtitle">
                  <span className="meta-icon-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{artist.location || 'India'}</span>
                  </span>
                  <span className="meta-divider">•</span>
                  <span className="meta-icon-item artist-travel-meta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                    </svg>
                    <span>Travel: <strong>{artist.travel_availability_display || 'Across my state'}</strong></span>
                  </span>
                  <span className="meta-divider">•</span>
                  <span>{artist.languages || 'English & Hindi'}</span>
                  <span className="meta-divider">•</span>
                  <span className="artist-rating-snippet">
                    <span className="artist-star-icon">★</span>
                    <strong style={{ color: '#FFFFFF' }}>{artist.average_rating || '4.8'}</strong>
                    <span style={{ color: '#8E8E8E' }}>
                      ({artist.total_reviews || 24} reviews)
                    </span>
                  </span>
                </div>

                {/* 5 Key Stat Cards */}
                <section className="artist-stats-grid" aria-label="Key artist statistics">
                  <div className="artist-stat-card">
                    <span className="artist-stat-value">
                      {artist.years_of_experience || 3} yrs
                    </span>
                    <span className="artist-stat-label">Stage experience</span>
                  </div>

                  <div className="artist-stat-card">
                    <span className="artist-stat-value">
                      {artist.shows_completed || 60}
                    </span>
                    <span className="artist-stat-label">Shows completed</span>
                  </div>

                  <div className="artist-stat-card">
                    <span className="artist-stat-value highlight-travel-stat">
                      {artist.travel_availability_display || 'Across my state'}
                    </span>
                    <span className="artist-stat-label">Travel availability</span>
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

                {/* Section: About the Performer */}
                <article className="artist-card-section">
                  <h2 className="artist-section-title">About the Performer</h2>
                  <p className="artist-bio-text">
                    {artist.bio ||
                      'A singer is a vocal artist who uses the voice as a musical instrument to produce melody, harmony, and rhythm, connecting with listeners through emotion and technique.'}
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

                {/* Section: Performance Reel */}
                <article className="artist-card-section">
                  <h2 className="artist-section-title">Performance Reel</h2>
                  <p className="artist-section-sub">
                    Watch highlights from live shows and performances.
                  </p>

                  <div className="artist-reel-cards-grid">
                    {reelItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="artist-reel-card"
                        onClick={() => handlePlayVideo(item)}
                        title={`Watch ${item.title}`}
                      >
                        <div className="artist-reel-thumb-box">
                          <img
                            src={
                              item.thumbnail_url ||
                              (item.item_type === 'photo' ? item.media_url : '') ||
                              DEFAULT_REEL_ITEMS[0].thumbnail_url
                            }
                            alt={item.title}
                            className="artist-reel-thumb-img"
                            onError={(e) => {
                              e.target.src = DEFAULT_REEL_ITEMS[0].thumbnail_url;
                            }}
                          />
                          <div className="artist-reel-play-circle">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="6 4 20 12 6 20" />
                            </svg>
                          </div>
                          {item.duration && (
                            <span className="artist-reel-duration-badge">
                              {item.duration}
                            </span>
                          )}
                        </div>
                        <div className="artist-reel-card-title">{item.title}</div>
                      </button>
                    ))}
                  </div>
                </article>

                {/* Section: Photo Gallery */}
                <article className="artist-card-section">
                  <h2 className="artist-section-title">Photo Gallery</h2>
                  <p className="artist-section-sub">
                    Moments from past performances and events.
                  </p>

                  <div className="artist-public-photos-grid">
                    {photoGalleryItems.map((photo, pIdx) => (
                      <div
                        key={photo.id || pIdx}
                        className="artist-public-photo-card"
                        onClick={() => openLightbox(pIdx)}
                        title={photo.title || 'Click to enlarge'}
                      >
                        <img
                          src={photo.media_url}
                          alt={photo.title || 'Performance Moment'}
                          className="artist-public-photo-img"
                        />
                      </div>
                    ))}
                  </div>
                </article>

                {/* Section: Completed Shows */}
                <article className="artist-card-section">
                  <h2 className="artist-section-title">Completed Shows</h2>
                  <p className="artist-section-sub">
                    A few recent events performed by {artist.stage_name}.
                  </p>

                  <div className="artist-clean-shows-list">
                    {completedShows.map((show) => (
                      <div key={show.id} className="artist-clean-show-row">
                        <span className="artist-clean-show-name">{show.event_name}</span>
                        <span className="artist-clean-show-date">{show.date_str}</span>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Section: Reviews & Ratings */}
                <article className="artist-card-section">
                  <h2 className="artist-section-title">Reviews & Ratings</h2>
                  <p className="artist-section-sub">
                    What event organizers say about the performance.
                  </p>

                  <div className="artist-reviews-flex-grid">
                    {/* Left Score Box */}
                    <div className="artist-reviews-score-card">
                      <div className="artist-reviews-score-num">
                        {artist.average_rating || '4.8'}{' '}
                        <span className="artist-reviews-score-denom">/ 5</span>
                      </div>
                      <div className="artist-reviews-gold-stars">★★★★★</div>
                      <div className="artist-reviews-count-text">
                        {artist.total_reviews || 24} reviews
                      </div>
                    </div>

                    {/* Right Review Cards Column */}
                    <div className="artist-reviews-cards-column">
                      {reviewsList.map((rev) => (
                        <div key={rev.id} className="artist-review-card-rect">
                          <div className="artist-review-rect-header">
                            <span className="artist-review-rect-author">
                              {rev.customer_name}
                            </span>
                            <span className="artist-review-rect-stars">
                              {'★'.repeat(rev.rating || 5)}
                              {'☆'.repeat(Math.max(0, 5 - (rev.rating || 5)))}
                            </span>
                          </div>
                          <div className="artist-review-rect-sub">
                            {rev.event_type || 'Live Performance'} · {rev.date_str || rev.created_at}
                          </div>
                          <p className="artist-review-rect-comment">{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              </div>

              {/* Right Column: Sticky Booking Panel */}
              <aside className="artist-col-right" aria-label="Book performer panel">
                <div className="artist-booking-widget">
                  <div className="booking-fee-label">Starting fee per event</div>
                  <div className="booking-fee-price">
                    ₹{Number(artist.starting_price || 5000).toLocaleString('en-IN')}
                  </div>
                  <div className="booking-fee-note">
                    Final quote depends on duration and location.
                  </div>

                  <div className="booking-travel-highlight">
                    <div className="booking-travel-icon-wrap" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                      </svg>
                    </div>
                    <div className="booking-travel-content">
                      <span className="booking-travel-title">Travel Availability</span>
                      <span className="booking-travel-value">
                        {artist.travel_availability_display || 'Across my state'}
                      </span>
                    </div>
                  </div>

                  {isOwner ? (
                    <button
                      type="button"
                      className="booking-btn-primary"
                      style={{ background: '#673AB7' }}
                      onClick={() =>
                        navigate ? navigate('/artist-dashboard') : window.location.assign('/artist-dashboard')
                      }
                    >
                      Manage My Artist Studio
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="booking-btn-primary"
                        onClick={() => {
                          if (!user) {
                            const dest = `/login?redirect=${encodeURIComponent(`/book-artist/${artist.id}`)}`;
                            if (navigate) navigate(dest);
                            else window.location.assign(dest);
                          } else {
                            if (navigate) navigate(`/book-artist/${artist.id}`);
                            else window.location.assign(`/book-artist/${artist.id}`);
                          }
                        }}
                      >
                        Book Now
                      </button>

                      <button
                        type="button"
                        className="booking-btn-quote"
                        onClick={() => setShowQuoteModal(true)}
                      >
                        Get Custom Quote
                      </button>
                    </>
                  )}

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
                    <span>{isShortlisted ? 'Saved to Shortlist' : 'Save to Shortlist'}</span>
                  </button>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {/* Video Reel Modal */}
      {activeVideo && (
        <div className="modal-overlay" onClick={() => setActiveVideo(null)}>
          <div className="video-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3 className="video-modal-title">
                {activeVideo.title} — {artist?.stage_name}
              </h3>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setActiveVideo(null)}
                aria-label="Close video player"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="video-modal-player-wrap">
              {activeVideo.embedUrl ? (
                <iframe
                  src={activeVideo.embedUrl}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : activeVideo.mediaUrl ? (
                <video
                  src={activeVideo.mediaUrl}
                  controls
                  autoPlay
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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

      {/* Photo Lightbox Modal */}
      {showGalleryLightbox && (
        <div className="modal-overlay" onClick={() => setShowGalleryLightbox(false)}>
          <div className="gallery-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-lightbox-header">
              <span style={{ color: '#F7F7F7', fontWeight: 600, fontSize: '1rem' }}>
                {allLightboxPhotos[lightboxIndex]?.title || 'Stage Photo'} ({lightboxIndex + 1} of {allLightboxPhotos.length})
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
                src={allLightboxPhotos[lightboxIndex]?.url}
                alt={allLightboxPhotos[lightboxIndex]?.title}
              />
            </div>

            <div className="gallery-lightbox-nav">
              <button
                type="button"
                className="gallery-nav-btn"
                onClick={() =>
                  setLightboxIndex((prev) => (prev > 0 ? prev - 1 : allLightboxPhotos.length - 1))
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
                  setLightboxIndex((prev) => (prev < allLightboxPhotos.length - 1 ? prev + 1 : 0))
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

      {/* Get Custom Quote Modal */}
      {showQuoteModal && (
        <div className="modal-overlay" onClick={() => setShowQuoteModal(false)}>
          <div
            className="video-modal-box"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="video-modal-header">
              <h3 className="video-modal-title">
                Get Custom Quote from {artist?.stage_name}
              </h3>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setShowQuoteModal(false)}
                aria-label="Close quote modal"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowQuoteModal(false);
                const query = new URLSearchParams({
                  quote: '1',
                  event_type: quoteForm.eventType,
                  event_date: quoteForm.eventDate,
                  venue: quoteForm.venue,
                  audience: quoteForm.audience,
                  message: quoteForm.message,
                }).toString();
                const dest = user
                  ? `/book-artist/${artist.id}?${query}`
                  : `/login?redirect=${encodeURIComponent(`/book-artist/${artist.id}?${query}`)}`;
                if (navigate) navigate(dest);
                else window.location.assign(dest);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#A0A0A0', marginBottom: 6 }}>
                  Event Type
                </label>
                <select
                  className="artist-port-modal-input"
                  value={quoteForm.eventType}
                  onChange={(e) => setQuoteForm({ ...quoteForm, eventType: e.target.value })}
                >
                  <option value="Wedding Reception">Wedding Reception</option>
                  <option value="Corporate Event">Corporate Event</option>
                  <option value="College Fest">College Fest</option>
                  <option value="Birthday Party">Birthday Party</option>
                  <option value="Private Celebration">Private Celebration</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#A0A0A0', marginBottom: 6 }}>
                    Tentative Date
                  </label>
                  <input
                    type="date"
                    className="artist-port-modal-input"
                    value={quoteForm.eventDate}
                    onChange={(e) => setQuoteForm({ ...quoteForm, eventDate: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#A0A0A0', marginBottom: 6 }}>
                    Expected Audience
                  </label>
                  <input
                    type="number"
                    className="artist-port-modal-input"
                    placeholder="e.g. 250"
                    value={quoteForm.audience}
                    onChange={(e) => setQuoteForm({ ...quoteForm, audience: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#A0A0A0', marginBottom: 6 }}>
                  Venue / City
                </label>
                <input
                  type="text"
                  className="artist-port-modal-input"
                  placeholder="e.g. Kannur, Kerala"
                  value={quoteForm.venue}
                  onChange={(e) => setQuoteForm({ ...quoteForm, venue: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#A0A0A0', marginBottom: 6 }}>
                  Event Details / Message
                </label>
                <textarea
                  className="artist-port-modal-input"
                  rows={3}
                  placeholder="Describe your event requirements, schedule, or duration..."
                  value={quoteForm.message}
                  onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  className="artist-port-modal-btn-cancel"
                  onClick={() => setShowQuoteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="artist-port-modal-btn-save"
                >
                  Proceed to Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer navigate={navigate} />
    </div>
  );
}

export default ArtistDetails;
