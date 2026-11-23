import { useState, useEffect } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { fetchAdminReports, getExportCsvUrl } from "../../services/adminService";

export default function AdminReportsView() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadReports() {
      try {
        const data = await fetchAdminReports();
        if (!ignore) setReports(data);
      } catch (err) {
        console.error("Error loading reports:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadReports();
    return () => { ignore = true; };
  }, []);

  if (loading) {
    return (
      <div className="admin-state-empty">
        <div className="admin-spinner" />
        <p>Loading analytics and platform reports...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reports & Data Analytics</h1>
          <p className="admin-page-subtitle">
            Export raw platform records to CSV and inspect platform distribution metrics.
          </p>
        </div>
      </div>

      {/* Export CSV Cards */}
      <div className="admin-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "28px" }}>
        <div className="admin-panel-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <FileSpreadsheet size={20} style={{ color: "var(--admin-accent)" }} />
            <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--admin-text-primary)" }}>Bookings Export</h3>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: "0.92rem", color: "var(--admin-text-muted)" }}>
            Download complete historical booking records, event venues, statuses, and customer contacts.
          </p>
          <a
            href={getExportCsvUrl("bookings")}
            download
            className="admin-btn admin-btn-secondary admin-btn-sm"
            style={{ width: "100%" }}
          >
            <Download size={14} />
            <span>Export Bookings CSV</span>
          </a>
        </div>

        <div className="admin-panel-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <FileSpreadsheet size={20} style={{ color: "var(--admin-status-success)" }} />
            <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--admin-text-primary)" }}>Financials Export</h3>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: "0.92rem", color: "var(--admin-text-muted)" }}>
            Download full payment logs, 8% commission breakdowns, Razorpay transaction IDs, and disbursements.
          </p>
          <a
            href={getExportCsvUrl("financials")}
            download
            className="admin-btn admin-btn-secondary admin-btn-sm"
            style={{ width: "100%" }}
          >
            <Download size={14} />
            <span>Export Financials CSV</span>
          </a>
        </div>

        <div className="admin-panel-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <FileSpreadsheet size={20} style={{ color: "var(--admin-status-info)" }} />
            <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--admin-text-primary)" }}>Users Export</h3>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: "0.92rem", color: "var(--admin-text-muted)" }}>
            Download user accounts, customer emails, artist roster registrations, and membership status.
          </p>
          <a
            href={getExportCsvUrl("users")}
            download
            className="admin-btn admin-btn-secondary admin-btn-sm"
            style={{ width: "100%" }}
          >
            <Download size={14} />
            <span>Export Users CSV</span>
          </a>
        </div>
      </div>

      {/* Analytics Breakdown */}
      <div className="admin-two-col-grid">
        {/* Booking Status Distribution */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">Booking Status Distribution</h3>
          </div>
          <div className="admin-actions-list">
            {(reports?.status_distribution || []).map((s, i) => (
              <div key={i} className="admin-action-row" style={{ cursor: "default" }}>
                <span className="admin-action-label" style={{ textTransform: "capitalize", color: "var(--admin-text-primary)" }}>
                  {s.status}
                </span>
                <span className="admin-action-badge badge-orange">{s.count} bookings</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">Artist Roster by Category</h3>
          </div>
          <div className="admin-actions-list">
            {(reports?.category_distribution || []).map((c, i) => (
              <div key={i} className="admin-action-row" style={{ cursor: "default" }}>
                <span className="admin-action-label" style={{ color: "var(--admin-text-primary)" }}>
                  {c.name}
                </span>
                <span className="admin-action-badge badge-amber">{c.artists_count} artists</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
