import { useEffect, useRef } from "react";
import "./BookingConfirmationModal.css";

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function format12Hour(timeStr) {
  if (!timeStr) return "";
  const [hh, mm] = timeStr.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const mmPadded = String(mm || 0).padStart(2, "0");
  return `${h12}:${mmPadded} ${period}`;
}

export default function BookingConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  artist,
  formData,
  isSubmitting,
  submitError,
  isSuccess,
  countdownSeconds = 3,
}) {
  const modalRef = useRef(null);

  // Close on Escape key (if not currently sending)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const currentArtist = artist || {};
  const stageName = currentArtist.stage_name
    ? currentArtist.stage_name.replace(/\s*\([^)]*\)/, "")
    : "Performer";

  const category =
    currentArtist.category_name ||
    (currentArtist.category && currentArtist.category.name) ||
    "Performing Artist";

  const location = currentArtist.location || "India";

  const dateFormatted = formatDisplayDate(formData.event_date);
  const timeFormatted = format12Hour(formData.event_time);
  const dateTimeDisplay = [dateFormatted, timeFormatted].filter(Boolean).join(" • ") || "—";

  const budgetDisplay = formData.budget
    ? `₹${Number(formData.budget).toLocaleString("en-IN")}`
    : currentArtist.starting_price
    ? `₹${Number(currentArtist.starting_price).toLocaleString("en-IN")}`
    : "₹5,000";

  const venueDisplay = formData.venue_name || "Venue to be confirmed";
  const areaDisplay = [formData.event_area, formData.city, formData.state]
    .filter(Boolean)
    .join(", ") || formData.event_address || "Location specified";

  return (
    <div
      className="bcm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bcmTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="bcm-modal" ref={modalRef}>
        {/* Loading / Progress State (During the 3 seconds sending flow) */}
        {isSubmitting ? (
          <div className="bcm-loading-wrap">
            {isSuccess ? (
              <div className="bcm-success-icon">✓</div>
            ) : (
              <div className="bcm-spinner" />
            )}

            <h3 className="bcm-loading-title">
              {isSuccess
                ? "Booking Request Sent!"
                : "Sending Booking Request..."}
            </h3>

            <p className="bcm-loading-desc">
              {isSuccess
                ? `Your booking request has been submitted to ${stageName}. Redirecting to your bookings dashboard...`
                : `Notifying ${stageName} and reserving your event slot.`}
            </p>

            <div className="bcm-progress-bar-wrap">
              <div className="bcm-progress-bar-fill" />
            </div>

            <div className="bcm-countdown-badge">
              {isSuccess
                ? "Redirecting now..."
                : `Submitting request... (${Math.max(1, countdownSeconds)}s remaining)`}
            </div>
          </div>
        ) : (
          /* Normal Confirmation Review Details State */
          <>
            {/* Modal Header */}
            <div className="bcm-header">
              <div>
                <h2 id="bcmTitle" className="bcm-title">
                  Confirm Booking Request
                </h2>
                <p className="bcm-subtitle">
                  Please review your booking details before sending the request to the performer.
                </p>
              </div>
              <button
                type="button"
                className="bcm-close-btn"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Close confirmation dialog"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="bcm-content-scroll">
              {submitError && (
                <div className="bcm-error-banner" role="alert">
                  {submitError}
                </div>
              )}

              {/* Artist Summary Card */}
              <div className="bcm-artist-strip">
                {currentArtist.profile_image ? (
                  <img
                    src={currentArtist.profile_image}
                    alt={stageName}
                    className="bcm-artist-avatar"
                  />
                ) : (
                  <div className="bcm-artist-avatar-fallback">
                    {stageName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="bcm-artist-info">
                  <h3 className="bcm-artist-name">{stageName}</h3>
                  <div className="bcm-artist-cat">{category}</div>
                  <div className="bcm-artist-loc">{location}</div>
                  <div className="bcm-artist-travel">
                    ✈ Travel: {currentArtist.travel_availability_display || currentArtist.travel_availability || 'Across my state'}
                  </div>
                </div>
              </div>

              {/* Booking Specifications Grid */}
              <div className="bcm-grid">
                <div className="bcm-item">
                  <span className="bcm-label">Event Type</span>
                  <span className="bcm-value">{formData.event_type || "Live Performance"}</span>
                </div>

                <div className="bcm-item">
                  <span className="bcm-label">Date &amp; Time</span>
                  <span className="bcm-value">{dateTimeDisplay}</span>
                </div>

                <div className="bcm-item">
                  <span className="bcm-label">Performance Duration</span>
                  <span className="bcm-value">{formData.performance_duration || "Standard"}</span>
                </div>

                <div className="bcm-item">
                  <span className="bcm-label">Expected Audience</span>
                  <span className="bcm-value">
                    {formData.expected_audience_size ? `${formData.expected_audience_size} guests` : "—"}
                  </span>
                </div>

                <div className="bcm-item full-width">
                  <span className="bcm-label">Venue &amp; Location</span>
                  <span className="bcm-value" style={{ display: "block" }}>
                    <strong>{venueDisplay}</strong>
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#A0A0AA", display: "block", marginTop: "2px" }}>
                    {areaDisplay}
                  </span>
                </div>

                <div className="bcm-item">
                  <span className="bcm-label">Contact Phone</span>
                  <span className="bcm-value">{formData.customer_phone || "—"}</span>
                </div>

                <div className="bcm-item">
                  <span className="bcm-label">Travel Availability</span>
                  <span className="bcm-value highlight-travel">
                    {currentArtist.travel_availability_display || currentArtist.travel_availability || "Across my state"}
                  </span>
                </div>

                <div className="bcm-item full-width">
                  <span className="bcm-label">Agreed / Offer Price</span>
                  <span className="bcm-value highlight-price">{budgetDisplay}</span>
                </div>

                {formData.additional_requirements && (
                  <div className="bcm-item full-width">
                    <span className="bcm-label">Special Notes / Requirements</span>
                    <div className="bcm-notes-box">
                      "{formData.additional_requirements.trim()}"
                    </div>
                  </div>
                )}
              </div>

              {/* Informational Notice */}
              <div className="bcm-notice">
                <strong>No payment required now.</strong> Your request will be sent directly to the artist. Once they accept, a 24-hour payment deadline countdown will start to finalize and confirm your booking.
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bcm-actions">
              <button
                type="button"
                className="bcm-btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Back to Edit
              </button>
              <button
                type="button"
                className="bcm-btn-primary"
                onClick={onConfirm}
                disabled={isSubmitting}
              >
                Send Booking Request
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
