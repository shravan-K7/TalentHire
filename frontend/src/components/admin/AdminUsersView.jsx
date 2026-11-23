import { useState, useEffect } from "react";
import { Search, UserX, UserCheck } from "lucide-react";
import { fetchAdminUsers, toggleUserStatus } from "../../services/adminService";

export default function AdminUsersView({ defaultRole = "all" }) {
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRole(defaultRole);
    setPage(1);
  }, [defaultRole]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchAdminUsers({ search, role, status, page });
        if (!ignore) {
          setUsers(data.users || []);
          setTotalCount(data.total_count || 0);
          setMessage("");
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error loading users:", err);
          setMessage(err.message || "Failed to load users.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [search, role, status, page]);

  async function handleToggleStatus(userId) {
    setActionLoading(userId);
    try {
      const res = await toggleUserStatus(userId);
      setMessage(res.message);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: res.is_active } : u))
      );
    } catch (err) {
      alert(err.message || "Could not toggle user status.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            {role === "artist" ? "Performing Artists" : role === "customer" ? "Customers" : "User Management"}
          </h1>
          <p className="admin-page-subtitle">
            Manage user accounts, credentials, statuses, and profiles. Total registered: {totalCount}
          </p>
        </div>
      </div>

      {message && (
        <div style={{ padding: "10px 16px", background: "rgba(16, 185, 129, 0.15)", color: "var(--admin-status-success)", borderRadius: "6px", marginBottom: "16px", fontSize: "0.94rem" }}>
          {message}
        </div>
      )}

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-group">
          <div className="admin-search-box" style={{ width: "260px" }}>
            <Search size={15} className="admin-search-icon" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="admin-filter-tabs">
            <button
              type="button"
              className={`admin-filter-tab ${role === "all" ? "active" : ""}`}
              onClick={() => { setRole("all"); setPage(1); }}
            >
              All Roles
            </button>
            <button
              type="button"
              className={`admin-filter-tab ${role === "customer" ? "active" : ""}`}
              onClick={() => { setRole("customer"); setPage(1); }}
            >
              Customers
            </button>
            <button
              type="button"
              className={`admin-filter-tab ${role === "artist" ? "active" : ""}`}
              onClick={() => { setRole("artist"); setPage(1); }}
            >
              Artists
            </button>
            <button
              type="button"
              className={`admin-filter-tab ${role === "admin" ? "active" : ""}`}
              onClick={() => { setRole("admin"); setPage(1); }}
            >
              Admins
            </button>
          </div>
        </div>

        <div className="admin-toolbar-group">
          <select
            className="admin-select"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-panel-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name & Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Location / Category</th>
                <th>Bookings</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "36px" }}>
                    <div className="admin-spinner" style={{ margin: "0 auto 10px" }} />
                    <span>Loading users...</span>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="strong">#{u.id}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--admin-text-primary)" }}>{u.name}</div>
                        <div style={{ fontSize: "0.88rem", color: "var(--admin-text-muted)" }}>@{u.username}</div>
                      </div>
                    </td>
                    <td>{u.email || "No email"}</td>
                    <td>
                      <span
                        className="admin-status-pill"
                        style={{
                          background: u.role === "admin" ? "var(--admin-status-purple-bg)" : u.role === "artist" ? "rgba(255, 87, 34, 0.15)" : "var(--admin-status-info-bg)",
                          color: u.role === "admin" ? "var(--admin-status-purple)" : u.role === "artist" ? "var(--admin-accent)" : "var(--admin-status-info)",
                        }}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div>{u.location || "India"}</div>
                        {u.category && (
                          <div style={{ fontSize: "0.86rem", color: "var(--admin-text-muted)" }}>{u.category}</div>
                        )}
                      </div>
                    </td>
                    <td>{u.bookings_count}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-start" }}>
                        <span className={`admin-status-pill ${u.is_active ? "active" : "inactive"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                        {u.role === "artist" && (
                          <span
                            className={`admin-status-pill ${u.is_verified ? "success" : "warning"}`}
                            style={{ fontSize: "0.76rem", padding: "2px 8px" }}
                          >
                            {u.is_verified ? "Verified" : "Pending Verification"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {u.role !== "admin" && (
                        <button
                          type="button"
                          className={`admin-btn admin-btn-sm ${u.is_active ? "admin-btn-secondary" : "admin-btn-success"}`}
                          disabled={actionLoading === u.id}
                          onClick={() => handleToggleStatus(u.id)}
                        >
                          {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                          <span>{u.is_active ? "Deactivate" : "Activate"}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "36px" }}>
                    No users matching criteria.
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
