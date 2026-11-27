import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Calendar,
  MapPin,
  Star,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
} from "lucide-react";
import { fetchCollaborationRecommendations } from "../../js/auth";
import "../../css/ArtistCollaboration.css";

const CATEGORIES = [
  "All Categories",
  "Singers",
  "Dancers",
  "DJs",
  "Instrumentalists",
  "Bands",
  "Standup Comedians",
  "Magicians",
  "Anchors & Emcees",
];

export default function ArtistCollaborationTab({
  artistProfile = null,
  navigate = null,
  onSwitchTab = null,
}) {
  const [collaborators, setCollaborators] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [myDistrictsCount, setMyDistrictsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [eventDate, setEventDate] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Modal for viewing complete shared districts
  const [viewingArtist, setViewingArtist] = useState(null);

  const todayIso = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category && category !== "All Categories") params.category = category;
      if (eventDate) params.event_date = eventDate;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;

      const res = await fetchCollaborationRecommendations(params);
      setCollaborators(res.collaborators || []);
      setTotalCount(res.total_count || 0);
      setMyDistrictsCount(res.my_districts_count || 0);
    } catch (err) {
      setError(err.message || "Failed to load collaboration recommendations.");
    } finally {
      setLoading(false);
    }
  }, [search, category, eventDate, minPrice, maxPrice]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  function handleResetFilters() {
    setSearch("");
    setCategory("All Categories");
    setEventDate("");
    setMinPrice("");
    setMaxPrice("");
  }

  function handleViewProfile(artistId) {
    if (typeof navigate === "function") {
      navigate(`/artists/${artistId}`);
    } else {
      window.location.href = `/artists/${artistId}`;
    }
  }

  return (
    <div className="collab-container">
      {/* Header Banner */}
      <div className="collab-header">
        <div className="collab-header-info">
          <h2>
            <Users size={24} color="#ff5722" />
            Smart Collaboration Discovery
          </h2>
          <p>
            Find compatible artists who share booking travel coverage in your service
            districts. Team coverage is automatically calculated from common service districts.
          </p>
        </div>
        <div className="collab-badge-coverage">
          <Layers size={16} />
          <span>
            Your Coverage: {myDistrictsCount} District
            {myDistrictsCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Filter Card */}
      <div className="collab-filter-card">
        <div className="collab-filter-row">
          {/* Keyword Search */}
          <div className="collab-filter-field">
            <label htmlFor="collab-search">Search Collaborator</label>
            <div style={{ position: "relative" }}>
              <input
                id="collab-search"
                type="text"
                className="collab-input"
                placeholder="Name, category or skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "36px" }}
              />
              <Search
                size={16}
                color="#6b7280"
                style={{ position: "absolute", left: "12px", top: "12px" }}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="collab-filter-field">
            <label htmlFor="collab-category">Category</label>
            <select
              id="collab-category"
              className="collab-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Event Date */}
          <div className="collab-filter-field">
            <label htmlFor="collab-event-date">Optional Event Date</label>
            <div style={{ position: "relative" }}>
              <input
                id="collab-event-date"
                type="date"
                className="collab-input"
                min={todayIso}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={{ paddingLeft: "36px" }}
              />
              <Calendar
                size={16}
                color="#ff5722"
                style={{ position: "absolute", left: "12px", top: "12px" }}
              />
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="collab-filter-field">
            <label>Starting Price (₹)</label>
            <div className="collab-price-inputs">
              <input
                type="number"
                className="collab-input"
                placeholder="Min"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <span className="collab-price-divider">-</span>
              <input
                type="number"
                className="collab-input"
                placeholder="Max"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Reset Filters */}
          <div className="collab-filter-actions">
            <button
              type="button"
              className="collab-btn-reset"
              onClick={handleResetFilters}
            >
              <RotateCcw size={14} style={{ marginRight: "6px", verticalAlign: "middle" }} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Meta Bar */}
      <div className="collab-results-meta">
        <span>
          Showing <strong>{collaborators.length}</strong> compatible collaborator
          {collaborators.length === 1 ? "" : "s"}
          {eventDate ? ` available on ${eventDate}` : ""}
        </span>
      </div>

      {/* States: Loading, Error, Empty, or Results Grid */}
      {loading ? (
        <div className="collab-loading-state">
          <div className="collab-spinner" />
          <p style={{ color: "#9ca3af", margin: 0 }}>
            Scanning artist travel coverage and finding compatible collaborators...
          </p>
        </div>
      ) : error ? (
        <div className="collab-error-state">
          <AlertCircle size={40} />
          <h3 className="collab-empty-title">Error Loading Collaborators</h3>
          <p className="collab-empty-desc">{error}</p>
          <button
            type="button"
            className="collab-btn-primary"
            onClick={loadRecommendations}
          >
            Try Again
          </button>
        </div>
      ) : myDistrictsCount === 0 ? (
        <div className="collab-empty-state">
          <MapPin size={44} />
          <h3 className="collab-empty-title">No Service Districts Configured</h3>
          <p className="collab-empty-desc">
            To discover compatible collaborators, you must first configure where you
            accept bookings.
          </p>
          {onSwitchTab && (
            <button
              type="button"
              className="collab-btn-primary"
              onClick={() => onSwitchTab("profile")}
            >
              Configure Travel Coverage
            </button>
          )}
        </div>
      ) : collaborators.length === 0 ? (
        <div className="collab-empty-state">
          <Users size={44} />
          <h3 className="collab-empty-title">No Compatible Collaborators Found</h3>
          <p className="collab-empty-desc">
            No active artists currently share service coverage for the selected
            filters. Try resetting or adjusting your category, price range, or event date.
          </p>
          <button
            type="button"
            className="collab-btn-primary"
            onClick={handleResetFilters}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="collab-grid">
          {collaborators.map((c) => {
            const sharedDistricts = c.shared_districts || [];
            const sharedCount = c.shared_districts_count || sharedDistricts.length;
            const previewDistricts = sharedDistricts.slice(0, 3);
            const remainingCount = sharedCount - previewDistricts.length;

            return (
              <div key={c.id} className="collab-card">
                <div className="collab-card-header">
                  {c.profile_image || c.featured_image ? (
                    <img
                      src={c.profile_image || c.featured_image}
                      alt={c.stage_name}
                      className="collab-avatar"
                    />
                  ) : (
                    <div className="collab-avatar-placeholder">
                      {c.stage_name ? c.stage_name.charAt(0).toUpperCase() : "A"}
                    </div>
                  )}
                  <div className="collab-title-area">
                    <h4 className="collab-stage-name" title={c.stage_name}>
                      {c.stage_name}
                    </h4>
                    <span className="collab-category-badge">
                      {c.category_name || "Artist"}
                    </span>
                  </div>
                </div>

                <div className="collab-card-body">
                  <div className="collab-meta-row">
                    <span className="collab-rating">
                      <Star size={14} fill="#ffb74d" color="#ffb74d" />
                      {c.avg_rating || "4.8"}
                    </span>
                    <span className="collab-price">
                      From <span>₹{Number(c.starting_price || 0).toLocaleString("en-IN")}</span>
                    </span>
                  </div>

                  {/* Base location */}
                  <div className="collab-location-row">
                    <MapPin size={15} />
                    <span>
                      Base:{" "}
                      {c.district?.name && c.state?.name
                        ? `${c.district.name}, ${c.state.name}`
                        : c.location || "India"}
                    </span>
                  </div>

                  {/* Shared Districts Box */}
                  <div className="collab-shared-box">
                    <div className="collab-shared-title">
                      <span>
                        <Sparkles size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                        {sharedCount} Shared District{sharedCount === 1 ? "" : "s"}
                      </span>
                      {sharedCount > 3 && (
                        <button
                          type="button"
                          onClick={() => setViewingArtist(c)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ff7043",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textDecoration: "underline",
                            padding: 0,
                          }}
                        >
                          View all
                        </button>
                      )}
                    </div>
                    <div className="collab-shared-pills">
                      {previewDistricts.map((d) => (
                        <span key={d.id} className="collab-shared-pill">
                          {d.name}
                        </span>
                      ))}
                      {remainingCount > 0 && (
                        <span className="collab-shared-more">
                          +{remainingCount} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date Availability */}
                  {eventDate && c.is_available_on_date && (
                    <div className="collab-date-badge available">
                      <CheckCircle2 size={14} />
                      <span>Available on {eventDate}</span>
                    </div>
                  )}
                </div>

                <div className="collab-card-footer">
                  <button
                    type="button"
                    className="collab-btn-profile"
                    onClick={() => handleViewProfile(c.id)}
                  >
                    <span>View Public Profile</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Full Shared Districts View */}
      {viewingArtist && (
        <div
          className="collab-coverage-modal-backdrop"
          onClick={() => setViewingArtist(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="collab-coverage-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="collab-modal-header">
              <h3>
                Shared Coverage with {viewingArtist.stage_name}
              </h3>
              <button
                type="button"
                className="collab-modal-close"
                onClick={() => setViewingArtist(null)}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: "#9ca3af", fontSize: "0.9rem", margin: 0 }}>
              Both you and <strong>{viewingArtist.stage_name}</strong> provide service
              coverage across the following {viewingArtist.shared_districts?.length || 0}{" "}
              districts:
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {(viewingArtist.shared_districts || []).map((d) => (
                <span
                  key={d.id}
                  style={{
                    background: "#26201e",
                    border: "1px solid rgba(255, 87, 34, 0.35)",
                    color: "#ffab91",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                  }}
                >
                  {d.name} ({d.state_name})
                </span>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                type="button"
                className="collab-btn-primary"
                onClick={() => setViewingArtist(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
