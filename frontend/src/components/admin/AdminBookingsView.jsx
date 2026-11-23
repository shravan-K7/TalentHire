import { useState, useEffect } from "react";
import { Search, Eye, X, ExternalLink } from "lucide-react";
import { fetchAdminBookings, fetchAdminBookingDetail } from "../../services/adminService";

export default function AdminBookingsView({ defaultFilter = "all" }) {
  const [bookings, setBookings] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(defaultFilter);
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchAdminBookings({ search, status, page });
        if (!ignore) {
          setBookings(data.bookings || []);
          setTotalCount(data.total_count || 0);
        }
      } catch (err) {
        console.error("Error loading bookings:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [search, status, page]);

  async function handleInspectBooking(bookingId) {
    try {
      const data = await fetchAdminBookingDetail(bookingId);
      setSelectedBooking(data.booking);
    } catch (err) {
      alert(err.message || "Could not load booking details.");
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            {status === "upcoming" ? "Upcoming Events" : status === "cancelled" ? "Cancelled Bookings" : "Booking Management"}
          </h1>
          <p className="admin-page-subtitle">
            Inspect booking lifecycles, event coordinates, artist confirmations, and payment statuses. Total: {totalCount}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-group">
          <div className="admin-search-box" style={{ width: "280px" }}>
            <Search size={15} className="admin-search-icon" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by ID, customer, artist, venue..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="admin-filter-tabs">
            <button
              type="button"
              className={`admin-filter-tab ${status === "all" ? "active" : ""}`}
              onClick={() => { setStatus("all"); setPage(1); }}
            >
              All Bookings
            </button>
            <button
              type="button"
              className={`admin-filter-tab ${status === "pending" ? "active" : ""}`}
              onClick={() => { setStatus("pending"); setPage(1); }}
            >
              Pending
            </button>
            <button
              type="button"
              className={`admin-filter-tab ${status === "accepted" ? "active" : ""}`}
              onClick={() => { setStatus("accepted"); setPage(1); }}
            >
              Accepted
            </button>
            <button
              type="button"
              className={`admin-filter-tab ${status === "completed" ? "active" : ""}`}
              onClick={() => { setStatus("completed"); setPage(1); }}
            >
              Completed
            </button>
            <button
              type="button"
              className={`admin-filter-tab ${status === "cancelled" ? "active" : ""}`}
              onClick={() => { setStatus("cancelled"); setPage(1); }}
            >
              Cancelled
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="admin-panel-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Artist</th>
                <th>Event Type</th>
                <th>Event Date & Time</th>
                <th>Location</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "36px" }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
                    <span>Loading bookings...</span>
                  </td>
                </tr>
              ) : bookings.length > 0 ? (
                bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="strong">{b.id}</td>
                    <td>{b.customer_name}</td>
                    <td>{b.artist_name}</td>
                    <td>{b.event_type}</td>
                    <td>{b.event_date}</td>
                    <td>{b.event_location}</td>
                    <td className="strong">₹{Number(b.amount).toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`admin-status-pill ${b.status.toLowerCase()}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-status-pill ${
                          b.payment_status.toLowerCase() === "success"
                            ? "success"
                            : b.payment_status.toLowerCase() === "pending"
                            ? "warning"
                            : "danger"
                        }`}
                      >
                        {b.payment_status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => handleInspectBooking(b.raw_id)}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "36px" }}>
                    No bookings found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card wide">
            <div className="admin-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h3 className="admin-modal-title">Booking Details {selectedBooking.id}</h3>
                <span className={`admin-status-pill ${selectedBooking.status.toLowerCase()}`}>
                  {selectedBooking.status.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedBooking(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              {/* Event & Pricing Overview */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ background: "var(--admin-card-subtle)", padding: "16px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--admin-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                    Customer Details
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--admin-text-primary)", fontSize: "1.12rem" }}>
                    {selectedBooking.customer?.name}
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "var(--admin-text-secondary)", marginTop: "4px" }}>
                    Email: {selectedBooking.customer?.email}
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "var(--admin-text-secondary)" }}>
                    Phone: {selectedBooking.customer_phone || "Not provided"}
                  </div>
                </div>

                <div style={{ background: "var(--admin-card-subtle)", padding: "16px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--admin-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                    Performing Artist
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--admin-text-primary)", fontSize: "1.12rem" }}>
                    {selectedBooking.artist?.stage_name}
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "var(--admin-accent)", marginTop: "4px" }}>
                    Category: {selectedBooking.artist?.category}
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "var(--admin-text-secondary)" }}>
                    Email: {selectedBooking.artist?.email}
                  </div>
                </div>
              </div>

              {/* Event Location & Coordinates */}
              <div style={{ background: "var(--admin-card-subtle)", padding: "16px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--admin-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                  Event Location & Venue
                </div>
                <div style={{ fontSize: "1.02rem", color: "var(--admin-text-primary)", fontWeight: 500 }}>
                  {selectedBooking.venue_name ? `${selectedBooking.venue_name}, ` : ""}
                  {selectedBooking.event_location}
                </div>
                {selectedBooking.city && (
                  <div style={{ fontSize: "0.95rem", color: "var(--admin-text-secondary)", marginTop: "4px" }}>
                    City: {selectedBooking.city}, {selectedBooking.state} ({selectedBooking.country})
                  </div>
                )}
                {selectedBooking.latitude && selectedBooking.longitude && (
                  <div style={{ fontSize: "0.92rem", color: "var(--admin-text-muted)", marginTop: "4px" }}>
                    Coordinates: {selectedBooking.latitude}, {selectedBooking.longitude}
                  </div>
                )}
                {selectedBooking.google_maps_url && (
                  <div style={{ marginTop: "8px" }}>
                    <a
                      href={selectedBooking.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                    >
                      <ExternalLink size={13} />
                      <span>Open Google Maps Link</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Financial & Payment Status */}
              <div style={{ background: "var(--admin-card-subtle)", padding: "16px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--admin-text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                  Financial Breakdown (8% Platform Commission & 92% Artist Share)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "8px" }}>
                  <div>
                    <span style={{ fontSize: "0.9rem", color: "var(--admin-text-muted)" }}>Agreed Fee: </span>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--admin-text-primary)" }}>
                      ₹{Number(selectedBooking.agreed_price).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.9rem", color: "var(--admin-text-muted)" }}>Platform Commission (8%): </span>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--admin-accent)" }}>
                      ₹{selectedBooking.payment ? Number(selectedBooking.payment.commission_amount).toLocaleString("en-IN") : (Number(selectedBooking.agreed_price) * 0.08).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.9rem", color: "var(--admin-text-muted)" }}>Artist Payout (92%): </span>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--admin-status-success)" }}>
                      ₹{selectedBooking.payment ? Number(selectedBooking.payment.artist_amount).toLocaleString("en-IN") : (Number(selectedBooking.agreed_price) * 0.92).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
                {selectedBooking.payment && (
                  <div style={{ marginTop: "12px", fontSize: "0.92rem", color: "var(--admin-text-muted)" }}>
                    Razorpay Order ID: <code style={{ color: "var(--admin-text-secondary)" }}>{selectedBooking.payment.razorpay_order_id}</code> | Transaction ID: <code style={{ color: "var(--admin-text-secondary)" }}>{selectedBooking.payment.transaction_id || "Uncaptured"}</code>
                  </div>
                )}
              </div>

              {/* Cancellation Notice if Cancelled */}
              {selectedBooking.cancellation && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "16px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--admin-status-danger)", marginBottom: "4px" }}>
                    Cancellation Details (Cancelled by {selectedBooking.cancellation.cancelled_by})
                  </div>
                  <div style={{ fontSize: "0.96rem", color: "var(--admin-text-primary)" }}>
                    Reason: {selectedBooking.cancellation.reason}
                  </div>
                  <div style={{ fontSize: "0.92rem", color: "var(--admin-text-muted)", marginTop: "4px" }}>
                    Refund Amount: ₹{Number(selectedBooking.cancellation.refund_amount).toLocaleString("en-IN")} (Processed on {selectedBooking.cancellation.created_at})
                  </div>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setSelectedBooking(null)}
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
