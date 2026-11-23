import { useState, useEffect } from "react";
import { Star, Trash2 } from "lucide-react";
import { fetchAdminReviews, deleteAdminReview } from "../../services/adminService";

export default function AdminReviewsView() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchAdminReviews();
        if (!ignore) setReviews(data.reviews || []);
      } catch (err) {
        console.error("Error loading reviews:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  async function handleDelete(reviewId) {
    if (!window.confirm("Are you sure you want to delete and remove this review?")) return;
    try {
      const res = await deleteAdminReview(reviewId);
      setFeedback(res.message);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      alert(err.message || "Failed to delete review.");
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reviews & Ratings Moderation</h1>
          <p className="admin-page-subtitle">
            Inspect customer reviews and moderate inappropriate or abusive content.
          </p>
        </div>
      </div>

      {feedback && (
        <div style={{ padding: "10px 16px", background: "rgba(16, 185, 129, 0.15)", color: "var(--admin-status-success)", borderRadius: "6px", marginBottom: "16px", fontSize: "0.95rem" }}>
          {feedback}
        </div>
      )}

      <div className="admin-panel-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Review ID</th>
                <th>Booking</th>
                <th>Customer</th>
                <th>Artist</th>
                <th>Rating</th>
                <th>Review Comment</th>
                <th>Date</th>
                <th>Moderation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "36px" }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
                    <span>Loading reviews...</span>
                  </td>
                </tr>
              ) : reviews.length > 0 ? (
                reviews.map((r) => (
                  <tr key={r.id}>
                    <td className="strong">#{r.id}</td>
                    <td>{r.booking_id}</td>
                    <td>{r.customer_name}</td>
                    <td className="strong">{r.artist_name}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--admin-status-warning)" }}>
                        <Star size={14} fill="var(--admin-status-warning)" />
                        <span style={{ fontWeight: 600 }}>{r.rating}/5</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: "320px", whiteSpace: "normal" }}>{r.comment}</td>
                    <td>{r.created_at}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "36px" }}>
                    No reviews published yet.
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
