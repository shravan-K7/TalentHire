import React, { useState, useMemo, useCallback } from "react";
import { Search, Copy, Check, AlertCircle, RefreshCw } from "lucide-react";
import "./CustomerPaymentHistory.css";

/**
 * Safely parse a date string or timestamp into a valid Date object.
 */
function parseDate(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a Date object or fallback date string into { dateStr, timeStr }.
 */
function formatDateTime(parsedDate, fallbackStr) {
  if (parsedDate) {
    const dateStr = parsedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const timeStr = parsedDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { dateStr, timeStr };
  }

  if (fallbackStr && typeof fallbackStr === "string") {
    const parts = fallbackStr.trim().split(" ");
    if (parts.length >= 5) {
      // e.g. "Nov 12, 2026 02:31 PM"
      return {
        dateStr: `${parts[0]} ${parts[1]} ${parts[2]}`,
        timeStr: `${parts[3]} ${parts[4]}`,
      };
    }
    return { dateStr: fallbackStr, timeStr: "" };
  }

  return { dateStr: "—", timeStr: "" };
}

/**
 * Format amount as Indian Currency: ₹1,80,600.00
 */
function formatCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return (
    "₹" +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)
  );
}

export default function CustomerPaymentHistory({
  bookings = [],
  payments = [],
  loading = false,
  error = null,
  onOpenReceipt,
  onPayNow,
  onViewDetails,
  paymentLoadingId = null,
  showToast,
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [copiedTxn, setCopiedTxn] = useState(null);
  const [currentTimestamp] = useState(() => Date.now());

  // Copy transaction ID to clipboard with toast notification
  const handleCopyTransactionId = useCallback(
    (txnId) => {
      if (!txnId) return;
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard
          .writeText(txnId)
          .then(() => {
            setCopiedTxn(txnId);
            setTimeout(() => setCopiedTxn(null), 2000);
            if (showToast) {
              showToast("Transaction ID copied to clipboard!");
            }
          })
          .catch(() => {
            // Fallback for non-secure contexts
            const el = document.createElement("textarea");
            el.value = txnId;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopiedTxn(txnId);
            setTimeout(() => setCopiedTxn(null), 2000);
            if (showToast) {
              showToast("Transaction ID copied to clipboard!");
            }
          });
      }
    },
    [showToast]
  );

  // Normalize and unify database records into clean transaction rows
  const unifiedTransactions = useMemo(() => {
    const list = [];
    const processedBookingIds = new Set();

    (bookings || []).forEach((b) => {
      processedBookingIds.add(b.id);
      const p =
        b.payment ||
        (payments || []).find((pay) => pay.booking_id === b.id) ||
        null;

      const isPaid =
        p &&
        (p.status === "success" ||
          p.status === "SUCCESS" ||
          p.status === "completed" ||
          p.status === "COMPLETED" ||
          p.status === "paid" ||
          p.status === "PAID");

      const isRefunded =
        p &&
        (p.status === "refunded" ||
          p.status === "REFUNDED");

      const isPartiallyRefunded =
        p &&
        (p.status === "partially_refunded" ||
          p.status === "PARTIALLY_REFUNDED");

      let statusKey = "pending";
      let statusLabel = "Pending";

      if (isPaid) {
        statusKey = "paid";
        statusLabel = "Paid";
      } else if (isRefunded) {
        statusKey = "refunded";
        statusLabel = "Refunded";
      } else if (isPartiallyRefunded) {
        statusKey = "partially_refunded";
        statusLabel = "Partially Refunded";
      } else if (b.status === "accepted") {
        statusKey = "payment_due";
        statusLabel = "Payment due";
      } else if (b.status === "pending") {
        statusKey = "awaiting_artist";
        statusLabel = "Awaiting artist";
      } else if (b.status === "cancelled") {
        statusKey = "cancelled";
        statusLabel = "Cancelled";
      } else if (b.status === "rejected") {
        statusKey = "rejected";
        statusLabel = "Rejected";
      } else {
        statusKey = b.status || "pending";
        statusLabel = b.status
          ? b.status.charAt(0).toUpperCase() + b.status.slice(1)
          : "Pending";
      }

      // Determine payment amount
      let amount = null;
      if (isPaid || isRefunded || isPartiallyRefunded) {
        amount = Number(p.amount ?? b.payment?.amount ?? b.agreed_price ?? 0);
      } else if (statusKey === "payment_due") {
        amount = Number(b.agreed_price ?? p?.amount ?? 0);
      } else if (statusKey === "awaiting_artist") {
        amount = null; // Display em dash
      } else if (b.status === "cancelled" || b.status === "rejected") {
        amount = p?.amount
          ? Number(p.amount)
          : b.agreed_price
          ? Number(b.agreed_price)
          : null;
      }

      // Transaction ID
      const transactionId =
        p?.transaction_id && String(p.transaction_id).trim() !== ""
          ? String(p.transaction_id).trim()
          : null;

      // Determine date and time
      const dateSource =
        isPaid && p?.date
          ? p.date
          : p?.created_at || b.created_at_iso || b.created_at;
      const parsedDate = parseDate(dateSource);
      const { dateStr, timeStr } = formatDateTime(parsedDate, dateSource);

      const artistName =
        b.artist_name ||
        b.artist?.stage_name ||
        b.artist?.name ||
        p?.artist_name ||
        "Artist";

      list.push({
        key: `txn-booking-${b.id}${p ? `-pay-${p.id}` : ""}`,
        bookingId: b.id,
        displayBookingId: `#BK-${b.id}`,
        artistName,
        transactionId,
        statusKey,
        statusLabel,
        amount,
        dateStr,
        timeStr,
        parsedDate,
        booking: b,
        payment: p,
      });
    });

    // Capture any standalone payments not matched to existing bookings
    (payments || []).forEach((p) => {
      if (!processedBookingIds.has(p.booking_id)) {
        const isPaid =
          p.status === "success" ||
          p.status === "SUCCESS" ||
          p.status === "completed" ||
          p.status === "paid";
        const isRefunded = p.status === "refunded";
        const statusKey = isPaid ? "paid" : isRefunded ? "refunded" : "pending";
        const statusLabel = isPaid
          ? "Paid"
          : isRefunded
          ? "Refunded"
          : "Pending";
        const transactionId =
          p.transaction_id && String(p.transaction_id).trim() !== ""
            ? String(p.transaction_id).trim()
            : null;
        const parsedDate = parseDate(p.date || p.created_at);
        const { dateStr, timeStr } = formatDateTime(parsedDate, p.date);

        list.push({
          key: `txn-orphan-pay-${p.id}`,
          bookingId: p.booking_id,
          displayBookingId: p.booking_id ? `#BK-${p.booking_id}` : "—",
          artistName: p.artist_name || "Artist",
          transactionId,
          statusKey,
          statusLabel,
          amount: Number(p.amount) || 0,
          dateStr,
          timeStr,
          parsedDate,
          booking: {
            id: p.booking_id,
            artist_name: p.artist_name,
            status: "completed",
            payment: p,
          },
          payment: p,
        });
      }
    });

    // Sort descending: newest date or highest booking ID first
    list.sort((a, b) => {
      const timeA = a.parsedDate ? a.parsedDate.getTime() : 0;
      const timeB = b.parsedDate ? b.parsedDate.getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.bookingId || 0) - (a.bookingId || 0);
    });

    return list;
  }, [bookings, payments]);

  // Compute dynamic summary statistics strictly from database records
  const stats = useMemo(() => {
    let totalPaid = 0;
    let paidCount = 0;
    let paymentDue = 0;
    let dueCount = 0;
    let awaitingArtist = 0;
    let thisMonthPaid = 0;

    const now = new Date(currentTimestamp);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    unifiedTransactions.forEach((item) => {
      if (item.statusKey === "paid") {
        const amt = Number(item.amount) || 0;
        totalPaid += amt;
        paidCount += 1;
        if (
          item.parsedDate &&
          item.parsedDate.getMonth() === currentMonth &&
          item.parsedDate.getFullYear() === currentYear
        ) {
          thisMonthPaid += amt;
        }
      } else if (item.statusKey === "payment_due") {
        const amt = Number(item.amount) || 0;
        paymentDue += amt;
        dueCount += 1;
      } else if (item.statusKey === "awaiting_artist") {
        awaitingArtist += 1;
      }
    });

    const currentMonthLabel = now.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    return {
      totalPaid,
      paidCount,
      paymentDue,
      dueCount,
      awaitingArtist,
      thisMonthPaid,
      currentMonthLabel,
    };
  }, [unifiedTransactions, currentTimestamp]);

  // Filtered transactions based on search query, status filter, and date filter
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date(currentTimestamp);
    const thirtyDaysAgo = currentTimestamp - 30 * 24 * 60 * 60 * 1000;

    return unifiedTransactions.filter((item) => {
      // 1. Search Query Filter
      if (q) {
        const matchTxn =
          item.transactionId && item.transactionId.toLowerCase().includes(q);
        const matchBookingId =
          String(item.bookingId).toLowerCase().includes(q) ||
          item.displayBookingId.toLowerCase().includes(q);
        const matchArtist =
          item.artistName && item.artistName.toLowerCase().includes(q);

        if (!matchTxn && !matchBookingId && !matchArtist) {
          return false;
        }
      }

      // 2. Status Dropdown Filter
      if (statusFilter !== "all") {
        if (item.statusKey !== statusFilter) {
          return false;
        }
      }

      // 3. Date Range Filter
      if (dateFilter !== "all" && item.parsedDate) {
        const d = item.parsedDate;
        if (dateFilter === "this_month") {
          if (
            d.getMonth() !== now.getMonth() ||
            d.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        } else if (dateFilter === "last_30_days") {
          if (d.getTime() < thirtyDaysAgo) {
            return false;
          }
        } else if (dateFilter === "this_year") {
          if (d.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [unifiedTransactions, searchQuery, statusFilter, dateFilter, currentTimestamp]);

  // Reset filters handler
  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("all");
  }, []);

  return (
    <div className="th-payhistory-root">
      {/* Page Title & Subtitle */}
      <header className="th-payhistory-header">
        <h1 className="th-payhistory-title">Payment History</h1>
        <p className="th-payhistory-subtitle">
          Your payments, receipts and transaction details.
        </p>
      </header>

      {/* Top 4 Summary Cards */}
      <section
        className="th-payhistory-stats-grid"
        aria-label="Payment summary statistics"
      >
        {/* TOTAL PAID CARD */}
        <div className="th-paystat-card">
          <div className="th-paystat-label">TOTAL PAID</div>
          <div className="th-paystat-value">
            {formatCurrency(stats.totalPaid)}
          </div>
          <div className="th-paystat-subtext">
            {stats.paidCount} {stats.paidCount === 1 ? "transaction" : "transactions"}
          </div>
        </div>

        {/* PAYMENT DUE CARD (Highlighted amber if payment due) */}
        <div
          className={`th-paystat-card th-paystat-due ${
            stats.paymentDue > 0 ? "has-due" : ""
          }`}
        >
          <div className="th-paystat-label">PAYMENT DUE</div>
          <div className="th-paystat-value">
            {formatCurrency(stats.paymentDue)}
          </div>
          <div className="th-paystat-subtext">
            {stats.dueCount}{" "}
            {stats.dueCount === 1 ? "booking accepted" : "bookings accepted"}
          </div>
        </div>

        {/* AWAITING ARTIST CARD */}
        <div className="th-paystat-card">
          <div className="th-paystat-label">AWAITING ARTIST</div>
          <div className="th-paystat-value">{stats.awaitingArtist}</div>
          <div className="th-paystat-subtext">No payment needed yet</div>
        </div>

        {/* THIS MONTH CARD */}
        <div className="th-paystat-card">
          <div className="th-paystat-label">THIS MONTH</div>
          <div className="th-paystat-value">
            {formatCurrency(stats.thisMonthPaid)}
          </div>
          <div className="th-paystat-subtext">{stats.currentMonthLabel}</div>
        </div>
      </section>

      {/* Controls Bar: Search + Status Dropdown + Date Dropdown + Transaction Counter */}
      <div className="th-payhistory-controls">
        <div className="th-payhistory-search-wrap">
          <Search className="th-payhistory-search-icon" size={17} />
          <input
            type="text"
            className="th-payhistory-search-input"
            placeholder="Search by transaction ID, booking ID or artist"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search payment history"
          />
        </div>

        <div className="th-payhistory-filter-group">
          {/* Status Dropdown Filter */}
          <div className="th-select-wrapper">
            <select
              className="th-payhistory-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All status</option>
              <option value="paid">Paid</option>
              <option value="payment_due">Payment due</option>
              <option value="awaiting_artist">Awaiting artist</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Range Dropdown Filter */}
          <div className="th-select-wrapper">
            <select
              className="th-payhistory-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date range"
            >
              <option value="all">All time</option>
              <option value="this_month">This month</option>
              <option value="last_30_days">Last 30 days</option>
              <option value="this_year">This year</option>
            </select>
          </div>

          {/* Dynamic Transaction Counter */}
          <span className="th-payhistory-count">
            {filteredTransactions.length}{" "}
            {filteredTransactions.length === 1 ? "transaction" : "transactions"}
          </span>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="th-payhistory-alert" role="alert">
          <AlertCircle size={18} className="th-payhistory-alert-icon" />
          <div className="th-payhistory-alert-msg">{error}</div>
          {onRefresh && (
            <button
              type="button"
              className="th-payhistory-retry-btn"
              onClick={onRefresh}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="th-payhistory-table-container">
          <div className="th-payhistory-loading-wrap">
            <div className="th-payhistory-spinner" />
            <p>Loading payment records...</p>
          </div>
        </div>
      ) : unifiedTransactions.length === 0 ? (
        /* Empty Database State */
        <div className="th-payhistory-empty-card">
          <div className="th-payhistory-empty-icon-wrap">
            <Search size={32} />
          </div>
          <h3 className="th-payhistory-empty-title">No Transactions Found</h3>
          <p className="th-payhistory-empty-desc">
            Once you book an artist and initiate transactions, payment receipts
            and records will appear here.
          </p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        /* Filter Empty State */
        <div className="th-payhistory-empty-card">
          <div className="th-payhistory-empty-icon-wrap">
            <Search size={32} />
          </div>
          <h3 className="th-payhistory-empty-title">
            No matching transactions
          </h3>
          <p className="th-payhistory-empty-desc">
            No records matched your search query or selected filters.
          </p>
          <button
            type="button"
            className="th-payhistory-reset-btn"
            onClick={handleResetFilters}
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* Transaction Table */
        <div className="th-payhistory-table-container">
          <table
            className="th-payhistory-table"
            aria-label="Payment History Table"
          >
            <thead>
              <tr>
                <th scope="col" className="th-col-date">
                  DATE &amp; TIME
                </th>
                <th scope="col" className="th-col-txn">
                  TRANSACTION ID
                </th>
                <th scope="col" className="th-col-booking">
                  BOOKING
                </th>
                <th scope="col" className="th-col-amount">
                  AMOUNT
                </th>
                <th scope="col" className="th-col-status">
                  STATUS
                </th>
                <th scope="col" className="th-col-actions">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((item) => {
                const canPayNow =
                  item.statusKey === "payment_due" && onPayNow;
                const canViewReceipt =
                  (item.statusKey === "paid" ||
                    item.statusKey === "refunded") &&
                  onOpenReceipt;

                return (
                  <tr key={item.key} className="th-payhistory-row">
                    {/* 1. DATE & TIME */}
                    <td className="th-td-date">
                      <div className="th-date-primary">{item.dateStr}</div>
                      {item.timeStr && (
                        <div className="th-date-time">{item.timeStr}</div>
                      )}
                    </td>

                    {/* 2. TRANSACTION ID */}
                    <td className="th-td-txn">
                      {item.transactionId ? (
                        <div className="th-txn-wrap">
                          <span className="th-txn-code">
                            {item.transactionId}
                          </span>
                          <button
                            type="button"
                            className="th-copy-btn"
                            onClick={() =>
                              handleCopyTransactionId(item.transactionId)
                            }
                            title="Copy Transaction ID"
                            aria-label={`Copy transaction ID ${item.transactionId}`}
                          >
                            {copiedTxn === item.transactionId ? (
                              <Check size={13} className="th-copied-icon" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="th-txn-not-generated">
                          Not yet generated
                        </span>
                      )}
                    </td>

                    {/* 3. BOOKING */}
                    <td className="th-td-booking">
                      <div className="th-booking-id">
                        {item.displayBookingId}
                      </div>
                      <div className="th-artist-name">{item.artistName}</div>
                    </td>

                    {/* 4. AMOUNT */}
                    <td className="th-td-amount">
                      <span className="th-amount-val">
                        {item.amount !== null
                          ? formatCurrency(item.amount)
                          : "—"}
                      </span>
                    </td>

                    {/* 5. STATUS */}
                    <td className="th-td-status">
                      <span
                        className={`th-status-pill status-${item.statusKey}`}
                      >
                        {item.statusLabel}
                      </span>
                    </td>

                    {/* 6. ACTIONS */}
                    <td className="th-td-actions">
                      <div className="th-actions-flex">
                        {/* Pay Now Button (Orange accent for payment due) */}
                        {canPayNow && (
                          <button
                            type="button"
                            className="th-btn-action th-btn-pay"
                            onClick={() => onPayNow(item.booking)}
                            disabled={paymentLoadingId === item.bookingId}
                          >
                            {paymentLoadingId === item.bookingId
                              ? "Processing..."
                              : "Pay now"}
                          </button>
                        )}

                        {/* Receipt Button */}
                        {canViewReceipt && (
                          <button
                            type="button"
                            className="th-btn-action th-btn-receipt"
                            onClick={() =>
                              onOpenReceipt({
                                id: item.payment?.id || item.booking?.id || item.bookingId,
                                booking_id: item.bookingId,
                                amount: item.amount,
                                status: item.statusLabel,
                                transaction_id: item.transactionId || "Pending",
                                date: item.dateStr + (item.timeStr ? ` ${item.timeStr}` : ""),
                                artist_name: item.artistName,
                                payment: item.payment,
                                agreed_price: item.booking?.agreed_price,
                              })
                            }
                          >
                            Receipt
                          </button>
                        )}

                        {/* Details Button */}
                        {onViewDetails && (
                          <button
                            type="button"
                            className="th-btn-action th-btn-details"
                            onClick={() => onViewDetails(item.booking)}
                          >
                            Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Table Footer Text */}
      <footer className="th-payhistory-footer">
        Showing 1–{filteredTransactions.length} of{" "}
        {unifiedTransactions.length} · Payments are processed securely
        through Razorpay.
      </footer>
    </div>
  );
}
