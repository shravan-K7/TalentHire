import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchArtists, fetchArtistCategoriesSummary } from '../js/auth';
import '../css/Artists.css';

// Canonical category display labels mapped from database names
const CATEGORY_DISPLAY_MAP = {
  'anchors & emcees': 'Anchors & Emcees',
  'dance groups': 'Dance groups',
  'live bands & ensembles': 'Live bands',
  'live djs & producers': 'DJs & producers',
  'orchestra & instrumental': 'Orchestra',
  'singers & vocalists': 'Singers & vocalists',
};

// Canonical category order matching the UI reference
const CATEGORY_ORDER = [
  'anchors & emcees',
  'dance groups',
  'live bands & ensembles',
  'live djs & producers',
  'orchestra & instrumental',
  'singers & vocalists',
];

// Fallback performance types if artist record does not have specific performance_types
function getFallbackPerformanceType(artist) {
  if (artist.performance_types && Array.isArray(artist.performance_types) && artist.performance_types.length > 0) {
    return artist.performance_types[0];
  }
  const cat = (artist.category_name || '').toLowerCase();
  const name = (artist.stage_name || '').toLowerCase();

  if (cat.includes('band')) return 'Live band';
  if (cat.includes('dance')) return 'Dance troupe';
  if (cat.includes('dj')) return 'DJ set';
  if (cat.includes('anchor') || cat.includes('emcee')) return 'Solo anchor';
  if (cat.includes('orchestra') || cat.includes('instrumental')) return 'Orchestra';
  if (cat.includes('singer') || cat.includes('vocalist')) return 'Solo performance';
  if (name.includes('ensemble') || name.includes('troupe')) return 'Group performance';
  return 'Solo performance';
}

function ArtistsList({ user, onLogout, navigate }) {
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [overallTotal, setOverallTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [imageErrors, setImageErrors] = useState({});

  // Active Video Preview Modal state
  const [previewArtist, setPreviewArtist] = useState(null);

  // Filters State
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('search') || '';
  });
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'all';
  });
  const [location, setLocation] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('location') || 'anywhere';
  });
  const [gender, setGender] = useState('all');
  const [artistType, setArtistType] = useState('all');
  const [sort, setSort] = useState('featured');

  // Load categories and initial artist total dynamically from DB
  useEffect(() => {
    let active = true;
    async function loadInitialMeta() {
      try {
        const data = await fetchArtistCategoriesSummary();
        if (!active) return;
        const cats = data.categories || [];
        setCategories(cats);
        setOverallTotal(data.total_artists || 0);

        // Resolve URL category parameter if provided
        const params = new URLSearchParams(window.location.search);
        const rawCat = params.get('category');
        if (rawCat && rawCat.toLowerCase() !== 'all') {
          const rawLower = rawCat.toLowerCase().trim();
          const matched = cats.find((c) => {
            const nameLower = c.name.toLowerCase();
            return (
              nameLower === rawLower ||
              nameLower.includes(rawLower) ||
              rawLower.includes(nameLower)
            );
          });
          if (matched) {
            setSelectedCategory(matched.name);
          }
        }
      } catch (err) {
        console.warn('Could not load categories:', err);
      }
    }
    loadInitialMeta();
    return () => {
      active = false;
    };
  }, []);

  // Fetch artists on filter change (resets to page 1)
  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    setError('');
    setPage(1);

    try {
      const data = await fetchArtists({
        search: search.trim(),
        category: selectedCategory === 'all' ? '' : selectedCategory,
        location: location === 'anywhere' || location === 'all' ? '' : location,
        gender: gender === 'all' ? '' : gender,
        artist_type: artistType === 'all' ? '' : artistType,
        sort: sort === 'featured' ? '' : sort,
        page: 1,
        page_size: 8,
      });

      setArtists(data.artists || []);
      setTotalCount(data.total_count ?? data.count ?? (data.artists || []).length);
      setHasMore(Boolean(data.has_more));
      if (data.locations && Array.isArray(data.locations) && data.locations.length > 0) {
        setLocations(data.locations);
      }
    } catch (err) {
      setError(err.message || 'Failed to load artists.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, location, gender, artistType, sort]);

  // Debounced load on filter/search change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFirstPage();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchFirstPage]);

  // Load More handler (pagination)
  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const data = await fetchArtists({
        search: search.trim(),
        category: selectedCategory === 'all' ? '' : selectedCategory,
        location: location === 'anywhere' || location === 'all' ? '' : location,
        gender: gender === 'all' ? '' : gender,
        artist_type: artistType === 'all' ? '' : artistType,
        sort: sort === 'featured' ? '' : sort,
        page: nextPage,
        page_size: 8,
      });

      const newArtists = data.artists || [];
      setArtists((prev) => [...prev, ...newArtists]);
      setPage(nextPage);
      setHasMore(Boolean(data.has_more));
    } catch (err) {
      console.warn('Failed to load more artists:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  // Sync category selection with URL
  function handleCategorySelect(catName) {
    setSelectedCategory(catName);
    if (window.history.replaceState) {
      const p = new URLSearchParams(window.location.search);
      if (catName === 'all') {
        p.delete('category');
      } else {
        p.set('category', catName);
      }
      const newQuery = p.toString() ? `?${p.toString()}` : '';
      window.history.replaceState(null, '', `${window.location.pathname}${newQuery}`);
    }
  }

  // Reset all filters to default
  function handleResetFilters() {
    setSearch('');
    setSelectedCategory('all');
    setLocation('anywhere');
    setGender('all');
    setArtistType('all');
    setSort('featured');
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  // Navigation handlers
  function handleCardClick(artistId) {
    if (navigate) {
      navigate(`/artists/${artistId}`);
    } else {
      window.location.assign(`/artists/${artistId}`);
    }
  }

  function handleBookArtist(artistId) {
    if (!user) {
      const target = `/book-artist/${artistId}`;
      const loginUrl = `/login?redirect=${encodeURIComponent(target)}`;
      if (navigate) {
        navigate(loginUrl);
      } else {
        window.location.assign(loginUrl);
      }
    } else {
      if (navigate) {
        navigate(`/book-artist/${artistId}`);
      } else {
        window.location.assign(`/book-artist/${artistId}`);
      }
    }
  }

  // Open Video Preview Modal
  function handleOpenVideoPreview(e, artist) {
    e.stopPropagation();
    setPreviewArtist(artist);
  }

  function handleCloseVideoPreview() {
    setPreviewArtist(null);
  }

  // Handle image load error to gracefully trigger fallback
  function handleImageError(artistId) {
    setImageErrors((prev) => ({ ...prev, [artistId]: true }));
  }

  // Sorted categories according to reference order
  const orderedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aKey = a.name.toLowerCase();
      const bKey = b.name.toLowerCase();
      const aIdx = CATEGORY_ORDER.indexOf(aKey);
      const bIdx = CATEGORY_ORDER.indexOf(bKey);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  // Clean formatted price
  function formatPrice(val) {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-IN');
  }

  return (
    <div className="artists-container">
      <Navbar user={user} onLogout={onLogout} currentPath="/artists" navigate={navigate} />

      <main className="artists-main-explore">
        <div className="artists-content-wrapper">
          {/* 1. Page Header */}
          <header className="explore-header-section">
            <h1 className="explore-page-title">Explore artists</h1>
            <p className="explore-page-subtitle">
              {overallTotal || totalCount || 14} artists ready to book for your next event.
            </p>
          </header>

          {/* 2. Search and Filter Bar */}
          <section className="explore-filter-bar" aria-label="Search and Filter Controls">
            {/* Search Input with Icon */}
            <div className="explore-search-box">
              <span className="explore-search-icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                className="explore-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search artist, song or category"
                aria-label="Search artist, song or category"
              />
              {search && (
                <button
                  type="button"
                  className="explore-search-clear"
                  onClick={() => setSearch('')}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Location Filter Dropdown */}
            <div className="explore-select-wrapper location-select-wrapper">
              <select
                className="explore-select location-select"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Filter by Location"
              >
                <option value="anywhere">Location: Anywhere</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <span className="explore-select-chevron" aria-hidden="true">▾</span>
            </div>

            {/* Gender Filter Dropdown */}
            <div className="explore-select-wrapper">
              <select
                className="explore-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                aria-label="Filter by Gender"
              >
                <option value="all">Any gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="group">Group / Troupe</option>
              </select>
              <span className="explore-select-chevron" aria-hidden="true">▾</span>
            </div>

            {/* Artist Type Filter Dropdown */}
            <div className="explore-select-wrapper">
              <select
                className="explore-select"
                value={artistType}
                onChange={(e) => setArtistType(e.target.value)}
                aria-label="Filter by Artist Type"
              >
                <option value="all">All artist types</option>
                <option value="Solo">Solo performance</option>
                <option value="Band">Live band</option>
                <option value="Dance">Dance troupe</option>
                <option value="DJ">DJ set</option>
                <option value="Emcee">Anchor / Emcee</option>
                <option value="Orchestra">Orchestra</option>
              </select>
              <span className="explore-select-chevron" aria-hidden="true">▾</span>
            </div>

            {/* Sorting Dropdown */}
            <div className="explore-select-wrapper">
              <select
                className="explore-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort Artists"
              >
                <option value="featured">Featured first</option>
                <option value="price_asc">Price Low to High</option>
                <option value="price_desc">Price High to Low</option>
                <option value="highest_rated">Highest Rated</option>
                <option value="experience">Most Experienced</option>
              </select>
              <span className="explore-select-chevron" aria-hidden="true">▾</span>
            </div>

            {/* Reset Action Button */}
            <button
              type="button"
              className="explore-reset-btn"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              Reset
            </button>
          </section>

          {/* 3. Category Filter Tabs Row */}
          <nav className="explore-category-tabs-row" aria-label="Artist Categories">
            {/* All Artists Tab */}
            <button
              type="button"
              className={`category-pill-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => handleCategorySelect('all')}
              aria-selected={selectedCategory === 'all'}
            >
              <span>All artists</span>
              <span className="category-pill-count">{overallTotal || totalCount || 14}</span>
            </button>

            {/* Database Category Tabs */}
            {orderedCategories.map((cat) => {
              const catKey = cat.name.toLowerCase();
              const displayLabel = CATEGORY_DISPLAY_MAP[catKey] || cat.name;
              const isSelected =
                selectedCategory === cat.name ||
                selectedCategory.toLowerCase() === catKey;

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-pill-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(cat.name)}
                  aria-selected={isSelected}
                >
                  <span>{displayLabel}</span>
                  <span className="category-pill-count">{cat.artist_count ?? 0}</span>
                </button>
              );
            })}
          </nav>

          {/* Error Message */}
          {error && (
            <div className="auth-alert-error" role="alert" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* 4. Artist Cards Grid */}
          {loading ? (
            <div className="explore-grid-skeleton" aria-label="Loading artists">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="artist-card-skeleton">
                  <div className="skeleton-media" />
                  <div className="skeleton-line short" />
                  <div className="skeleton-line title" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line small" />
                  <div className="skeleton-bottom-row">
                    <div className="skeleton-line price" />
                    <div className="skeleton-btn" />
                  </div>
                </div>
              ))}
            </div>
          ) : artists.length === 0 ? (
            <div className="explore-empty-state">
              <div className="empty-state-icon" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <h2 className="explore-empty-title">No artists found</h2>
              <p className="explore-empty-desc">
                We couldn&apos;t find any artists matching your current search or filter criteria.
              </p>
              <button
                type="button"
                className="explore-clear-filters-btn"
                onClick={handleResetFilters}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="explore-artists-grid">
              {artists.map((artist) => {
                const initialLetter = (artist.stage_name || 'A').charAt(0).toUpperCase();
                const imageSrc = artist.featured_image || artist.profile_image;
                const showImage = Boolean(imageSrc && !imageErrors[artist.id]);
                const perfType = getFallbackPerformanceType(artist);
                const displayCategory = (artist.category_name || 'Performer').toUpperCase();

                return (
                  <article
                    key={artist.id}
                    className="artist-card-v3"
                    onClick={() => handleCardClick(artist.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCardClick(artist.id);
                    }}
                  >
                    {/* Media Preview Box */}
                    <div className="card-media-box">
                      {showImage ? (
                        <img
                          src={imageSrc}
                          alt={artist.stage_name}
                          className="card-media-photo"
                          loading="lazy"
                          onError={() => handleImageError(artist.id)}
                        />
                      ) : (
                        <div className="card-initial-fallback">
                          <div className="card-initial-circle">
                            {initialLetter}
                          </div>
                        </div>
                      )}

                      {/* Video Preview Play Button */}
                      <button
                        type="button"
                        className="card-play-action-btn"
                        onClick={(e) => handleOpenVideoPreview(e, artist)}
                        title={`Preview performance of ${artist.stage_name}`}
                        aria-label={`Preview performance of ${artist.stage_name}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </button>
                    </div>

                    {/* Artist Content Details */}
                    <div className="card-content-body">
                      {/* Category Label */}
                      <div className="card-category-label">
                        {displayCategory}
                      </div>

                      {/* Stage Name */}
                      <h2 className="card-artist-name" title={artist.stage_name}>
                        {artist.stage_name}
                      </h2>

                      {/* Performance Type */}
                      <p className="card-perf-type">
                        {perfType}
                      </p>

                      {/* Location with Pin & Travel Tag */}
                      <div className="card-location-row">
                        <div className="card-loc-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{artist.location || 'India'}</span>
                        </div>
                        {artist.travel_availability_display && (
                          <span className="card-travel-tag" title={`Travel availability: ${artist.travel_availability_display}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                            </svg>
                            <span>{artist.travel_availability_display}</span>
                          </span>
                        )}
                      </div>

                      {/* Pricing and Book Now Row */}
                      <div className="card-bottom-action-row">
                        <div className="card-pricing-exp-wrap">
                          <span className="price-label-from">From </span>
                          <span className="price-amount-highlight">
                            ₹{formatPrice(artist.starting_price)}
                          </span>
                          <span className="price-exp-label">
                            {` · ${artist.years_of_experience || 0} yrs exp`}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="card-book-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookArtist(artist.id);
                          }}
                          title={`Book ${artist.stage_name}`}
                        >
                          Book now
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* 5. Pagination / Load More Footer */}
          {!loading && artists.length > 0 && (
            <footer className="explore-pagination-footer">
              <p className="pagination-count-text">
                Showing {artists.length} of {totalCount} artists
              </p>
              {hasMore && (
                <button
                  type="button"
                  className="btn-load-more"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              )}
            </footer>
          )}
        </div>
      </main>

      {/* 6. Video Preview Modal */}
      {previewArtist && (
        <div
          className="video-preview-modal-overlay"
          onClick={handleCloseVideoPreview}
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-preview-title"
        >
          <div
            className="video-preview-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="video-preview-header">
              <div>
                <span className="preview-category-tag">
                  {(previewArtist.category_name || 'PERFORMER').toUpperCase()}
                </span>
                <h3 id="video-preview-title" className="video-preview-title">
                  {previewArtist.stage_name}
                </h3>
              </div>
              <button
                type="button"
                className="video-preview-close-btn"
                onClick={handleCloseVideoPreview}
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>

            <div className="video-preview-body">
              {previewArtist.video_preview?.youtube_id ? (
                <div className="video-iframe-responsive">
                  <iframe
                    src={`https://www.youtube.com/embed/${previewArtist.video_preview.youtube_id}?autoplay=1`}
                    title={`${previewArtist.stage_name} Live Performance`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : previewArtist.video_preview?.url && !previewArtist.video_preview.url.includes('soundcloud.com') ? (
                <div className="video-player-box">
                  <video
                    src={previewArtist.video_preview.url}
                    controls
                    autoPlay
                    className="video-player-element"
                  />
                </div>
              ) : (
                <div className="video-preview-fallback">
                  <div className="fallback-badge-circle">
                    {previewArtist.stage_name.charAt(0).toUpperCase()}
                  </div>
                  <h4>Performance Video Portfolio</h4>
                  <p>
                    Full live stage recordings and studio videos for{' '}
                    <strong>{previewArtist.stage_name}</strong> are available in their verified portfolio.
                  </p>
                </div>
              )}
            </div>

            <div className="video-preview-footer">
              <button
                type="button"
                className="preview-btn-details"
                onClick={() => {
                  handleCloseVideoPreview();
                  handleCardClick(previewArtist.id);
                }}
              >
                View Full Profile
              </button>
              <button
                type="button"
                className="preview-btn-book"
                onClick={() => {
                  const id = previewArtist.id;
                  handleCloseVideoPreview();
                  handleBookArtist(id);
                }}
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default ArtistsList;
