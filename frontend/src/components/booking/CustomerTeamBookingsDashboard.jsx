import { useState, useMemo } from "react";
import {
  Users,
  Package,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Ban,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import PaymentCountdown from "./PaymentCountdown";

export default function CustomerTeamBookingsDashboard({
  teamBookings = [],
  loading = false,
  error = "",
  onRefresh = null,
  onPayNow = null,
  onCancelBooking = null,
  paymentLoadingId = null,
}) {
  const [filter, setFilter] = useState("all");
  const [selectedBookingForModal, setSelectedBookingForModal] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const counts = useMemo(() => {
    return {
      all: teamBookings.length,
      awaiting_payment: teamBookings.filter((b) => b.status === "awaiting_payment").length,
      confirmed: teamBookings.filter((b) => b.status === "confirmed").length,
      pending: teamBookings.filter(
        (b) => b.status === "pending_owner_review" || b.status === "pending_member_confirmations"
      ).length,
      past: teamBookings.filter(
        (b) => b.status === "rejected" || b.status === "expired" || b.status === "cancelled" || b.status === "completed"
      ).length,
    };
  }, [teamBookings]);

  const filteredBookings = useMemo(() => {
    if (filter === "awaiting_payment") return teamBookings.filter((b) => b.status === "awaiting_payment");
    if (filter === "confirmed") return teamBookings.filter((b) => b.status === "confirmed");
    if (filter === "pending")
      return teamBookings.filter(
        (b) => b.status === "pending_owner_review" || b.status === "pending_member_confirmations"
      );
    if (filter === "past")
      return teamBookings.filter(
        (b) => b.status === "rejected" || b.status === "expired" || b.status === "cancelled" || b.status === "completed"
      );
    return teamBookings;
  }, [teamBookings, filter]);

  async function handleConfirmCancel() {
    if (!cancelModalBooking || !onCancelBooking) return;
    setCancelSubmitting(true);
    setCancelError("");
    try {
      await onCancelBooking(cancelModalBooking.id, cancelReason);
      setCancelModalBooking(null);
      setCancelReason("");
    } catch (err) {
      setCancelError(err.message || "Failed to cancel team booking.");
    } finally {
      setCancelSubmitting(false);
    }
  }

  function renderStatusBadge(status, statusDisplay) {
    let bg = "#262626";
    let color = "#bbb";
    let border = "#333";

    if (status === "pending_owner_review") {
      bg = "rgba(245, 158, 11, 0.15)";
      color = "#f59e0b";
      border = "rgba(245, 158, 11, 0.4)";
    } else if (status === "pending_member_confirmations") {
      bg = "rgba(59, 130, 246, 0.15)";
      color = "#60a5fa";
      border = "rgba(59, 130, 246, 0.4)";
    } else if (status === "awaiting_payment") {
      bg = "rgba(255, 87, 34, 0.2)";
      color = "#FF5722";
      border = "rgba(255, 87, 34, 0.5)";
    } else if (status === "confirmed") {
      bg = "rgba(34, 197, 94, 0.15)";
      color = "#4ade80";
      border = "rgba(34, 197, 94, 0.4)";
    } else if (status === "rejected") {
      bg = "rgba(239, 68, 68, 0.15)";
      color = "#f87171";
      border = "rgba(239, 68, 68, 0.4)";
    } else if (status === "expired" || status === "cancelled") {
      bg = "#1f1f1f";
      color = "#777";
      border = "#2a2a2a";
    }

    return (
      <span
        style={{
          background: bg,
          color: color,
          border: `1px solid ${border}`,
          borderRadius: "20px",
          padding: "4px 12px",
          fontSize: "0.8rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: color,
          }}
        />
        {statusDisplay || status}
      </span>
    );
  }

  return (
    <div style={{ color: "#fff" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 6px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={26} color="#FF5722" />
            <span>Collaboration Team Bookings</span>
          </h1>
          <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.92rem" }}>
            Track your combined performance packages, artist confirmation statuses, and payment deadlines.
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              background: "#1e1e1e",
              border: "1px solid #333",
              borderRadius: "8px",
              color: "#ddd",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            <RotateCcw size={14} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "20px" }}>
        {[
          { key: "all", label: "All Bookings", count: counts.all },
          { key: "awaiting_payment", label: "Awaiting Payment", count: counts.awaiting_payment, highlight: true },
          { key: "confirmed", label: "Confirmed", count: counts.confirmed },
          { key: "pending", label: "Pending Confirmations", count: counts.pending },
          { key: "past", label: "Past / Cancelled", count: counts.past },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: filter === t.key ? 700 : 500,
              background:
                filter === t.key
                  ? t.highlight
                    ? "#FF5722"
                    : "#282828"
                  : "#181818",
              color: filter === t.key ? "#fff" : "#aaa",
              border: filter === t.key ? (t.highlight ? "1px solid #FF5722" : "1px solid #444") : "1px solid #282828",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
            }}
          >
            <span>{t.label}</span>
            <span
              style={{
                background: filter === t.key ? "rgba(255,255,255,0.2)" : "#222",
                padding: "2px 6px",
                borderRadius: "10px",
                fontSize: "0.75rem",
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>
          <Clock size={36} color="#FF5722" className="animate-spin" style={{ margin: "0 auto 12px" }} />
          <p style={{ margin: 0 }}>Loading your collaboration team bookings...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", borderRadius: "8px", padding: "16px", color: "#fca5a5", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredBookings.length === 0 && (
        <div style={{ background: "#161616", border: "1px dashed #2c2c2c", borderRadius: "12px", padding: "50px 20px", textAlign: "center" }}>
          <Users size={44} color="#555" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ color: "#eee", fontSize: "1.15rem", margin: "0 0 6px" }}>No Team Bookings Found</h3>
          <p style={{ color: "#888", fontSize: "0.9rem", maxWidth: "420px", margin: "0 auto 20px" }}>
            {filter === "all"
              ? "You haven't requested any team bookings yet. Explore verified collaboration teams and book multi-artist packages."
              : `No team bookings found under the "${filter.replace('_', ' ')}" filter.`}
          </p>
          <a
            href="/artists?tab=teams"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "#FF5722",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            <Package size={16} />
            <span>Explore Collaboration Teams</span>
          </a>
        </div>
      )}

      {/* Bookings List */}
      {!loading && !error && filteredBookings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {filteredBookings.map((tb) => {
            const isAwaitingPayment = tb.status === "awaiting_payment";
            const canCancel = tb.permissions?.can_cancel;

            return (
              <div
                key={tb.id}
                style={{
                  background: "#181818",
                  border: isAwaitingPayment ? "1px solid #FF5722" : "1px solid #282828",
                  borderRadius: "12px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                  position: "relative",
                  boxShadow: isAwaitingPayment ? "0 4px 20px rgba(255, 87, 34, 0.12)" : "none",
                }}
              >
                {/* Top Row: Team, Package, Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                    {tb.team.profile_image ? (
                      <img
                        src={tb.team.profile_image}
                        alt={tb.team.name}
                        style={{ width: "52px", height: "52px", borderRadius: "10px", objectFit: "cover", border: "1px solid #333" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "10px",
                          background: "#222",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.2rem",
                          fontWeight: 800,
                          color: "#FF5722",
                          border: "1px solid #333",
                        }}
                      >
                        {tb.team.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                          {tb.team.name}
                        </h2>
                        <span style={{ fontSize: "0.8rem", color: "#888" }}>
                          Booking #{tb.id}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                        <span style={{ color: "#FF5722", fontWeight: 700, fontSize: "0.95rem" }}>
                          {tb.package.name}
                        </span>
                        {tb.package.category && (
                          <span
                            style={{
                              background: "#242424",
                              color: "#ccc",
                              fontSize: "0.75rem",
                              padding: "2px 8px",
                              borderRadius: "10px",
                            }}
                          >
                            {tb.package.category}
                          </span>
                        )}
                        <span style={{ color: "#999", fontSize: "0.85rem" }}>
                          ₹{Number(tb.package.price).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>{renderStatusBadge(tb.status, tb.status_display)}</div>
                </div>

                {/* Event Details Grid */}
                <div
                  style={{
                    background: "#141414",
                    border: "1px solid #242424",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Calendar size={18} color="#FF5722" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase" }}>Event Date</div>
                      <div style={{ fontSize: "0.9rem", color: "#eee", fontWeight: 600 }}>
                        {tb.event.date_display || tb.event.date}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <MapPin size={18} color="#FF5722" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase" }}>Location / Venue</div>
                      <div style={{ fontSize: "0.9rem", color: "#eee", fontWeight: 600 }}>
                        {tb.event.venue_name || tb.event.location || "TBD"}
                        {tb.event.city ? `, ${tb.event.city}` : ""}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Clock size={18} color="#FF5722" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase" }}>Duration & Type</div>
                      <div style={{ fontSize: "0.9rem", color: "#eee", fontWeight: 600 }}>
                        {tb.event.type} • {tb.event.performance_duration || tb.package.duration_display}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Member Confirmation Checklist */}
                <div style={{ borderTop: "1px solid #242424", paddingTop: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>
                      Participating Artists ({tb.member_confirmations?.length || 0})
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "#888" }}>
                      {tb.confirmations_summary?.accepted || 0} of {tb.confirmations_summary?.total || 0} confirmed
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {(tb.member_confirmations || []).map((m) => {
                      let statusBg = "#222";
                      let statusText = "#888";
                      let StatusIcon = Clock;

                      if (m.status === "accepted") {
                        statusBg = "rgba(34, 197, 94, 0.15)";
                        statusText = "#4ade80";
                        StatusIcon = CheckCircle2;
                      } else if (m.status === "declined") {
                        statusBg = "rgba(239, 68, 68, 0.15)";
                        statusText = "#f87171";
                        StatusIcon = X;
                      }

                      return (
                        <div
                          key={m.id}
                          style={{
                            background: statusBg,
                            border: `1px solid ${statusBg}`,
                            borderRadius: "16px",
                            padding: "4px 10px 4px 6px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.82rem",
                          }}
                        >
                          {m.profile_image ? (
                            <img
                              src={m.profile_image}
                              alt={m.stage_name}
                              style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: "#333",
                                color: "#FF5722",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                              }}
                            >
                              {m.stage_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span style={{ color: "#fff", fontWeight: 600 }}>{m.stage_name}</span>
                          <span style={{ color: statusText, display: "flex", alignItems: "center", gap: "3px", fontSize: "0.75rem" }}>
                            <StatusIcon size={13} />
                            <span>{m.status}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rejection Note */}
                {tb.status === "rejected" && tb.rejection_reason && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      fontSize: "0.85rem",
                      color: "#fca5a5",
                    }}
                  >
                    <strong>Reason for Rejection: </strong>
                    {tb.rejection_reason}
                  </div>
                )}

                {/* Awaiting Payment Banner & Countdown Timer */}
                {isAwaitingPayment && (
                  <div
                    style={{
                      background: "rgba(255, 87, 34, 0.1)",
                      border: "1px solid rgba(255, 87, 34, 0.4)",
                      borderRadius: "10px",
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <div style={{ color: "#FF5722", fontWeight: 700, fontSize: "0.95rem", marginBottom: "4px" }}>
                        All Team Members Confirmed! Complete Payment
                      </div>
                      <p style={{ margin: 0, color: "#ccc", fontSize: "0.85rem" }}>
                        Your reservation is temporarily held. Complete your payment within 24 hours to finalize this booking.
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                      <PaymentCountdown
                        deadlineIso={tb.payment_deadline}
                        onExpire={onRefresh}
                        variant="card"
                      />

                      <button
                        type="button"
                        onClick={() => onPayNow && onPayNow(tb)}
                        disabled={paymentLoadingId === `team-${tb.id}`}
                        style={{
                          background: "#FF5722",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "10px 20px",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          cursor: paymentLoadingId === `team-${tb.id}` ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          boxShadow: "0 4px 14px rgba(255, 87, 34, 0.4)",
                        }}
                      >
                        <CreditCard size={18} />
                        <span>
                          {paymentLoadingId === `team-${tb.id}` ? "Opening Checkout..." : `Pay ₹${Number(tb.package.price).toLocaleString("en-IN")}`}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderTop: "1px solid #242424", paddingTop: "14px" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForModal(tb)}
                      style={{
                        background: "#242424",
                        border: "1px solid #333",
                        color: "#ddd",
                        borderRadius: "6px",
                        padding: "7px 14px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      View Details
                    </button>

                    <a
                      href={`/teams/${tb.team.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "transparent",
                        border: "1px solid #2e2e2e",
                        color: "#9ca3af",
                        borderRadius: "6px",
                        padding: "7px 12px",
                        fontSize: "0.85rem",
                        textDecoration: "none",
                      }}
                    >
                      <span>Team Profile</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>

                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => setCancelModalBooking(tb)}
                      style={{
                        background: "transparent",
                        border: "1px solid #442222",
                        color: "#f87171",
                        borderRadius: "6px",
                        padding: "7px 14px",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBookingForModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBookingForModal(null);
          }}
        >
          <div
            style={{
              background: "#181818",
              border: "1px solid #2e2e2e",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "650px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #282828", paddingBottom: "16px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>
                  Team Booking Details #{selectedBookingForModal.id}
                </h3>
                <span style={{ fontSize: "0.85rem", color: "#888" }}>
                  Team: {selectedBookingForModal.team.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForModal(null)}
                style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer" }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Package Snapshot */}
            <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.8rem", color: "#888", textTransform: "uppercase", marginBottom: "6px" }}>
                Package Snapshot
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem" }}>
                  {selectedBookingForModal.package.name}
                </span>
                <span style={{ color: "#FF5722", fontWeight: 800, fontSize: "1.1rem" }}>
                  ₹{Number(selectedBookingForModal.package.price).toLocaleString("en-IN")}
                </span>
              </div>
              <div style={{ color: "#aaa", fontSize: "0.85rem", marginTop: "4px" }}>
                Duration: {selectedBookingForModal.package.duration_display}
              </div>

              {selectedBookingForModal.package.included_services && selectedBookingForModal.package.included_services.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "4px" }}>What's Included:</div>
                  <ul style={{ margin: 0, paddingLeft: "18px", color: "#ccc", fontSize: "0.82rem" }}>
                    {selectedBookingForModal.package.included_services.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Event Details */}
            <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.8rem", color: "#888", textTransform: "uppercase", marginBottom: "10px" }}>
                Event Specifications
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "#777" }}>Event Type: </span>
                  <span style={{ color: "#ddd", fontWeight: 600 }}>{selectedBookingForModal.event.type}</span>
                </div>
                <div>
                  <span style={{ color: "#777" }}>Date: </span>
                  <span style={{ color: "#ddd", fontWeight: 600 }}>{selectedBookingForModal.event.date_display}</span>
                </div>
                <div>
                  <span style={{ color: "#777" }}>Venue: </span>
                  <span style={{ color: "#ddd", fontWeight: 600 }}>{selectedBookingForModal.event.venue_name || selectedBookingForModal.event.location}</span>
                </div>
                <div>
                  <span style={{ color: "#777" }}>Audience: </span>
                  <span style={{ color: "#ddd", fontWeight: 600 }}>{selectedBookingForModal.event.expected_audience_size || "Not specified"}</span>
                </div>
              </div>

              {selectedBookingForModal.event.customer_message && (
                <div style={{ marginTop: "12px", borderTop: "1px solid #222", paddingTop: "8px" }}>
                  <span style={{ color: "#777", fontSize: "0.8rem" }}>Customer Requirements: </span>
                  <p style={{ margin: "4px 0 0", color: "#ccc", fontSize: "0.85rem", fontStyle: "italic" }}>
                    "{selectedBookingForModal.event.customer_message}"
                  </p>
                </div>
              )}
            </div>

            {/* Payment Record (if exists) */}
            {selectedBookingForModal.payment && (
              <div style={{ background: "#141414", border: "1px solid #242424", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "0.8rem", color: "#888", textTransform: "uppercase", marginBottom: "6px" }}>
                  Payment Information
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#aaa", fontSize: "0.85rem" }}>
                    Status: <strong style={{ color: selectedBookingForModal.payment.status === "success" ? "#4ade80" : "#f59e0b" }}>{selectedBookingForModal.payment.status.toUpperCase()}</strong>
                  </span>
                  <span style={{ color: "#ddd", fontSize: "0.85rem" }}>
                    Total: ₹{Number(selectedBookingForModal.payment.amount).toLocaleString("en-IN")}
                  </span>
                </div>
                {selectedBookingForModal.payment.transaction_id && (
                  <div style={{ fontSize: "0.78rem", color: "#777", marginTop: "4px" }}>
                    Tx ID: {selectedBookingForModal.payment.transaction_id}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedBookingForModal(null)}
                style={{
                  padding: "9px 20px",
                  background: "#282828",
                  color: "#ddd",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#181818",
              border: "1px solid #2e2e2e",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "480px",
              padding: "24px",
            }}
          >
            <h3 style={{ margin: "0 0 10px", color: "#fff", fontSize: "1.2rem", fontWeight: 700 }}>
              Cancel Team Booking Request?
            </h3>
            <p style={{ margin: "0 0 16px", color: "#9ca3af", fontSize: "0.88rem", lineHeight: 1.5 }}>
              Are you sure you want to cancel your booking request for <strong>{cancelModalBooking.package.name}</strong> with <strong>{cancelModalBooking.team.name}</strong>? All holds on artist dates will be immediately released.
            </p>

            {cancelError && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "8px", padding: "10px", color: "#fca5a5", fontSize: "0.85rem", marginBottom: "14px" }}>
                {cancelError}
              </div>
            )}

            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", color: "#aaa", fontSize: "0.8rem", marginBottom: "6px" }}>
                Reason for Cancellation (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Change of event schedule"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#121212",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.88rem",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                style={{
                  padding: "9px 18px",
                  background: "#242424",
                  color: "#ccc",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelSubmitting}
                style={{
                  padding: "9px 18px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: cancelSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {cancelSubmitting ? "Cancelling..." : "Yes, Cancel Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
