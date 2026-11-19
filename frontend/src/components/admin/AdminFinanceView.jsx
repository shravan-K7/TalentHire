import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { fetchAdminTransactions, fetchAdminRefunds } from "../../services/adminService";

export default function AdminFinanceView({ initialTab = "transactions" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [transactions, setTransactions] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadFinanceData() {
      try {
        if (activeTab === "refunds") {
          const data = await fetchAdminRefunds();
          if (!ignore) setRefunds(data.refunds || []);
        } else {
          const data = await fetchAdminTransactions({ search });
          if (!ignore) {
            setTransactions(data.transactions || []);
            setSummary(data.summary || {});
          }
        }
      } catch (err) {
        console.error("Error loading financial data:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadFinanceData();
    return () => { ignore = true; };
  }, [activeTab, search]);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Financial Management</h1>
          <p className="admin-page-subtitle">
            Razorpay gateway settlement, 8% platform commissions, 92% artist earnings, and refund status.
          </p>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="admin-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Gross Transaction Volume</div>
          <div className="admin-kpi-value">₹{Number(summary.total_volume || 0).toLocaleString("en-IN")}</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">TalentHire Commission (8%)</div>
          <div className="admin-kpi-value" style={{ color: "var(--admin-accent)" }}>
            ₹{Number(summary.total_commission || 0).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Artist Total Payouts (92%)</div>
          <div className="admin-kpi-value" style={{ color: "var(--admin-status-success)" }}>
            ₹{Number(summary.total_artist_payout || 0).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Successful Transactions</div>
          <div className="admin-kpi-value">{summary.successful_count || 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-toolbar">
        <div className="admin-filter-tabs">
          <button
            type="button"
            className={`admin-filter-tab ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            Razorpay Transactions
          </button>
          <button
            type="button"
            className={`admin-filter-tab ${activeTab === "refunds" ? "active" : ""}`}
            onClick={() => setActiveTab("refunds")}
          >
            Refunds & Cancellations
          </button>
        </div>

        {activeTab === "transactions" && (
          <div className="admin-search-box" style={{ width: "260px" }}>
            <Search size={15} className="admin-search-icon" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by order or txn ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="admin-panel-card">
        <div className="admin-table-wrapper">
          {activeTab === "transactions" ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Artist</th>
                  <th>Total Amount</th>
                  <th>Platform (8%)</th>
                  <th>Artist (92%)</th>
                  <th>Transaction ID</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "36px" }}>
                      <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
                      <span>Loading transactions...</span>
                    </td>
                  </tr>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="strong">#{tx.id}</td>
                      <td>{tx.booking_id}</td>
                      <td>{tx.customer}</td>
                      <td>{tx.artist}</td>
                      <td className="strong">₹{Number(tx.total_amount).toLocaleString("en-IN")}</td>
                      <td style={{ color: "var(--admin-accent)", fontWeight: 600 }}>
                        ₹{Number(tx.commission_amount).toLocaleString("en-IN")}
                      </td>
                      <td style={{ color: "var(--admin-status-success)", fontWeight: 600 }}>
                        ₹{Number(tx.artist_amount).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <code style={{ fontSize: "0.82rem", color: "var(--admin-text-secondary)" }}>
                          {tx.transaction_id || tx.razorpay_order_id}
                        </code>
                      </td>
                      <td>
                        <span className={`admin-status-pill ${tx.status.toLowerCase()}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td>{tx.created_at}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "36px" }}>
                      No payment transactions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Refund ID</th>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Artist</th>
                  <th>Refund Amount</th>
                  <th>Razorpay Refund ID</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center", padding: "36px" }}>
                      <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
                      <span>Loading refunds...</span>
                    </td>
                  </tr>
                ) : refunds.length > 0 ? (
                  refunds.map((rf) => (
                    <tr key={rf.id}>
                      <td className="strong">#RF-{rf.id}</td>
                      <td>{rf.booking_id}</td>
                      <td>{rf.customer}</td>
                      <td>{rf.artist}</td>
                      <td className="strong" style={{ color: "var(--admin-status-warning)" }}>
                        ₹{Number(rf.amount).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <code>{rf.razorpay_refund_id}</code>
                      </td>
                      <td>
                        <span className={`admin-status-pill ${rf.status.toLowerCase()}`}>
                          {rf.status}
                        </span>
                      </td>
                      <td>{rf.reason || "Booking cancellation refund"}</td>
                      <td>{rf.created_at}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center", padding: "36px" }}>
                      No refund requests logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
