import { useState, useEffect, useRef, useCallback } from "react";
import { getCsrfToken } from "../js/auth";
import "../css/Chatbot.css";

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned an unexpected response (HTTP ${response.status}). Please ensure the backend server is restarted.`
    );
  }
}

function renderInlineBold(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
}

function FormattedMessage({ content }) {
  const lines = String(content || "").split(/\r?\n/);
  const blocks = [];
  let listItems = [];
  let listType = null;

  const flushList = (keyPrefix) => {
    if (listItems.length === 0) return;
    if (listType === "ol") {
      blocks.push(
        <ol key={`${keyPrefix}-ol`} className="chatbot-fmt-list">
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineBold(item)}</li>
          ))}
        </ol>
      );
    } else {
      blocks.push(
        <ul key={`${keyPrefix}-ul`} className="chatbot-fmt-list">
          {listItems.map((item, i) => (
            <li key={i}>{renderInlineBold(item)}</li>
          ))}
        </ul>
      );
    }
    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`empty-${idx}`);
      return;
    }

    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      flushList(`hd-${idx}`);
      blocks.push(
        <div key={`h-${idx}`} className="chatbot-fmt-heading">
          {renderInlineBold(headingMatch[1])}
        </div>
      );
      return;
    }

    const ulMatch = line.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      if (listType === "ol") flushList(`sw-${idx}`);
      listType = "ul";
      listItems.push(ulMatch[1]);
      return;
    }

    const olMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (listType === "ul") flushList(`sw-${idx}`);
      listType = "ol";
      listItems.push(olMatch[1]);
      return;
    }

    flushList(`p-${idx}`);
    blocks.push(
      <p key={`p-${idx}`} className="chatbot-fmt-para">
        {renderInlineBold(line)}
      </p>
    );
  });

  flushList("end");
  return <div className="chatbot-fmt-root">{blocks}</div>;
}

const ROLE_CONFIG = {
  customer: {
    subtitle: "Customer AI Assistant",
    welcome:
      "Hi! I'm the TalentHire AI Assistant. Ask me about finding performing artists, checking availability, your bookings, payments, favorites, or cancellation policies.",
    suggestions: [
      "Show my upcoming bookings",
      "Check my payment status",
      "Show my favorite artists",
      "Explain my cancellation policy",
      "Show my notifications",
    ],
  },
  artist: {
    subtitle: "Artist AI Assistant",
    welcome:
      "Hi! I'm the TalentHire AI Assistant for Performing Artists. Ask me about incoming booking requests, your upcoming shows, earnings, profile verification, availability, or rescheduling requests.",
    suggestions: [
      "Show my pending booking requests",
      "Show my upcoming bookings",
      "How much have I earned?",
      "Is my profile verified?",
      "Show my availability",
      "Do I have any pending rescheduling requests?",
    ],
  },
};

function Chatbot({ user, navigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const tempIdRef = useRef(0);

  const isAuthenticated = Boolean(user);
  const uiRole =
    user?.is_artist || user?.role === "artist" ? "artist" : "customer";
  const roleConfig = ROLE_CONFIG[uiRole];

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingHistory(true);
    setError("");

    try {
      const response = await fetch("/api/chat/history/", {
        method: "GET",
        credentials: "include",
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Unable to load chat history.");
      }
      setSessionId(data.session_id ?? null);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      setError(err.message || "Unable to load conversation history.");
    } finally {
      setLoadingHistory(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && isOpen) {
      loadHistory();
    }
  }, [isAuthenticated, isOpen, loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, isOpen]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      inputRef.current?.focus();
    }
  }, [isOpen, isAuthenticated]);

  async function sendMessageText(rawText) {
    const trimmed = rawText.trim();
    if (!trimmed || sending || resetting || !isAuthenticated) return;

    setError("");
    setInputValue("");

    tempIdRef.current += 1;
    const tempId = `temp-${tempIdRef.current}`;
    const optimisticUserMsg = {
      id: tempId,
      sender: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setSending(true);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/chat/message/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          message: trimmed,
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
      });

      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Failed to get a response.");
      }

      setSessionId(data.session_id ?? sessionId);
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return [...withoutTemp, data.user_message, data.assistant_message];
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputValue(trimmed);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    sendMessageText(inputValue);
  }

  async function handleResetChat() {
    if (!isAuthenticated || sending || resetting) return;
    setResetting(true);
    setError("");

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/chat/reset/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Unable to reset conversation.");
      }
      setSessionId(data.session_id ?? null);
      setMessages([]);
    } catch (err) {
      setError(err.message || "Unable to reset conversation.");
    } finally {
      setResetting(false);
    }
  }

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const followupSuggestions =
    lastMessage?.sender === "assistant" && Array.isArray(lastMessage?.metadata?.suggestions)
      ? lastMessage.metadata.suggestions
      : [];

  return (
    <div className="chatbot">
      {isOpen && (
        <section className="chatbot-window" aria-label="TalentHire AI Assistant">
          <header className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-header-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FF5722"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  <path d="M19 19v1a2 2 0 0 1-2 2h-3" />
                </svg>
              </div>
              <div>
                <strong>TalentHire AI</strong>
                <small>{isAuthenticated ? roleConfig.subtitle : "Support Assistant"}</small>
              </div>
            </div>

            <div className="chatbot-header-actions">
              {isAuthenticated && (
                <button
                  type="button"
                  className="chatbot-reset-btn"
                  onClick={handleResetChat}
                  disabled={sending || resetting}
                  title="Start a new conversation"
                >
                  {resetting ? "..." : "New Chat"}
                </button>
              )}
              <button
                type="button"
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close support"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          <div className="chatbot-messages">
            {!isAuthenticated ? (
              <div className="chatbot-auth-gate">
                <div className="chat-message assistant">
                  Welcome to TalentHire! Sign in as a Customer or Performing Artist to chat with the TalentHire AI Assistant.
                </div>
                <button
                  type="button"
                  className="chatbot-signin-btn"
                  onClick={() => {
                    setIsOpen(false);
                    if (navigate) navigate("/login");
                  }}
                >
                  Sign In to Chat
                </button>
              </div>
            ) : loadingHistory ? (
              <div className="chatbot-status-text">Loading conversation...</div>
            ) : (
              <>
                <div className="chat-message assistant">
                  <FormattedMessage content={roleConfig.welcome} />
                </div>

                {messages.length === 0 && (
                  <div className="chatbot-suggestions">
                    <span className="chatbot-suggestions-label">Suggested questions:</span>
                    {roleConfig.suggestions.map((question) => (
                      <button
                        type="button"
                        key={question}
                        className="chatbot-suggestion-chip"
                        onClick={() => sendMessageText(question)}
                        disabled={sending}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((msg) => {
                  const artistCards =
                    msg.sender === "assistant" && Array.isArray(msg.metadata?.artists)
                      ? msg.metadata.artists
                      : [];
                  return (
                    <div key={msg.id} className="chatbot-msg-group">
                      <div
                        className={`chat-message ${msg.sender === "user" ? "user" : "assistant"}`}
                      >
                        {msg.sender === "user" ? (
                          msg.content
                        ) : (
                          <FormattedMessage content={msg.content} />
                        )}
                      </div>

                      {artistCards.length > 0 && (
                        <div className="chatbot-artist-cards">
                          {artistCards.map((artist) => (
                            <div key={artist.artist_id} className="chatbot-artist-card">
                              <div className="chatbot-artist-card-top">
                                <div>
                                  <div className="chatbot-artist-name">
                                    {artist.stage_name}
                                    {artist.is_verified && (
                                      <span className="chatbot-verified-badge" title="Verified Artist">
                                        ✓ Verified
                                      </span>
                                    )}
                                  </div>
                                  <div className="chatbot-artist-meta">
                                    {artist.category}
                                    {artist.location ? ` • ${artist.location}` : ""}
                                  </div>
                                </div>
                                {artist.starting_price_inr && (
                                  <div className="chatbot-artist-price">
                                    ₹{Number(artist.starting_price_inr).toLocaleString("en-IN")}
                                  </div>
                                )}
                              </div>
                              {navigate && (
                                <button
                                  type="button"
                                  className="chatbot-artist-link-btn"
                                  onClick={() => {
                                    navigate(`/artists/${artist.artist_id}`);
                                  }}
                                >
                                  View Profile →
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!sending && followupSuggestions.length > 0 && (
                  <div className="chatbot-followups">
                    {followupSuggestions.map((item) => (
                      <button
                        type="button"
                        key={item}
                        className="chatbot-followup-chip"
                        onClick={() => sendMessageText(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}

                {sending && (
                  <div className="chat-message assistant chatbot-typing" aria-live="polite">
                    <span>Thinking</span>
                    <span className="chatbot-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                )}
              </>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="chatbot-error" role="alert">
              <span>{error}</span>
              <button
                type="button"
                className="chatbot-error-dismiss"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {isAuthenticated && (
            <form className="chatbot-input-form" onSubmit={handleFormSubmit}>
              <input
                ref={inputRef}
                type="text"
                className="chatbot-input"
                placeholder="Ask a TalentHire question..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                maxLength={1000}
                disabled={sending || resetting}
                aria-label="Chat message"
              />
              <button
                type="submit"
                className="chatbot-send-btn"
                disabled={!inputValue.trim() || sending || resetting}
                aria-label="Send message"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          )}
        </section>
      )}

      <button
        type="button"
        className={`chatbot-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Close Support" : "Support"}
        title={isOpen ? "Close Support" : "Support"}
      >
        {isOpen ? (
          <svg
            className="chatbot-toggle-icon"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            className="chatbot-toggle-icon"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            <path d="M19 19v1a2 2 0 0 1-2 2h-3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default Chatbot;
