import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  User,
  MapPin,
  Layers,
  Film,
  Play,
  ArrowRight,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchArtists, fetchArtistCategoriesSummary, fetchPublicTeams } from '../js/auth';
import { fetchIndianStates, fetchDistrictsByState } from '../services/locationService';
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
  const [_locations, setLocations] = useState([]);
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
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('state_id') || params.get('state') || '';
  });
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('district_id') || params.get('district') || '';
  });
  const [eventDate, setEventDate] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('event_date') || params.get('date') || '';
  });
  const [minPrice, setMinPrice] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('min_price') || '';
  });
  const [maxPrice, setMaxPrice] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('max_price') || '';
  });
  const [gender, setGender] = useState('all');
  const [artistType, setArtistType] = useState('all');
  const [sort, setSort] = useState('featured');

  // Top Tabs: 'artists' | 'teams'
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'teams' ? 'teams' : 'artists';
  });

  // Collaboration Teams State
  const [teams, setTeams] = useState([]);
  const [teamsTotalCount, setTeamsTotalCount] = useState(0);
  const [teamsPage, setTeamsPage] = useState(1);
  const [teamsHasMore, setTeamsHasMore] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsLoadingMore, setTeamsLoadingMore] = useState(false);
  const [teamsError, setTeamsError] = useState('');

  // Teams Filters State
  const [teamSearch, setTeamSearch] = useState('');
  const [teamCategory, setTeamCategory] = useState('all');
  const [teamState, setTeamState] = useState('');
  const [teamDistrict, setTeamDistrict] = useState('');
  const [teamDistricts, setTeamDistricts] = useState([]);
  const [teamSort, setTeamSort] = useState('recent');

  const todayIso = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Load Indian states once
  useEffect(() => {
    let active = true;
    async function loadStates() {
      try {
        const res = await fetchIndianStates();
        if (active && res.states) {
          setStates(res.states);
        }
      } catch (err) {
        console.warn('Could not load states:', err);
      }
    }
    loadStates();
    return () => {
      active = false;
    };
  }, []);

  // Load districts whenever selectedState changes
  useEffect(() => {
    let active = true;
    if (!selectedState) {
      setDistricts([]);
      setSelectedDistrict('');
      return;
    }
    async function loadDistricts() {
      try {
        const res = await fetchDistrictsByState(selectedState);
        if (active && res.districts) {
          setDistricts(res.districts);
          setSelectedDistrict((prev) => {
            if (!prev) return '';
            const exists = (res.districts || []).some((d) => String(d.id) === String(prev));
            return exists ? prev : '';
          });
        }
      } catch (err) {
        console.warn('Could not load districts:', err);
      }
    }
    loadDistricts();
    return () => {
      active = false;
    };
  }, [selectedState]);

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
        state_id: selectedState || '',
        district_id: selectedDistrict || '',
        event_date: eventDate || '',
        min_price: minPrice || '',
        max_price: maxPrice || '',
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
  }, [
    search,
    selectedCategory,
    selectedState,
    selectedDistrict,
    eventDate,
    minPrice,
    maxPrice,
    gender,
    artistType,
    sort,
  ]);

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
        state_id: selectedState || '',
        district_id: selectedDistrict || '',
        event_date: eventDate || '',
        min_price: minPrice || '',
        max_price: maxPrice || '',
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
  }

  // Deep-link URL sync for active filters
  useEffect(() => {
    if (!window.history.replaceState) return;
    const p = new URLSearchParams();
    if (search.trim()) p.set('search', search.trim());
    if (selectedCategory && selectedCategory !== 'all') p.set('category', selectedCategory);
    if (selectedState) p.set('state_id', selectedState);
    if (selectedDistrict) p.set('district_id', selectedDistrict);
    if (eventDate) p.set('date', eventDate);
    if (minPrice) p.set('min_price', minPrice);
    if (maxPrice) p.set('max_price', maxPrice);
    if (gender && gender !== 'all') p.set('gender', gender);
    if (artistType && artistType !== 'all') p.set('artist_type', artistType);
    if (sort && sort !== 'featured') p.set('sort', sort);

    const newQuery = p.toString() ? `?${p.toString()}` : '';
    window.history.replaceState(null, '', `${window.location.pathname}${newQuery}`);
  }, [
    search,
    selectedCategory,
    selectedState,
    selectedDistrict,
    eventDate,
    minPrice,
    maxPrice,
    gender,
    artistType,
    sort,
  ]);

  // Reset all filters to default
  function handleResetFilters() {
    setSearch('');
    setSelectedCategory('all');
    setSelectedState('');
    setSelectedDistrict('');
    setDistricts([]);
    setEventDate('');
    setMinPrice('');
    setMaxPrice('');
    setGender('all');
    setArtistType('all');
    setSort('featured');
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  // Load districts whenever teamState changes
  useEffect(() => {
    let active = true;
    if (!teamState) {
      setTeamDistricts([]);
      setTeamDistrict('');
      return;
    }
    async function loadDistricts() {
      try {
        const res = await fetchDistrictsByState(teamState);
        if (active && res.districts) {
          setTeamDistricts(res.districts);
          setTeamDistrict((prev) => {
            if (!prev) return '';
            const exists = (res.districts || []).some((d) => String(d.id) === String(prev));
            return exists ? prev : '';
          });
        }
      } catch (err) {
        console.warn('Could not load team districts:', err);
      }
    }
    loadDistricts();
    return () => {
      active = false;
    };
  }, [teamState]);

  // Fetch first page of collaboration teams
  const fetchFirstPageTeams = useCallback(async () => {
    setTeamsLoading(true);
    setTeamsError('');
    setTeamsPage(1);

    try {
      const data = await fetchPublicTeams({
        search: teamSearch.trim(),
        category: teamCategory === 'all' ? '' : teamCategory,
        state_id: teamState || '',
        district_id: teamDistrict || '',
        sort: teamSort,
        page: 1,
        page_size: 8,
      });

      setTeams(data.teams || []);
      setTeamsTotalCount(data.total_count ?? data.count ?? (data.teams || []).length);
      setTeamsHasMore(Boolean(data.has_more));
    } catch (err) {
      setTeamsError(err.message || 'Failed to load collaboration teams.');
    } finally {
      setTeamsLoading(false);
    }
  }, [teamSearch, teamCategory, teamState, teamDistrict, teamSort]);

  // Debounced load for teams
  useEffect(() => {
    if (activeTab === 'teams') {
      const timer = setTimeout(() => {
        fetchFirstPageTeams();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchFirstPageTeams]);

  // Load More handler for teams
  async function handleLoadMoreTeams() {
    if (teamsLoadingMore || !teamsHasMore) return;
    setTeamsLoadingMore(true);
    const nextPage = teamsPage + 1;

    try {
      const data = await fetchPublicTeams({
        search: teamSearch.trim(),
        category: teamCategory === 'all' ? '' : teamCategory,
        state_id: teamState || '',
        district_id: teamDistrict || '',
        sort: teamSort,
        page: nextPage,
        page_size: 8,
      });

      setTeams((prev) => [...prev, ...(data.teams || [])]);
      setTeamsPage(nextPage);
      setTeamsHasMore(Boolean(data.has_more));
    } catch (err) {
      console.warn('Could not load more teams:', err);
    } finally {
      setTeamsLoadingMore(false);
    }
  }

  function handleResetTeamFilters() {
    setTeamSearch('');
    setTeamCategory('all');
    setTeamState('');
    setTeamDistrict('');
    setTeamDistricts([]);
    setTeamSort('recent');
  }

  function handleViewTeam(teamId) {
    if (navigate) {
      navigate(`/teams/${teamId}`);
    } else {
      window.location.assign(`/teams/${teamId}`);
    }
  }

  function handleTabSwitch(tab) {
    setActiveTab(tab);
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.pathname + url.search);
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
            <h1 className="explore-page-title">
              {activeTab === 'teams' ? 'Explore Collaboration Teams' : 'Explore artists'}
            </h1>
            <p className="explore-page-subtitle">
              {activeTab === 'teams'
                ? `${teamsTotalCount} verified performing teams ready to book across shared service coverage.`
                : `${overallTotal || totalCount || 14} artists ready to book for your next event.`}
            </p>

            {/* Top Tabs: Individual Artists vs Collaboration Teams */}
            <div className="explore-tabs-container" role="tablist" aria-label="Performer Types">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'artists'}
                className={`explore-tab-btn ${activeTab === 'artists' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('artists')}
              >
                <User size={16} />
                <span>Individual Artists</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'teams'}
                className={`explore-tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('teams')}
              >
                <Users size={16} />
                <span>Collaboration Teams</span>
              </button>
            </div>
          </header>

          {/* ================================================================
              TAB 1: INDIVIDUAL ARTISTS
              ================================================================ */}
          {activeTab === 'artists' && (
            <>
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

            {/* State / UT Filter Dropdown */}
            <div className="explore-select-wrapper location-select-wrapper">
              <select
                className="explore-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                aria-label="Filter by State or Union Territory"
              >
                <option value="">State: All States / UTs</option>
                {states.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}{s.is_union_territory ? ' (UT)' : ''}
                  </option>
                ))}
              </select>
              <span className="explore-select-chevron" aria-hidden="true">▾</span>
            </div>

            {/* District Filter Dropdown (dependent on State) */}
            <div className={`explore-select-wrapper location-select-wrapper ${!selectedState ? 'disabled' : ''}`}>
              <select
                className="explore-select"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={!selectedState}
                aria-label="Filter by District"
              >
                <option value="">{selectedState ? 'District: All Districts' : 'District: Select State first'}</option>
                {districts.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
              <span className="explore-select-chevron" aria-hidden="true">▾</span>
            </div>

            {/* Event Date Availability Picker */}
            <div className="explore-date-box" title="Check availability for your event date">
              <span className="explore-date-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <input
                type="date"
                className="explore-date-input"
                min={todayIso}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                aria-label="Filter by event date availability"
              />
              {eventDate && (
                <button
                  type="button"
                  className="explore-date-clear"
                  onClick={() => setEventDate('')}
                  title="Clear event date"
                  aria-label="Clear event date"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Starting Price Range Filter */}
            <div className="explore-price-range-group" title="Filter by Starting Price (INR)">
              <div className="explore-price-input-box">
                <span className="explore-price-prefix">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="explore-price-input"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  aria-label="Minimum Starting Price"
                />
              </div>
              <span className="explore-price-divider">–</span>
              <div className="explore-price-input-box">
                <span className="explore-price-prefix">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="explore-price-input"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  aria-label="Maximum Starting Price"
                />
              </div>
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
            </>
          )}

          {/* ================================================================
              TAB 2: COLLABORATION TEAMS (PHASE 5C)
              ================================================================ */}
          {activeTab === 'teams' && (
            <div className="explore-teams-section">
              {/* Team Filter Bar */}
              <section className="explore-filter-bar" aria-label="Team Search and Filter Controls">
                {/* Team Search Input */}
                <div className="explore-search-box">
                  <span className="explore-search-icon" aria-hidden="true">
                    <Search size={17} />
                  </span>
                  <input
                    type="text"
                    className="explore-search-input"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder="Search teams, members or styles"
                    aria-label="Search teams, members or styles"
                  />
                  {teamSearch && (
                    <button
                      type="button"
                      className="explore-search-clear"
                      onClick={() => setTeamSearch('')}
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Team Category Select */}
                <div className="explore-select-wrapper">
                  <select
                    className="explore-select"
                    value={teamCategory}
                    onChange={(e) => setTeamCategory(e.target.value)}
                    aria-label="Filter by Team Category"
                  >
                    <option value="all">Category: All Categories</option>
                    {orderedCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team State Select */}
                <div className="explore-select-wrapper location-select-wrapper">
                  <select
                    className="explore-select"
                    value={teamState}
                    onChange={(e) => setTeamState(e.target.value)}
                    aria-label="Filter teams by State"
                  >
                    <option value="">State: All States / UTs</option>
                    {states.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}{s.is_union_territory ? ' (UT)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team District Select */}
                <div className="explore-select-wrapper location-select-wrapper">
                  <select
                    className="explore-select"
                    value={teamDistrict}
                    onChange={(e) => setTeamDistrict(e.target.value)}
                    disabled={!teamState || teamDistricts.length === 0}
                    aria-label="Filter teams by District"
                  >
                    <option value="">District: {teamState ? 'All Districts' : 'Select State First'}</option>
                    {teamDistricts.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team Sort Select */}
                <div className="explore-select-wrapper sort-select-wrapper">
                  <select
                    className="explore-select"
                    value={teamSort}
                    onChange={(e) => setTeamSort(e.target.value)}
                    aria-label="Sort Collaboration Teams"
                  >
                    <option value="recent">Sort: Featured / Recent</option>
                    <option value="name">Sort: Team Name (A-Z)</option>
                    <option value="members">Sort: Most Members</option>
                    <option value="coverage">Sort: Most Coverage</option>
                  </select>
                </div>

                {/* Reset Filters Button */}
                {(teamSearch || teamCategory !== 'all' || teamState || teamDistrict || teamSort !== 'recent') && (
                  <button
                    type="button"
                    className="explore-reset-btn"
                    onClick={handleResetTeamFilters}
                    title="Reset all team filters"
                    aria-label="Reset all team filters"
                  >
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                )}
              </section>

              {/* Error Message */}
              {teamsError && (
                <div className="explore-error-alert" role="alert">
                  <p>{teamsError}</p>
                </div>
              )}

              {/* Loading State */}
              {teamsLoading && (
                <div className="explore-loading-grid" aria-live="polite">
                  <div className="explore-spinner" />
                  <p>Discovering collaboration teams...</p>
                </div>
              )}

              {/* Teams Grid */}
              {!teamsLoading && teams.length > 0 && (
                <section className="teams-grid-container" aria-label="Collaboration Teams List">
                  {teams.map((t) => (
                    <article
                      key={t.id}
                      className="team-card"
                      onClick={() => handleViewTeam(t.id)}
                    >
                      {/* Banner Cover Image */}
                      <div
                        className="team-card-banner"
                        style={
                          t.cover_image
                            ? { backgroundImage: `url(${t.cover_image})` }
                            : { background: 'linear-gradient(135deg, #1f2432 0%, #11141c 100%)' }
                        }
                      >
                        <div className="team-card-banner-overlay" />
                        <span className="team-card-category-badge">
                          {t.category_name || 'Collaboration Team'}
                        </span>

                        {/* Avatar */}
                        <div className="team-card-avatar-wrap">
                          {t.profile_image ? (
                            <img
                              src={t.profile_image}
                              alt={t.name}
                              className="team-card-avatar"
                            />
                          ) : (
                            <div className="team-card-avatar-placeholder">
                              {t.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="team-card-body">
                        <div className="team-card-title-row">
                          <h3 className="team-card-name">{t.name}</h3>
                        </div>

                        <div className="team-card-location">
                          <MapPin size={14} color="#FF5722" />
                          <span>{t.base_location}</span>
                        </div>

                        <p className="team-card-desc">
                          {t.description || 'Verified performing collaboration team across shared districts.'}
                        </p>

                        {/* Metrics Pills */}
                        <div className="team-card-metrics-row">
                          <span className="team-metric-pill">
                            <Users size={13} color="#FF5722" />
                            <span>{t.active_members_count} Active Member{t.active_members_count === 1 ? '' : 's'}</span>
                          </span>

                          <span className="team-metric-pill coverage">
                            <Layers size={13} color="#4ade80" />
                            <span>{t.shared_districts_count} Shared District{t.shared_districts_count === 1 ? '' : 's'}</span>
                          </span>
                        </div>

                        {/* Portfolio Previews Strip */}
                        {t.portfolio_previews && t.portfolio_previews.length > 0 && (
                          <div className="team-card-portfolio-strip">
                            {t.portfolio_previews.slice(0, 3).map((p) => (
                              <div key={p.id} className="team-portfolio-thumb">
                                {p.thumbnail_url || (p.item_type === 'photo' && p.media_url) ? (
                                  <img
                                    src={p.thumbnail_url || p.media_url}
                                    alt={p.title || 'Team Media'}
                                  />
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                                    <Film size={18} />
                                  </div>
                                )}
                                {(p.item_type === 'video' || p.item_type === 'youtube') && (
                                  <div className="team-portfolio-thumb-play">
                                    <Play size={12} fill="#fff" />
                                  </div>
                                )}
                              </div>
                            ))}
                            {t.portfolio_count > 3 && (
                              <div className="team-portfolio-more-badge">
                                +{t.portfolio_count - 3}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="team-card-footer">
                          <div className="team-card-owner-info">
                            <span>Founded by <strong>{t.owner?.stage_name}</strong></span>
                          </div>

                          <button
                            type="button"
                            className="team-card-btn-view"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTeam(t.id);
                            }}
                          >
                            <span>View Team</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
              )}

              {/* Empty State */}
              {!teamsLoading && teams.length === 0 && !teamsError && (
                <section className="explore-empty-state" aria-label="No teams found">
                  <div className="empty-state-icon-wrap" aria-hidden="true">
                    <Users size={32} color="#FF5722" />
                  </div>
                  <h3 className="empty-state-title">No collaboration teams found</h3>
                  <p className="empty-state-desc">
                    We couldn&apos;t find any active collaboration teams matching your search criteria or shared location coverage.
                  </p>
                  <button
                    type="button"
                    className="empty-state-reset-btn"
                    onClick={handleResetTeamFilters}
                  >
                    Reset team filters
                  </button>
                </section>
              )}

              {/* Pagination / Load More Footer */}
              {!teamsLoading && teams.length > 0 && (
                <footer className="explore-pagination-footer">
                  <p className="pagination-count-text">
                    Showing {teams.length} of {teamsTotalCount} collaboration teams
                  </p>
                  {teamsHasMore && (
                    <button
                      type="button"
                      className="btn-load-more"
                      onClick={handleLoadMoreTeams}
                      disabled={teamsLoadingMore}
                    >
                      {teamsLoadingMore ? 'Loading teams...' : 'Load more teams'}
                    </button>
                  )}
                </footer>
              )}
            </div>
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
