import { useEffect, useState } from "react";
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

  const [form, setForm] = useState({
    stage_name: user?.artist_profile?.stage_name || "",
    category: String(user?.artist_profile?.category_id || ""),
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
        // Ensure CSRF cookie is set
        await fetch("/api/auth/csrf/", {
          credentials: "include",
        });

        // Load Categories
        const categoryResponse = await fetch("/api/auth/artist/categories/", {
          credentials: "include",
        });

        if (!categoryResponse.ok) {
          throw new Error("Could not load artist categories.");
        }

        const categoryData = await categoryResponse.json();
        if (!ignore) {
          setCategories(categoryData.categories || []);
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

  function handleChange(event) {
    const { name, value, files } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "profile_image" ? files[0] : value,
    }));
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
        const csrfRes = await fetch("/api/auth/csrf/", { credentials: "include" });
        const csrfData = await csrfRes.json();
        csrfToken = csrfData.csrfToken || "";
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
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {renderError("category")}
          </label>

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

          <label>
            Location *
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              required
              maxLength={150}
              placeholder="e.g. Mumbai, Maharashtra"
            />
            {renderError("location")}
          </label>

          <label>
            Phone Number
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
            Years of Experience
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

        <h2>Performance Types</h2>

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
