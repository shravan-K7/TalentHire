import { useState, useEffect, useCallback, useRef } from "react";
import { Paperclip, Send, ArrowLeft, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import {
  fetchAdminSupportTickets,
  fetchAdminSupportTicketDetail,
  replyAdminSupportTicket,
  updateAdminSupportTicketStatus,
} from "../../services/adminService";
import "../../css/SupportSystem.css";

const REQUEST_CATEGORIES = [
  { value: "general_query", label: "General Query" },
  { value: "suggestion", label: "Suggestion & Feedback" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "payment_issue", label: "Payment Issue" },
  { value: "booking_issue", label: "Booking Issue" },
  { value: "profile_issue", label: "Profile Issue" },
  { value: "other", label: "Other" },
];

const TICKET_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "awaiting_response", label: "Awaiting Response" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function AdminSupportView({ onCountChange }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [feedback, setFeedback] = useState("");

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Ticket Conversation
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [replyStatus, setReplyStatus] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await fetchAdminSupportTickets({
        search: searchQuery.trim(),
        status: statusFilter,
        category: categoryFilter,
        page,
        pageSize: 12,
      });
      setTickets(data.tickets || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setErrorMsg(err.message || "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter, page]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function handleOpenTicket(ticketId) {
    setDetailLoading(true);
    setErrorMsg("");
    setFeedback("");
    try {
      const data = await fetchAdminSupportTicketDetail(ticketId);
      setSelectedTicket(data.ticket);
      setReplyStatus(data.ticket?.status || "awaiting_response");
      loadTickets();
      onCountChangeRef.current?.();
    } catch (err) {
      setErrorMsg(err.message || "Failed to load ticket details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleReplySubmit(e) {
    e.preventDefault();
    if (!selectedTicket) return;
    setErrorMsg("");
    setFeedback("");

    if (!replyText.trim() && !replyAttachment) {
      setErrorMsg("Please enter a reply message or attach a file.");
      return;
    }

    setSendingReply(true);
    try {
      const res = await replyAdminSupportTicket(selectedTicket.id, {
        message: replyText.trim(),
        attachment: replyAttachment,
        status: replyStatus,
      });
      setSelectedTicket(res.ticket);
      setReplyText("");
      setReplyAttachment(null);
      setFeedback(res.message || "Reply sent to artist.");
      loadTickets();
      onCountChangeRef.current?.();
    } catch (err) {
      setErrorMsg(err.message || "Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  }

  async function handleStatusChange(newStatus) {
    if (!selectedTicket || !newStatus) return;
    setUpdatingStatus(true);
    setErrorMsg("");
    setFeedback("");
    try {
      const res = await updateAdminSupportTicketStatus(selectedTicket.id, newStatus);
      setSelectedTicket(res.ticket);
      setReplyStatus(res.ticket?.status || newStatus);
      setFeedback(res.message || "Ticket status updated.");
      loadTickets();
      onCountChangeRef.current?.();
    } catch (err) {
      setErrorMsg(err.message || "Failed to update ticket status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Support Management</h1>
          <p className="admin-page-subtitle">
            Manage artist support tickets, review attachments, reply to inquiries, and update ticket statuses.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(16, 185, 129, 0.15)",
            color: "var(--admin-status-success, #34d399)",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "0.92rem",
          }}
        >
          {feedback}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(239, 68, 68, 0.15)",
            color: "#f87171",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "0.92rem",
          }}
        >
          {errorMsg}
        </div>
      )}

      {selectedTicket || detailLoading ? (
        <div className="admin-panel-card" style={{ padding: "22px" }}>
          {detailLoading && !selectedTicket ? (
            <div style={{ textAlign: "center", padding: "36px" }}>
              <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
              <span>Loading ticket conversation...</span>
            </div>
          ) : selectedTicket && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div className="support-conversation-header">
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div className="support-ticket-top">
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      onClick={() => setSelectedTicket(null)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <ArrowLeft size={14} />
                      Back to All Tickets
                    </button>
                    <span className="support-ticket-id">{selectedTicket.ticket_number}</span>
                    <span className="support-ticket-category">{selectedTicket.category_label}</span>
                    <span className={`support-status-badge support-status-${selectedTicket.status}`}>
                      {selectedTicket.status_label}
                    </span>
                  </div>
                  <h2 className="support-ticket-subject" style={{ fontSize: "1.18rem", marginTop: "4px" }}>
                    {selectedTicket.subject}
                  </h2>
                  <div className="support-ticket-dates">
                    <span>
                      Artist: <strong style={{ color: "#fff" }}>{selectedTicket.artist?.stage_name}</strong> (@{selectedTicket.artist?.username})
                    </span>
                    <span>Email: {selectedTicket.artist?.email || "N/A"}</span>
                    {selectedTicket.artist?.phone && <span>Phone: {selectedTicket.artist.phone}</span>}
                    {selectedTicket.artist?.category_name && (
                      <span>Category: {selectedTicket.artist.category_name}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                  <select
                    className="support-filter-select"
                    value={selectedTicket.status}
                    disabled={updatingStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    aria-label="Change ticket status"
                  >
                    {TICKET_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>

                  {selectedTicket.status !== "resolved" && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange("resolved")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <CheckCircle size={14} />
                      Mark Resolved
                    </button>
                  )}

                  {selectedTicket.status !== "closed" && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange("closed")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <XCircle size={14} />
                      Close Ticket
                    </button>
                  )}
                </div>
              </div>

              <div className="support-messages-thread">
                {(selectedTicket.messages || []).map((msg) => (
                  <div
                    key={msg.id}
                    className={`support-msg-row ${msg.sender_role === "admin" ? "is-artist" : "is-admin"}`}
                  >
                    <div className="support-msg-meta">
                      <span className="support-msg-sender">{msg.sender_name}</span>
                      <span className={`support-msg-role-tag ${msg.sender_role}`}>
                        {msg.sender_role === "admin" ? "Admin" : "Artist"}
                      </span>
                      <span>{msg.created_at_display}</span>
                    </div>
                    <div className="support-msg-bubble">
                      <div>{msg.message}</div>
                      {msg.attachment_url && (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="support-msg-attachment"
                        >
                          <Paperclip size={13} />
                          <span>{msg.attachment_name || "View Attachment"}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleReplySubmit} className="support-reply-form">
                <textarea
                  rows={3}
                  className="support-filter-input"
                  style={{ width: "100%", resize: "vertical" }}
                  placeholder="Write an official reply to the artist..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="support-reply-footer">
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                    <label className="support-file-label">
                      <Paperclip size={15} />
                      <span>{replyAttachment ? replyAttachment.name : "Attach file (optional)"}</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx"
                        style={{ display: "none" }}
                        onChange={(e) => setReplyAttachment(e.target.files?.[0] || null)}
                      />
                    </label>
                    <select
                      className="support-filter-select"
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                      aria-label="Status after reply"
                    >
                      {TICKET_STATUSES.map((st) => (
                        <option key={st.value} value={st.value}>
                          Set status: {st.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={sendingReply}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <Send size={14} />
                    {sendingReply ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-panel-card">
          <div style={{ padding: "18px 20px 0" }}>
            <div className="support-filters-bar">
              <input
                type="text"
                className="support-filter-input"
                placeholder="Search by Ticket ID, artist name, email, or subject..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
              <select
                className="support-filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                {TICKET_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
              <select
                className="support-filter-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                {REQUEST_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Artist</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "36px" }}>
                      <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
                      <span>Loading support tickets...</span>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "36px", color: "var(--admin-text-muted)" }}>
                      No support tickets found.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span className="support-ticket-id">{t.ticket_number}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.artist?.stage_name}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)" }}>
                          {t.artist?.email || `@${t.artist?.username}`}
                        </div>
                      </td>
                      <td>
                        <span className="support-ticket-category">{t.category_label}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, maxWidth: "280px" }}>{t.subject}</div>
                        {t.unread_count > 0 && (
                          <span className="support-unread-pill" style={{ marginTop: "4px" }}>
                            {t.unread_count} new message{t.unread_count > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`support-status-badge support-status-${t.status}`}>
                          {t.status_label}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.84rem", color: "var(--admin-text-muted)" }}>
                        {t.updated_at_display}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          onClick={() => handleOpenTicket(t.id)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px" }}
                        >
                          <MessageSquare size={14} />
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="support-pagination" style={{ padding: "14px 20px" }}>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ color: "var(--admin-text-muted)", fontSize: "0.86rem" }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
