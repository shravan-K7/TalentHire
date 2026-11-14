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
    customer_phone: user?.phone || user?.customer_profile?.phone || '',
    performance_duration: '',
    expected_audience_size: '',
    budget: '18000',
    additional_requirements: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldError, setFieldError] = useState({ field: '', message: '' });
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
            customer_phone: prev.customer_phone || user?.phone || user?.customer_profile?.phone || '',
          }));
        }
      } catch {
        if (isMounted) {
          // If fetching fails, gracefully use DEFAULT_ARTIST so page renders reliably
          setArtist(DEFAULT_ARTIST);
          setFormData((prev) => ({
            ...prev,
            budget: String(DEFAULT_ARTIST.starting_price),
            event_location: DEFAULT_ARTIST.location,
            customer_phone: prev.customer_phone || user?.phone || user?.customer_profile?.phone || '',
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
  }, [artistId, user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (submitError) {
      setSubmitError('');
    }
    if (fieldError.field) {
      setFieldError({ field: '', message: '' });
    }
  }

  function handleFocus(fieldId) {
    if (fieldError.field === fieldId) {
      setFieldError({ field: '', message: '' });
    }
  }

  function pointOutField(fieldId, message) {
    setSubmitError(message);
    setFieldError({ field: fieldId, message });

    setTimeout(() => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof el.focus === 'function') {
          el.focus({ preventScroll: true });
        }
      }
    }, 30);
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
    setFieldError({ field: '', message: '' });

    // Validations with smooth scroll and point-out
    if (!formData.event_type.trim()) {
      pointOutField('eventType', 'Please select an event type.');
      return;
    }
    if (!formData.event_date) {
      pointOutField('eventDateTimeSection', 'Please choose the event date from the calendar.');
      return;
    }
    if (!formData.event_time) {
      pointOutField('eventDateTimeSection', 'Please choose the event start time.');
      return;
    }

    // Validate future date and time
    const combinedStr = `${formData.event_date}T${formData.event_time}:00`;
    const eventDateTime = new Date(combinedStr);
    const now = new Date();
    if (isNaN(eventDateTime.getTime()) || eventDateTime <= now) {
      pointOutField('eventDateTimeSection', 'The event date and time must be in the future.');
      return;
    }

    if (!formData.event_location.trim()) {
      pointOutField('eventLocation', 'Please enter the venue / location.');
      return;
    }

    if (!formData.customer_phone.trim()) {
      pointOutField('customerPhone', 'Please enter your contact phone number.');
      return;
    }
    const cleanPhoneDigits = formData.customer_phone.replace(/\D/g, '');
    if (cleanPhoneDigits.length < 7 || cleanPhoneDigits.length > 15) {
      pointOutField('customerPhone', 'Please enter a valid phone number (7 to 15 digits).');
      return;
    }

    if (!formData.performance_duration.trim()) {
      pointOutField('performanceDuration', 'Please select the performance duration.');
      return;
    }

    if (!formData.expected_audience_size) {
      pointOutField('expectedAudienceSize', 'Please enter the expected audience size.');
      return;
    }

    const audNum = Number(formData.expected_audience_size);
    if (isNaN(audNum) || audNum <= 0 || !Number.isInteger(audNum)) {
      pointOutField('expectedAudienceSize', 'Expected audience size must be a positive whole number.');
      return;
    }

    // Budget check if entered
    if (formData.budget) {
      const budNum = Number(formData.budget);
      if (isNaN(budNum) || budNum < 0) {
        pointOutField('budget', 'Budget cannot be negative.');
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
        customer_phone: formData.customer_phone.trim(),
        phone: formData.customer_phone.trim(),
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
                    className={`booking-control ${fieldError.field === 'eventType' ? 'booking-control-highlight' : ''}`}
                    value={formData.event_type}
                    onChange={handleChange}
                    onFocus={() => handleFocus('eventType')}
                    aria-invalid={fieldError.field === 'eventType' ? 'true' : undefined}
                    required
                  >
                    <option value="" disabled>Select event type</option>
                    {EVENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {fieldError.field === 'eventType' && (
                    <div className="booking-field-pointer" role="alert">
                      <span className="booking-pointer-arrow">👆</span>
                      <span>{fieldError.message}</span>
                    </div>
                  )}
                </div>

                {/* Event date & start time with custom responsive Calendar and Time slot picker */}
                <div
                  id="eventDateTimeSection"
                  className={`booking-field ${fieldError.field === 'eventDateTimeSection' ? 'booking-field-highlight' : ''}`}
                >
                  <label className="booking-field-label">
                    Event date & start time <span className="booking-req">*</span>
                  </label>
                  {fieldError.field === 'eventDateTimeSection' && (
                    <div className="booking-field-pointer" style={{ marginBottom: 10 }} role="alert">
                      <span className="booking-pointer-arrow">👇</span>
                      <span>{fieldError.message}</span>
                    </div>
                  )}
                  <BookingCalendarPicker
                    selectedDate={formData.event_date}
                    selectedTime={formData.event_time}
                    onDateChange={(newDate) => {
                      setFormData((prev) => ({ ...prev, event_date: newDate }));
                      if (submitError) setSubmitError('');
                      if (fieldError.field === 'eventDateTimeSection') setFieldError({ field: '', message: '' });
                    }}
                    onTimeChange={(newTime) => {
                      setFormData((prev) => ({ ...prev, event_time: newTime }));
                      if (submitError) setSubmitError('');
                      if (fieldError.field === 'eventDateTimeSection') setFieldError({ field: '', message: '' });
                    }}
                  />
                </div>

                {/* Venue / location */}
                <div className="booking-field">
                  <label htmlFor="eventLocation" className="booking-field-label">
                    Venue / location <span className="booking-req">*</span>
                  </label>
                  <input
                    id="eventLocation"
                    type="text"
                    name="event_location"
                    className={`booking-control ${fieldError.field === 'eventLocation' ? 'booking-control-highlight' : ''}`}
                    value={formData.event_location}
                    onChange={handleChange}
                    onFocus={() => handleFocus('eventLocation')}
                    placeholder="Venue name, city"
                    aria-invalid={fieldError.field === 'eventLocation' ? 'true' : undefined}
                    required
                  />
                  {fieldError.field === 'eventLocation' && (
                    <div className="booking-field-pointer" role="alert">
                      <span className="booking-pointer-arrow">👆</span>
                      <span>{fieldError.message}</span>
                    </div>
                  )}
                </div>

                {/* Phone number */}
                <div className="booking-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="customerPhone" className="booking-field-label">
                    Phone number <span className="booking-req">*</span>
                  </label>
                  <input
                    id="customerPhone"
                    type="tel"
                    name="customer_phone"
                    className={`booking-control ${fieldError.field === 'customerPhone' ? 'booking-control-highlight' : ''}`}
                    value={formData.customer_phone}
                    onChange={handleChange}
                    onFocus={() => handleFocus('customerPhone')}
                    placeholder="e.g. +91 98765 43210"
                    autoComplete="tel"
                    aria-invalid={fieldError.field === 'customerPhone' ? 'true' : undefined}
                    required
                  />
                  {fieldError.field === 'customerPhone' ? (
                    <div className="booking-field-pointer" role="alert">
                      <span className="booking-pointer-arrow">👆</span>
                      <span>{fieldError.message}</span>
                    </div>
                  ) : (
                    <span className="booking-field-hint">
                      The artist will use this phone number to coordinate arrival and event schedule.
                    </span>
                  )}
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
                      className={`booking-control ${fieldError.field === 'performanceDuration' ? 'booking-control-highlight' : ''}`}
                      value={formData.performance_duration}
                      onChange={handleChange}
                      onFocus={() => handleFocus('performanceDuration')}
                      aria-invalid={fieldError.field === 'performanceDuration' ? 'true' : undefined}
                      required
                    >
                      <option value="" disabled>Select duration</option>
                      {DURATION_OPTIONS.map((dur) => (
                        <option key={dur} value={dur}>
                          {dur}
                        </option>
                      ))}
                    </select>
                    {fieldError.field === 'performanceDuration' && (
                      <div className="booking-field-pointer" role="alert">
                        <span className="booking-pointer-arrow">👆</span>
                        <span>{fieldError.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="booking-field">
                    <label htmlFor="expectedAudienceSize" className="booking-field-label">
                      Expected audience size <span className="booking-req">*</span>
                    </label>
                    <input
                      id="expectedAudienceSize"
                      type="number"
                      name="expected_audience_size"
                      className={`booking-control ${fieldError.field === 'expectedAudienceSize' ? 'booking-control-highlight' : ''}`}
                      value={formData.expected_audience_size}
                      onChange={handleChange}
                      onFocus={() => handleFocus('expectedAudienceSize')}
                      placeholder="e.g. 250"
                      min="1"
                      step="1"
                      aria-invalid={fieldError.field === 'expectedAudienceSize' ? 'true' : undefined}
                      required
                    />
                    {fieldError.field === 'expectedAudienceSize' && (
                      <div className="booking-field-pointer" role="alert">
                        <span className="booking-pointer-arrow">👆</span>
                        <span>{fieldError.message}</span>
                      </div>
                    )}
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
                    className={`booking-control ${fieldError.field === 'budget' ? 'booking-control-highlight' : ''}`}
                    value={formData.budget}
                    onChange={handleChange}
                    onFocus={() => handleFocus('budget')}
                    placeholder={currentArtist.starting_price ? String(parseInt(currentArtist.starting_price, 10)) : '18000'}
                    min="0"
                    step="500"
                    aria-invalid={fieldError.field === 'budget' ? 'true' : undefined}
                  />
                  {fieldError.field === 'budget' ? (
                    <div className="booking-field-pointer" role="alert">
                      <span className="booking-pointer-arrow">👆</span>
                      <span>{fieldError.message}</span>
                    </div>
                  ) : (
                    <span className="booking-field-hint">
                      Prefilled with the artist's starting price. Final quote may differ.
                    </span>
                  )}
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
