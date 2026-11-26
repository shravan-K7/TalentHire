import { useState, useEffect, useCallback } from "react";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";
import AdminOverviewView from "../components/admin/AdminOverviewView";
import AdminUsersView from "../components/admin/AdminUsersView";
import AdminVerificationsView from "../components/admin/AdminVerificationsView";
import AdminBookingsView from "../components/admin/AdminBookingsView";
import AdminFinanceView from "../components/admin/AdminFinanceView";
import AdminCategoriesView from "../components/admin/AdminCategoriesView";
import AdminComplaintsView from "../components/admin/AdminComplaintsView";
import AdminSupportView from "../components/admin/AdminSupportView";
import AdminReviewsView from "../components/admin/AdminReviewsView";
import AdminNotificationsView from "../components/admin/AdminNotificationsView";
import AdminChatbotView from "../components/admin/AdminChatbotView";
import AdminReportsView from "../components/admin/AdminReportsView";
import AdminSettingsView from "../components/admin/AdminSettingsView";
import { fetchAdminOverview } from "../services/adminService";
import "../css/AdminDashboard.css";

const VALID_ADMIN_SECTIONS = new Set([
  "overview",
  "users",
  "all-users",
  "artists",
  "artist-verifications",
  "customers",
  "bookings",
  "upcoming-events",
  "cancellations",
  "transactions",
  "commission",
  "refunds",
  "categories",
  "complaints",
  "support-management",
  "reviews",
  "notifications",
  "chatbot",
  "reports",
  "settings",
  "roles",
  "activity-logs",
]);

function getSectionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("section") || params.get("tab");
  if (fromQuery && VALID_ADMIN_SECTIONS.has(fromQuery)) {
    return fromQuery;
  }
  const pathParts = window.location.pathname.replace(/\/+$/, "").split("/");
  const lastPart = pathParts[pathParts.length - 1];
  if (lastPart && lastPart !== "admin-dashboard" && lastPart !== "admin" && VALID_ADMIN_SECTIONS.has(lastPart)) {
    return lastPart;
  }
  return "overview";
}

export default function AdminDashboard({ user, onLogout, navigate }) {
  const [currentSection, setCurrentSection] = useState(() => getSectionFromUrl());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  function selectSection(sec) {
    const nextSection = VALID_ADMIN_SECTIONS.has(sec) ? sec : "overview";
    setCurrentSection(nextSection);
    const currentUrl = new URL(window.location.href);
    currentUrl.pathname = "/admin-dashboard";
    if (nextSection === "overview") {
      currentUrl.searchParams.delete("section");
      currentUrl.searchParams.delete("tab");
    } else {
      currentUrl.searchParams.set("section", nextSection);
      currentUrl.searchParams.delete("tab");
    }
    window.history.replaceState(null, "", currentUrl.pathname + currentUrl.search);
  }

  useEffect(() => {
    function handlePopState() {
      setCurrentSection(getSectionFromUrl());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const refreshDashboardData = useCallback(async () => {
    try {
      const data = await fetchAdminOverview();
      setOverviewData(data);
    } catch (err) {
      console.error("Failed to refresh admin metrics:", err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await fetchAdminOverview();
        if (!ignore) {
          setOverviewData(data);
        }
      } catch (err) {
        console.error("Admin dashboard access error:", err);
      } finally {
        if (!ignore) setOverviewLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  // Security guard check: immediately block non-staff users
  if (!user?.is_staff && !user?.is_superuser && user?.role !== "admin") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#111215",
          color: "#f3f4f6",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", marginBottom: "16px" }}>
          ⚠️
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 8px" }}>Access Restricted</h1>
        <p style={{ color: "#9ca3af", maxWidth: "420px", marginBottom: "20px", fontSize: "0.9rem" }}>
          The TalentHire Admin Console requires elevated staff or superuser permissions. Your account does not have access.
        </p>
        <button
          type="button"
          onClick={() => {
            const dest = (user?.role === "artist" || user?.is_artist) ? "/artist-dashboard" : "/customer-dashboard";
            if (navigate) navigate(dest);
            else window.location.href = dest;
          }}
          style={{
            padding: "8px 18px",
            background: "#FF5722",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Return to Your Dashboard
        </button>
      </main>
    );
  }

  const pendingVerificationsCount = overviewData?.pending_actions?.artist_verifications || 0;
  const openComplaintsCount = overviewData?.pending_actions?.open_complaints || 0;
  const openSupportTicketsCount = overviewData?.pending_actions?.open_support_tickets || 0;

  return (
    <div className={`admin-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Fixed / Collapsible Left Sidebar */}
      <AdminSidebar
        currentSection={currentSection}
        onSelectSection={selectSection}
        pendingVerificationsCount={pendingVerificationsCount}
        openComplaintsCount={openComplaintsCount}
        openSupportTicketsCount={openSupportTicketsCount}
        onLogout={onLogout}
        navigate={navigate}
      />

      {/* Main Content Layout */}
      <div className="admin-main-wrapper">
        <AdminHeader
          user={user}
          currentSection={currentSection}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onLogout={onLogout}
          navigate={navigate}
          onSelectSection={selectSection}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
        />

        <main className="admin-content-area">
          {currentSection === "overview" && (
            <AdminOverviewView
              data={overviewData}
              loading={overviewLoading}
              onNavigateSection={selectSection}
            />
          )}

          {(currentSection === "users" || currentSection === "all-users") && (
            <AdminUsersView key="users" defaultRole="all" />
          )}

          {currentSection === "artists" && (
            <AdminUsersView key="artists" defaultRole="artist" />
          )}

          {currentSection === "artist-verifications" && (
            <AdminVerificationsView
              onCountChange={refreshDashboardData}
            />
          )}

          {currentSection === "customers" && (
            <AdminUsersView key="customers" defaultRole="customer" />
          )}

          {currentSection === "bookings" && (
            <AdminBookingsView key="bookings-all" defaultFilter="all" />
          )}

          {currentSection === "upcoming-events" && (
            <AdminBookingsView key="bookings-upcoming" defaultFilter="accepted" />
          )}

          {currentSection === "cancellations" && (
            <AdminBookingsView key="bookings-cancelled" defaultFilter="cancelled" />
          )}

          {currentSection === "transactions" && (
            <AdminFinanceView key="finance-txns" initialTab="transactions" />
          )}

          {currentSection === "commission" && (
            <AdminFinanceView key="finance-commission" initialTab="transactions" />
          )}

          {currentSection === "refunds" && (
            <AdminFinanceView key="finance-refunds" initialTab="refunds" />
          )}

          {currentSection === "categories" && (
            <AdminCategoriesView />
          )}

          {currentSection === "complaints" && (
            <AdminComplaintsView
              onCountChange={refreshDashboardData}
            />
          )}

          {currentSection === "support-management" && (
            <AdminSupportView
              onCountChange={refreshDashboardData}
            />
          )}

          {currentSection === "reviews" && (
            <AdminReviewsView />
          )}

          {currentSection === "notifications" && (
            <AdminNotificationsView />
          )}

          {currentSection === "chatbot" && (
            <AdminChatbotView />
          )}

          {currentSection === "reports" && (
            <AdminReportsView />
          )}

          {currentSection === "settings" && (
            <AdminSettingsView defaultTab="settings" />
          )}

          {currentSection === "roles" && (
            <AdminSettingsView defaultTab="roles" />
          )}

          {currentSection === "activity-logs" && (
            <AdminSettingsView defaultTab="logs" />
          )}
        </main>
      </div>
    </div>
  );
}
