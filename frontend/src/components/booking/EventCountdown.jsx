import { useState, useEffect } from "react";
import "../../css/EventCountdown.css";

/**
 * EventCountdown Component
 * Displays a live countdown (Days, Hours, Minutes, Seconds) until the event date & time
 * for confirmed, paid bookings (both Customer and Artist views).
 * Once the event date and time is reached or passed, dismisses the countdown completely (returns null).
 */
export default function EventCountdown({
  eventDate,
  variant = "banner", // "banner" | "pill" | "compact"
  title = "Upcoming Event Countdown",
  className = "",
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!eventDate) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [eventDate]);

  if (!eventDate) return null;

  const target = new Date(eventDate).getTime();
  if (isNaN(target)) return null;

  const diffMs = target - now;

  // Once the date and time of the event arrives or has passed, dismiss the countdown
  if (diffMs <= 0) {
    return null;
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");
  const timeText =
    days > 0
      ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
      : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  if (variant === "pill" || variant === "compact") {
    return (
      <div
        className={`th-event-countdown-pill ${className}`.trim()}
        title={`Live Countdown to Event: ${timeText}`}
      >
        <span className="th-event-pulse-dot" />
        <svg
          className="th-event-clock-icon"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="th-event-pill-text">Event in {timeText}</span>
      </div>
    );
  }

  return (
    <div
      className={`th-event-countdown-banner ${className}`.trim()}
      role="timer"
      aria-live="polite"
    >
      <div className="th-event-banner-header">
        <div className="th-event-banner-badge">
          <span className="th-event-pulse-dot" />
          <span className="th-event-badge-label">CONFIRMED &amp; PAID</span>
        </div>
        <div className="th-event-banner-title-wrap">
          <svg
            className="th-event-banner-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h4 className="th-event-banner-title">{title}</h4>
        </div>
      </div>

      <div className="th-event-timer-grid">
        {days > 0 && (
          <div className="th-event-timer-block">
            <span className="th-event-timer-num">{pad(days)}</span>
            <span className="th-event-timer-lbl">DAYS</span>
          </div>
        )}
        <div className="th-event-timer-block">
          <span className="th-event-timer-num">{pad(hours)}</span>
          <span className="th-event-timer-lbl">HOURS</span>
        </div>
        <div className="th-event-timer-sep">:</div>
        <div className="th-event-timer-block">
          <span className="th-event-timer-num">{pad(minutes)}</span>
          <span className="th-event-timer-lbl">MINS</span>
        </div>
        <div className="th-event-timer-sep">:</div>
        <div className="th-event-timer-block">
          <span className="th-event-timer-num">{pad(seconds)}</span>
          <span className="th-event-timer-lbl">SECS</span>
        </div>
      </div>

      <p className="th-event-banner-sub">
        Live event reminder: performance begins according to schedule. Both host and artist are notified.
      </p>
    </div>
  );
}
