import { ArrowRight } from "lucide-react";

export default function AdminOverviewView({
  data,
  loading,
  onNavigateSection,
}) {
  if (loading) {
    return (
      <div className="admin-state-empty">
        <div className="admin-spinner" />
        <p>Loading real-time platform metrics...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const recentBookings = data?.recent_bookings || [];
  const pendingActions = data?.pending_actions || {};
  const recentRegistrations = data?.recent_registrations || [];
  const recentActivity = data?.recent_activity || [];

  // Format currency helper
  function formatINR(val) {
    const num = Number(val || 0);
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)}L`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  }

  return (
    <div>
      {/* Top Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Platform overview · real-time data</p>
        </div>
      </div>

      {/* 6 Top KPI Cards */}
      <div className="admin-kpi-grid">
        <div
          className="admin-kpi-card clickable"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateSection("users")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigateSection("users");
            }
          }}
          title="Click to view all registered users"
        >
          <div className="admin-kpi-label">Total users</div>
          <div className="admin-kpi-value">{kpis.total_users?.toLocaleString("en-IN") || 0}</div>
        </div>

        <div
          className="admin-kpi-card clickable"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateSection("artists")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigateSection("artists");
            }
          }}
          title="Click to view all artists"
        >
          <div className="admin-kpi-label">Artists</div>
          <div className="admin-kpi-value">{kpis.total_artists?.toLocaleString("en-IN") || 0}</div>
        </div>

        <div
          className="admin-kpi-card clickable"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateSection("customers")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigateSection("customers");
            }
          }}
          title="Click to view all customers"
        >
          <div className="admin-kpi-label">Customers</div>
          <div className="admin-kpi-value">{kpis.total_customers?.toLocaleString("en-IN") || 0}</div>
        </div>

        <div
          className="admin-kpi-card clickable"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateSection("bookings")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigateSection("bookings");
            }
          }}
          title="Click to view all bookings"
        >
          <div className="admin-kpi-label">Total bookings</div>
          <div className="admin-kpi-value">{kpis.total_bookings?.toLocaleString("en-IN") || 0}</div>
        </div>

        {/* Highlighted Orange Card for Pending Verifications */}
        <div
          className="admin-kpi-card highlight-orange clickable"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateSection("artist-verifications")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigateSection("artist-verifications");
            }
          }}
          title="Click to review pending verifications"
        >
          <div className="admin-kpi-label" style={{ color: "var(--admin-accent)" }}>
            Pending verifications
          </div>
          <div className="admin-kpi-value">{kpis.pending_verifications || 0}</div>
        </div>

        <div
          className="admin-kpi-card clickable"
          role="button"
          tabIndex={0}
          onClick={() => onNavigateSection("transactions")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNavigateSection("transactions");
            }
          }}
          title="Click to view successful payment transactions"
        >
          <div className="admin-kpi-label">Successful payments</div>
          <div className="admin-kpi-value">{kpis.successful_payments?.toLocaleString("en-IN") || 0}</div>
        </div>
      </div>

      {/* Commission (8%) Card */}
      <div
        className="admin-kpi-commission-card clickable"
        role="button"
        tabIndex={0}
        onClick={() => onNavigateSection("commission")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNavigateSection("commission");
          }
        }}
        title="Click to view commission report"
      >
        <div>
          <div className="admin-kpi-commission-title">Commission (8%)</div>
          <div className="admin-kpi-commission-value">{formatINR(kpis.total_commission)}</div>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-secondary admin-btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onNavigateSection("commission");
          }}
        >
          <span>View commission report</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Middle Row: Recent Bookings + Pending Actions */}
      <div className="admin-two-col-grid">
        {/* Left: Recent Bookings */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">Recent bookings</h2>
            <button
              type="button"
              className="admin-panel-link"
              onClick={() => onNavigateSection("bookings")}
            >
              View all
            </button>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Artist</th>
                  <th>Event Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.length > 0 ? (
                  recentBookings.map((b) => (
                    <tr
                      key={b.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => onNavigateSection("bookings")}
                    >
                      <td className="strong">{b.id}</td>
                      <td>{b.customer}</td>
                      <td>{b.artist}</td>
                      <td>{b.event_date}</td>
                      <td className="strong">₹{Number(b.amount).toLocaleString("en-IN")}</td>
                      <td>
                        <span
                          className={`admin-status-pill ${b.status.toLowerCase()}`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "28px" }}>
                      No bookings recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Pending Actions */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">Pending actions</h2>
          </div>

          <div className="admin-actions-list">
            <div
              className="admin-action-row"
              onClick={() => onNavigateSection("artist-verifications")}
            >
              <span className="admin-action-label">Artist verifications</span>
              <span className="admin-action-badge badge-orange">
                {pendingActions.artist_verifications || 0}
              </span>
            </div>

            <div
              className="admin-action-row"
              onClick={() => onNavigateSection("refunds")}
            >
              <span className="admin-action-label">Refund requests</span>
              <span className="admin-action-badge badge-amber">
                {pendingActions.refund_requests || 0}
              </span>
            </div>

            <div
              className="admin-action-row"
              onClick={() => onNavigateSection("complaints")}
            >
              <span className="admin-action-label">Open complaints</span>
              <span className="admin-action-badge badge-red">
                {pendingActions.open_complaints || 0}
              </span>
            </div>

            <div
              className="admin-action-row"
              onClick={() => onNavigateSection("reviews")}
            >
              <span className="admin-action-label">Flagged reviews</span>
              <span className="admin-action-badge badge-blue">
                {pendingActions.flagged_reviews || 0}
              </span>
            </div>
          </div>

          <div className="admin-actions-btn-wrap">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              style={{ width: "100%" }}
              onClick={() => onNavigateSection("artist-verifications")}
            >
              Review verifications
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Registrations + Recent Activity */}
      <div className="admin-equal-two-col">
        {/* Left: Recent Registrations */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">Recent registrations</h2>
            <button
              type="button"
              className="admin-panel-link"
              onClick={() => onNavigateSection("users")}
            >
              View all
            </button>
          </div>

          <div className="admin-list-container">
            {recentRegistrations.length > 0 ? (
              recentRegistrations.map((u) => (
                <div
                  key={u.id}
                  className="admin-list-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => onNavigateSection("users")}
                  title="Click to view user in User Management"
                >
                  <div className="admin-list-item-main">
                    <span className="admin-list-item-title">{u.name}</span>
                    <span className="admin-list-item-sub">{u.subtitle}</span>
                  </div>
                  <span
                    className={`admin-status-pill ${
                      u.status.toLowerCase() === "verified" ||
                      u.status.toLowerCase() === "active"
                        ? "success"
                        : "warning"
                    }`}
                  >
                    {u.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="admin-state-empty">No recent registrations.</div>
            )}
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h2 className="admin-panel-title">Recent activity</h2>
            <button
              type="button"
              className="admin-panel-link"
              onClick={() => onNavigateSection("activity-logs")}
            >
              Activity logs
            </button>
          </div>

          <div className="admin-list-container">
            {recentActivity.length > 0 ? (
              recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="admin-activity-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => onNavigateSection("activity-logs")}
                  title="Click to view full activity logs"
                >
                  <span className="admin-activity-text">{act.text}</span>
                  <span className="admin-activity-time">{act.time}</span>
                </div>
              ))
            ) : (
              <div className="admin-state-empty">No platform activity yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
