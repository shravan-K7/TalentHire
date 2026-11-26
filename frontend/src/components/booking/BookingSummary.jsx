function format12Hour(timeStr) {
  if (!timeStr) return '';
  const [hh, mm] = timeStr.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const mmPadded = String(mm || 0).padStart(2, '0');
  return `${h12}:${mmPadded} ${period}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

export default function BookingSummary({ artist, formData }) {
  const currentArtist = artist || {};
  const stageName = currentArtist.stage_name
    ? currentArtist.stage_name.replace(/\s*\([^)]*\)/, '')
    : 'Selected Artist';

  const category =
    currentArtist.category_name ||
    (currentArtist.category && currentArtist.category.name) ||
    'Performer';

  const location = currentArtist.location || 'India';
  const startingPrice = currentArtist.starting_price
    ? Number(currentArtist.starting_price).toLocaleString('en-IN')
    : null;

  // Formatted date and time string
  const dateFormatted = formatDisplayDate(formData.event_date);
  const timeFormatted = format12Hour(formData.event_time);
  const dateTimeString = [dateFormatted, timeFormatted].filter(Boolean).join(' • ') || '—';

  // Budget display
  const budgetValue = formData.budget
    ? `₹${Number(formData.budget).toLocaleString('en-IN')}`
    : startingPrice
    ? `₹${startingPrice}`
    : '—';

  return (
    <aside className="booking-sidebar">
      {/* 1. Artist Card */}
      <div className="booking-artist-card">
        <div className="booking-artist-top">
          <div className="booking-artist-avatar-wrap">
            {currentArtist.profile_image ? (
              <img
                src={currentArtist.profile_image}
                alt={stageName}
                className="booking-artist-avatar-img"
              />
            ) : (
              <div className="booking-artist-avatar-placeholder">
                [photo]
              </div>
            )}
          </div>
          <div className="booking-artist-meta">
            <h3 className="booking-artist-name">{stageName}</h3>
            <p className="booking-artist-cat">{category}</p>
          </div>
        </div>

        <div className="booking-artist-divider" />

        <div className="booking-artist-stats-row">
          <div className="booking-artist-stat">
            <span className="booking-artist-stat-label">Location</span>
            <span className="booking-artist-stat-val">{location}</span>
          </div>
          <div className="booking-artist-stat text-right">
            <span className="booking-artist-stat-label">Starting price</span>
            <span className="booking-artist-price-val">
              {startingPrice ? `₹${startingPrice}` : 'On Request'}
            </span>
          </div>
        </div>

        <div className="booking-artist-travel-box">
          <div className="booking-artist-travel-icon-wrap" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
          </div>
          <div className="booking-artist-travel-info">
            <span className="booking-artist-travel-label">Travel availability</span>
            <span className="booking-artist-travel-val">
              {(() => {
                const rawTravel = currentArtist.travel_availability_display || currentArtist.travel_availability || 'Across my state';
                return (currentArtist.travel_availability === 'city' || rawTravel.toLowerCase() === 'within my city') && currentArtist.location
                  ? `${rawTravel} (${currentArtist.location})`
                  : rawTravel;
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Live Booking Summary Card */}
      <div className="booking-summary-card">
        <h3 className="booking-summary-title">Booking summary</h3>

        <div className="booking-summary-list">
          <div className="booking-summary-row is-datetime">
            <span className="booking-summary-label">Date &amp; Time</span>
            <span className="booking-summary-value">{dateTimeString}</span>
          </div>

          <div className="booking-summary-row">
            <span className="booking-summary-label">Event type</span>
            <span className="booking-summary-value">{formData.event_type || '—'}</span>
          </div>

          <div className="booking-summary-row">
            <span className="booking-summary-label">Location</span>
            <span className="booking-summary-value">{formData.event_area || '—'}</span>
          </div>

          <div className="booking-summary-row">
            <span className="booking-summary-label">Venue</span>
            <span className="booking-summary-value">{formData.venue_name || '—'}</span>
          </div>

          <div className="booking-summary-row">
            <span className="booking-summary-label">Duration</span>
            <span className="booking-summary-value">{formData.performance_duration || '—'}</span>
          </div>

          <div className="booking-summary-row">
            <span className="booking-summary-label">Audience size</span>
            <span className="booking-summary-value">{formData.expected_audience_size || '—'}</span>
          </div>

          <div className="booking-summary-row is-budget">
            <span className="booking-summary-label">Your budget</span>
            <span className="booking-summary-budget-value">{budgetValue}</span>
          </div>
        </div>
      </div>

      {/* 3. What Happens Next Card */}
      <div className="booking-next-card">
        <h3 className="booking-next-title">What happens next</h3>
        <ol className="booking-next-steps">
          <li className="booking-next-step-item">
            <span className="booking-next-step-num">1</span>
            <span className="booking-next-step-text">Artist reviews your request</span>
          </li>
          <li className="booking-next-step-item">
            <span className="booking-next-step-num">2</span>
            <span className="booking-next-step-text">They accept or decline</span>
          </li>
          <li className="booking-next-step-item">
            <span className="booking-next-step-num">3</span>
            <span className="booking-next-step-text">If accepted, you pay securely to confirm</span>
          </li>
        </ol>
      </div>
    </aside>
  );
}
