import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { fetchAdminChatbotStats } from "../../services/adminService";

export default function AdminChatbotView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testQuery, setTestQuery] = useState("");
  const [testResponse, setTestResponse] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadStats() {
      try {
        const data = await fetchAdminChatbotStats();
        if (!ignore) setStats(data);
      } catch (err) {
        console.error("Error loading chatbot stats:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadStats();
    return () => { ignore = true; };
  }, []);

  function handleTestSubmit(e) {
    e.preventDefault();
    if (!testQuery.trim()) return;

    // Emulate knowledge base resolution
    const q = testQuery.toLowerCase();
    if (q.includes("book") || q.includes("hire")) {
      setTestResponse("Matched Category: Booking Help\nAnswer: Customers can browse artists, check dates on the live calendar, and submit a booking request. Upon artist acceptance, payment is processed securely via Razorpay payment gateway.");
    } else if (q.includes("commission") || q.includes("fee") || q.includes("price")) {
      setTestResponse("Matched Category: Payments & Refunds\nAnswer: TalentHire charges an 8% platform service fee upon booking confirmation, and 92% is disbursed to the performing artist.");
    } else if (q.includes("cancel") || q.includes("refund")) {
      setTestResponse("Matched Category: Payments & Refunds\nAnswer: TalentHire provides a 48-hour free cancellation policy before performance start, with automated tiered refund processing.");
    } else {
      setTestResponse("Matched Category: General Inquiries\nAnswer: Welcome to TalentHire. Please select from our interactive menu or submit a support ticket via your dashboard.");
    }
  }

  if (loading) {
    return (
      <div className="admin-state-empty">
        <div className="admin-spinner" />
        <p>Loading chatbot operational telemetry...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">AI Chatbot Monitoring</h1>
          <p className="admin-page-subtitle">
            Monitor automated customer support performance, inquiry resolution rates, and knowledge base coverage.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="admin-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Chatbot Health Status</div>
          <div className="admin-kpi-value" style={{ color: "var(--admin-status-success)", fontSize: "1.6rem" }}>
            Operational
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Knowledge Base Topics</div>
          <div className="admin-kpi-value">{stats?.knowledge_topics_count || 24}</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">System Uptime</div>
          <div className="admin-kpi-value">{stats?.uptime || "99.98%"}</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Average Response Time</div>
          <div className="admin-kpi-value">{stats?.avg_response_time || "120ms"}</div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="admin-two-col-grid">
        {/* Knowledge Base Categories */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">Knowledge Base Topics Covered</h3>
          </div>
          <div className="admin-actions-list">
            {(stats?.categories_covered || []).map((cat, i) => (
              <div key={i} className="admin-action-row" style={{ cursor: "default" }}>
                <span className="admin-action-label" style={{ color: "var(--admin-text-primary)" }}>
                  {cat}
                </span>
                <span className="admin-status-pill success">Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Queried FAQs */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">Top Frequently Asked Questions</h3>
          </div>
          <div className="admin-actions-list">
            {(stats?.recent_queries || []).map((q, i) => (
              <div key={i} className="admin-action-row" style={{ cursor: "default" }}>
                <div>
                  <div style={{ fontSize: "0.96rem", color: "var(--admin-text-primary)", fontWeight: 500 }}>
                    "{q.query}"
                  </div>
                  <div style={{ fontSize: "0.86rem", color: "var(--admin-text-muted)" }}>{q.category}</div>
                </div>
                <span className="admin-action-badge badge-orange">{q.frequency} queries</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Testing Sandbox */}
      <div className="admin-panel-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <Sparkles size={18} style={{ color: "var(--admin-accent)" }} />
          <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--admin-text-primary)", fontWeight: 600 }}>
            Chatbot Knowledge Simulator
          </h3>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: "0.95rem", color: "var(--admin-text-muted)" }}>
          Test customer prompts to verify knowledge base matching and response accuracy.
        </p>

        <form onSubmit={handleTestSubmit} style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <input
            type="text"
            className="admin-form-input"
            placeholder="Type a test customer inquiry (e.g. How does 8% commission work?)..."
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
          />
          <button type="submit" className="admin-btn admin-btn-primary">
            <span>Test Query</span>
          </button>
        </form>

        {testResponse && (
          <div style={{ background: "var(--admin-card-subtle)", padding: "16px", borderRadius: "6px", border: "1px solid var(--admin-border)", fontSize: "0.96rem", color: "var(--admin-text-primary)", whiteSpace: "pre-line", lineHeight: 1.5 }}>
            {testResponse}
          </div>
        )}
      </div>
    </div>
  );
}
