import { useState, useMemo, useRef, useEffect } from "react";
import gsap from "gsap";
import "../../css/MyBookingsDashboard.css";

// Dynamic dark palette for artist initials fallback (deterministic hash by artist name/ID)
const AVATAR_PALETTE = [
  "#2B3A4E",
  "#3D2B56",
  "#562B2B",
  "#1F4242",
  "#2D4222",
  "#3E2723",
  "#263238",
  "#443525",
  "#1A365D",
  "#4A1D6D",
];

// Extract initials dynamically from real artist name
function getArtistInitials(artistName) {
  if (!artistName || typeof artistName !== "string") return "TH";
  const cleaned = artistName.trim().replace(/\s*\([^)]*\)/, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1) {
    const word = parts[0];
    const capMatches = word.match(/[A-Z]/g);
    if (capMatches && capMatches.length >= 2) {
      return (capMatches[0] + capMatches[1]).toUpperCase();
    }
    return word.substring(0, 2).toUpperCase();
  }
  return "TH";
}

// Generate deterministic avatar background from artist name / ID
function getAvatarBg(artistName = "", id = 0) {
  let hash = Number(id) || 0;
  const str = String(artistName || "");
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// Format real database booking ID
function formatBookingId(id) {
  if (!id) return "";
  return `#TH-${id}`;
}

// Clean and format real category name
function formatCategory(categoryName) {
  if (!categoryName) return "";
  return String(categoryName).trim();
}

// Format actual event date and time from backend values
function formatEventDateTime(eventDateStr, eventDateIso) {
  if (!eventDateStr && !eventDateIso) {
    return { date: "Date TBD", time: "", full: "Date TBD" };
  }
  try {
    const d = new Date(eventDateIso || eventDateStr);
    if (!isNaN(d.getTime())) {
      const datePart = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timePart = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return {
        date: datePart,
        time: timePart,
        full: `${datePart} · ${timePart}`,
      };
    }
  } catch {
    // fallback
  }

  if (eventDateStr && typeof eventDateStr === "string") {
    const parts = eventDateStr.split(/\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
    if (parts.length >= 2) {
      const datePart = parts[0].trim();
      let timePart = parts[1].trim().replace(/^0(\d:)/, "$1");
      return {
        date: datePart,
        time: timePart,
        full: `${datePart} · ${timePart}`,
      };
    }
    return { date: eventDateStr, time: "", full: eventDateStr };
  }

  return { date: "Date TBD", time: "", full: "Date TBD" };
}

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function checkIsEventToday(booking) {
  try {
    const today = new Date();
    if (booking.event_date_iso) {
      const d = new Date(booking.event_date_iso);
      if (!isNaN(d.getTime()) && isSameDay(d, today)) return true;
    }
    if (booking.event_date) {
      const d = new Date(booking.event_date);
      if (!isNaN(d.getTime()) && isSameDay(d, today)) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

// Calculate real remaining time from actual backend expiry timestamp
function formatReservationCountdown(expiresAtIso) {
  if (!expiresAtIso) return null;
  const expires = new Date(expiresAtIso).getTime();
  if (isNaN(expires)) return null;
  const now = Date.now();
  const diffMs = expires - now;
  if (diffMs <= 0) return "Reservation Expired";
  const totalSec = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) return `Expires in ${hours}h ${mins}m`;
  return `Expires in ${mins}m`;
}

/**
 * Resolves the payment / booking amount to display according to strict business rules:
 * 1. Payment Successful: Display the actual amount from payment.amount.
 * 2. Artist Accepted but Payment Pending: Display agreed_price as the payable booking amount
 *    strictly when booking status is 'accepted', payment is not completed, and agreed_price is valid positive amount.
 * 3. Ineligible booking states (pending approval, rejected, cancelled, expired, etc.): Do NOT present agreed_price.
 * 4. Payment Not Initiated and No Agreed Price: Display "Amount not available".
 * 5. Never use customer_budget as a paid amount or confirmed payable amount.
 */
function getBookingPaymentAmount(booking) {
  if (!booking) {
    return {
      hasAmount: false,
      amount: null,
      formatted: "Amount not available",
      paidText: "Amount not available",
    };
  }

  const paymentStatus = (booking.payment?.status || "").toLowerCase();
  const isPaid =
    paymentStatus === "success" ||
    paymentStatus === "paid" ||
    paymentStatus === "completed";

  // 1. Payment Successful: Display the actual amount from payment.amount
  if (isPaid) {
    const rawPaymentAmt = booking.payment?.amount;
    if (
      rawPaymentAmt !== undefined &&
      rawPaymentAmt !== null &&
      rawPaymentAmt !== "" &&
      !isNaN(Number(rawPaymentAmt))
    ) {
      const num = Number(rawPaymentAmt);
      return {
        hasAmount: true,
        amount: num,
        formatted: `₹${num.toLocaleString("en-IN")}`,
        paidText: `Paid: ₹${num.toLocaleString("en-IN")}`,
      };
    }
    // Payment marked success but amount missing from payment record
    return {
      hasAmount: false,
      amount: null,
      formatted: "Amount not available",
      paidText: "Amount not available",
    };
  }

  // 2. Artist Accepted but Payment Pending:
  // Only display booking.agreed_price as the payable amount when:
  // - Booking status is 'accepted'
  // - Payment has not been successfully completed (!isPaid)
  // - agreed_price is a valid positive amount (> 0)
  const status = (booking.status || "").toLowerCase();
  if (status === "accepted" && !isPaid) {
    const rawAgreed = booking.agreed_price;
    if (
      rawAgreed !== undefined &&
      rawAgreed !== null &&
      rawAgreed !== "" &&
      !isNaN(Number(rawAgreed))
    ) {
      const num = Number(rawAgreed);
      if (num > 0) {
        return {
          hasAmount: true,
          amount: num,
          formatted: `₹${num.toLocaleString("en-IN")}`,
          paidText: `₹${num.toLocaleString("en-IN")}`,
        };
      }
    }
  }

  // 3. For pending approval, rejected, cancelled, expired or other ineligible booking states,
  // do not present agreed_price as a payable amount. Display "Amount not available".
  // 4. Never use customer_budget.
  return {
    hasAmount: false,
    amount: null,
    formatted: "Amount not available",
    paidText: "Amount not available",
  };
}

// Dynamically compute booking card display state strictly from real database fields
function computeBookingState(booking) {
  const status = (booking.status || "pending").toLowerCase();
  const paymentStatus = (booking.payment?.status || "").toLowerCase();
  const isPaid =
    paymentStatus === "success" ||
    paymentStatus === "paid" ||
    paymentStatus === "completed";
  const isToday = checkIsEventToday(booking);
  const paymentInfo = getBookingPaymentAmount(booking);

  // 1. Cancelled / Rejected / Expired / Unavailable
  if (
    status === "cancelled" ||
    status === "rejected" ||
    status === "expired" ||
    status === "unavailable"
  ) {
    let label = "Cancelled";
    if (status === "rejected") label = "Artist Declined";
    else if (status === "expired") label = "Reservation Expired";
    else if (status === "unavailable") label = "Date Unavailable";

    return {
      type: "cancelled",
      badgeText: status === "rejected" ? "Rejected" : status === "expired" ? "Expired" : "Cancelled",
      badgeClass: "cancelled",
      amountOrSubtext: label,
      progressPercent: 33.33,
      steps: [
        { label: "Request Sent", state: "completed" },
        { label, state: "cancelled" },
        { label: "Payment", state: "upcoming" },
        { label: "Event & Complete", state: "upcoming" },
      ],
    };
  }

  // 2. Pending Approval
  if (status === "pending") {
    const countdown = formatReservationCountdown(booking.expires_at);
    // Rule 3: Payment not initiated and no agreed price -> "Amount not available" (or countdown if reservation active)
    return {
      type: "pending",
      badgeText: "Pending Approval",
      badgeClass: "pending",
      amountOrSubtext: countdown || (paymentInfo.hasAmount ? paymentInfo.formatted : "Amount not available"),
      isAmount: !countdown && paymentInfo.hasAmount,
      progressPercent: 33.33,
      steps: [
        { label: "Request Sent", state: "completed" },
        { label: "Artist Approval", state: "current" },
        { label: "Payment", state: "upcoming" },
        { label: "Event & Complete", state: "upcoming" },
      ],
    };
  }

  // 3. Completed
  if (status === "completed") {
    const dt = formatEventDateTime(booking.event_date, booking.event_date_iso);
    const subtext =
      dt.date && dt.date !== "Date TBD"
        ? `Completed on ${dt.date}`
        : paymentInfo.hasAmount
          ? paymentInfo.paidText
          : "Completed";

    return {
      type: "completed",
      badgeText: "Completed",
      badgeClass: "completed",
      amountOrSubtext: subtext,
      progressPercent: 100,
      steps: [
        { label: "Request Sent", state: "completed" },
        { label: "Accepted by Artist", state: "completed" },
        { label: "Payment Completed", state: "completed" },
        { label: "Completed", state: "completed" },
      ],
    };
  }

  // 4. Accepted by Artist
  if (status === "accepted") {
    // 4A. Unpaid / Awaiting Payment
    // Rule 2: Artist Accepted but Payment Pending -> Display agreed_price as payable amount
    // Rule 3: If no agreed price -> Display "Amount not available"
    // Rule 4: Never use customer_budget
    if (!isPaid) {
      return {
        type: "awaiting_payment",
        badgeText: "Awaiting Payment",
        badgeClass: "awaiting_payment",
        amountOrSubtext: paymentInfo.hasAmount
          ? paymentInfo.formatted
          : "Amount not available",
        isAmount: paymentInfo.hasAmount,
        progressPercent: 66.66,
        steps: [
          { label: "Request Sent", state: "completed" },
          { label: "Accepted by Artist", state: "completed" },
          { label: "Payment", state: "current" },
          { label: "Event & Complete", state: "upcoming" },
        ],
      };
    }

    // 4B. Paid & Event is Today (In Progress)
    if (isToday || status === "in_progress") {
      const dt = formatEventDateTime(booking.event_date, booking.event_date_iso);
      return {
        type: "in_progress",
        badgeText: "In Progress",
        badgeClass: "in_progress",
        amountOrSubtext: dt.time ? `Starts at ${dt.time}` : "Event Today",
        progressPercent: 100,
        steps: [
          { label: "Request Sent", state: "completed" },
          { label: "Accepted by Artist", state: "completed" },
          { label: "Payment Completed", state: "completed" },
          { label: "Event Today", state: "current" },
        ],
      };
    }

    // 4C. Paid & Future Event (Confirmed)
    // Rule 1: Payment Successful -> Display actual amount from payment.amount
    // Rule 3: If payment amount not available -> "Amount not available"
    // Rule 4: Never use customer_budget
    return {
      type: "confirmed",
      badgeText: "Confirmed",
      badgeClass: "confirmed",
      amountOrSubtext: paymentInfo.hasAmount
        ? paymentInfo.paidText
        : "Amount not available",
      isAmount: false,
      progressPercent: 100,
      steps: [
        { label: "Request Sent", state: "completed" },
        { label: "Accepted by Artist", state: "completed" },
        { label: "Payment Completed", state: "completed" },
        { label: "Event & Complete", state: "current" },
      ],
    };
  }

  // 5. In Progress direct status
  if (status === "in_progress") {
    const dt = formatEventDateTime(booking.event_date, booking.event_date_iso);
    return {
      type: "in_progress",
      badgeText: "In Progress",
      badgeClass: "in_progress",
      amountOrSubtext: dt.time ? `Starts at ${dt.time}` : "Event In Progress",
      progressPercent: 100,
      steps: [
        { label: "Request Sent", state: "completed" },
        { label: "Accepted by Artist", state: "completed" },
        { label: "Payment Completed", state: "completed" },
        { label: "Event Today", state: "current" },
      ],
    };
  }

  // Fallback for any unexpected status
  return {
    type: "pending",
    badgeText: status.charAt(0).toUpperCase() + status.slice(1),
    badgeClass: "pending",
    amountOrSubtext: paymentInfo.hasAmount ? paymentInfo.formatted : "Amount not available",
    isAmount: paymentInfo.hasAmount,
    progressPercent: 33.33,
    steps: [
      { label: "Request Sent", state: "completed" },
      { label: "Artist Review", state: "current" },
      { label: "Payment", state: "upcoming" },
      { label: "Event & Complete", state: "upcoming" },
    ],
  };
}

export default function CustomerBookingsDashboard({
  bookings = [],
  loading = false,
  error = "",
  onRetry,
  onViewDetails,
  onPayNow,
  onReschedule,
  onCancelBooking,
  _onHistory,
  _onOpenReceipt,
  onContactSupport,
  navigate,
  paymentLoadingId,
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const dashboardRef = useRef(null);
  const statsRef = useRef(null);
  const cardsListRef = useRef(null);
  const prevStatsRef = useRef(null);

  // Dynamic statistics calculated purely from real backend records
  const calculatedStats = useMemo(() => {
    let pendingCount = 0;
    let confirmedCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    bookings.forEach((b) => {
      const state = computeBookingState(b);
      if (state.type === "pending") {
        pendingCount++;
      } else if (state.type === "awaiting_payment" || state.type === "confirmed") {
        confirmedCount++;
      } else if (state.type === "in_progress") {
        inProgressCount++;
      } else if (state.type === "completed") {
        completedCount++;
      } else if (state.type === "cancelled") {
        cancelledCount++;
      }
    });

    return {
      total: bookings.length,
      pending: pendingCount,
      confirmed: confirmedCount,
      inProgress: inProgressCount,
      completed: completedCount,
      cancelled: cancelledCount,
    };
  }, [bookings]);

  // Animate statistics numbers with GSAP count-up strictly when values change
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion || !statsRef.current) return;

    const currentStats = calculatedStats;
    const prev = prevStatsRef.current;

    const hasChanged =
      !prev ||
      prev.total !== currentStats.total ||
      prev.pending !== currentStats.pending ||
      prev.confirmed !== currentStats.confirmed ||
      prev.inProgress !== currentStats.inProgress ||
      prev.completed !== currentStats.completed ||
      prev.cancelled !== currentStats.cancelled;

    if (!hasChanged) return;

    prevStatsRef.current = { ...currentStats };

    const ctx = gsap.context(() => {
      const statElements = statsRef.current.querySelectorAll(".th-stat-num");
      const statValues = [
        currentStats.total,
        currentStats.pending,
        currentStats.confirmed,
        currentStats.inProgress,
        currentStats.completed,
        currentStats.cancelled,
      ];

      statElements.forEach((el, index) => {
        const targetVal = statValues[index] || 0;
        const countObj = { val: 0 };

        gsap.to(countObj, {
          val: targetVal,
          duration: 0.9,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(countObj.val);
          },
        });
      });
    }, statsRef);

    return () => ctx.revert();
  }, [calculatedStats]);

  // Filter actual bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeFilter === "all") return true;
      const state = computeBookingState(b);
      if (activeFilter === "pending") return state.type === "pending";
      if (activeFilter === "confirmed") {
        return state.type === "confirmed" || state.type === "awaiting_payment";
      }
      if (activeFilter === "in_progress") return state.type === "in_progress";
      if (activeFilter === "completed") return state.type === "completed";
      if (activeFilter === "cancelled") return state.type === "cancelled";
      return true;
    });
  }, [bookings, activeFilter]);

  // Sort actual bookings
  const sortedBookings = useMemo(() => {
    const list = [...filteredBookings];
    list.sort((a, b) => {
      const dateA = new Date(a.event_date_iso || a.event_date || 0).getTime();
      const dateB = new Date(b.event_date_iso || b.event_date || 0).getTime();
      const idA = Number(a.id || 0);
      const idB = Number(b.id || 0);

      switch (sortBy) {
        case "oldest":
          return idA - idB;
        case "date_upcoming":
          return dateA - dateB;
        case "date_latest":
          return dateB - dateA;
        case "latest":
        default:
          return idB - idA;
      }
    });
    return list;
  }, [filteredBookings, sortBy]);

  // Pagination calculation
  const totalBookingsCount = sortedBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalBookingsCount / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const paginatedBookings = sortedBookings.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // GSAP animation on booking list items & progress tracker line fills
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion || !cardsListRef.current) return;

    const ctx = gsap.context(() => {
      const cards = cardsListRef.current.querySelectorAll(".th-booking-card");
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.06,
            ease: "power2.out",
          },
        );
      }

      const fillLines = cardsListRef.current.querySelectorAll(
        ".th-tracker-fill-line",
      );
      fillLines.forEach((line) => {
        const targetPercent = line.getAttribute("data-percent") || "0";
        gsap.fromTo(
          line,
          { width: "0%" },
          {
            width: `${targetPercent}%`,
            duration: 0.8,
            ease: "power2.out",
            delay: 0.15,
          },
        );
      });
    }, cardsListRef);

    return () => ctx.revert();
  }, [paginatedBookings, activeFilter, sortBy]);

  function handleFilterClick(filterKey) {
    setActiveFilter(filterKey);
    setCurrentPage(1);
  }

  function handleSortChange(e) {
    setSortBy(e.target.value);
    setCurrentPage(1);
  }

  function handleFindArtists() {
    if (navigate) {
      navigate("/artists");
    } else {
      window.location.href = "/artists";
    }
  }

  return (
    <div className="th-bookings-dashboard" ref={dashboardRef}>
      {/* =========================================================================
          1. MAIN HEADER
          ========================================================================= */}
      <div className="th-bookings-header">
        <div className="th-header-left">
          <h1 className="th-header-title">My Bookings</h1>
          <p className="th-header-subtitle">
            Track and manage all your artist bookings in one place.
          </p>
        </div>

        <button
          type="button"
          className="th-btn-find-artists"
          onClick={handleFindArtists}
        >
          <span>Find Artists</span>
        </button>
      </div>

      {/* =========================================================================
          2. HORIZONTAL STATISTICS CARDS (6 CARDS IN A ROW)
          ========================================================================= */}
      <div className="th-stats-row" ref={statsRef}>
        <div
          className={`th-stat-card total ${activeFilter === "all" ? "active-stat" : ""}`}
          onClick={() => handleFilterClick("all")}
          role="button"
          tabIndex={0}
          title="Filter: All Bookings"
        >
          <div className="th-stat-num total">{calculatedStats.total}</div>
          <div className="th-stat-label">Total Bookings</div>
        </div>

        <div
          className={`th-stat-card pending ${activeFilter === "pending" ? "active-stat" : ""}`}
          onClick={() => handleFilterClick("pending")}
          role="button"
          tabIndex={0}
          title="Filter: Pending Requests"
        >
          <div className="th-stat-num pending">{calculatedStats.pending}</div>
          <div className="th-stat-label">Pending Requests</div>
        </div>

        <div
          className={`th-stat-card confirmed ${activeFilter === "confirmed" ? "active-stat" : ""}`}
          onClick={() => handleFilterClick("confirmed")}
          role="button"
          tabIndex={0}
          title="Filter: Confirmed Bookings"
        >
          <div className="th-stat-num confirmed">
            {calculatedStats.confirmed}
          </div>
          <div className="th-stat-label">Confirmed</div>
        </div>

        <div
          className={`th-stat-card in_progress ${activeFilter === "in_progress" ? "active-stat" : ""}`}
          onClick={() => handleFilterClick("in_progress")}
          role="button"
          tabIndex={0}
          title="Filter: In Progress Bookings"
        >
          <div className="th-stat-num in_progress">
            {calculatedStats.inProgress}
          </div>
          <div className="th-stat-label">In Progress</div>
        </div>

        <div
          className={`th-stat-card completed ${activeFilter === "completed" ? "active-stat" : ""}`}
          onClick={() => handleFilterClick("completed")}
          role="button"
          tabIndex={0}
          title="Filter: Completed Bookings"
        >
          <div className="th-stat-num completed">
            {calculatedStats.completed}
          </div>
          <div className="th-stat-label">Completed</div>
        </div>

        <div
          className={`th-stat-card cancelled ${activeFilter === "cancelled" ? "active-stat" : ""}`}
          onClick={() => handleFilterClick("cancelled")}
          role="button"
          tabIndex={0}
          title="Filter: Cancelled Bookings"
        >
          <div className="th-stat-num cancelled">
            {calculatedStats.cancelled}
          </div>
          <div className="th-stat-label">Cancelled</div>
        </div>
      </div>

      {/* =========================================================================
          3. BOOKING FILTERS AND SORTING
          ========================================================================= */}
      <div className="th-controls-row">
        <div className="th-filter-tabs" role="tablist">
          <button
            type="button"
            className={`th-filter-tab ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => handleFilterClick("all")}
          >
            All Bookings ({calculatedStats.total})
          </button>
          <button
            type="button"
            className={`th-filter-tab ${activeFilter === "pending" ? "active" : ""}`}
            onClick={() => handleFilterClick("pending")}
          >
            Pending ({calculatedStats.pending})
          </button>
          <button
            type="button"
            className={`th-filter-tab ${activeFilter === "confirmed" ? "active" : ""}`}
            onClick={() => handleFilterClick("confirmed")}
          >
            Confirmed ({calculatedStats.confirmed})
          </button>
          <button
            type="button"
            className={`th-filter-tab ${activeFilter === "in_progress" ? "active" : ""}`}
            onClick={() => handleFilterClick("in_progress")}
          >
            In Progress ({calculatedStats.inProgress})
          </button>
          <button
            type="button"
            className={`th-filter-tab ${activeFilter === "completed" ? "active" : ""}`}
            onClick={() => handleFilterClick("completed")}
          >
            Completed ({calculatedStats.completed})
          </button>
          <button
            type="button"
            className={`th-filter-tab ${activeFilter === "cancelled" ? "active" : ""}`}
            onClick={() => handleFilterClick("cancelled")}
          >
            Cancelled ({calculatedStats.cancelled})
          </button>
        </div>

        <div className="th-sort-dropdown-wrap">
          <select
            className="th-sort-select"
            value={sortBy}
            onChange={handleSortChange}
            aria-label="Sort Bookings"
          >
            <option value="latest">Sort: Latest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="date_upcoming">Event Date (Upcoming First)</option>
            <option value="date_latest">Event Date (Latest First)</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          4. BOOKING CARDS LIST / LOADING / ERROR / EMPTY STATES
          ========================================================================= */}
      <div className="th-bookings-list" ref={cardsListRef}>
        {/* State A: Loading Skeleton */}
        {loading ? (
          <div className="th-skeleton-list">
            {[1, 2, 3].map((n) => (
              <div key={n} className="th-booking-card th-skeleton-card">
                <div className="th-card-left">
                  <div className="th-artist-avatar-box th-skeleton-box" />
                  <div className="th-artist-info" style={{ width: "160px", gap: "8px" }}>
                    <div className="th-skeleton-box" style={{ width: "80px", height: "14px" }} />
                    <div className="th-skeleton-box" style={{ width: "140px", height: "18px" }} />
                    <div className="th-skeleton-box" style={{ width: "120px", height: "14px" }} />
                  </div>
                </div>
                <div className="th-card-middle">
                  <div className="th-skeleton-box" style={{ width: "100%", height: "20px" }} />
                </div>
                <div className="th-card-right">
                  <div className="th-skeleton-box" style={{ width: "100px", height: "24px" }} />
                  <div className="th-skeleton-box" style={{ width: "80px", height: "16px" }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* State B: Error State with Retry */
          <div className="th-error-card">
            <h3 className="th-error-title">Unable to Load Bookings</h3>
            <p className="th-error-desc">{error}</p>
            {onRetry && (
              <button
                type="button"
                className="th-btn-find-artists"
                onClick={onRetry}
              >
                Retry
              </button>
            )}
          </div>
        ) : paginatedBookings.length === 0 ? (
          /* State C: Empty State */
          <div className="th-empty-card">
            <h3 className="th-empty-title">
              {activeFilter === "all"
                ? "No bookings yet."
                : `No ${activeFilter.replace("_", " ")} bookings.`}
            </h3>
            <p className="th-empty-desc">
              {activeFilter === "all"
                ? "You haven't requested any artist bookings yet. Discover top-rated artists and book your next live event performance."
                : `You don't have any ${activeFilter.replace("_", " ")} bookings at the moment.`}
            </p>
            {activeFilter !== "all" ? (
              <button
                type="button"
                className="th-btn-find-artists"
                onClick={() => setActiveFilter("all")}
              >
                View All Bookings
              </button>
            ) : (
              <button
                type="button"
                className="th-btn-find-artists"
                onClick={handleFindArtists}
              >
                Find Artists
              </button>
            )}
          </div>
        ) : (
          /* State D: Dynamic Booking Cards */
          paginatedBookings.map((b) => {
            const state = computeBookingState(b);
            const artistName = b.artist_name || "Artist";
            const initials = getArtistInitials(artistName);
            const avatarBg = getAvatarBg(artistName, b.artist_id || b.id);
            const formattedDate = formatEventDateTime(
              b.event_date,
              b.event_date_iso,
            );
            const bookingCode = formatBookingId(b.id);
            const categoryStr = formatCategory(b.category_name);
            const locationStr =
              b.event_location || b.event_area || "Location not provided";

            return (
              <div key={b.id} className="th-booking-card">
                {/* -----------------------------------------------------------
                    LEFT SECTION – Artist and Event Information
                    ----------------------------------------------------------- */}
                <div className="th-card-left">
                  <div
                    className="th-artist-avatar-box"
                    style={{ backgroundColor: avatarBg }}
                  >
                    {b.artist_image ? (
                      <img
                        src={b.artist_image}
                        alt={artistName}
                        className="th-artist-avatar-img"
                      />
                    ) : (
                      <span className="th-artist-avatar-initials">
                        {initials}
                      </span>
                    )}
                  </div>

                  <div className="th-artist-info">
                    {bookingCode && (
                      <span className="th-booking-code">
                        Booking {bookingCode}
                      </span>
                    )}
                    <div className="th-artist-name-row">
                      <span className="th-artist-name">{artistName}</span>
                      {categoryStr && (
                        <span className="th-artist-category">
                          ({categoryStr})
                        </span>
                      )}
                    </div>
                    <span className="th-event-datetime">
                      {formattedDate.full}
                    </span>
                    <span className="th-event-location">{locationStr}</span>
                  </div>
                </div>

                {/* -----------------------------------------------------------
                    MIDDLE SECTION – Booking Progress Tracker
                    ----------------------------------------------------------- */}
                <div className="th-card-middle">
                  <div className="th-tracker-container">
                    <div className="th-tracker-track-wrap">
                      <div className="th-tracker-line-container">
                        <div className="th-tracker-bg-line" />
                        <div
                          className="th-tracker-fill-line"
                          data-percent={state.progressPercent}
                          style={{ width: `${state.progressPercent}%` }}
                        />
                      </div>

                      <div className="th-tracker-nodes-row">
                        {state.steps.map((step, idx) => (
                          <div key={idx} className="th-tracker-node-box">
                            <div
                              className={`th-tracker-circle ${step.state}`}
                              title={`${step.label} (${step.state})`}
                            >
                              {step.state === "current" && (
                                <div className="th-tracker-circle-inner-dot" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="th-tracker-labels-row">
                      {state.steps.map((step, idx) => (
                        <span
                          key={idx}
                          className={`th-tracker-label ${
                            step.state === "current"
                              ? "active"
                              : step.state === "completed"
                                ? "done"
                                : ""
                          }`}
                        >
                          {step.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* -----------------------------------------------------------
                    RIGHT SECTION – Status and Actions
                    ----------------------------------------------------------- */}
                <div className="th-card-right">
                  <div className="th-status-badge-wrap">
                    <span className={`th-status-badge ${state.badgeClass}`}>
                      {state.badgeText}
                    </span>
                  </div>

                  {state.isAmount ? (
                    <div className="th-card-amount-large">
                      {state.amountOrSubtext}
                    </div>
                  ) : (
                    <div className="th-card-meta-text">
                      {state.amountOrSubtext}
                    </div>
                  )}

                  {/* Contextual Action Buttons depending on real booking state */}
                  <div className="th-actions-stack">
                    {/* 1. Pending: View Details, Cancel Request */}
                    {state.type === "pending" && (
                      <>
                        <button
                          type="button"
                          className="th-btn-act secondary"
                          onClick={() => onViewDetails && onViewDetails(b)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="th-btn-act danger"
                          onClick={() =>
                            onCancelBooking && onCancelBooking(b)
                          }
                        >
                          Cancel Request
                        </button>
                      </>
                    )}

                    {/* 2. Awaiting Payment: Pay Now, View Details */}
                    {state.type === "awaiting_payment" && (
                      <>
                        <button
                          type="button"
                          className="th-btn-act primary"
                          onClick={() => onPayNow && onPayNow(b)}
                          disabled={paymentLoadingId === b.id}
                        >
                          {paymentLoadingId === b.id
                            ? "Processing..."
                            : "Pay Now"}
                        </button>
                        <button
                          type="button"
                          className="th-btn-act secondary"
                          onClick={() => onViewDetails && onViewDetails(b)}
                        >
                          View Details
                        </button>
                      </>
                    )}

                    {/* 3. Confirmed & Paid: View Details, Reschedule, Cancel Booking */}
                    {state.type === "confirmed" && (
                      <>
                        <button
                          type="button"
                          className="th-btn-act secondary"
                          onClick={() => onViewDetails && onViewDetails(b)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="th-btn-act secondary"
                          onClick={() => onReschedule && onReschedule(b)}
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          className="th-btn-act danger"
                          onClick={() =>
                            onCancelBooking && onCancelBooking(b)
                          }
                        >
                          Cancel Booking
                        </button>
                      </>
                    )}

                    {/* 4. In Progress: View Details, Contact Support */}
                    {state.type === "in_progress" && (
                      <>
                        <button
                          type="button"
                          className="th-btn-act secondary"
                          onClick={() => onViewDetails && onViewDetails(b)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="th-btn-act secondary"
                          onClick={() =>
                            onContactSupport
                              ? onContactSupport()
                              : navigate
                                ? navigate("/profile?tab=support")
                                : (window.location.href =
                                    "/profile?tab=support")
                          }
                        >
                          Contact Support
                        </button>
                      </>
                    )}

                    {/* 5. Completed: View Details, Rate & Review, Book Again */}
                    {state.type === "completed" && (
                      <>
                        <button
                          type="button"
                          className="th-btn-act secondary"
                          onClick={() => onViewDetails && onViewDetails(b)}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="th-btn-act secondary"
                          onClick={() =>
                            onContactSupport
                              ? onContactSupport()
                              : navigate
                                ? navigate("/profile?tab=support")
                                : (window.location.href =
                                    "/profile?tab=support")
                          }
                        >
                          Rate & Review
                        </button>
                        <button
                          type="button"
                          className="th-btn-act secondary"
                          onClick={() => {
                            if (b.artist_id && navigate) {
                              navigate(`/artists/${b.artist_id}`);
                            } else if (navigate) {
                              navigate("/artists");
                            } else {
                              window.location.href = "/artists";
                            }
                          }}
                        >
                          Book Again
                        </button>
                      </>
                    )}

                    {/* 6. Cancelled or Rejected: View Details */}
                    {state.type === "cancelled" && (
                      <button
                        type="button"
                        className="th-btn-act secondary"
                        onClick={() => onViewDetails && onViewDetails(b)}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =========================================================================
          5. PAGINATION FOOTER
          ========================================================================= */}
      {!loading && !error && totalBookingsCount > 0 && (
        <div className="th-pagination-row">
          <span className="th-pagination-text">
            Showing {startIndex + 1} –{" "}
            {Math.min(startIndex + itemsPerPage, totalBookingsCount)} of{" "}
            {totalBookingsCount} bookings
          </span>

          <div className="th-pagination-controls">
            <button
              type="button"
              className="th-page-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              aria-label="Previous Page"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                type="button"
                className={`th-page-btn ${pg === validCurrentPage ? "active" : ""}`}
                onClick={() => setCurrentPage(pg)}
              >
                {pg}
              </button>
            ))}
            <button
              type="button"
              className="th-page-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              aria-label="Next Page"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
