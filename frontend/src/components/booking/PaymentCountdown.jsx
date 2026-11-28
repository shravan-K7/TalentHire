import { useState, useEffect, useRef } from "react";

/**
 * Hook for live 1-second interval countdown against backend deadline.
 */
function usePaymentCountdown(deadlineIso, onExpire) {
  const [now, setNow] = useState(() => Date.now());
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!deadlineIso) return;
    hasTriggeredRef.current = false;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineIso]);

  const target = deadlineIso ? new Date(deadlineIso).getTime() : NaN;
  const isInvalid = !deadlineIso || isNaN(target);
  const diffMs = isInvalid ? null : target - now;

  useEffect(() => {
    if (diffMs !== null && diffMs <= 0 && onExpire && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      onExpire();
    }
  }, [diffMs, onExpire]);

  if (isInvalid) {
    return { isExpired: false, diffMs: null, text: "" };
  }

  if (diffMs <= 0) {
    return {
      isExpired: true,
      diffMs: 0,
      text: "00h 00m 00s",
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const text = `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;

  return { isExpired: false, diffMs, text, hours, minutes, seconds };
}

export default function PaymentCountdown({
  deadlineIso,
  isExpired: initialExpired = false,
  onExpire,
  variant = "detail",
}) {
  const countdown = usePaymentCountdown(deadlineIso, onExpire);
  const isExpired = initialExpired || countdown.isExpired;

  if (variant === "compact") {
    if (isExpired) {
      return (
        <div className="th-booking-countdown-pill expired">
          <span className="th-countdown-compact-text">Payment Expired</span>
        </div>
      );
    }

    if (!countdown.text) return null;

    return (
      <div className="th-booking-countdown-pill active">
        <span className="th-countdown-pulse-dot" />
        <span className="th-countdown-compact-text">Pay within {countdown.text}</span>
      </div>
    );
  }

  // Default "detail" variant for Booking Details Payment card
  if (isExpired) {
    return (
      <div className="th-payment-countdown-card expired" role="alert">
        <div className="th-payment-countdown-header">
          <span className="th-payment-countdown-label-expired">Payment Expired</span>
        </div>
        <p className="th-payment-countdown-note-expired">
          Payment deadline expired. This booking is no longer available for payment.
        </p>
      </div>
    );
  }

  if (!countdown.text) return null;

  return (
    <div className="th-payment-countdown-card active" aria-live="polite">
      <div className="th-payment-countdown-header">
        <span className="th-payment-countdown-label">Payment Deadline</span>
        <span className="th-payment-countdown-timer">{countdown.text}</span>
      </div>
      <p className="th-payment-countdown-note">
        Complete your payment within 24 hours.
      </p>
    </div>
  );
}
