import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  Globe,
} from "lucide-react";

export default function AdminHeader({
  user,
  currentSection,
  collapsed,
  onToggleCollapse,
  onLogout,
  navigate,
  onSelectSection,
  searchQuery,
  onSearchChange,
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifPopup(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sectionTitles = {
    overview: "Dashboard",
    users: "All Users",
    "all-users": "All Users",
    artists: "Artists",
    "artist-verifications": "Artist Verification",
    customers: "Customers",
    bookings: "All Bookings",
    "upcoming-events": "Upcoming Events",
    cancellations: "Cancellations",
    transactions: "Transactions",
    commission: "Commission & Earnings",
    refunds: "Refunds",
    categories: "Artist Categories",
    complaints: "Complaints & Disputes",
    reviews: "Reviews & Ratings",
    notifications: "Notifications",
    chatbot: "AI Chatbot Monitoring",
    reports: "Reports & Analytics",
    settings: "System Settings",
    roles: "Roles & Permissions",
    "activity-logs": "Activity Logs",
  };

  const currentTitle = sectionTitles[currentSection] || "Dashboard";
  const adminInitial = user?.username ? user.username[0].toUpperCase() : "A";

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button
          type="button"
          className="admin-sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>

        <div className="admin-breadcrumb">
          <span>Admin</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{currentTitle}</span>
        </div>
      </div>

      <div className="admin-header-right">
        <div className="admin-search-box">
          <Search size={15} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search users, bookings, artists..."
            value={searchQuery || ""}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
        </div>

        {/* Notifications Icon & Popover */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <button
            type="button"
            className="admin-header-btn"
            title="Notifications"
            onClick={() => setShowNotifPopup((prev) => !prev)}
            aria-label="Notifications"
          >
            <Bell size={17} />
            <span className="admin-header-badge-dot" />
          </button>

          {showNotifPopup && (
            <div className="admin-dropdown-popover" style={{ width: "280px" }}>
              <div className="admin-dropdown-header">
                <div className="admin-dropdown-name">System Alerts</div>
                <div className="admin-dropdown-role">Real-time platform notices</div>
              </div>
              <div style={{ padding: "8px 16px", fontSize: "0.82rem", color: "var(--admin-text-secondary)", lineHeight: "1.4" }}>
                <p style={{ margin: "4px 0" }}>• Check pending artist verifications queue</p>
                <p style={{ margin: "4px 0" }}>• Platform commission (8%) active on all bookings</p>
              </div>
              <div style={{ borderTop: "1px solid var(--admin-border)", padding: "6px 12px" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setShowNotifPopup(false);
                    onSelectSection("notifications");
                  }}
                >
                  View Announcements
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown */}
        <div className="admin-user-menu" ref={dropdownRef}>
          <button
            type="button"
            className="admin-user-menu-btn"
            onClick={() => setShowUserDropdown((prev) => !prev)}
          >
            <div className="admin-avatar">{adminInitial}</div>
            <span className="admin-user-label">
              <span>Admin</span>
              <ChevronDown size={14} style={{ color: "var(--admin-text-muted)" }} />
            </span>
          </button>

          {showUserDropdown && (
            <div className="admin-dropdown-popover">
              <div className="admin-dropdown-header">
                <div className="admin-dropdown-name">{user?.username || "Administrator"}</div>
                <div className="admin-dropdown-role">{user?.email || "Platform Staff"}</div>
              </div>

              <button
                type="button"
                className="admin-dropdown-item"
                onClick={() => {
                  setShowUserDropdown(false);
                  onSelectSection("settings");
                }}
              >
                <Settings size={15} />
                <span>System Settings</span>
              </button>

              <button
                type="button"
                className="admin-dropdown-item"
                onClick={() => {
                  setShowUserDropdown(false);
                  if (navigate) navigate("/");
                  else window.location.href = "/";
                }}
              >
                <Globe size={15} />
                <span>TalentHire Website</span>
              </button>

              <div style={{ borderTop: "1px solid var(--admin-border)", margin: "4px 0" }} />

              <button
                type="button"
                className="admin-dropdown-item danger"
                onClick={() => {
                  setShowUserDropdown(false);
                  onLogout();
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
