import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchArtistDetail, createBooking } from '../js/auth';
import '../css/BookingPage.css';

// Calculate minimum event date as tomorrow in YYYY-MM-DD format
function getMinEventDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

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

function BookingPage({ artistId, user, onLogout, navigate }) {
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Form State matching the layout
  const [formData, setFormData] = useState({
    event_type: '',
    event_date: '',
    event_time: '18:00',
    event_location: '',
    performance_duration: '',
    expected_audience_size: '',
    budget: '',
    additional_requirements: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [bookingSuccessData, setBookingSuccessData] = useState(null);

  // Authentication check: unauthenticated customers must be redirected to login
  useEffect(() => {
    if (!user) {
      const redirectPath = `/book-artist/${artistId}`;
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
        const data = await fetchArtistDetail(artistId);
        if (isMounted) {
          setArtist(data);
          setFormData((prev) => ({
            ...prev,
            budget: data.starting_price ? String(parseInt(data.starting_price, 10)) : '',
            event_location: data.location || '',
          }));
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.message || 'Unable to load artist details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (artistId) {
      loadArtist();
    }

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
    if (navigate) {
      navigate(`/artists/${artistId}`);
    } else {
      window.location.assign(`/artists/${artistId}`);
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
      setSubmitError('Please choose the event date.');
      return;
    }
    if (!formData.event_time) {
      setSubmitError('Please choose the event time.');
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
        artist_id: Number(artistId),
        event_type: formData.event_type.trim(),
        event_date: formData.event_date,
        event_time: formData.event_time,
        event_location: formData.event_location.trim(),
        performance_duration: formData.performance_duration.trim(),
        expected_audience_size: Number(formData.expected_audience_size),
        agreed_price: formData.budget ? Number(formData.budget) : (artist?.starting_price || null),
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

  const minDate = getMinEventDate();

  return (
    <div className="booking-page-root">
      <Navbar user={user} onLogout={onLogout} currentPath={`/book-artist/${artistId}`} navigate={navigate} />

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
            Tell the artist about your event. You won’t be charged until they accept.
          </p>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="booking-loading-box">
            <div className="booking-spinner" />
            <p>Loading artist booking details...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && fetchError && (
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
        {!loading && bookingSuccessData && (
          <div className="booking-success-box">
            <div className="booking-success-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="booking-success-title">Booking Request Sent!</h2>
            <p className="booking-success-desc">
              Your request for <strong>{artist?.stage_name}</strong> has been submitted with status{' '}
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
        {!loading && !fetchError && !bookingSuccessData && artist && (
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

                <div className="booking-row-2">
                  <div className="booking-field">
                    <label htmlFor="eventDate" className="booking-field-label">
                      Event date <span className="booking-req">*</span>
                    </label>
                    <input
                      id="eventDate"
                      type="date"
                      name="event_date"
                      className="booking-control"
                      value={formData.event_date}
                      onChange={handleChange}
                      min={minDate}
                      required
                    />
                    <span className="booking-field-hint">Must be a future date</span>
                  </div>

                  <div className="booking-field">
                    <label htmlFor="eventTime" className="booking-field-label">
                      Event time <span className="booking-req">*</span>
                    </label>
                    <input
                      id="eventTime"
                      type="time"
                      name="event_time"
                      className="booking-control"
                      value={formData.event_time}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

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
                    placeholder={artist.starting_price ? String(parseInt(artist.starting_price, 10)) : '18000'}
                    min="0"
                    step="500"
                  />
                  <span className="booking-field-hint">
                    Prefilled with the artist’s starting price. Final quote may differ.
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
                    rows={2}
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
                    {artist.profile_image ? (
                      <img
                        src={artist.profile_image}
                        alt={artist.stage_name}
                      />
                    ) : (
                      <div className="booking-artist-thumb-fallback">
                        {artist.stage_name ? artist.stage_name.charAt(0) : 'A'}
                      </div>
                    )}
                  </div>

                  <div className="booking-artist-meta">
                    <div className="booking-artist-name" title={artist.stage_name}>
                      {artist.stage_name}
                    </div>
                    <div className="booking-artist-cat">
                      {artist.category_name || 'Anchors & Emcees'}
                    </div>
                  </div>
                </div>

                <div className="booking-artist-divider" />

                <div className="booking-artist-details">
                  <div className="booking-artist-row">
                    <span className="booking-artist-label">Location</span>
                    <span className="booking-artist-val">{artist.location || 'India'}</span>
                  </div>
                  <div className="booking-artist-row">
                    <span className="booking-artist-label">Starting price</span>
                    <span className="booking-artist-price">
                      ₹{Number(artist.starting_price || 0).toLocaleString('en-IN')}
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
