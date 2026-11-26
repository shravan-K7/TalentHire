import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarDays,
  Clock,
  CalendarX,
  CreditCard,
  TrendingUp,
  RotateCcw,
  Layers,
  AlertCircle,
  Star,
  Bell,
  Bot,
  BarChart3,
  Settings,
  Shield,
  FileText,
  Globe,
  Headset,
} from "lucide-react";

export default function AdminSidebar({
  currentSection,
  onSelectSection,
  pendingVerificationsCount = 0,
  openComplaintsCount = 0,
  openSupportTicketsCount = 0,
  navigate,
}) {
  const navGroups = [
    {
      title: "DASHBOARD",
      items: [
        { id: "overview", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "USER MANAGEMENT",
      items: [
        { id: "users", label: "All Users", icon: Users },
        { id: "artists", label: "Artists", icon: Users },
        {
          id: "artist-verifications",
          label: "Artist Verification",
          icon: UserCheck,
          badge: pendingVerificationsCount > 0 ? pendingVerificationsCount : null,
        },
        { id: "customers", label: "Customers", icon: Users },
      ],
    },
    {
      title: "BOOKING MANAGEMENT",
      items: [
        { id: "bookings", label: "All Bookings", icon: CalendarDays },
        { id: "upcoming-events", label: "Upcoming Events", icon: Clock },
        { id: "cancellations", label: "Cancellations", icon: CalendarX },
      ],
    },
    {
      title: "FINANCIAL MANAGEMENT",
      items: [
        { id: "transactions", label: "Transactions", icon: CreditCard },
        { id: "commission", label: "Commission & Earnings", icon: TrendingUp },
        { id: "refunds", label: "Refunds", icon: RotateCcw },
      ],
    },
    {
      title: "PLATFORM MANAGEMENT",
      items: [
        { id: "categories", label: "Artist Categories", icon: Layers },
        {
          id: "complaints",
          label: "Complaints & Disputes",
          icon: AlertCircle,
          badge: openComplaintsCount > 0 ? openComplaintsCount : null,
        },
        {
          id: "support-management",
          label: "Support Management",
          icon: Headset,
          badge: openSupportTicketsCount > 0 ? openSupportTicketsCount : null,
        },
        { id: "reviews", label: "Reviews & Ratings", icon: Star },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "chatbot", label: "AI Chatbot Monitoring", icon: Bot },
      ],
    },
    {
      title: "INSIGHTS",
      items: [
        { id: "reports", label: "Reports & Analytics", icon: BarChart3 },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        { id: "settings", label: "System Settings", icon: Settings },
        { id: "roles", label: "Roles & Permissions", icon: Shield },
        { id: "activity-logs", label: "Activity Logs", icon: FileText },
      ],
    },
  ];

  return (
    <aside className="admin-sidebar" aria-label="Admin Navigation Sidebar">
      <div className="admin-sidebar-brand">
        <a
          href="/admin-dashboard"
          className="admin-brand-link"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection("overview");
          }}
        >
          <span>Talent</span>
          <span className="brand-accent">Hire</span>
          <span className="admin-brand-badge">Admin</span>
        </a>
      </div>

      <nav className="admin-sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.title} className="admin-nav-group">
            <div className="admin-nav-group-title">{group.title}</div>
            {group.items.map((item) => {
              const IconComponent = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => onSelectSection(item.id)}
                >
                  <IconComponent size={17} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="admin-nav-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <button
          type="button"
          className="admin-btn admin-btn-secondary admin-btn-sm"
          style={{ width: "100%", justifyContent: "flex-start", gap: "8px" }}
          onClick={() => {
            if (navigate) navigate("/");
            else window.location.href = "/";
          }}
        >
          <Globe size={15} />
          <span>Exit to Website</span>
        </button>
      </div>
    </aside>
  );
}
