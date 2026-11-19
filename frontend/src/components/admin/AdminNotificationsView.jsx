import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { fetchAdminAnnouncements, sendAdminAnnouncement } from "../../services/adminService";

export default function AdminNotificationsView() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchAdminAnnouncements();
        if (!ignore) setAnnouncements(data.announcements || []);
      } catch (err) {
        console.error("Error loading announcements:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  async function loadAnnouncements() {
    try {
      const data = await fetchAdminAnnouncements();
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error("Error loading announcements:", err);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSubmitting(true);
    setFeedback("");
    try {
      const res = await sendAdminAnnouncement({ title, message, recipientType });
      setFeedback(res.message);
      setTitle("");
      setMessage("");
      loadAnnouncements();
    } catch (err) {
      alert(err.message || "Failed to dispatch announcement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Platform Notifications & Announcements</h1>
          <p className="admin-page-subtitle">
            Broadcast platform-wide notices, seasonal updates, or maintenance alerts to customers and artists.
          </p>
        </div>
      </div>

      {feedback && (
        <div style={{ padding: "10px 16px", background: "rgba(16, 185, 129, 0.15)", color: "var(--admin-status-success)", borderRadius: "6px", marginBottom: "16px", fontSize: "0.85rem" }}>
          {feedback}
        </div>
      )}

      {/* Broadcast Form Card */}
      <div className="admin-panel-card" style={{ padding: "24px", marginBottom: "24px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", color: "var(--admin-text-primary)", fontWeight: 600 }}>
          Broadcast New Announcement
        </h3>

        <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
            <div className="admin-form-group">
              <label className="admin-form-label">Announcement Title</label>
              <input
                type="text"
                required
                className="admin-form-input"
                placeholder="e.g. Festival Season Booking Surge - Artist Tips"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Recipients Group</label>
              <select
                className="admin-select"
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value)}
              >
                <option value="all">All Registered Users</option>
                <option value="artists">Performing Artists Only</option>
                <option value="customers">Customers Only</option>
              </select>
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Announcement Message</label>
            <textarea
              required
              className="admin-form-textarea"
              placeholder="Write the full broadcast announcement text..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={submitting}
            >
              <Send size={15} />
              <span>Broadcast Announcement</span>
            </button>
          </div>
        </form>
      </div>

      {/* Broadcast History */}
      <div className="admin-panel-card">
        <div className="admin-panel-header">
          <h3 className="admin-panel-title">Announcement History</h3>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Message Content</th>
                <th>Delivered To</th>
                <th>Dispatched Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "36px" }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
                    <span>Loading announcement logs...</span>
                  </td>
                </tr>
              ) : announcements.length > 0 ? (
                announcements.map((a) => (
                  <tr key={a.id}>
                    <td className="strong">#{a.id}</td>
                    <td className="strong">{a.title}</td>
                    <td style={{ maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis" }}>{a.message}</td>
                    <td>{a.recipient}</td>
                    <td>{a.created_at}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "36px" }}>
                    No announcements dispatched yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
