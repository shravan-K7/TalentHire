import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchArtists } from '../js/auth';
import '../css/Artists.css';

function ArtistsList({ user, onLogout, navigate }) {
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Top Search and Filter Controls
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'all';
  });
  const [gender, setGender] = useState('all');
  const [artistType, setArtistType] = useState('all');
  const [sort, setSort] = useState('featured');

  // Video / Audio Play Preview Modal
  const [activePlayArtist, setActivePlayArtist] = useState(null);

  // Load categories and initial artist total
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/auth/artist/categories/', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
          if (typeof data.total_artists === 'number') {
            setTotalCount(data.total_artists);
          }
        }
      } catch (err) {
        console.warn('Could not load categories:', err);
      }
    }
    loadCategories();
  }, []);

  // Fetch artists on filter change
  const loadArtists = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchArtists({
        search: search.trim(),
        category: selectedCategory === 'all' ? '' : selectedCategory,
        gender: gender === 'all' ? '' : gender,
        artist_type: artistType === 'all' ? '' : artistType,
        sort: sort === 'featured' ? '' : sort,
      });

      setArtists(data.artists || []);
      if (selectedCategory === 'all' && !search && gender === 'all' && artistType === 'all') {
        setTotalCount(data.count ?? data.artists.length);
      }
    } catch (err) {
      setError(err.message || 'Failed to load performing artists.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, gender, artistType, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadArtists();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadArtists]);

  // Escape key handler for play modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && activePlayArtist) {
        setActivePlayArtist(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePlayArtist]);

  function handleResetFilters() {
    setSearch('');
    setSelectedCategory('all');
    setGender('all');
    setArtistType('all');
    setSort('featured');
  }

  function handleCardClick(artistId) {
    if (navigate) {
      navigate(`/artists/${artistId}`);
    }
  }

  function handlePlay(artist) {
    setActivePlayArtist(artist);
  }

  return (
    <div className="artists-container">
      <Navbar user={user} onLogout={onLogout} currentPath="/artists" navigate={navigate} />

      <main className="artists-main-v2">
        {/* Top Search & Filter Bar (Matching Image 2) */}
        <section className="top-search-filter-row" aria-label="Search and Filter Controls">
          {/* 1. White search input */}
          <div className="top-search-wrap">
            <input
              type="text"
              className="top-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search artist, hit song, category, location."
              aria-label="Search artist, hit song, category, location"
            />
            {search && (
              <button
                type="button"
                className="top-search-clear-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search text"
              >
                Clear
              </button>
            )}
          </div>

          {/* 2. All Categories Dropdown */}
          <div className="top-select-wrap">
            <select
              className="top-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by Category"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. All Genders Dropdown */}
          <div className="top-select-wrap">
            <select
              className="top-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              aria-label="Filter by Gender"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="group">Group / Troupe</option>
            </select>
          </div>

          {/* 4. All Artist Types Dropdown */}
          <div className="top-select-wrap">
            <select
              className="top-select"
              value={artistType}
              onChange={(e) => setArtistType(e.target.value)}
              aria-label="Filter by Artist Type"
            >
              <option value="all">All Artist Types</option>
              <option value="Solo">Solo Performer</option>
              <option value="Band">Band / Troupe</option>
              <option value="DJ">Live DJ</option>
              <option value="Emcee">Anchor / Emcee</option>
              <option value="Orchestra">Orchestra / Strings</option>
              <option value="Dance">Dance Troupe</option>
            </select>
          </div>

          {/* 5. Sort Dropdown */}
          <div className="top-select-wrap">
            <select
              className="top-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort Order"
            >
              <option value="featured">Featured First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="experience">Most Experienced</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {/* 6. RESET Action Button */}
          <button
            type="button"
            className="top-reset-btn"
            onClick={handleResetFilters}
            title="Reset all filters"
          >
            Reset
          </button>
        </section>

        {/* Two-Column Marketplace Layout */}
        <div className="artists-layout-wrapper">
          {/* Left Sidebar: CATEGORIES */}
          <aside className="categories-sidebar" aria-label="Category Navigation">
            <div className="categories-card">
              <h2 className="categories-card-title">CATEGORIES</h2>
              <div className="categories-list" role="tablist">
                {/* All Artists */}
                <button
                  type="button"
                  className={`category-item-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                  role="tab"
                  aria-selected={selectedCategory === 'all'}
                >
                  <span className="category-item-name">All Artists</span>
                  <span className="category-item-count">{totalCount}</span>
                </button>

                {/* Specific Categories */}
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-item-btn ${selectedCategory === cat.name ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.name)}
                    role="tab"
                    aria-selected={selectedCategory === cat.name}
                  >
                    <span className="category-item-name">{cat.name}</span>
                    <span className="category-item-count">{cat.artist_count ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Total Artists Display Box */}
            <div className="total-artists-card">
              <span className="total-artists-label">TOTAL ARTISTS</span>
              <span className="total-artists-value">{totalCount}</span>
            </div>
          </aside>

          {/* Right Column Grid: Artist Cards */}
          <section className="artists-catalog-area">
            {error && (
              <div className="auth-alert-error" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="artists-loading-state">
                <div className="artists-spinner" />
                <p>Loading artists roster...</p>
              </div>
            ) : artists.length === 0 ? (
              <div className="artists-empty-state">
                <h3 className="artists-empty-title">No Artists Found</h3>
                <p>We couldn't find any performing artists matching your search or filter settings.</p>
                <button
                  type="button"
                  className="top-reset-btn"
                  onClick={handleResetFilters}
                  style={{ marginTop: 14 }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="artists-grid-v2">
                {artists.map((artist) => (
                  <article
                    key={artist.id}
                    className="artist-card-v2"
                    onClick={() => handleCardClick(artist.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCardClick(artist.id);
                    }}
                  >
                    {/* Top Action Bar: Play on Left, Book Now on Right */}
                    <div className="artist-card-action-bar">
                      <button
                        type="button"
                        className="card-btn-play"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(artist);
                        }}
                        title={`Preview showreel for ${artist.stage_name}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>Play</span>
                      </button>
                      <button
                        type="button"
                        className="card-btn-book"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(artist.id);
                        }}
                        title={`Book ${artist.stage_name}`}
                      >
                        Book Now
                      </button>
                    </div>

                    {/* Portrait Image or Stage Placeholder */}
                    <div className="artist-card-image-box">
                      {artist.profile_image ? (
                        <img
                          src={artist.profile_image}
                          alt={artist.stage_name}
                          className="artist-card-photo"
                          loading="lazy"
                        />
                      ) : (
                        <div className="artist-card-fallback-photo">
                          <div className="fallback-initial">
                            {artist.stage_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="fallback-tag">Stage Ready</span>
                        </div>
                      )}
                    </div>

                    {/* Details Section Below Image */}
                    <div className="artist-card-info-box">
                      <div className="artist-card-meta-row">
                        <span className="artist-meta-category">
                          {artist.category_name ? artist.category_name.toUpperCase() : 'PERFORMER'}
                        </span>
                        <span className="artist-meta-location">
                          {artist.location ? artist.location.toUpperCase() : 'INDIA'}
                        </span>
                      </div>

                      <h3 className="artist-meta-title" title={artist.stage_name}>
                        {artist.stage_name}
                      </h3>

                      <p className="artist-meta-subtitle">
                        {artist.performance_types && artist.performance_types.length > 0
                          ? artist.performance_types[0]
                          : artist.category_name || 'Performer'}
                      </p>

                      <p className="artist-meta-notes" title={artist.additional_information || artist.bio}>
                        {artist.additional_information
                          ? artist.additional_information
                          : `Starting at ₹${Number(artist.starting_price).toLocaleString('en-IN')} • ${artist.years_of_experience} yrs exp`}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />

      {/* Play Showreel Modal */}
      {activePlayArtist && (
        <div
          className="play-modal-backdrop"
          onClick={() => setActivePlayArtist(null)}
          role="presentation"
        >
          <div
            className="play-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="playModalTitle"
          >
            <div className="play-modal-header">
              <div>
                <span className="artist-meta-category">
                  {activePlayArtist.category_name ? activePlayArtist.category_name.toUpperCase() : 'PERFORMER'}
                </span>
                <h2 id="playModalTitle" className="play-modal-title">
                  {activePlayArtist.stage_name}
                </h2>
              </div>
              <button
                type="button"
                className="play-modal-close"
                onClick={() => setActivePlayArtist(null)}
                aria-label="Close Preview"
              >
                ×
              </button>
            </div>

            <div className="play-modal-body">
              {activePlayArtist.portfolio_url ? (
                <div className="play-modal-video-box">
                  <p className="play-modal-desc">
                    Showreel and live performance showcase for <strong>{activePlayArtist.stage_name}</strong>:
                  </p>
                  <a
                    href={activePlayArtist.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-btn-book play-external-link"
                  >
                    Open Live Video Showcase
                  </a>
                </div>
              ) : (
                <div className="play-modal-empty">
                  <p className="play-modal-desc">
                    <strong>{activePlayArtist.stage_name}</strong> performs across events with signature live sets:
                  </p>
                  <blockquote className="play-modal-quote">
                    "{activePlayArtist.additional_information || activePlayArtist.bio}"
                  </blockquote>
                </div>
              )}

              <div className="play-modal-footer">
                <button
                  type="button"
                  className="card-btn-book"
                  style={{ width: '100%', padding: '12px 20px', fontSize: '0.95rem' }}
                  onClick={() => {
                    const id = activePlayArtist.id;
                    setActivePlayArtist(null);
                    handleCardClick(id);
                  }}
                >
                  Book {activePlayArtist.stage_name} Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtistsList;
