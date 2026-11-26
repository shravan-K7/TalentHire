import { useState, useEffect, useCallback } from "react";
import { Paperclip, ArrowLeft, Send, MessageSquare } from "lucide-react";
import {
  fetchArtistSupportTickets,
  createArtistSupportTicket,
  fetchArtistSupportTicketDetail,
  replyArtistSupportTicket,
} from "../../js/auth";
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

export default function ArtistSupportTab({ onUnreadChange }) {
  // Create Request Form State
  const [formData, setFormData] = useState({
    category: "general_query",
    subject: "",
    message: "",
  });
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  // My Support Requests List State
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [listError, setListError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Conversation State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState("");

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    setListError("");
    try {
      const data = await fetchArtistSupportTickets({
        status: statusFilter,
        category: categoryFilter,
        search: searchQuery.trim(),
        page,
        pageSize: 8,
      });
      setTickets(data.tickets || []);
      setTotalPages(data.total_pages || 1);
      if (onUnreadChange) {
        onUnreadChange(data.unread_tickets_count || 0);
      }
    } catch (err) {
      setListError(err.message || "Unable to load your support requests.");
    } finally {
      setLoadingTickets(false);
    }
  }, [statusFilter, categoryFilter, searchQuery, page, onUnreadChange]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.subject.trim() || !formData.message.trim()) {
      setFormError("Please enter both a subject and detailed message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createArtistSupportTicket({
        category: formData.category,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        attachment,
      });
      const created = res.ticket;
      setFormSuccess(
        `Support request submitted. Your ticket number is ${created.ticket_number}.`
      );
      setFormData({ category: "general_query", subject: "", message: "" });
      setAttachment(null);
      setPage(1);
      await loadTickets();
      if (created) {
        setSelectedTicket(created);
      }
    } catch (err) {
      setFormError(err.message || "Failed to submit support request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOpenConversation(ticketId) {
    setLoadingDetail(true);
    setReplyError("");
    setReplySuccess("");
    try {
      const data = await fetchArtistSupportTicketDetail(ticketId);
      setSelectedTicket(data.ticket);
      loadTickets();
    } catch (err) {
      setListError(err.message || "Unable to open ticket conversation.");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!selectedTicket) return;
    setReplyError("");
    setReplySuccess("");

    if (!replyText.trim() && !replyAttachment) {
      setReplyError("Please enter a message or attach a file.");
      return;
    }

    setSendingReply(true);
    try {
      const res = await replyArtistSupportTicket(selectedTicket.id, {
        message: replyText.trim(),
        attachment: replyAttachment,
      });
      setSelectedTicket(res.ticket);
      setReplyText("");
      setReplyAttachment(null);
      setReplySuccess("Reply sent.");
      loadTickets();
    } catch (err) {
      setReplyError(err.message || "Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  }

  return (
    <div className="support-section-stack">
      {/* SECTION A: CREATE SUPPORT REQUEST */}
      <div className="cd-form-card">
        <div className="cd-form-header">
          <h2 className="cd-form-title">Create Support Request</h2>
          <p className="cd-form-subtext">
            Submit queries, suggestions, complaints, or technical issues directly to the TalentHire Admin team.
          </p>
        </div>

        {formSuccess && (
          <div className="cd-alert-success" role="status" style={{ marginBottom: "16px" }}>
            {formSuccess}
          </div>
        )}
        {formError && (
          <div className="cd-alert-error" role="alert" style={{ marginBottom: "16px" }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="cd-form">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div className="cd-form-group">
              <label className="cd-label" htmlFor="artist_support_category">
                Request Type *
              </label>
              <select
                id="artist_support_category"
                className="cd-input"
                value={formData.category}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
              >
                {REQUEST_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="cd-form-group">
              <label className="cd-label" htmlFor="artist_support_subject">
                Subject *
              </label>
              <input
                id="artist_support_subject"
                type="text"
                className="cd-input"
                maxLength={200}
                placeholder="Brief summary of your request"
                value={formData.subject}
                onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="cd-form-group">
            <label className="cd-label" htmlFor="artist_support_message">
              Detailed Message *
            </label>
            <textarea
              id="artist_support_message"
              rows={4}
              className="cd-textarea"
              placeholder="Provide clear details, booking references, or steps to reproduce..."
              value={formData.message}
              onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
              required
            />
          </div>

          <div className="support-reply-footer">
            <label className="support-file-label">
              <Paperclip size={15} />
              <span>{attachment ? attachment.name : "Attach screenshot or document (optional, max 5 MB)"}</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx"
                style={{ display: "none" }}
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
            </label>

            <button
              type="submit"
              className="cd-btn-primary cd-btn-sm"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION C: TICKET CONVERSATION (when a ticket is opened) */}
      {(selectedTicket || loadingDetail) && (
        <div className="support-conversation-card" id="artist-support-conversation">
          {loadingDetail && !selectedTicket ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#9e9e9e" }}>
              Loading conversation...
            </div>
          ) : selectedTicket && (
            <>
              <div className="support-conversation-header">
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div className="support-ticket-top">
                    <button
                      type="button"
                      className="cd-btn-secondary cd-btn-sm"
                      onClick={() => setSelectedTicket(null)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <ArrowLeft size={14} />
                      Back to Tickets
                    </button>
                    <span className="support-ticket-id">{selectedTicket.ticket_number}</span>
                    <span className="support-ticket-category">{selectedTicket.category_label}</span>
                    <span className={`support-status-badge support-status-${selectedTicket.status}`}>
                      {selectedTicket.status_label}
                    </span>
                  </div>
                  <h3 className="support-ticket-subject" style={{ marginTop: "6px" }}>
                    {selectedTicket.subject}
                  </h3>
                  <div className="support-ticket-dates">
                    <span>Submitted: {selectedTicket.created_at_display}</span>
                    <span>Last updated: {selectedTicket.updated_at_display}</span>
                  </div>
                </div>
              </div>

              <div className="support-messages-thread">
                {(selectedTicket.messages || []).map((msg) => (
                  <div
                    key={msg.id}
                    className={`support-msg-row ${msg.sender_role === "admin" ? "is-admin" : "is-artist"}`}
                  >
                    <div className="support-msg-meta">
                      <span className="support-msg-sender">{msg.sender_name}</span>
                      <span className={`support-msg-role-tag ${msg.sender_role}`}>
                        {msg.sender_role === "admin" ? "Admin" : "You"}
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

              {selectedTicket.status === "closed" ? (
                <div className="support-closed-notice">
                  This ticket is closed. If you need further assistance, please submit a new support request above.
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="support-reply-form">
                  {replyError && (
                    <div className="cd-alert-error" role="alert">
                      {replyError}
                    </div>
                  )}
                  {replySuccess && (
                    <div className="cd-alert-success" role="status">
                      {replySuccess}
                    </div>
                  )}
                  <textarea
                    rows={3}
                    className="cd-textarea"
                    placeholder="Write your reply to the TalentHire support team..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="support-reply-footer">
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
                    <button
                      type="submit"
                      className="cd-btn-primary cd-btn-sm"
                      disabled={sendingReply}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <Send size={14} />
                      {sendingReply ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}

      {/* SECTION B: MY SUPPORT REQUESTS */}
      <div className="cd-profile-card">
        <div className="cd-form-header" style={{ marginBottom: "16px" }}>
          <h3 className="cd-card-title">My Support Requests</h3>
          <p className="cd-form-subtext">
            Track status updates and continue conversations with the Admin team.
          </p>
        </div>

        <div className="support-filters-bar">
          <input
            type="text"
            className="support-filter-input"
            placeholder="Search by Ticket ID or subject..."
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

        {listError && (
          <div className="cd-alert-error" role="alert" style={{ marginBottom: "14px" }}>
            {listError}
          </div>
        )}

        {loadingTickets ? (
          <div className="support-empty-box">Loading your support requests...</div>
        ) : tickets.length === 0 ? (
          <div className="support-empty-box">
            No support requests found matching the selected filters.
          </div>
        ) : (
          <div className="support-tickets-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="support-ticket-card">
                <div className="support-ticket-main">
                  <div className="support-ticket-top">
                    <span className="support-ticket-id">{ticket.ticket_number}</span>
                    <span className="support-ticket-category">{ticket.category_label}</span>
                    <span className={`support-status-badge support-status-${ticket.status}`}>
                      {ticket.status_label}
                    </span>
                    {ticket.unread_count > 0 && (
                      <span className="support-unread-pill">
                        {ticket.unread_count} unread reply
                      </span>
                    )}
                  </div>
                  <h4 className="support-ticket-subject">{ticket.subject}</h4>
                  <div className="support-ticket-dates">
                    <span>Submitted: {ticket.created_at_display}</span>
                    <span>Updated: {ticket.updated_at_display}</span>
                    <span>Messages: {ticket.message_count}</span>
                  </div>
                </div>

                <div className="support-ticket-actions">
                  <button
                    type="button"
                    className="cd-btn-secondary cd-btn-sm"
                    onClick={() => handleOpenConversation(ticket.id)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <MessageSquare size={14} />
                    View Conversation
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="support-pagination">
            <button
              type="button"
              className="cd-btn-secondary cd-btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ color: "#9e9e9e", fontSize: "0.86rem" }}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="cd-btn-secondary cd-btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
