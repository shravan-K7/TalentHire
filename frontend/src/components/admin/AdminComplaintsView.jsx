import { useState, useEffect } from "react";
import { CheckCircle, X } from "lucide-react";
import { fetchAdminComplaints, resolveAdminComplaint } from "../../services/adminService";

export default function AdminComplaintsView({ onCountChange }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchAdminComplaints();
        if (!ignore) {
          setComplaints(data.complaints || []);
          const pendingCount = (data.complaints || []).filter((c) => c.status === "Pending").length;
          if (onCountChange) onCountChange(pendingCount);
        }
      } catch (err) {
        console.error("Error loading complaints:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [onCountChange]);

  async function loadComplaints() {
    try {
      const data = await fetchAdminComplaints();
      setComplaints(data.complaints || []);
      const pendingCount = (data.complaints || []).filter((c) => c.status === "Pending").length;
      if (onCountChange) onCountChange(pendingCount);
    } catch (err) {
      console.error("Error loading complaints:", err);
    }
  }

  async function handleResolveSubmit(e) {
    e.preventDefault();
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      const res = await resolveAdminComplaint(selectedTicket.id, resolution);
      setFeedback(res.message);
      setSelectedTicket(null);
      setResolution("");
      loadComplaints();
    } catch (err) {
      alert(err.message || "Failed to resolve complaint.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Complaints & Customer Disputes</h1>
          <p className="admin-page-subtitle">
            Review support inquiries, booking disputes, and customer assistance tickets.
          </p>
        </div>
      </div>

      {feedback && (
        <div style={{ padding: "10px 16px", background: "rgba(16, 185, 129, 0.15)", color: "var(--admin-status-success)", borderRadius: "6px", marginBottom: "16px", fontSize: "0.85rem" }}>
          {feedback}
        </div>
      )}

      <div className="admin-panel-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>User & Role</th>
                <th>Email</th>
                <th>Subject</th>
                <th>Message Snippet</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "36px" }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
                    <span>Loading tickets...</span>
                  </td>
                </tr>
              ) : complaints.length > 0 ? (
                complaints.map((c) => (
                  <tr key={c.id}>
                    <td className="strong">#SUP-{c.id}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--admin-text-primary)" }}>{c.username}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)" }}>{c.user_role}</div>
                      </div>
                    </td>
                    <td>{c.user_email || "N/A"}</td>
                    <td className="strong">{c.subject}</td>
                    <td style={{ maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.message}
                    </td>
                    <td>
                      <span className={`admin-status-pill ${c.status.toLowerCase() === "resolved" ? "success" : "warning"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>{c.created_at}</td>
                    <td>
                      {c.status === "Pending" ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary admin-btn-sm"
                          onClick={() => {
                            setSelectedTicket(c);
                            setResolution("We have reviewed your request and verified the transaction.");
                          }}
                        >
                          <CheckCircle size={13} />
                          <span>Resolve</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--admin-status-success)", fontWeight: 600 }}>
                          Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "36px" }}>
                    No support inquiries or customer complaints.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      {selectedTicket && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Resolve Support Request #{selectedTicket.id}</h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedTicket(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit}>
              <div className="admin-modal-body">
                <div style={{ background: "var(--admin-card-subtle)", padding: "14px", borderRadius: "6px", fontSize: "0.85rem" }}>
                  <div style={{ fontWeight: 600, color: "var(--admin-text-primary)", marginBottom: "4px" }}>
                    From: {selectedTicket.username} ({selectedTicket.user_role})
                  </div>
                  <div style={{ color: "var(--admin-accent)", fontWeight: 600, marginBottom: "6px" }}>
                    Subject: {selectedTicket.subject}
                  </div>
                  <div style={{ color: "var(--admin-text-secondary)", lineHeight: 1.4 }}>
                    {selectedTicket.message}
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Resolution Message to User</label>
                  <textarea
                    required
                    className="admin-form-textarea"
                    placeholder="Enter the official response message dispatched to the user's notifications..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setSelectedTicket(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={submitting}
                >
                  Confirm & Resolve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
