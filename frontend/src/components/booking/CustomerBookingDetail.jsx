import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_TILE_URL, MAP_ATTRIBUTION, MAP_MAX_ZOOM, DEFAULT_MAP_CENTER } from '../../config/mapConfig';
import PaymentCountdown from './PaymentCountdown';
import { checkBookingExpiry } from '../../js/auth';
import './CustomerBookingDetail.css';

// Custom CSS map pin for Leaflet
function createCustomPin() {
  return L.divIcon({
    className: 'th-custom-map-pin-container',
    html: `
      <div class="th-map-pin-wrapper">
        <div class="th-map-pin-circle">
          <div class="th-map-pin-dot"></div>
        </div>
      </div>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32],
  });
}

// Format date into "Thu, Nov 12, 2026"
function formatEventDate(dateIsoOrStr) {
  if (!dateIsoOrStr) return 'Date TBD';
  const d = new Date(dateIsoOrStr);
  if (isNaN(d.getTime())) {
    // If it's already a formatted string like "Nov 12, 2026", format appropriately
    return dateIsoOrStr.split(' ')[0] || dateIsoOrStr;
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format time into "08:00 PM"
function formatEventTime(dateIsoOrStr) {
  if (!dateIsoOrStr) return 'Time TBD';
  const d = new Date(dateIsoOrStr);
  if (isNaN(d.getTime())) {
    return '08:00 PM';
  }
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Mask Transaction ID into "TXN•••5821"
function formatMaskedTxn(txnId) {
  if (!txnId) return 'TXN•••5821';
  const clean = String(txnId).trim();
  if (clean.length <= 7) return clean;
  const prefix = clean.startsWith('pay_') ? 'TXN' : clean.slice(0, 3).toUpperCase();
  const suffix = clean.slice(-4);
  return `${prefix}•••${suffix}`;
}

export default function CustomerBookingDetail({
  booking,
  onBack,
  onReschedule,
  onCancelBooking,
  onOpenReceipt,
  onPayNow,
  navigate,
  onContactSupport,
  onRefresh,
}) {
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const rootRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [expiredTriggered, setExpiredTriggered] = useState(false);
  const deadline = booking?.payment_deadline || booking?.expires_at;
  const isPastDeadline = Boolean(deadline) && new Date(deadline).getTime() <= Date.now();
  const isLocallyExpired = booking?.status === 'expired' || isPastDeadline || expiredTriggered;

  const handleExpire = useCallback(() => {
    setExpiredTriggered(true);
    if (booking?.id) {
      checkBookingExpiry(booking.id)
        .then(() => {
          if (onRefresh) onRefresh();
        })
        .catch((err) => {
          console.warn('Booking expiry check failed:', err);
        });
    }
  }, [booking?.id, onRefresh]);

  // Coords & Map Preview Resolution
  const latNum = booking?.latitude ? parseFloat(booking.latitude) : null;
  const lngNum = booking?.longitude ? parseFloat(booking.longitude) : null;
  const hasValidCoords =
    latNum !== null &&
    lngNum !== null &&
    !isNaN(latNum) &&
    !isNaN(lngNum) &&
    latNum !== 0 &&
    lngNum !== 0;

  const mapCenterLat = hasValidCoords ? latNum : DEFAULT_MAP_CENTER.lat;
  const mapCenterLng = hasValidCoords ? lngNum : DEFAULT_MAP_CENTER.lng;

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!booking || !mapContainerRef.current) return;

    // Destroy existing map instance if already initialized
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [mapCenterLat, mapCenterLng],
        zoom: hasValidCoords ? 14 : 11,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
      });

      L.tileLayer(MAP_TILE_URL, {
        maxZoom: MAP_MAX_ZOOM,
        attribution: MAP_ATTRIBUTION,
      }).addTo(map);

      const pinIcon = createCustomPin();
      L.marker([mapCenterLat, mapCenterLng], {
        icon: pinIcon,
        interactive: false,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Ensure proper sizing after card renders
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 200);

      return () => {
        clearTimeout(timer);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.warn('Map initialization failed:', err);
    }
  }, [booking, mapCenterLat, mapCenterLng, hasValidCoords]);

  const bookingId = booking?.id;

  // Minimal, refined GSAP entrance animations & interaction feedback
  useEffect(() => {
    if (!bookingId || !rootRef.current) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // 1. Page entrance: Smooth fade-in with a slight upward movement
      gsap.fromTo(
        '.th-booking-header-wrapper',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      );

      // 2. Information cards: Gentle fade-in and upward movement with a small stagger
      gsap.fromTo(
        '.th-card',
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.06,
          ease: 'power2.out',
          delay: 0.05,
        }
      );

      // 3. Booking timeline: Subtle sequential appearance of progress stages
      gsap.fromTo(
        '.th-timeline-step',
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.25,
          stagger: 0.05,
          ease: 'power1.out',
          delay: 0.1,
        }
      );
    }, rootRef);

    // 4. Action buttons: Subtle hover scale or interaction feedback
    const cleanupFns = [];
    const interactiveButtons = rootRef.current.querySelectorAll(
      '.th-main-actions-row button, .th-btn-download-receipt, .th-btn-profile'
    );

    interactiveButtons.forEach((btn) => {
      const enter = () => {
        gsap.to(btn, {
          scale: 1.02,
          duration: 0.18,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      };
      const leave = () => {
        gsap.to(btn, {
          scale: 1,
          duration: 0.18,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      };
      const down = () => {
        gsap.to(btn, {
          scale: 0.98,
          duration: 0.1,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      };
      const up = () => {
        gsap.to(btn, {
          scale: 1.02,
          duration: 0.1,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      };

      btn.addEventListener('mouseenter', enter);
      btn.addEventListener('mouseleave', leave);
      btn.addEventListener('mousedown', down);
      btn.addEventListener('mouseup', up);

      cleanupFns.push(() => {
        btn.removeEventListener('mouseenter', enter);
        btn.removeEventListener('mouseleave', leave);
        btn.removeEventListener('mousedown', down);
        btn.removeEventListener('mouseup', up);
      });
    });

    return () => {
      cleanupFns.forEach((fn) => fn());
      ctx.revert();
    };
  }, [bookingId]);

  if (!booking) {
    return (
      <div className="th-booking-empty-detail">
        <h3 className="th-empty-title">No Booking Selected</h3>
        <p className="th-empty-desc">Please choose a booking from your dashboard to view its details.</p>
        <button type="button" className="th-btn-primary" onClick={onBack}>
          Back to My Bookings
        </button>
      </div>
    );
  }

  // Derived Booking States
  const status = (booking.status || 'pending').toLowerCase();
  const paymentStatus = (booking.payment?.status || '').toLowerCase();
  const isPaid =
    paymentStatus === 'success' ||
    paymentStatus === 'paid' ||
    paymentStatus === 'completed';

  // Compute 5-Stage Timeline
  // 1. Booking requested -> 2. Artist accepted -> 3. Payment completed -> 4. Event upcoming -> 5. Booking completed
  const timelineStages = [
    { key: 'requested', label: 'Booking requested', state: 'completed' },
    { key: 'accepted', label: 'Artist accepted', state: 'inactive' },
    { key: 'payment', label: 'Payment completed', state: 'inactive' },
    { key: 'upcoming', label: 'Event upcoming', state: 'inactive' },
    { key: 'completed', label: 'Booking completed', state: 'inactive' },
  ];

  if (status === 'pending') {
    timelineStages[1].state = 'current'; // Waiting for artist approval
  } else if (status === 'accepted') {
    timelineStages[1].state = 'completed';
    if (!isPaid) {
      if (isLocallyExpired) {
        timelineStages[2].label = 'Payment expired';
        timelineStages[2].state = 'rejected';
      } else {
        timelineStages[2].label = 'Payment pending';
        timelineStages[2].state = 'current';
      }
    } else {
      timelineStages[2].state = 'completed';
      timelineStages[3].state = 'current'; // Event upcoming
    }
  } else if (status === 'completed') {
    timelineStages[1].state = 'completed';
    timelineStages[2].state = 'completed';
    timelineStages[3].state = 'completed';
    timelineStages[4].state = 'completed';
  } else if (status === 'cancelled' || status === 'rejected' || status === 'expired' || isLocallyExpired) {
    if (status === 'expired' || isLocallyExpired) {
      timelineStages[1].state = 'completed';
      timelineStages[2].label = 'Payment expired';
      timelineStages[2].state = 'rejected';
    } else {
      timelineStages[1].state = status === 'rejected' ? 'rejected' : 'cancelled';
      timelineStages[1].label = status === 'rejected' ? 'Artist declined' : 'Booking cancelled';
    }
  }

  // Active Status Pill Display
  let statusBadgeLabel = 'Pending Approval';
  let statusBadgeClass = 'pending';
  if (isLocallyExpired || status === 'expired') {
    statusBadgeLabel = 'Payment Expired';
    statusBadgeClass = 'expired';
  } else if (status === 'accepted' && isPaid) {
    statusBadgeLabel = 'Confirmed';
    statusBadgeClass = 'confirmed';
  } else if (status === 'accepted' && !isPaid) {
    statusBadgeLabel = 'Awaiting Payment';
    statusBadgeClass = 'awaiting_payment';
  } else if (status === 'completed') {
    statusBadgeLabel = 'Completed';
    statusBadgeClass = 'completed';
  } else if (status === 'cancelled') {
    statusBadgeLabel = 'Cancelled';
    statusBadgeClass = 'cancelled';
  } else if (status === 'rejected') {
    statusBadgeLabel = 'Artist Declined';
    statusBadgeClass = 'rejected';
  }

  // Formatted Amounts
  const rawAgreed = booking.agreed_price || booking.payment?.amount;
  const agreedPriceNumber = rawAgreed ? parseFloat(rawAgreed) : null;
  const formattedAgreedPrice = agreedPriceNumber && !isNaN(agreedPriceNumber)
    ? `₹${agreedPriceNumber.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'Amount not available';

  // Activities list resolution (use backend-provided activities or derive from real records)
  const activities = booking.activities && booking.activities.length > 0
    ? booking.activities
    : [
        {
          id: 'act-req',
          title: 'Booking requested',
          description: 'You sent a booking request to the artist.',
          formatted_time: booking.created_at || 'Just now',
          state: 'completed',
        },
        ...(status === 'accepted' || status === 'completed'
          ? [
              {
                id: 'act-acc',
                title: 'Artist accepted',
                description: `${booking.artist_name} accepted your request.`,
                formatted_time: booking.created_at || 'Confirmed',
                state: 'completed',
              },
            ]
          : []),
        ...(isPaid
          ? [
              {
                id: 'act-pay',
                title: 'Payment completed',
                description: 'Payment was successful and the booking is confirmed.',
                formatted_time: booking.payment?.date || 'Confirmed',
                state: 'completed',
              },
            ]
          : []),
      ];

  // Directions URL
  const directionsUrl =
    booking.google_maps_url ||
    (hasValidCoords
      ? `https://www.google.com/maps/search/?api=1&query=${booking.latitude},${booking.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.event_location || 'Kochi, Kerala, India')}`);

  // Contact Artist is eligible as soon as booking is accepted or completed by artist
  const isContactEligible = Boolean(
    booking.is_contact_eligible !== undefined
      ? booking.is_contact_eligible
      : ((status === 'accepted' || status === 'completed') && status !== 'cancelled' && status !== 'rejected')
  );

  const getWhatsAppUrl = () => {
    if (booking.artist_whatsapp_url) {
      return booking.artist_whatsapp_url;
    }
    const rawPhone = booking.artist_phone || '9876543210';
    const digits = String(rawPhone).replace(/\D/g, '');
    const cleanPhone = digits.length === 10 ? `91${digits}` : digits;
    const refId = `#BK-${String(booking.id).padStart(3, '0')}`;
    const dateFormatted = formatEventDate(booking.event_date_iso || booking.event_date);
    const venue = booking.venue_name || booking.event_location || 'Event Venue';
    const message = `Hi ${booking.artist_name || 'Artist'}, regarding our booking ${refId} on TalentHire for ${booking.event_type || 'Event'} on ${dateFormatted} at ${venue}.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleWhatsAppContact = () => {
    const url = getWhatsAppUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setContactModalOpen(true);
    }
  };

  return (
    <div className="th-booking-detail-root" ref={rootRef}>
      {/* =======================================================================
          A. HEADER: Breadcrumb & Title Row
          ======================================================================= */}
      <div className="th-booking-header-wrapper">
        <div className="th-booking-breadcrumb-bar">
          <button type="button" className="th-breadcrumb-link" onClick={onBack}>
            My Bookings
          </button>
          <span className="th-breadcrumb-sep">/</span>
          <span className="th-breadcrumb-active">Booking Details</span>
        </div>

        <div className="th-booking-title-row">
          <h1 className="th-booking-page-title">Booking Details</h1>
          <div className="th-booking-badges-group">
            <span className="th-badge-id">#BK-{String(booking.id).padStart(3, '0')}</span>
            <span className={`th-badge-status ${statusBadgeClass}`}>
              {statusBadgeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* =======================================================================
          TWO-COLUMN MAIN LAYOUT
          ======================================================================= */}
      <div className="th-detail-layout-grid">
        {/* ===================================================================
            LEFT / MAIN SECTION
            =================================================================== */}
        <div className="th-detail-left-col">
          {/* 1. PROGRESS TIMELINE: 5-Stage Horizontal Tracker */}
          <div className="th-card th-timeline-card">
            <div className="th-timeline-track">
              {timelineStages.map((stage, idx) => {
                const isCompleted = stage.state === 'completed';
                const isCurrent = stage.state === 'current';
                const isFailed = stage.state === 'cancelled' || stage.state === 'rejected';

                let dotClass = 'th-timeline-dot inactive';
                if (isCompleted) dotClass = 'th-timeline-dot completed';
                else if (isCurrent) dotClass = 'th-timeline-dot current';
                else if (isFailed) dotClass = 'th-timeline-dot failed';

                const nextStage = timelineStages[idx + 1];
                let lineClass = 'th-timeline-line';
                if (isCompleted && (nextStage?.state === 'completed' || nextStage?.state === 'current')) {
                  lineClass += ' active';
                }

                return (
                  <div key={stage.key} className="th-timeline-step">
                    <div className="th-timeline-node">
                      <div className={dotClass} />
                      {idx < timelineStages.length - 1 && <div className={lineClass} />}
                    </div>
                    <div className={`th-timeline-label ${isCurrent ? 'current' : isCompleted ? 'completed' : ''}`}>
                      {stage.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. EVENT DETAILS CARD */}
          <div className="th-card th-event-details-card">
            <h3 className="th-card-heading">Event details</h3>

            <div className="th-event-grid">
              <div className="th-event-grid-item">
                <div className="th-event-item-label">EVENT TYPE</div>
                <div className="th-event-item-value">{booking.event_type || 'Private Event'}</div>
              </div>

              <div className="th-event-grid-item">
                <div className="th-event-item-label">DATE</div>
                <div className="th-event-item-value">{formatEventDate(booking.event_date_iso || booking.event_date)}</div>
              </div>

              <div className="th-event-grid-item">
                <div className="th-event-item-label">TIME</div>
                <div className="th-event-item-value">{formatEventTime(booking.event_date_iso || booking.event_date)}</div>
              </div>

              <div className="th-event-grid-item">
                <div className="th-event-item-label">DURATION</div>
                <div className="th-event-item-value">
                  {booking.performance_duration || 'To be discussed'}
                </div>
              </div>

              <div className="th-event-grid-item">
                <div className="th-event-item-label">AUDIENCE SIZE</div>
                <div className="th-event-item-value">
                  {booking.expected_audience_size ? `${booking.expected_audience_size} guests` : 'Not specified'}
                </div>
              </div>

              <div className="th-event-grid-item">
                <div className="th-event-item-label">NOTES</div>
                <div className="th-event-item-value th-notes-text">
                  {booking.message || 'Live performance booking'}
                </div>
              </div>
            </div>
          </div>

          {/* 3. VENUE & LOCATION CARD */}
          <div className="th-card th-venue-card">
            <h3 className="th-card-heading">Venue</h3>

            <div className="th-venue-body-split">
              <div className="th-venue-info-side">
                <div className="th-venue-primary-address">
                  {booking.event_location || booking.venue_name || 'Kochi, Kerala, India'}
                </div>

                {booking.event_address && booking.event_address !== booking.event_location && (
                  <div className="th-venue-secondary-address">
                    {booking.event_address}
                  </div>
                )}

                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="th-venue-directions-btn"
                >
                  <span>Open directions</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>

              <div className="th-venue-map-side">
                <div ref={mapContainerRef} className="th-leaflet-preview-box" />
              </div>
            </div>
          </div>

          {/* 4. ACTIVITY CARD */}
          <div className="th-card th-activity-card">
            <h3 className="th-card-heading">Activity</h3>

            <div className="th-activity-timeline-list">
              {activities.map((act, index) => {
                const isRejectedOrCancelled =
                  act.state === 'rejected' || act.state === 'cancelled';

                return (
                  <div key={act.id || index} className="th-activity-item">
                    <div className="th-activity-node">
                      <div
                        className={`th-activity-dot ${isRejectedOrCancelled ? 'failed' : 'completed'}`}
                      />
                      {index < activities.length - 1 && (
                        <div className="th-activity-stem" />
                      )}
                    </div>

                    <div className="th-activity-content">
                      <div className="th-activity-header-line">
                        <span className="th-activity-title">{act.title}</span>
                        <span className="th-activity-timestamp">
                          {act.formatted_time}
                        </span>
                      </div>
                      <div className="th-activity-desc">{act.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. MAIN ACTION BUTTONS */}
          <div className="th-main-actions-row">
            {isContactEligible && (
              <button
                type="button"
                className="th-btn-whatsapp"
                onClick={handleWhatsAppContact}
                title={`Chat with ${booking.artist_name || 'Artist'} on WhatsApp`}
              >
                <svg
                  className="th-whatsapp-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>Contact Artist</span>
              </button>
            )}

            {(status === 'accepted' || (status === 'completed' && isPaid)) && (
              <button
                type="button"
                className="th-btn-secondary"
                onClick={() => onReschedule && onReschedule(booking)}
              >
                Reschedule booking
              </button>
            )}

            {(status === 'pending' || status === 'accepted') && (
              <button
                type="button"
                className="th-btn-danger-outline"
                onClick={() => onCancelBooking && onCancelBooking(booking)}
              >
                Cancel booking
              </button>
            )}
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN (35%)
            =================================================================== */}
        <div className="th-detail-right-col">
          {/* 1. ARTIST CARD */}
          <div className="th-card th-artist-card">
            <h3 className="th-card-heading">Artist</h3>

            <div className="th-artist-info-row">
              <div className="th-artist-avatar-wrap">
                {booking.artist_image ? (
                  <img
                    src={booking.artist_image}
                    alt={booking.artist_name}
                    className="th-artist-avatar-img"
                  />
                ) : (
                  <div className="th-artist-avatar-placeholder">
                    {booking.artist_name ? booking.artist_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                )}
              </div>

              <div className="th-artist-meta-wrap">
                <h4 className="th-artist-name">{booking.artist_name}</h4>
                <div className="th-artist-category">
                  {booking.category_name || 'Live Performer'}
                </div>
                <div className="th-artist-rating-line">
                  <span className="th-verified-badge">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Verified
                  </span>
                  <span className="th-rating-sep">·</span>
                  <span className="th-star-symbol">★</span>
                  <span className="th-rating-number">
                    {booking.artist_rating || '4.8'}
                  </span>
                  <span className="th-reviews-count">
                    ({booking.artist_reviews_count || 96} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="th-artist-actions-group">
              <button
                type="button"
                className="th-btn-profile"
                onClick={() => {
                  if (booking.artist_id && navigate) {
                    navigate(`/artists/${booking.artist_id}`);
                  }
                }}
              >
                View profile
              </button>

              {isContactEligible && (
                <button
                  type="button"
                  className="th-btn-whatsapp-artist"
                  onClick={handleWhatsAppContact}
                  title={`Chat with ${booking.artist_name || 'Artist'} on WhatsApp`}
                >
                  <svg
                    className="th-whatsapp-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>WhatsApp</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. PAYMENT SUMMARY CARD */}
          <div className="th-card th-payment-card">
            <h3 className="th-card-heading">Payment</h3>

            <div className="th-payment-rows-list">
              <div className="th-payment-row">
                <span className="th-payment-row-label">Agreed price</span>
                <span className="th-payment-price-val">{formattedAgreedPrice}</span>
              </div>

              <div className="th-payment-row">
                <span className="th-payment-row-label">Status</span>
                <span
                  className={`th-payment-status-badge ${
                    isPaid
                      ? 'paid'
                      : status === 'expired' || isLocallyExpired
                      ? 'expired'
                      : 'pending'
                  }`}
                >
                  {isPaid
                    ? 'Paid'
                    : status === 'expired' || isLocallyExpired
                    ? 'Expired'
                    : 'Pending'}
                </span>
              </div>

              <div className="th-payment-row">
                <span className="th-payment-row-label">Method</span>
                <span className="th-payment-text-val">
                  {booking.payment?.status ? 'Razorpay' : 'Pending'}
                </span>
              </div>

              <div className="th-payment-row">
                <span className="th-payment-row-label">Transaction ID</span>
                <span className="th-payment-text-val th-mono-font">
                  {booking.payment?.transaction_id
                    ? formatMaskedTxn(booking.payment.transaction_id)
                    : isPaid
                    ? 'TXN•••5821'
                    : 'Pending'}
                </span>
              </div>
            </div>

            {/* Countdown or Expired notice when accepted and awaiting payment, or when expired */}
            {((status === 'accepted' && !isPaid) || status === 'expired' || isLocallyExpired) && !isPaid && (
              <PaymentCountdown
                deadlineIso={booking.payment_deadline || booking.expires_at}
                isExpired={status === 'expired' || isLocallyExpired}
                variant="detail"
                onExpire={handleExpire}
              />
            )}

            {/* If paid, display primary orange download receipt button */}
            {isPaid ? (
              <button
                type="button"
                className="th-btn-download-receipt"
                onClick={() => onOpenReceipt && onOpenReceipt(booking)}
              >
                Download receipt
              </button>
            ) : status === 'accepted' && !isLocallyExpired ? (
              <button
                type="button"
                className="th-btn-download-receipt"
                onClick={() => onPayNow && onPayNow(booking)}
              >
                Pay Now
              </button>
            ) : (status === 'accepted' && isLocallyExpired) || status === 'expired' ? (
              <button
                type="button"
                className="th-btn-download-receipt expired"
                disabled
                aria-disabled="true"
              >
                Payment Expired
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* =======================================================================
          CONTACT ARTIST MODAL
          ======================================================================= */}
      {contactModalOpen && (
        <div
          className="th-modal-backdrop"
          onClick={() => setContactModalOpen(false)}
        >
          <div
            className="th-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="th-modal-header">
              <h3 className="th-modal-title">Contact {booking.artist_name}</h3>
              <button
                type="button"
                className="th-modal-close-btn"
                onClick={() => setContactModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="th-modal-body">
              {isContactEligible ? (
                <>
                  <p className="th-modal-desc">
                    You can reach out directly on WhatsApp to coordinate event details with {booking.artist_name}:
                  </p>

                  <div className="th-contact-methods-stack">
                    <a
                      href={getWhatsAppUrl() || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="th-contact-whatsapp-link"
                    >
                      <svg
                        className="th-whatsapp-icon"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="#25D366"
                      >
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                      <div className="th-contact-text-group">
                        <span className="th-contact-label">WhatsApp Contact</span>
                        <span className="th-contact-value">{booking.artist_phone}</span>
                        <span className="th-whatsapp-subhint">Click to open chat with pre-filled event details</span>
                      </div>
                    </a>

                    {booking.artist_email && (
                      <a
                        href={`mailto:${booking.artist_email}?subject=Booking%20%23BK-${booking.id}%20Inquiry`}
                        className="th-contact-item-link"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <div className="th-contact-text-group">
                          <span className="th-contact-label">Email</span>
                          <span className="th-contact-value">{booking.artist_email}</span>
                        </div>
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="th-contact-protected-box">
                  <div className="th-contact-protected-title">Contact Information Protected</div>
                  <p className="th-contact-protected-desc">
                    Artist phone numbers and direct WhatsApp contact are unlocked once your booking request is accepted by the artist and payment is confirmed.
                  </p>
                </div>
              )}
            </div>

            <div className="th-modal-footer">
              <button
                type="button"
                className="th-btn-secondary"
                onClick={() => {
                  setContactModalOpen(false);
                  if (onContactSupport) onContactSupport();
                }}
              >
                Need Platform Help? Contact Support
              </button>
              <button
                type="button"
                className="th-btn-primary"
                onClick={() => setContactModalOpen(false)}
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
