import { useState, useEffect } from "react";
import { fetchAdminSettings, fetchAdminActivityLogs } from "../../services/adminService";

export default function AdminSettingsView({ defaultTab = "settings" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [settingsData, setSettingsData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        if (activeTab === "logs") {
          const lData = await fetchAdminActivityLogs();
          if (!ignore) setLogs(lData.logs || []);
        } else {
          const sData = await fetchAdminSettings();
          if (!ignore) setSettingsData(sData);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => { ignore = true; };
  }, [activeTab]);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            {activeTab === "logs" ? "Platform Activity Logs" : activeTab === "roles" ? "Roles & Permissions" : "System Settings"}
          </h1>
          <p className="admin-page-subtitle">
            Configure platform policies, administrator permissions, and review the security audit trail.
          </p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filter-tabs">
          <button
            type="button"
            className={`admin-filter-tab ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Platform Configuration
          </button>
          <button
            type="button"
            className={`admin-filter-tab ${activeTab === "roles" ? "active" : ""}`}
            onClick={() => setActiveTab("roles")}
          >
            Roles & Staff
          </button>
          <button
            type="button"
            className={`admin-filter-tab ${activeTab === "logs" ? "active" : ""}`}
            onClick={() => setActiveTab("logs")}
          >
            Activity Audit Logs
          </button>
        </div>
      </div>

      {activeTab === "settings" && settingsData && (
        <div className="admin-panel-card" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: "1.25rem", color: "var(--admin-text-primary)", fontWeight: 600 }}>
            TalentHire Platform Policy Parameters
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
            <div style={{ background: "var(--admin-card-subtle)", padding: "16px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
              <div style={{ fontSize: "0.9rem", color: "var(--admin-text-muted)", marginBottom: "4px" }}>Platform Commission Model</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--admin-accent)" }}>
                {settingsData.platform?.commission_rate}
              </div>
              <div style={{ fontSize: "0.88rem", color: "var(--admin-text-secondary)", marginTop: "4px" }}>
                TalentHire platform service fee retained on successful bookings.
              </div>
            </div>

            <div style={{ background: "var(--admin-card-subtle)", padding: "16px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
              <div style={{ fontSize: "0.9rem", color: "var(--admin-text-muted)", marginBottom: "4px" }}>Artist Payout Share</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--admin-status-success)" }}>
                {settingsData.platform?.artist_share}
              </div>
              <div style={{ fontSize: "0.88rem", color: "var(--admin-text-secondary)", marginTop: "4px" }}>
                Disbursed to performing artists post completion.
              </div>
            </div>

            <div style={{ background: "var(--admin-card-subtle)", padding: "16px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
              <div style={{ fontSize: "0.9rem", color: "var(--admin-text-muted)", marginBottom: "4px" }}>Cancellation Grace Window</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--admin-text-primary)" }}>
                {settingsData.platform?.cancellation_window_hours} Hours
              </div>
              <div style={{ fontSize: "0.88rem", color: "var(--admin-text-secondary)", marginTop: "4px" }}>
                Free cancellation threshold before performance start.
              </div>
            </div>

            <div style={{ background: "var(--admin-card-subtle)", padding: "16px", borderRadius: "8px", border: "1px solid var(--admin-border)" }}>
              <div style={{ fontSize: "0.9rem", color: "var(--admin-text-muted)", marginBottom: "4px" }}>Timezone & Currency</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--admin-text-primary)" }}>
                {settingsData.platform?.currency} · {settingsData.platform?.timezone}
              </div>
              <div style={{ fontSize: "0.88rem", color: "var(--admin-text-secondary)", marginTop: "4px" }}>
                Standard operating timezone across India.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "roles" && settingsData && (
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">Administrator Accounts ({settingsData.admin_users?.length || 0})</h3>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Permission Level</th>
                  <th>Account Status</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {(settingsData.admin_users || []).map((adm) => (
                  <tr key={adm.id}>
                    <td className="strong">#{adm.id}</td>
                    <td className="strong">{adm.username}</td>
                    <td>{adm.email || "staff@talenthire.in"}</td>
                    <td>
                      <span className="admin-status-pill info">
                        {adm.is_superuser ? "SUPERUSER / OWNER" : "STAFF ADMIN"}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-status-pill ${adm.is_active ? "active" : "inactive"}`}>
                        {adm.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{adm.last_login}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">Real-Time Platform Event Stream</h3>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Actor / Source</th>
                  <th>Category</th>
                  <th>Activity Description</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "36px" }}>
                      <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
                      <span>Loading activity logs...</span>
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td className="strong">{log.actor}</td>
                      <td>
                        <span
                          className="admin-status-pill"
                          style={{
                            background:
                              log.category === "Financial"
                                ? "var(--admin-status-success-bg)"
                                : log.category === "Booking"
                                ? "rgba(255, 87, 34, 0.15)"
                                : "var(--admin-status-info-bg)",
                            color:
                              log.category === "Financial"
                                ? "var(--admin-status-success)"
                                : log.category === "Booking"
                                ? "var(--admin-accent)"
                                : "var(--admin-status-info)",
                          }}
                        >
                          {log.category}
                        </span>
                      </td>
                      <td>{log.action}</td>
                      <td style={{ color: "var(--admin-text-muted)" }}>{log.time}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "36px" }}>
                      No activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
