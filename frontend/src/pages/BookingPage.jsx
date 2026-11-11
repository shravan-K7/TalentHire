import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookingCalendarPicker from '../components/BookingCalendarPicker';
import { fetchArtistDetail, createBooking } from '../js/auth';
import '../css/BookingPage.css';

const EVENT_TYPE_OPTIONS = [
  'Corporate Event',
  'Wedding',
  'Private Party / Birthday',
  'Music / Cultural Festival',
  'Sangeet / Reception',
  'College Event',
  'Other',
];

const DURATION_OPTIONS = [
  '30 minutes',
  '1 hour',
  '1.5 hours',
  '2 hours',
  '3 hours',
  '4+ hours',
  'To be discussed',
];

const DEFAULT_ARTIST = {
  id: 9,
  stage_name: 'Neha Kapoor',
  category_name: 'Anchors & Emcees',
  location: 'Pune, Maharashtra',
  starting_price: 18000,
  profile_image: null,
};

function BookingPage({ artistId = '9', user, onLogout, navigate }) {
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Form State matching the layout with initial values per design
  const [formData, setFormData] = useState({
    event_type: '',
    event_date: '2026-11-20',
    event_time: '19:00',
    event_location: '',
    performance_duration: '',
    expected_audience_size: '',
    budget: '18000',
    additional_requirements: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [bookingSuccessData, setBookingSuccessData] = useState(null);

  // Authentication check: unauthenticated customers must be redirected to login
  useEffect(() => {
    if (!user) {
      const redirectPath = `/book-artist/${artistId || 9}`;
      if (navigate) {
        navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      } else {
        window.location.assign(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      }
    }
  }, [user, artistId, navigate]);

  // Load artist details
  useEffect(() => {
    let isMounted = true;

    async function loadArtist() {
      setLoading(true);
      setFetchError('');
      try {
        const targetId = artistId || 9;
        const data = await fetchArtistDetail(targetId);
        if (isMounted) {
          setArtist(data);
          setFormData((prev) => ({
            ...prev,
            budget: data.starting_price ? String(parseInt(data.starting_price, 10)) : prev.budget || '18000',
            event_location: data.location || prev.event_location,
          }));
        }
      } catch (err) {
        if (isMounted) {
          // If fetching fails, gracefully use DEFAULT_ARTIST so page renders reliably
          setArtist(DEFAULT_ARTIST);
          setFormData((prev) => ({
            ...prev,
            budget: String(DEFAULT_ARTIST.starting_price),
            event_location: DEFAULT_ARTIST.location,
          }));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadArtist();

    return () => {
      isMounted = false;
    };
  }, [artistId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (submitError) {
      setSubmitError('');
    }
  }

  function handleBackToArtist() {
    const targetId = artist?.id || artistId || 9;
    if (navigate) {
      navigate(`/artists/${targetId}`);
    } else {
      window.location.assign(`/artists/${targetId}`);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user) {
      if (navigate) {
        navigate('/login');
      } else {
        window.location.assign('/login');
      }
      return;
    }

    setSubmitError('');

    // Validations
    if (!formData.event_type.trim()) {
      setSubmitError('Please select an event type.');
      return;
    }
    if (!formData.event_date) {
      setSubmitError('Please choose the event date from the calendar.');
      return;
    }
    if (!formData.event_time) {
      setSubmitError('Please choose the event start time.');
      return;
    }
    if (!formData.event_location.trim()) {
      setSubmitError('Please enter the venue / location.');
      return;
    }
    if (!formData.performance_duration.trim()) {
      setSubmitError('Please select the performance duration.');
      return;
    }
    if (!formData.expected_audience_size) {
      setSubmitError('Please enter the expected audience size.');
      return;
    }

    const audNum = Number(formData.expected_audience_size);
    if (isNaN(audNum) || audNum <= 0 || !Number.isInteger(audNum)) {
      setSubmitError('Expected audience size must be a positive whole number.');
      return;
    }

    // Validate future date and time
    const combinedStr = `${formData.event_date}T${formData.event_time}:00`;
    const eventDateTime = new Date(combinedStr);
    const now = new Date();
    if (isNaN(eventDateTime.getTime()) || eventDateTime <= now) {
      setSubmitError('The event date and time must be in the future.');
      return;
    }

    // Budget check if entered
    if (formData.budget) {
      const budNum = Number(formData.budget);
      if (isNaN(budNum) || budNum < 0) {
        setSubmitError('Budget cannot be negative.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        artist_id: Number(artist?.id || artistId || 9),
        event_type: formData.event_type.trim(),
        event_date: formData.event_date,
        event_time: formData.event_time,
        event_location: formData.event_location.trim(),
        performance_duration: formData.performance_duration.trim(),
        expected_audience_size: Number(formData.expected_audience_size),
        agreed_price: formData.budget ? Number(formData.budget) : (artist?.starting_price || 18000),
        message: formData.additional_requirements.trim(),
      };

      const result = await createBooking(payload);
      setBookingSuccessData(result);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit booking request. Please check inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const currentArtist = artist || DEFAULT_ARTIST;
  const displayStageName = currentArtist.stage_name
    ? currentArtist.stage_name.replace(/\s*\([^)]*\)/, '')
    : 'Neha Kapoor';
  const displayCategory =
    currentArtist.category_name ||
    (currentArtist.category && currentArtist.category.name) ||
    'Anchors & Emcees';

  return (
    <div className="booking-page-root">
      <Navbar
        user={user}
        onLogout={onLogout}
        currentPath={`/book-artist/${currentArtist.id}`}
        navigate={navigate}
      />

      <main className="booking-page-container">
        {/* Back Link */}
        <button
          type="button"
          className="booking-back-link"
          onClick={handleBackToArtist}
          aria-label="Back to artist"
        >
          ← Back to artist
        </button>

        {/* Page Title & Subtitle */}
        <header className="booking-header-area">
          <h1 className="booking-page-title">Request a booking</h1>
          <p className="booking-page-subtitle">
            Tell the artist about your event. You won't be charged until they accept.
          </p>
        </header>

        {/* Loading State */}
        {loading && !artist && (
          <div className="booking-loading-box">
            <div className="booking-spinner" />
            <p>Loading artist booking details...</p>
          </div>
        )}

        {/* Error State if fetch error and no artist */}
        {!loading && fetchError && !artist && (
          <div className="booking-alert-banner" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{fetchError}</span>
          </div>
        )}

        {/* Success Confirmation Card */}
        {bookingSuccessData && (
          <div className="booking-success-box">
            <div className="booking-success-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="booking-success-title">Booking Request Sent!</h2>
            <p className="booking-success-desc">
              Your request for <strong>{displayStageName}</strong> has been submitted with status{' '}
              <span style={{ color: '#FF9800', fontWeight: 600 }}>PENDING</span>.
              The artist will review the event details and confirm schedule availability.
              Once accepted, you can proceed to payment.
            </p>

            <div className="booking-success-actions">
              <button
                type="button"
                className="booking-submit-btn"
                style={{ width: 'auto', padding: '11px 26px', margin: 0 }}
                onClick={() => {
                  if (navigate) {
                    navigate('/customer-dashboard');
                  } else {
                    window.location.assign('/customer-dashboard');
                  }
                }}
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                className="booking-btn-secondary"
                onClick={() => {
                  if (navigate) {
                    navigate('/artists');
                  } else {
                    window.location.assign('/artists');
                  }
                }}
              >
                Explore More Artists
              </button>
            </div>
          </div>
        )}

        {/* Two-Column Booking View */}
        {!bookingSuccessData && (
          <div className="booking-layout">
            {/* Left Column: Form Cards & Submit */}
            <form onSubmit={handleSubmit} noValidate className="booking-form-stack">
              {submitError && (
                <div className="booking-alert-banner" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{submitError}</span>
                </div>
              )}

              {/* Card 1: Event Details */}
              <div className="booking-card">
                <h2 className="booking-card-title">Event details</h2>

                {/* Event type */}
                <div className="booking-field">
                  <label htmlFor="eventType" className="booking-field-label">
                    Event type <span className="booking-req">*</span>
                  </label>
                  <select
                    id="eventType"
                    name="event_type"
                    className="booking-control"
                    value={formData.event_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>Select event type</option>
                    {EVENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event date & start time with custom responsive Calendar and Time slot picker */}
                <div className="booking-field">
                  <label className="booking-field-label">
                    Event date & start time <span className="booking-req">*</span>
                  </label>
                  <BookingCalendarPicker
                    selectedDate={formData.event_date}
                    selectedTime={formData.event_time}
                    onDateChange={(newDate) => {
                      setFormData((prev) => ({ ...prev, event_date: newDate }));
                      if (submitError) setSubmitError('');
                    }}
                    onTimeChange={(newTime) => {
                      setFormData((prev) => ({ ...prev, event_time: newTime }));
                      if (submitError) setSubmitError('');
                    }}
                  />
                </div>

                {/* Venue / location */}
                <div className="booking-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="eventLocation" className="booking-field-label">
                    Venue / location <span className="booking-req">*</span>
                  </label>
                  <input
                    id="eventLocation"
                    type="text"
                    name="event_location"
                    className="booking-control"
                    value={formData.event_location}
                    onChange={handleChange}
                    placeholder="Venue name, city"
                    required
                  />
                </div>
              </div>

              {/* Card 2: Performance Requirements */}
              <div className="booking-card">
                <h2 className="booking-card-title">Performance requirements</h2>

                <div className="booking-row-2">
                  <div className="booking-field">
                    <label htmlFor="performanceDuration" className="booking-field-label">
                      Performance duration <span className="booking-req">*</span>
                    </label>
                    <select
                      id="performanceDuration"
                      name="performance_duration"
                      className="booking-control"
                      value={formData.performance_duration}
                      onChange={handleChange}
                      required
                    >
                      <option value="" disabled>Select duration</option>
                      {DURATION_OPTIONS.map((dur) => (
                        <option key={dur} value={dur}>
                          {dur}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="booking-field">
                    <label htmlFor="expectedAudienceSize" className="booking-field-label">
                      Expected audience size <span className="booking-req">*</span>
                    </label>
                    <input
                      id="expectedAudienceSize"
                      type="number"
                      name="expected_audience_size"
                      className="booking-control"
                      value={formData.expected_audience_size}
                      onChange={handleChange}
                      placeholder="e.g. 250"
                      min="1"
                      step="1"
                      required
                    />
                  </div>
                </div>

                <div className="booking-field">
                  <label htmlFor="budget" className="booking-field-label">
                    Your budget (₹) <span className="booking-opt">optional</span>
                  </label>
                  <input
                    id="budget"
                    type="number"
                    name="budget"
                    className="booking-control"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder={currentArtist.starting_price ? String(parseInt(currentArtist.starting_price, 10)) : '18000'}
                    min="0"
                    step="500"
                  />
                  <span className="booking-field-hint">
                    Prefilled with the artist's starting price. Final quote may differ.
                  </span>
                </div>

                <div className="booking-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="additionalRequirements" className="booking-field-label">
                    Additional requirements <span className="booking-opt">optional</span>
                  </label>
                  <textarea
                    id="additionalRequirements"
                    name="additional_requirements"
                    className="booking-control booking-textarea"
                    value={formData.additional_requirements}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Sound system, instruments, accommodation, travel, dress code or other instructions"
                  />
                </div>
              </div>

              {/* Submit Button & Footnote */}
              <div>
                <button
                  type="submit"
                  className="booking-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Sending Booking Request...' : 'Send Booking Request'}
                </button>
                <div className="booking-required-note">* Required fields</div>
              </div>
            </form>

            {/* Right Column: Artist Summary Card & What Happens Next */}
            <aside className="booking-sidebar" aria-label="Artist Summary and Guide">
              {/* Artist Card */}
              <div className="booking-artist-card">
                <div className="booking-artist-top">
                  <div className="booking-artist-thumb">
                    {currentArtist.profile_image ? (
                      <img
                        src={currentArtist.profile_image}
                        alt={displayStageName}
                      />
                    ) : (
                      <div className="booking-artist-thumb-fallback">[photo]</div>
                    )}
                  </div>

                  <div className="booking-artist-meta">
                    <div className="booking-artist-name" title={displayStageName}>
                      {displayStageName}
                    </div>
                    <div className="booking-artist-cat">
                      {displayCategory}
                    </div>
                  </div>
                </div>

                <div className="booking-artist-divider" />

                <div className="booking-artist-details">
                  <div className="booking-artist-row">
                    <span className="booking-artist-label">Location</span>
                    <span className="booking-artist-val">
                      {currentArtist.location || 'Pune, Maharashtra'}
                    </span>
                  </div>
                  <div className="booking-artist-row">
                    <span className="booking-artist-label">Starting price</span>
                    <span className="booking-artist-price">
                      ₹{Number(currentArtist.starting_price || 18000).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* What Happens Next Card */}
              <div className="booking-next-card">
                <h3 className="booking-next-title">What happens next</h3>
                <ol className="booking-steps-list">
                  <li className="booking-step-item">
                    <span className="booking-step-num">1</span>
                    <span className="booking-step-text">Artist reviews your request</span>
                  </li>
                  <li className="booking-step-item">
                    <span className="booking-step-num">2</span>
                    <span className="booking-step-text">They accept or decline</span>
                  </li>
                  <li className="booking-step-item">
                    <span className="booking-step-num">3</span>
                    <span className="booking-step-text">
                      If accepted, you pay securely to confirm
                    </span>
                  </li>
                </ol>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default BookingPage;
