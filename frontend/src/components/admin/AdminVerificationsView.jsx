import { useState, useEffect } from "react";
import { Check, X, ShieldAlert, Image as ImageIcon } from "lucide-react";
import { fetchVerificationQueue, verifyArtistAction } from "../../services/adminService";

export default function AdminVerificationsView({ onCountChange }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalArtist, setRejectModalArtist] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchVerificationQueue();
        if (!ignore) {
          setQueue(data.pending_verifications || []);
          if (onCountChange) onCountChange(data.count || 0);
        }
      } catch (err) {
        console.error("Error loading verification queue:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [onCountChange]);

  async function handleApprove(artist) {
    if (!window.confirm(`Approve and verify ${artist.stage_name}?`)) return;
    setSubmitting(true);
    setFeedback("");
    try {
      const res = await verifyArtistAction(artist.id, "approve");
      setFeedback(res.message);
      setQueue((prev) => prev.filter((a) => a.id !== artist.id));
      if (onCountChange) onCountChange(queue.length - 1);
    } catch (err) {
      alert(err.message || "Failed to verify artist.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmReject() {
    if (!rejectModalArtist) return;
    setSubmitting(true);
    try {
      const res = await verifyArtistAction(rejectModalArtist.id, "reject", rejectReason);
      setFeedback(res.message);
      setQueue((prev) => prev.filter((a) => a.id !== rejectModalArtist.id));
      setRejectModalArtist(null);
      setRejectReason("");
      if (onCountChange) onCountChange(queue.length - 1);
    } catch (err) {
      alert(err.message || "Failed to reject verification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Artist Verification Queue</h1>
          <p className="admin-page-subtitle">
            Review artist registrations, profiles, and media portfolios before public verification.
          </p>
        </div>
      </div>

      {feedback && (
        <div style={{ padding: "10px 16px", background: "rgba(16, 185, 129, 0.15)", color: "var(--admin-status-success)", borderRadius: "6px", marginBottom: "20px", fontSize: "0.85rem" }}>
          {feedback}
        </div>
      )}

      {loading ? (
        <div className="admin-state-empty">
          <div className="admin-spinner" />
          <p>Loading pending verification requests...</p>
        </div>
      ) : queue.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {queue.map((artist) => (
            <div key={artist.id} className="admin-panel-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--admin-text-primary)" }}>
                      {artist.stage_name}
                    </h3>
                    <span className="admin-status-pill warning">Pending Verification</span>
                  </div>
                  <div style={{ fontSize: "0.86rem", color: "var(--admin-accent)", marginTop: "4px", fontWeight: 600 }}>
                    {artist.category}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-success"
                    disabled={submitting}
                    onClick={() => handleApprove(artist)}
                  >
                    <Check size={16} />
                    <span>Approve Verification</span>
                  </button>

                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    disabled={submitting}
                    onClick={() => setRejectModalArtist(artist)}
                  >
                    <X size={16} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              {/* Previous Rejection Feedback / Notes */}
              {artist.rejection_notes && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "6px",
                    marginBottom: "16px",
                    fontSize: "0.85rem",
                    color: "#fca5a5",
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: "var(--admin-status-danger)", display: "block", marginBottom: "4px" }}>
                    Previous Rejection Feedback / Notes:
                  </strong>
                  {artist.rejection_notes}
                </div>
              )}

              {/* Bio & Details */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "var(--admin-card-subtle)", padding: "14px 18px", borderRadius: "6px", marginBottom: "16px", fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "var(--admin-text-muted)" }}>Location: </span>
                  <span style={{ color: "var(--admin-text-primary)", fontWeight: 500 }}>{artist.location || "Kerala, India"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--admin-text-muted)" }}>Starting Fee: </span>
                  <span style={{ color: "var(--admin-text-primary)", fontWeight: 600 }}>₹{Number(artist.starting_price).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span style={{ color: "var(--admin-text-muted)" }}>Phone: </span>
                  <span style={{ color: "var(--admin-text-primary)" }}>{artist.phone || "Not provided"}</span>
                </div>
                <div>
                  <span style={{ color: "var(--admin-text-muted)" }}>Email: </span>
                  <span style={{ color: "var(--admin-text-primary)" }}>{artist.email}</span>
                </div>
              </div>

              {artist.bio && (
                <div style={{ marginBottom: "16px", fontSize: "0.88rem", color: "var(--admin-text-secondary)", lineHeight: 1.5 }}>
                  <strong style={{ color: "var(--admin-text-primary)" }}>Biography: </strong>
                  {artist.bio}
                </div>
              )}

              {/* Portfolio Preview */}
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--admin-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                  Portfolio Items ({artist.portfolio?.length || 0})
                </div>
                {artist.portfolio && artist.portfolio.length > 0 ? (
                  <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "6px" }}>
                    {artist.portfolio.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          width: "120px",
                          height: "90px",
                          borderRadius: "6px",
                          background: "#0e0f12",
                          border: "1px solid var(--admin-border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          flexShrink: 0,
                          position: "relative",
                        }}
                      >
                        {item.url ? (
                          <img src={item.url} alt={item.caption || "portfolio"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <ImageIcon size={22} style={{ color: "var(--admin-text-muted)" }} />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--admin-text-muted)" }}>No portfolio media uploaded yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-panel-card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <ShieldAlert size={40} style={{ color: "var(--admin-status-success)", margin: "0 auto 12px" }} />
          <h3 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "var(--admin-text-primary)" }}>Verification Queue is Empty</h3>
          <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--admin-text-muted)" }}>
            All performing artist accounts have been reviewed and verified.
          </p>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalArtist && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Reject Verification for {rejectModalArtist.stage_name}</h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setRejectModalArtist(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--admin-text-secondary)" }}>
                The artist will receive a notification regarding why their profile verification was not approved.
              </p>

              <div className="admin-form-group">
                <label className="admin-form-label">Reason for Rejection</label>
                <textarea
                  className="admin-form-textarea"
                  placeholder="e.g. Please upload higher-resolution portfolio pictures or add performance duration details..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setRejectModalArtist(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                disabled={submitting}
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
