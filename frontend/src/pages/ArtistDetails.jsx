import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchArtistDetail, createBooking } from '../js/auth';
import '../css/Artists.css';

const MIN_BOOKING_DATE = new Date().toISOString().split('T')[0];

function ArtistDetails({ artistId, user, onLogout, navigate }) {
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    event_type: 'Wedding',
    event_date: '',
    event_location: '',
    agreed_price: '',
    message: '',
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadArtist() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchArtistDetail(artistId);
        if (!ignore) {
          setArtist(data);
          setBookingForm((prev) => ({
            ...prev,
            agreed_price: data.starting_price || '',
            event_location: data.location || '',
          }));
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Could not load artist profile.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (artistId) {
      loadArtist();
    }

    return () => {
      ignore = true;
    };
  }, [artistId]);

  function handleBookingChange(e) {
    const { name, value } = e.target;
    setBookingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleBookingSubmit(e) {
    e.preventDefault();
    if (!user) {
      if (navigate) {
        navigate('/login');
      } else {
        window.location.href = '/login';
      }
      return;
    }

    setBookingLoading(true);
    setBookingSuccess('');
    setBookingError('');

    try {
      const res = await createBooking({
        artist_id: artist.id,
        event_type: bookingForm.event_type,
        event_date: bookingForm.event_date,
        event_location: bookingForm.event_location,
        agreed_price: bookingForm.agreed_price,
        message: bookingForm.message,
      });

      setBookingSuccess(res.message || 'Booking request submitted successfully!');
      setTimeout(() => {
        setShowBookingModal(false);
        setBookingSuccess('');
      }, 3000);
    } catch (err) {
      setBookingError(err.message || 'Could not submit booking request.');
    } finally {
      setBookingLoading(false);
    }
  }

  const isOwner = user && artist && user.artist_profile && user.artist_profile.id === artist.id;

  return (
    <div className="artists-container">
      <Navbar user={user} onLogout={onLogout} currentPath="/artists" navigate={navigate} />

      <main className="artists-main">
        {/* Top Back Navigation Bar */}
        <div className="detail-back-bar">
          <button
            type="button"
            className="detail-back-btn"
            onClick={() => (navigate ? navigate('/artists') : (window.location.href = '/artists'))}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to All Artists
          </button>
        </div>

        {error && (
          <div className="auth-alert-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#A0A0A0' }}>
            <p>Loading artist profile...</p>
          </div>
        ) : !artist ? (
          <div className="artists-empty-state">
            <h3 className="artists-empty-title">Artist Not Found</h3>
            <p>The requested artist profile does not exist or is currently inactive.</p>
            <button
              type="button"
              className="artist-view-btn"
              onClick={() => (navigate ? navigate('/artists') : (window.location.href = '/artists'))}
            >
              Browse All Artists
            </button>
          </div>
        ) : (
          <div className="artist-detail-page">
            {/* Hero Header */}
            <header className="artist-detail-hero">
              {artist.profile_image ? (
                <img
                  src={artist.profile_image}
                  alt={artist.stage_name}
                  className="detail-hero-avatar"
                />
              ) : (
                <div className="detail-avatar-fallback">
                  {artist.stage_name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="detail-hero-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="artist-category-pill">
                    {artist.category_name || 'Performing Artist'}
                  </span>
                  {artist.is_verified && (
                    <span className="artist-verified-pill">Verified Performer</span>
                  )}
                  {artist.average_rating > 0 && (
                    <span style={{ fontSize: '0.8rem', background: 'rgba(255, 235, 59, 0.15)', color: '#FFEB3B', padding: '3px 10px', borderRadius: '9999px', fontWeight: 700 }}>
                      ★ {artist.average_rating} ({artist.total_reviews} reviews)
                    </span>
                  )}
                </div>

                <h1 className="detail-hero-name">{artist.stage_name}</h1>

                <div className="detail-meta-row">
                  <div className="detail-meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{artist.location || 'India'}</span>
                  </div>

                  <div className="detail-meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span>Travel: {artist.travel_availability_display || artist.travel_availability}</span>
                  </div>

                  <div className="detail-meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span>{artist.years_of_experience} Years Stage Experience</span>
                  </div>

                  {artist.gender && (
                    <div className="detail-meta-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
                      </svg>
                      <span>Gender: {artist.gender === 'female' ? 'Female' : artist.gender === 'male' ? 'Male' : 'Other'}</span>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Main Content & Sidebar Grid */}
            <div className="detail-layout-grid">
              <div className="detail-main-col">
                {/* About Section */}
                <section className="detail-section-card">
                  <h2 className="detail-section-title">About the Performer</h2>
                  <p className="detail-bio-text">
                    {artist.bio || 'Professional stage talent available for live events, private receptions, and festivals.'}
                  </p>
                </section>

                {/* Performance Types Section */}
                {artist.performance_types && artist.performance_types.length > 0 && (
                  <section className="detail-section-card">
                    <h2 className="detail-section-title">Performance Formats & Event Types</h2>
                    <div className="artist-card-performance-types" style={{ gap: 10 }}>
                      {artist.performance_types.map((type) => (
                        <span key={type} className="perf-type-tag" style={{ fontSize: '0.88rem', padding: '6px 14px' }}>
                          {type}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Portfolio & Video Reel */}
                <section className="detail-section-card">
                  <h2 className="detail-section-title">Portfolio & Live Video Reel</h2>
                  {artist.portfolio_url ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <p style={{ margin: 0, color: '#A0A0A0', fontSize: '0.94rem' }}>
                        Watch live performance highlights, audio recordings, and concert clips:
                      </p>
                      <a
                        href={artist.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="detail-back-btn"
                        style={{ alignSelf: 'flex-start', color: '#FF5722', borderColor: '#FF5722', textDecoration: 'none' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                        <span>Open Live Portfolio Reel ({artist.portfolio_url})</span>
                      </a>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: '#777', fontSize: '0.92rem' }}>
                      No direct external portfolio reel link provided yet. Inquire directly for private audition recordings.
                    </p>
                  )}

                  {artist.portfolio_items && artist.portfolio_items.length > 0 && (
                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <h3 style={{ fontSize: '1.05rem', color: '#F7F7F7', margin: 0 }}>Roster Highlights:</h3>
                      {artist.portfolio_items.map((item) => (
                        <div key={item.id} style={{ background: '#181818', padding: '12px 16px', borderRadius: 8, border: '1px solid #333' }}>
                          <strong style={{ display: 'block', color: '#F7F7F7' }}>{item.title}</strong>
                          <p style={{ margin: '4px 0 0', color: '#A0A0A0', fontSize: '0.88rem' }}>{item.description}</p>
                          {item.media_url && (
                            <a href={item.media_url} target="_blank" rel="noopener noreferrer" style={{ color: '#FFEB3B', fontSize: '0.82rem', marginTop: 4, display: 'inline-block' }}>
                              View Media
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Additional Information Section */}
                {artist.additional_information && (
                  <section className="detail-section-card">
                    <h2 className="detail-section-title">Equipment & Technical Requirements</h2>
                    <p className="detail-bio-text" style={{ fontSize: '0.96rem', color: '#B0B0B0' }}>
                      {artist.additional_information}
                    </p>
                  </section>
                )}

                {/* Reviews Section */}
                {artist.reviews && artist.reviews.length > 0 && (
                  <section className="detail-section-card">
                    <h2 className="detail-section-title">Client Reviews & Testimonials</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {artist.reviews.map((rev) => (
                        <div key={rev.id} style={{ borderBottom: '1px solid #333', paddingBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#F7F7F7' }}>{rev.customer_name}</strong>
                            <span style={{ color: '#FFEB3B', fontWeight: 700 }}>★ {rev.rating}/5</span>
                          </div>
                          <p style={{ margin: '6px 0 0', color: '#B0B0B0', fontSize: '0.92rem' }}>{rev.comment}</p>
                          <small style={{ color: '#666', fontSize: '0.78rem' }}>{rev.created_at}</small>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar Booking & Pricing Card */}
              <aside className="detail-booking-card">
                <div className="pricing-highlight">
                  <span className="pricing-highlight-label">Event Performance Fee</span>
                  <div className="pricing-highlight-val">
                    ₹{Number(artist.starting_price).toLocaleString('en-IN')}
                  </div>
                  <span className="pricing-highlight-note">
                    Transparent starting rate per event. Final quote depends on duration and location.
                  </span>
                </div>

                <div className="booking-perks">
                  <div className="booking-perk-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>100% Verified Stage Performer</span>
                  </div>

                  <div className="booking-perk-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Zero Middleman Markups</span>
                  </div>

                  <div className="booking-perk-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Direct Artist Communication</span>
                  </div>
                </div>

                {isOwner ? (
                  <button
                    type="button"
                    className="btn-book-artist"
                    style={{ background: '#673AB7' }}
                    onClick={() => (navigate ? navigate('/artist-register') : (window.location.href = '/artist-register'))}
                  >
                    Edit My Artist Profile
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-book-artist"
                    onClick={() => {
                      if (!user) {
                        if (navigate) {
                          navigate('/login');
                        }
                      } else {
                        setShowBookingModal(true);
                      }
                    }}
                  >
                    {user ? 'Request to Book Artist' : 'Sign In to Book'}
                  </button>
                )}
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {showBookingModal && artist && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Book {artist.stage_name}</h2>
                <p className="modal-subtitle">Submit event details to receive booking confirmation and schedule.</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowBookingModal(false)}
                aria-label="Close booking modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {bookingError && (
              <div className="auth-alert-error" role="alert">
                {bookingError}
              </div>
            )}

            {bookingSuccess && (
              <div className="auth-alert-status" role="status">
                {bookingSuccess}
              </div>
            )}

            <form className="auth-form" onSubmit={handleBookingSubmit}>
              <div className="form-field">
                <label htmlFor="modalEventType">Event Type *</label>
                <select
                  id="modalEventType"
                  name="event_type"
                  className="filter-select"
                  value={bookingForm.event_type}
                  onChange={handleBookingChange}
                  required
                  style={{ padding: '12px 14px' }}
                >
                  <option value="Wedding">Wedding Celebration</option>
                  <option value="Corporate Event">Corporate Summit / Gala</option>
                  <option value="Private Party">Private Party / Birthday</option>
                  <option value="Festival">Music / Cultural Festival</option>
                  <option value="Sangeet / Reception">Sangeet / Reception</option>
                  <option value="Other">Other Event</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="modalEventDate">Event Date *</label>
                <input
                  id="modalEventDate"
                  type="date"
                  name="event_date"
                  value={bookingForm.event_date}
                  onChange={handleBookingChange}
                  required
                  min={MIN_BOOKING_DATE}
                  style={{ background: '#181818', color: '#F7F7F7', border: '1px solid #363636', borderRadius: 8, padding: '12px' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="modalEventLocation">Event Location / Venue *</label>
                <input
                  id="modalEventLocation"
                  type="text"
                  name="event_location"
                  value={bookingForm.event_location}
                  onChange={handleBookingChange}
                  placeholder="e.g. Grand Hyatt, Mumbai"
                  required
                  style={{ background: '#181818', color: '#F7F7F7', border: '1px solid #363636', borderRadius: 8, padding: '12px' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="modalAgreedPrice">Offered / Starting Budget (₹)</label>
                <input
                  id="modalAgreedPrice"
                  type="number"
                  name="agreed_price"
                  value={bookingForm.agreed_price}
                  onChange={handleBookingChange}
                  min="0"
                  step="100"
                  style={{ background: '#181818', color: '#F7F7F7', border: '1px solid #363636', borderRadius: 8, padding: '12px' }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="modalMessage">Message or Special Requests</label>
                <textarea
                  id="modalMessage"
                  name="message"
                  value={bookingForm.message}
                  onChange={handleBookingChange}
                  rows={3}
                  placeholder="Estimated guest count, performance duration, specific song requests..."
                  style={{ background: '#181818', color: '#F7F7F7', border: '1px solid #363636', borderRadius: 8, padding: '12px' }}
                />
              </div>

              <button
                type="submit"
                className="btn-book-artist"
                disabled={bookingLoading}
              >
                {bookingLoading ? 'Submitting Request...' : 'Confirm & Send Booking Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default ArtistDetails;
