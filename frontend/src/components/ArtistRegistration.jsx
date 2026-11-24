import { useEffect, useState, useRef, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { getCsrfToken, fetchArtistCategories } from "../js/auth";
import { autocompleteLocations } from "../services/locationService";
import "../css/ArtistRegistration.css";

const performanceOptions = [
  "Solo performance",
  "Group performance",
  "Live events",
  "Weddings",
  "Corporate events",
  "Private parties",
  "Festivals",
];

function getCookie(name) {
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const trimmed = cookie.trim();

    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.substring(name.length + 1));
    }
  }

  return "";
}

export default function ArtistRegistration({
  user,
  onProfileSaved,
  onCancel,
  navigate,
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isExistingProfile, setIsExistingProfile] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  // Place autocomplete state
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [highlightedLocationIndex, setHighlightedLocationIndex] = useState(-1);
  const locationContainerRef = useRef(null);
  const locationDebounceTimer = useRef(null);
  const locationReqSeqRef = useRef(0);

  const [form, setForm] = useState({
    stage_name: user?.artist_profile?.stage_name || "",
    category: String(user?.artist_profile?.category_id || ""),
    other_category: "",
    gender: user?.artist_profile?.gender || "male",
    bio: user?.artist_profile?.bio || "",
    location: user?.artist_profile?.location || "",
    phone: user?.artist_profile?.phone || "",
    starting_price: user?.artist_profile?.starting_price || "",
    years_of_experience: "0",
    performance_types: [],
    travel_availability: "city",
    portfolio_url: "",
    additional_information: "",
    profile_image: null,
  });

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        // Ensure CSRF token is fetched/cookie is set
        await getCsrfToken();

        // Load Categories
        const categoriesList = await fetchArtistCategories();
        if (!ignore) {
          setCategories(categoriesList || []);
        }

        // Load existing profile if available
        const profileResponse = await fetch("/api/auth/artist/profile/", {
          credentials: "include",
        });

        if (profileResponse.status === 401 || profileResponse.status === 403) {
          if (!ignore) {
            setIsUnauthenticated(true);
          }
          return;
        }

        if (!profileResponse.ok) {
          throw new Error("Could not load your artist profile.");
        }

        const profileData = await profileResponse.json();

        if (!ignore && profileData.exists && profileData.artist) {
          const artist = profileData.artist;
          setIsExistingProfile(true);
          if (artist.profile_image) {
            setExistingImageUrl(artist.profile_image);
          }

          setForm((previous) => ({
            ...previous,
            stage_name: artist.stage_name || "",
            category: String(artist.category || ""),
            other_category: "",
            gender: artist.gender || "male",
            bio: artist.bio || "",
            location: artist.location || "",
            phone: artist.phone || "",
            starting_price: artist.starting_price || "",
            years_of_experience: String(artist.years_of_experience ?? "0"),
            performance_types: artist.performance_types || [],
            travel_availability: artist.travel_availability || "city",
            portfolio_url: artist.portfolio_url || "",
            additional_information: artist.additional_information || "",
          }));
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load artist details.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  // Close place suggestions dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        locationContainerRef.current &&
        !locationContainerRef.current.contains(event.target)
      ) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLocationSuggestions = useCallback(async (queryText) => {
    const clean = (queryText || "").trim();
    if (clean.length < 2) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      setLocationLoading(false);
      return;
    }

    const currentReqId = ++locationReqSeqRef.current;
    setLocationLoading(true);

    try {
      const res = await autocompleteLocations(clean);
      if (currentReqId !== locationReqSeqRef.current) return;

      if (res.suggestions && res.suggestions.length > 0) {
        setLocationSuggestions(res.suggestions);
        setShowLocationDropdown(true);
        setHighlightedLocationIndex(-1);
      } else {
        setLocationSuggestions([]);
        setShowLocationDropdown(false);
      }
    } catch {
      if (currentReqId === locationReqSeqRef.current) {
        setLocationSuggestions([]);
        setShowLocationDropdown(false);
      }
    } finally {
      if (currentReqId === locationReqSeqRef.current) {
        setLocationLoading(false);
      }
    }
  }, []);

  function handleLocationChange(e) {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, location: value }));

    if (fieldErrors.location) {
      setFieldErrors((prev) => ({ ...prev, location: null }));
    }

    if (locationDebounceTimer.current) {
      clearTimeout(locationDebounceTimer.current);
    }

    locationDebounceTimer.current = setTimeout(() => {
      fetchLocationSuggestions(value);
    }, 320);
  }

  function handleSelectLocation(suggestion) {
    const formatted =
      suggestion.formatted_address ||
      [suggestion.title, suggestion.subtitle].filter(Boolean).join(", ");
    setForm((prev) => ({ ...prev, location: formatted }));
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
    if (fieldErrors.location) {
      setFieldErrors((prev) => ({ ...prev, location: null }));
    }
  }

  function handleLocationKeyDown(e) {
    if (!showLocationDropdown || locationSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedLocationIndex((prev) =>
        prev < locationSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedLocationIndex((prev) =>
        prev > 0 ? prev - 1 : locationSuggestions.length - 1
      );
    } else if (e.key === "Enter") {
      if (
        highlightedLocationIndex >= 0 &&
        highlightedLocationIndex < locationSuggestions.length
      ) {
        e.preventDefault();
        handleSelectLocation(locationSuggestions[highlightedLocationIndex]);
      }
    } else if (e.key === "Escape") {
      setShowLocationDropdown(false);
    }
  }

  function handleChange(event) {
    const { name, value, files } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "profile_image" ? files[0] : value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  function handlePerformanceChange(event) {
    const { value, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      performance_types: checked
        ? [...previous.performance_types, value]
        : previous.performance_types.filter((item) => item !== value),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.category === "other" && !form.other_category?.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        other_category: [{ message: "Please specify your category." }],
      }));
      setError("Please specify your category.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    try {
      const data = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (key === "performance_types") {
          data.append(key, JSON.stringify(value));
        } else if (key === "profile_image") {
          if (value instanceof File) {
            data.append(key, value);
          }
        } else {
          data.append(key, value ?? "");
        }
      });

      let csrfToken = getCookie("csrftoken");
      if (!csrfToken) {
        csrfToken = await getCsrfToken();
      }

      const response = await fetch("/api/auth/artist/profile/", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken,
        },
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
          throw new Error("Please correct the highlighted fields.");
        }

        throw new Error(
          result.error ||
            result.detail ||
            result.message ||
            "Could not save your artist profile."
        );
      }

      setSuccess(
        result.message ||
          (isExistingProfile
            ? "Artist profile updated successfully. Redirecting to your dashboard..."
            : "Artist profile created successfully. Redirecting to your dashboard...")
      );
      setIsExistingProfile(true);

      if (result.artist?.profile_image) {
        setExistingImageUrl(result.artist.profile_image);
      }

      if (onProfileSaved && result.artist) {
        onProfileSaved(result.artist);
      }

      setTimeout(() => {
        if (navigate) {
          navigate("/profile");
        } else {
          window.location.href = "/profile";
        }
      }, 700);
    } catch (err) {
      setError(err.message || "Failed to save artist profile.");
    } finally {
      setSaving(false);
    }
  }

  function renderError(field) {
    const errors = fieldErrors[field];
    if (!errors?.length) return null;

    return (
      <small className="field-error">
        {errors.map((item) => item.message).join(" ")}
      </small>
    );
  }

  if (loading) {
    return (
      <main className="artist-page">
        <p className="artist-loading">Loading artist registration...</p>
      </main>
    );
  }

  if (isUnauthenticated) {
    return (
      <main className="artist-page">
        <div className="artist-form artist-auth-required">
          <span className="artist-form-badge">Artist Onboarding</span>
          <h2>Sign In to Register as an Artist</h2>
          <p>
            You need a TalentHire account to create and manage your performing artist profile.
            Please sign in or create a new account to proceed.
          </p>
          <div className="artist-auth-actions">
            <button
              type="button"
              className="artist-submit"
              onClick={() => (navigate ? navigate("/login") : (window.location.href = "/login"))}
            >
              Sign In
            </button>
            <button
              type="button"
              className="artist-cancel-btn"
              onClick={() =>
                navigate ? navigate("/register?role=artist") : (window.location.href = "/register?role=artist")
              }
            >
              Create Artist Account
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="artist-page">
      <div className="artist-top-bar">
        <button
          type="button"
          className="artist-back-btn"
          onClick={() => (onCancel ? onCancel() : navigate ? navigate("/profile") : (window.location.href = "/profile"))}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      <form
        className="artist-form"
        onSubmit={handleSubmit}
        encType="multipart/form-data"
      >
        <header className="artist-form-header">
          <span className="artist-form-badge">
            {isExistingProfile ? "Manage Profile" : "New Artist Registration"}
          </span>
          <h1>
            {isExistingProfile
              ? "Manage Your Performing Artist Profile"
              : "Register as a Performing Artist"}
          </h1>
          <p>
            {isExistingProfile
              ? "Update your performance types, starting rates, and contact details for prospective event clients."
              : "Showcase your talent and connect with clients looking for stage-ready performers."}
          </p>
        </header>

        {error && <div className="artist-alert error">{error}</div>}
        {success && <div className="artist-alert success">{success}</div>}

        <h2>Artist Information</h2>

        <div className="artist-grid">
          <label>
            Stage Name *
            <input
              name="stage_name"
              value={form.stage_name}
              onChange={handleChange}
              required
              maxLength={150}
              placeholder="e.g. DJ Pulse or The Velvet Strings"
            />
            {renderError("stage_name")}
          </label>

          <label>
            Category *
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
              <option value="other">Other</option>
            </select>
            {renderError("category")}
          </label>

          {form.category === "other" && (
            <label className="artist-other-category-field">
              Specify Category *
              <input
                type="text"
                name="other_category"
                value={form.other_category || ""}
                onChange={handleChange}
                required
                maxLength={100}
                placeholder="Enter new category (e.g. Magician, Comedian, Illusionist)"
                autoFocus
              />
              {renderError("other_category")}
            </label>
          )}

          <label>
            Gender *
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {renderError("gender")}
          </label>

          <label className="full-width">
            About Your Talent *
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Describe your repertoire, sound, instruments, previous appearances..."
            />
            {renderError("bio")}
          </label>

          <div className="artist-location-wrapper" ref={locationContainerRef}>
            <label htmlFor="artist_location">Location *</label>
            <div className="artist-location-input-box">
              <input
                id="artist_location"
                name="location"
                value={form.location}
                onChange={handleLocationChange}
                onFocus={() => {
                  if (
                    locationSuggestions.length > 0 &&
                    form.location.trim().length >= 2
                  ) {
                    setShowLocationDropdown(true);
                  }
                }}
                onKeyDown={handleLocationKeyDown}
                required
                maxLength={150}
                placeholder="e.g. Mumbai, Maharashtra"
                autoComplete="off"
              />
              {locationLoading && (
                <div className="artist-location-spinner-icon">
                  <Loader2 size={16} className="spin" />
                </div>
              )}
            </div>
            {renderError("location")}

            {showLocationDropdown && locationSuggestions.length > 0 && (
              <ul className="artist-location-dropdown" role="listbox">
                {locationSuggestions.map((item, idx) => {
                  const isHighlighted = idx === highlightedLocationIndex;
                  return (
                    <li
                      key={item.place_id || `${item.title}-${idx}`}
                      role="option"
                      aria-selected={isHighlighted}
                      className={`artist-location-option ${isHighlighted ? "active" : ""}`}
                      onClick={() => handleSelectLocation(item)}
                      onMouseEnter={() => setHighlightedLocationIndex(idx)}
                    >
                      <MapPin size={16} className="artist-location-pin" />
                      <div className="artist-location-info">
                        <div className="artist-location-title-row">
                          <span className="artist-location-title">{item.title}</span>
                          {item.area_type && (
                            <span className="artist-location-tag">
                              {item.area_type.replace(/([A-Z])/g, " $1").toLowerCase()}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <div className="artist-location-subtitle">{item.subtitle}</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <label>
            Phone Number *
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              maxLength={20}
              placeholder="+91 98765 43210"
            />
            {renderError("phone")}
          </label>

          <label>
            Starting Price (INR) *
            <input
              name="starting_price"
              type="number"
              min="0"
              step="0.01"
              value={form.starting_price}
              onChange={handleChange}
              required
              placeholder="e.g. 15000"
            />
            {renderError("starting_price")}
          </label>

          <label>
            Years of Experience *
            <input
              name="years_of_experience"
              type="number"
              min="0"
              max="100"
              value={form.years_of_experience}
              onChange={handleChange}
            />
            {renderError("years_of_experience")}
          </label>
        </div>

        <h2>Performance Types *</h2>

        <div className="performance-options">
          {performanceOptions.map((option) => (
            <label key={option} className="performance-option">
              <input
                type="checkbox"
                value={option}
                checked={form.performance_types.includes(option)}
                onChange={handlePerformanceChange}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {renderError("performance_types")}

        <h2>Travel and Portfolio</h2>

        <div className="artist-grid">
          <label>
            Travel Availability *
            <select
              name="travel_availability"
              value={form.travel_availability}
              onChange={handleChange}
              required
            >
              <option value="city">Within my city</option>
              <option value="state">Across my state</option>
              <option value="india">Across India</option>
              <option value="international">International</option>
            </select>
            {renderError("travel_availability")}
          </label>

          <label>
            Portfolio or Video URL
            <input
              name="portfolio_url"
              type="url"
              placeholder="https://youtube.com/... or https://instagram.com/..."
              value={form.portfolio_url}
              onChange={handleChange}
            />
            {renderError("portfolio_url")}
          </label>

          <label className="full-width">
            Profile Photo
            {existingImageUrl && (
              <div className="current-photo-preview">
                <img
                  src={existingImageUrl}
                  alt={form.stage_name || "Artist profile"}
                  className="current-photo-img"
                />
                <span className="current-photo-info">Current photo uploaded. Choose a file below to replace it.</span>
              </div>
            )}
            <input
              name="profile_image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleChange}
            />
            {renderError("profile_image")}
          </label>

          <label className="full-width">
            Additional Information
            <textarea
              name="additional_information"
              rows={3}
              placeholder="Languages spoken, special equipment, stage requirements..."
              value={form.additional_information}
              onChange={handleChange}
            />
            {renderError("additional_information")}
          </label>
        </div>

        <div className="artist-form-actions">
          <button
            className="artist-submit"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : isExistingProfile
              ? "Update Artist Profile"
              : "Save Artist Profile"}
          </button>

          <button
            type="button"
            className="artist-cancel-btn"
            onClick={() => (onCancel ? onCancel() : navigate ? navigate("/profile") : (window.location.href = "/profile"))}
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
