import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EventDetails from '../components/booking/EventDetails';
import EventLocation from '../components/booking/EventLocation';
import PerformanceRequirements from '../components/booking/PerformanceRequirements';
import BookingSummary from '../components/booking/BookingSummary';
import {
  fetchArtistDetail,
  createBooking,
  fetchPublicArtistAvailability,
} from '../js/auth';
import '../css/BookingPage.css';

const DEFAULT_ARTIST = {
  id: '',
  stage_name: 'Artist',
  category_name: 'Performer',
  location: '',
  starting_price: 0,
  profile_image: null,
};

export default function BookingPage({ artistId = '4', user, onLogout, navigate, checking = false }) {
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Comprehensive Form State matching backend model
  const [formData, setFormData] = useState({
    event_type: '',
    event_date: '2026-11-20',
    event_time: '19:00',
    event_location: '',
    event_area: '',
    event_area_place_id: '',
    event_address: '',
    city: '',
    state: '',
    country: 'India',
    venue_name: '',
    latitude: null,
    longitude: null,
    area_latitude: null,
    area_longitude: null,
    google_maps_url: '',
    location_source: 'autocomplete',
    location_instructions: '',
    customer_phone: user?.phone || user?.customer_profile?.phone || '',
    performance_duration: '',
    expected_audience_size: '',
    budget: '',
    additional_requirements: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldError, setFieldError] = useState({ field: '', message: '' });
  const [bookingSuccessData, setBookingSuccessData] = useState(null);

  // Artist availability state
  const [unavailableDates, setUnavailableDates] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [currentMonth, setCurrentMonth] = useState('2026-11');
  const availabilityReqIdRef = useRef(0);
  const currentMonthRef = useRef(currentMonth);

  useEffect(() => {
    currentMonthRef.current = currentMonth;
  }, [currentMonth]);

  // Fetch artist availability for a given month with stale response guard
  const loadAvailability = useCallback(async (monthStr, targetArtistId) => {
    const aid = targetArtistId || artist?.id || artistId || 4;
    if (!aid || !monthStr) return;

    const reqId = ++availabilityReqIdRef.current;
    setAvailabilityLoading(true);
    setAvailabilityError('');

    try {
      const data = await fetchPublicArtistAvailability(aid, monthStr);
      if (reqId === availabilityReqIdRef.current) {
        setUnavailableDates(data.unavailable_dates || []);
        setAvailabilityError('');
      }
    } catch (err) {
      if (reqId === availabilityReqIdRef.current) {
        console.warn('Failed to load artist availability:', err);
        setUnavailableDates(null);
        setAvailabilityError(err.message || 'Unable to load artist schedule. Please try again.');
      }
    } finally {
      if (reqId === availabilityReqIdRef.current) {
        setAvailabilityLoading(false);
      }
    }
  }, [artist?.id, artistId]);

  const handleMonthChange = useCallback((monthStr) => {
    setCurrentMonth(monthStr);
    loadAvailability(monthStr);
  }, [loadAvailability]);

  // Initial availability fetch
  useEffect(() => {
    if (!user) return;
    const aid = artistId || 4;
    loadAvailability(currentMonthRef.current, aid);
  }, [user, artistId, loadAvailability]);

  // Authentication check
  useEffect(() => {
    if (!checking && !user) {
      const targetId = artistId || artist?.id || 4;
      const redirectPath = `/book-artist/${targetId}`;
      if (navigate) {
        navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      } else {
        window.location.assign(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      }
    }
  }, [checking, user, artistId, artist?.id, navigate]);

  // Load artist details
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadArtist() {
      setLoading(true);
      setFetchError('');
      try {
        const targetId = artistId || 4;
        const data = await fetchArtistDetail(targetId);
        if (isMounted) {
          setArtist(data);
          loadAvailability(currentMonthRef.current, data.id);
          setFormData((prev) => ({
            ...prev,
            budget: prev.budget || (data.starting_price ? String(parseInt(data.starting_price, 10)) : ''),
            customer_phone: prev.customer_phone || user?.phone || user?.customer_profile?.phone || '',
          }));
        }
      } catch {
        if (isMounted) {
          setArtist(DEFAULT_ARTIST);
          setFormData((prev) => ({
            ...prev,
            budget: prev.budget || String(DEFAULT_ARTIST.starting_price),
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
  }, [artistId, user, loadAvailability]);

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

  function handleFocusField(fieldId) {
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
    const targetId = artist?.id || artistId || 4;
    if (navigate) {
      navigate(`/artists/${targetId}`);
    } else {
      window.location.assign(`/artists/${targetId}`);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user) {
      const targetId = artist?.id || artistId || 4;
      const redirectPath = `/book-artist/${targetId}`;
      const loginUrl = `/login?redirect=${encodeURIComponent(redirectPath)}`;
      if (navigate) {
        navigate(loginUrl);
      } else {
        window.location.assign(loginUrl);
      }
      return;
    }

    setSubmitError('');
    setFieldError({ field: '', message: '' });

    // 1. Event Type Validation
    if (!formData.event_type.trim()) {
      pointOutField('eventType', 'Please select an event type.');
      return;
    }

    // 2. Date & Time Validation
    if (!formData.event_date) {
      pointOutField('eventDateTimeSection', 'Please choose the event date from the calendar.');
      return;
    }
    if (!formData.event_time) {
      pointOutField('eventDateTimeSection', 'Please choose the event start time.');
      return;
    }

    const combinedStr = `${formData.event_date}T${formData.event_time}:00`;
    const eventDateTime = new Date(combinedStr);
    const now = new Date();
    if (isNaN(eventDateTime.getTime()) || eventDateTime <= now) {
      pointOutField('eventDateTimeSection', 'The event date and time must be in the future.');
      return;
    }

    if (Array.isArray(unavailableDates) && unavailableDates.includes(formData.event_date)) {
      pointOutField('eventDateTimeSection', 'This artist is unavailable on this date. Please select another date.');
      return;
    }

    if (availabilityError) {
      pointOutField('eventDateTimeSection', 'Unable to verify artist schedule. Please retry checking availability.');
      return;
    }

    // 3. Location / Area Validation
    if (!formData.event_area.trim()) {
      pointOutField('eventAreaInput', 'Please search and select or enter the Location / Area.');
      return;
    }

    // 4. Venue Name Validation
    if (!formData.venue_name.trim()) {
      pointOutField('venueNameInput', 'Please enter the venue name or specific place.');
      return;
    }

    // 5. Phone Number Validation
    if (!formData.customer_phone.trim()) {
      pointOutField('customerPhone', 'Please enter your contact phone number.');
      return;
    }
    const cleanPhoneDigits = formData.customer_phone.replace(/\D/g, '');
    if (cleanPhoneDigits.length < 7 || cleanPhoneDigits.length > 15) {
      pointOutField('customerPhone', 'Please enter a valid phone number (7 to 15 digits).');
      return;
    }

    // 6. Performance Duration Validation
    if (!formData.performance_duration.trim()) {
      pointOutField('performanceDuration', 'Please select the performance duration.');
      return;
    }

    // 7. Expected Audience Size Validation
    if (!formData.expected_audience_size) {
      pointOutField('expectedAudienceSize', 'Please enter the expected audience size.');
      return;
    }
    const audNum = Number(formData.expected_audience_size);
    if (isNaN(audNum) || audNum <= 0 || !Number.isInteger(audNum)) {
      pointOutField('expectedAudienceSize', 'Expected audience size must be a positive whole number.');
      return;
    }

    // 8. Budget Validation
    if (formData.budget) {
      const budNum = Number(formData.budget);
      if (isNaN(budNum) || budNum < 0) {
        pointOutField('budget', 'Budget cannot be negative.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const combinedLocation = [formData.venue_name.trim(), formData.event_area.trim()].filter(Boolean).join(', ');

      const payload = {
        artist_id: Number(artist?.id || artistId || 4),
        event_type: formData.event_type.trim(),
        event_date: formData.event_date,
        event_time: formData.event_time,
        event_area: formData.event_area.trim(),
        event_area_place_id: formData.event_area_place_id || '',
        event_address: formData.event_address.trim() || combinedLocation,
        city: formData.city.trim() || formData.event_area.trim(),
        state: formData.state.trim() || 'Kerala',
        country: formData.country || 'India',
        venue_name: formData.venue_name.trim(),
        event_location: combinedLocation,
        latitude: formData.latitude !== null && !isNaN(formData.latitude) ? Number(formData.latitude) : null,
        longitude: formData.longitude !== null && !isNaN(formData.longitude) ? Number(formData.longitude) : null,
        area_latitude: formData.area_latitude !== null && !isNaN(formData.area_latitude) ? Number(formData.area_latitude) : null,
        area_longitude: formData.area_longitude !== null && !isNaN(formData.area_longitude) ? Number(formData.area_longitude) : null,
        google_maps_url: formData.google_maps_url.trim(),
        location_source: formData.location_source || 'manual',
        location_instructions: formData.location_instructions.trim(),
        customer_phone: formData.customer_phone.trim(),
        phone: formData.customer_phone.trim(),
        performance_duration: formData.performance_duration.trim(),
        expected_audience_size: Number(formData.expected_audience_size),
        agreed_price: formData.budget ? Number(formData.budget) : (artist?.starting_price || 5000),
        message: formData.additional_requirements.trim(),
      };

      const result = await createBooking(payload);
      setBookingSuccessData(result);
    } catch (err) {
      const errorMsg = err.message || 'Failed to submit booking request. Please check inputs and try again.';
      setSubmitError(errorMsg);

      if (err.status === 401 || errorMsg.toLowerCase().includes('sign in') || errorMsg.toLowerCase().includes('log in')) {
        const targetId = artist?.id || artistId || 4;
        const redirectPath = `/book-artist/${targetId}`;
        const loginUrl = `/login?redirect=${encodeURIComponent(redirectPath)}`;
        if (navigate) {
          navigate(loginUrl);
        } else {
          window.location.assign(loginUrl);
        }
        return;
      }

      if (err.status === 409 || errorMsg.toLowerCase().includes('already has a booking') || errorMsg.toLowerCase().includes('active reservation')) {
        pointOutField('eventDateTimeSection', errorMsg);
        loadAvailability(currentMonthRef.current);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const currentArtist = artist || DEFAULT_ARTIST;
  const displayStageName = currentArtist.stage_name
    ? currentArtist.stage_name.replace(/\s*\([^)]*\)/, '')
    : 'Artist';

  if (!user) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#181818',
          color: '#F7F7F7',
          gap: '16px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '3px solid rgba(255, 87, 34, 0.2)',
            borderTopColor: '#FF5722',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#A0A0A0' }}>
          Please sign in to book this performer. Redirecting to login...
        </p>
      </main>
    );
  }

  return (
    <div className="booking-page-root">
      <Navbar
        user={user}
        onLogout={onLogout}
        currentPath={`/book-artist/${currentArtist.id}`}
        navigate={navigate}
      />

      <main className="booking-page-container">
        {/* Back Link without icons or emojis */}
        <button
          type="button"
          className="booking-back-link"
          onClick={handleBackToArtist}
          aria-label="Back to artist"
        >
          Back to artist
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

        {/* Error State */}
        {!loading && fetchError && !artist && (
          <div className="booking-alert-banner" role="alert">
            <span>{fetchError}</span>
          </div>
        )}

        {/* Success Confirmation Card */}
        {bookingSuccessData && (
          <div className="booking-success-box">
            <div className="booking-success-badge">CONFIRMED</div>
            <h2 className="booking-success-title">Booking Request Sent</h2>
            <p className="booking-success-desc">
              Your request for <strong>{displayStageName}</strong> has been submitted with status{' '}
              <span className="booking-status-tag">PENDING</span>.
              The artist will review the event details, venue location, and schedule availability.
              Once accepted, you can proceed with payment.
            </p>

            <div className="booking-success-actions">
              <button
                type="button"
                className="booking-submit-btn booking-success-btn"
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
                  <span>{submitError}</span>
                </div>
              )}

              {/* Card 1: Event Details */}
              <EventDetails
                formData={formData}
                handleChange={handleChange}
                onDateChange={(val) => {
                  setFormData((prev) => ({ ...prev, event_date: val }));
                  if (fieldError.field === 'eventDateTimeSection') {
                    setFieldError({ field: '', message: '' });
                  }
                }}
                onTimeChange={(val) => {
                  setFormData((prev) => ({ ...prev, event_time: val }));
                  if (fieldError.field === 'eventDateTimeSection') {
                    setFieldError({ field: '', message: '' });
                  }
                }}
                unavailableDates={unavailableDates}
                onMonthChange={handleMonthChange}
                isLoadingAvailability={availabilityLoading}
                availabilityError={availabilityError}
                fieldError={fieldError}
                onFocusField={handleFocusField}
              />

              {/* Card 2: Event Location */}
              <EventLocation
                formData={formData}
                setFormData={setFormData}
                fieldError={fieldError}
                onFocusField={handleFocusField}
              />

              {/* Card 3: Contact & Performance Requirements */}
              <PerformanceRequirements
                formData={formData}
                handleChange={handleChange}
                fieldError={fieldError}
                onFocusField={handleFocusField}
              />

              {/* Submit Button */}
              <div className="booking-submit-wrapper">
                <button
                  type="submit"
                  className="booking-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting Request...' : 'Send Booking Request'}
                </button>
                <div className="booking-required-notice">* Required fields</div>
              </div>
            </form>

            {/* Right Column: Artist Card, Booking Summary, Next Steps */}
            <BookingSummary
              artist={currentArtist}
              formData={formData}
            />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
