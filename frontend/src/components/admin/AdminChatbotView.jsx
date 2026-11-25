import { useState, useEffect, useCallback } from "react";
import { fetchAdminChatbotStats } from "../../services/adminService";

export default function AdminChatbotView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const loadStats = useCallback(async (targetPage) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminChatbotStats(targetPage, 10);
      setStats(data);
    } catch (err) {
      setError(err.message || "Unable to load chatbot analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats(page);
  }, [page, loadStats]);

  if (loading && !stats) {
    return (
      <div className="admin-state-empty">
        <div className="admin-spinner" />
        <p>Loading chatbot operational telemetry...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="admin-panel-card" style={{ padding: "24px" }}>
        <p style={{ color: "var(--admin-status-danger)", margin: "0 0 12px" }}>{error}</p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => loadStats(page)}>
          Retry
        </button>
      </div>
    );
  }

  const totalConversations = stats?.total_conversations ?? 0;
  const totalMessages = stats?.total_messages ?? 0;
  const customerConversations = stats?.customer_conversations ?? 0;
  const artistConversations = stats?.artist_conversations ?? 0;
  const failedRequests = stats?.failed_requests ?? 0;
  const avgResponseMs = stats?.avg_response_time_ms;
  const dailyTrends = stats?.daily_trends || [];
  const monthlyTrends = stats?.monthly_trends || [];
  const topTopics = stats?.top_topics || [];
  const recentActivity = stats?.recent_activity || [];
  const pagination = stats?.pagination || { page: 1, total_pages: 1, total_items: 0 };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">AI Chatbot Analytics</h1>
          <p className="admin-page-subtitle">
            Real-time database telemetry from TalentHire customer and artist AI conversations.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="admin-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Total Conversations</div>
          <div className="admin-kpi-value">{totalConversations}</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Total Messages</div>
          <div className="admin-kpi-value">{totalMessages}</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Customer / Artist</div>
          <div className="admin-kpi-value" style={{ fontSize: "1.45rem" }}>
            {customerConversations} / {artistConversations}
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Failed AI Requests</div>
          <div
            className="admin-kpi-value"
            style={{
              color: failedRequests > 0 ? "var(--admin-status-danger)" : "var(--admin-status-success)",
            }}
          >
            {failedRequests}
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Avg Response Time</div>
          <div className="admin-kpi-value">
            {avgResponseMs !== null && avgResponseMs !== undefined ? `${avgResponseMs} ms` : "—"}
          </div>
        </div>
      </div>

      {/* Trends & Top Topics */}
      <div className="admin-two-col-grid">
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">Conversation Trends</h3>
          </div>
          <div className="admin-actions-list">
            <div style={{ fontSize: "0.85rem", color: "var(--admin-text-muted)", fontWeight: 600 }}>
              Daily (Last 14 Days)
            </div>
            {dailyTrends.length === 0 ? (
              <div style={{ fontSize: "0.9rem", color: "var(--admin-text-muted)" }}>
                No daily conversation data recorded yet.
              </div>
            ) : (
              dailyTrends.map((d) => (
                <div key={d.date} className="admin-action-row" style={{ cursor: "default" }}>
                  <span className="admin-action-label" style={{ color: "var(--admin-text-primary)" }}>
                    {d.date}
                  </span>
                  <span className="admin-action-badge badge-orange">{d.count} sessions</span>
                </div>
              ))
            )}

            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--admin-text-muted)",
                fontWeight: 600,
                marginTop: "10px",
              }}
            >
              Monthly (Last 6 Months)
            </div>
            {monthlyTrends.length === 0 ? (
              <div style={{ fontSize: "0.9rem", color: "var(--admin-text-muted)" }}>
                No monthly conversation data recorded yet.
              </div>
            ) : (
              monthlyTrends.map((m) => (
                <div key={m.month} className="admin-action-row" style={{ cursor: "default" }}>
                  <span className="admin-action-label" style={{ color: "var(--admin-text-primary)" }}>
                    {m.month}
                  </span>
                  <span className="admin-action-badge badge-orange">{m.count} sessions</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">Top Queried Topics</h3>
          </div>
          <div className="admin-actions-list">
            {topTopics.length === 0 ? (
              <div style={{ fontSize: "0.9rem", color: "var(--admin-text-muted)" }}>
                No topics recorded yet.
              </div>
            ) : (
              topTopics.map((item) => (
                <div key={item.topic} className="admin-action-row" style={{ cursor: "default" }}>
                  <span className="admin-action-label" style={{ color: "var(--admin-text-primary)" }}>
                    {item.topic}
                  </span>
                  <span className="admin-action-badge badge-orange">{item.count} queries</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Paginated Recent Chatbot Activity */}
      <div className="admin-panel-card" style={{ padding: "20px" }}>
        <div className="admin-panel-header" style={{ padding: 0, marginBottom: "14px" }}>
          <h3 className="admin-panel-title">Recent Chatbot Activity</h3>
          <span style={{ fontSize: "0.85rem", color: "var(--admin-text-muted)" }}>
            Page {pagination.page} of {pagination.total_pages}
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div style={{ fontSize: "0.92rem", color: "var(--admin-text-muted)" }}>
            No chatbot sessions recorded yet.
          </div>
        ) : (
          <div className="admin-actions-list">
            {recentActivity.map((act) => (
              <div key={act.session_id} className="admin-action-row" style={{ cursor: "default" }}>
                <div>
                  <div style={{ fontSize: "0.95rem", color: "var(--admin-text-primary)", fontWeight: 500 }}>
                    Session #{act.session_id} ·{" "}
                    <span style={{ textTransform: "capitalize" }}>{act.role_context}</span>
                  </div>
                  <div style={{ fontSize: "0.84rem", color: "var(--admin-text-muted)" }}>
                    {act.message_count} messages · Updated {act.updated_at}
                  </div>
                </div>
                <span className={`admin-status-pill ${act.is_active ? "success" : ""}`}>
                  {act.is_active ? "Active" : "Closed"}
                </span>
              </div>
            ))}
          </div>
        )}

        {pagination.total_pages > 1 && (
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "14px" }}>
            <button
              type="button"
              className="admin-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={page >= pagination.total_pages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
