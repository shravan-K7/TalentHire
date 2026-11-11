import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  fetchArtistDashboard,
  respondArtistBooking,
  completeArtistBooking,
  addArtistPortfolio,
  deleteArtistPortfolio,
  updateArtistAvailability,
  deleteArtistAvailability,
  updateArtistProfileData,
  markNotificationsRead,
} from "../js/auth";
import "../css/CustomerDashboard.css";

function formatBookingStatus(status) {
  if (!status) return "Pending";
  if (status === "accepted") return "Confirmed";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "rejected") return "Declined";
  return typeof status === "string" && status.length > 0
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Pending";
}

function renderStars(rating = 5) {
  const rounded = Math.round(Number(rating) || 5);
  return (
    <div style={{ display: "inline-flex", gap: "3px", color: "#FF5722" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={star <= rounded ? "#FF5722" : "none"}
          stroke="#FF5722"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

const COMMON_PERFORMANCE_TYPES = [
  "Solo Performance",
  "Live Band",
  "Acoustic Set",
  "DJ Set",
  "Classical & Fusion",
  "Instrumental Solo",
  "Vocals & Guitar",
  "Bollywood Unplugged",
  "Sufi Ensemble",
  "Stage Emcee",
];

function ArtistDashboard({ user, onLogout, navigate, onUserUpdate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Active navigation tab
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "dashboard";
  });

  const [selectedBooking, setSelectedBooking] = useState(null);

  // Modals state
  const [respondModal, setRespondModal] = useState({
    open: false,
    action: "accept", // 'accept' | 'reject'
    booking: null,
    reason: "",
    final_price: "",
  });
  const [responding, setResponding] = useState(false);

  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({
    title: "",
    media_url: "",
    description: "",
  });
  const [portfolioSaving, setPortfolioSaving] = useState(false);

  const [receiptItem, setReceiptItem] = useState(null);

  // Availability state
  const [availForm, setAvailForm] = useState({
    date: "",
    is_available: false,
    reason: "",
  });
  const [availSaving, setAvailSaving] = useState(false);

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    stage_name: "",
    category: "",
    gender: "male",
    starting_price: "",
    years_of_experience: 0,
    phone: "",
    location: "",
    travel_availability: "city",
    bio: "",
    performance_types: [],
    portfolio_url: "",
    additional_information: "",
  });
  const [customTagInput, setCustomTagInput] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  // Request filter state on requests tab
  const [requestFilter, setRequestFilter] = useState("all"); // 'all' | 'pending' | 'accepted' | 'rejected'

  // Toast feedback
  const [toastMsg, setToastMsg] = useState("");

  // Sync tab with browser URL history
  useEffect(() => {
    function handlePop() {
      const params = new URLSearchParams(window.location.search);
      const tabFromUrl = params.get("tab") || "dashboard";
      setActiveTab(tabFromUrl);
    }
    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
    };
  }, []);

  function switchTab(tabName) {
    setActiveTab(tabName);
    const currentUrl = new URL(window.location.href);
    if (tabName === "dashboard") {
      currentUrl.searchParams.delete("tab");
    } else {
      currentUrl.searchParams.set("tab", tabName);
    }
    window.history.replaceState(
      null,
      "",
      currentUrl.pathname + currentUrl.search,
    );
  }

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? "" : prev));
    }, 3500);
  }

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetchArtistDashboard();
      setData(res);
      const artist = res.artist || {};
      setEditForm({
        stage_name: artist.stage_name || "",
        category: artist.category_id ? String(artist.category_id) : "",
        gender: artist.gender || "male",
        starting_price: artist.starting_price || "",
        years_of_experience: artist.years_of_experience || 0,
        phone: artist.phone || "",
        location: artist.location || "",
        travel_availability: artist.travel_availability || "city",
        bio: artist.bio || "",
        performance_types: Array.isArray(artist.performance_types)
          ? artist.performance_types
          : [],
        portfolio_url: artist.portfolio_url || "",
        additional_information: artist.additional_information || "",
      });
      setProfileImagePreview(artist.profile_image || "");
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load artist dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const res = await fetchArtistDashboard();
        if (!ignore) {
          setData(res);
          const artist = res.artist || {};
          setEditForm({
            stage_name: artist.stage_name || "",
            category: artist.category_id ? String(artist.category_id) : "",
            gender: artist.gender || "male",
            starting_price: artist.starting_price || "",
            years_of_experience: artist.years_of_experience || 0,
            phone: artist.phone || "",
            location: artist.location || "",
            travel_availability: artist.travel_availability || "city",
            bio: artist.bio || "",
            performance_types: Array.isArray(artist.performance_types)
              ? artist.performance_types
              : [],
            portfolio_url: artist.portfolio_url || "",
            additional_information: artist.additional_information || "",
          });
          setProfileImagePreview(artist.profile_image || "");
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Unable to load artist dashboard data.");
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  // Handle Booking Response (Accept / Reject)
  async function handleConfirmBookingResponse() {
    console.log("Respond modal state:", respondModal);
    console.log("Final price:", respondModal.final_price);

    if (!respondModal.booking) return;

    // Validate before setting loading state
    if (
      respondModal.action === "accept" &&
      (!respondModal.final_price ||
        !Number.isFinite(Number(respondModal.final_price)) ||
        Number(respondModal.final_price) <= 0)
    ) {
      alert("Please enter a valid final performance price.");
      return;
    }

    setResponding(true);

    try {
      const res = await respondArtistBooking(respondModal.booking.id, {
        action: respondModal.action,
        reason: respondModal.reason,
        final_price:
          respondModal.action === "accept"
            ? respondModal.final_price
            : undefined,
      });
      showToast(res.message || "Booking status updated.");
      setRespondModal({
        open: false,
        action: "accept",
        booking: null,
        reason: "",
        final_price: "",
      });
      if (selectedBooking && selectedBooking.id === respondModal.booking.id) {
        setSelectedBooking((prev) => ({
          ...prev,
          status: respondModal.action === "accept" ? "accepted" : "rejected",
          response_message: respondModal.reason,
          agreed_price: res.agreed_price || prev.agreed_price,
        }));
      }
      await loadDashboard();
    } catch (err) {
      showToast(err.message || "Failed to update booking status.");
    } finally {
      setResponding(false);
    }
  }

  // Handle Mark Performance Completed
  async function handleCompleteBooking(bookingId) {
    if (!window.confirm("Mark this performance as successfully completed?")) {
      return;
    }

    try {
      const res = await completeArtistBooking(bookingId);
      showToast(res.message || "Performance completed.");
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking((prev) => ({ ...prev, status: "completed" }));
      }
      loadDashboard();
    } catch (err) {
      showToast(err.message || "Failed to complete performance.");
    }
  }

  // Handle Add Portfolio
  async function handleAddPortfolioSubmit(e) {
    e.preventDefault();
    if (!portfolioForm.title.trim()) {
      showToast("Title is required for portfolio item.");
      return;
    }

    setPortfolioSaving(true);
    try {
      await addArtistPortfolio(portfolioForm);
      showToast("Portfolio item added.");
      setPortfolioForm({ title: "", media_url: "", description: "" });
      setPortfolioModalOpen(false);
      loadDashboard();
    } catch (err) {
      showToast(err.message || "Failed to add portfolio item.");
    } finally {
      setPortfolioSaving(false);
    }
  }

  // Handle Delete Portfolio
  async function handleDeletePortfolio(itemId) {
    if (
      !window.confirm("Are you sure you want to delete this portfolio item?")
    ) {
      return;
    }

    try {
      await deleteArtistPortfolio(itemId);
      showToast("Portfolio item deleted.");
      loadDashboard();
    } catch (err) {
      showToast(err.message || "Failed to delete portfolio item.");
    }
  }

  // Handle Add / Set Availability
  async function handleSaveAvailability(e) {
    e.preventDefault();
    if (!availForm.date) {
      showToast("Please select a date.");
      return;
    }

    setAvailSaving(true);
    try {
      await updateArtistAvailability(availForm);
      showToast("Availability status saved.");
      setAvailForm({ date: "", is_available: false, reason: "" });
      loadDashboard();
    } catch (err) {
      showToast(err.message || "Failed to update availability.");
    } finally {
      setAvailSaving(false);
    }
  }

  // Handle Delete Availability
  async function handleDeleteAvailability(availId) {
    try {
      await deleteArtistAvailability(availId);
      showToast("Date override removed.");
      loadDashboard();
    } catch (err) {
      showToast(err.message || "Failed to remove date override.");
    }
  }

  // Handle Edit Profile Submission
  async function handleEditProfileSubmit(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccessMsg("");
    setProfileErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("stage_name", editForm.stage_name);
      formData.append("category", editForm.category);
      formData.append("gender", editForm.gender);
      formData.append("starting_price", editForm.starting_price);
      formData.append(
        "years_of_experience",
        String(editForm.years_of_experience || 0),
      );
      formData.append("phone", editForm.phone);
      formData.append("location", editForm.location);
      formData.append("travel_availability", editForm.travel_availability);
      formData.append("bio", editForm.bio);
      formData.append(
        "performance_types",
        JSON.stringify(editForm.performance_types),
      );
      formData.append("portfolio_url", editForm.portfolio_url);
      formData.append(
        "additional_information",
        editForm.additional_information,
      );

      if (profileImageFile) {
        formData.append("profile_image", profileImageFile);
      }

      const res = await updateArtistProfileData(formData);
      setProfileSuccessMsg(
        res.message || "Artist profile updated successfully.",
      );
      showToast("Artist profile updated.");

      if (onUserUpdate && res.artist) {
        onUserUpdate((prev) => ({
          ...prev,
          artist_profile: res.artist,
        }));
      }

      loadDashboard();
      setTimeout(() => {
        switchTab("profile");
      }, 900);
    } catch (err) {
      setProfileErrorMsg(err.message || "Failed to update artist profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  // Handle Image File Selection
  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setProfileErrorMsg("Profile photo must be smaller than 5MB.");
        return;
      }
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProfileImagePreview(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  // Toggle Performance Type Tag
  function togglePerformanceType(tag) {
    setEditForm((prev) => {
      const exists = prev.performance_types.includes(tag);
      return {
        ...prev,
        performance_types: exists
          ? prev.performance_types.filter((t) => t !== tag)
          : [...prev.performance_types, tag],
      };
    });
  }

  function addCustomTag() {
    const clean = customTagInput.trim();
    if (clean && !editForm.performance_types.includes(clean)) {
      setEditForm((prev) => ({
        ...prev,
        performance_types: [...prev.performance_types, clean],
      }));
      setCustomTagInput("");
    }
  }

  // Mark all notifications read
  async function handleMarkNotifsRead() {
    try {
      await markNotificationsRead();
      showToast("All notifications marked as read.");
      loadDashboard();
    } catch (err) {
      showToast(err.message || "Unable to update notifications.");
    }
  }

  const artist = data?.artist || {};
  const stats = data?.stats || {};
  const bookings = data?.bookings || [];
  const upcomingPerformances = data?.upcoming_performances || [];
  const recentActivity = data?.recent_activity || [];
  const payments = data?.payments || [];
  const portfolio = data?.portfolio || [];
  const reviews = data?.reviews || [];
  const availability = data?.availability || [];
  const notifications = data?.notifications || [];
  const categories = data?.categories || [];
  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  const initials = (artist.stage_name || user?.username || "PA")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Filtered requests
  const filteredBookings = bookings.filter((b) => {
    if (requestFilter === "pending") return b.status === "pending";
    if (requestFilter === "accepted") return b.status === "accepted";
    if (requestFilter === "rejected") return b.status === "rejected";
    return true;
  });

  const pendingBookingsList = bookings.filter((b) => b.status === "pending");
  const acceptedBookingsList = bookings.filter((b) => b.status === "accepted");

  if (loading) {
    return (
      <div className="cd-page">
        <Navbar
          user={user}
          onLogout={onLogout}
          currentPath="/profile"
          navigate={navigate}
        />
        <main className="cd-loading-container">
          <div className="cd-spinner" />
          <p className="cd-loading-text">
            Loading Performing Artist Dashboard...
          </p>
        </main>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="cd-page">
        <Navbar
          user={user}
          onLogout={onLogout}
          currentPath="/profile"
          navigate={navigate}
        />
        <main className="cd-error-container">
          <div className="cd-error-box">
            <h2>Unable to Load Artist Dashboard</h2>
            <p>{error}</p>
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                type="button"
                className="cd-btn-primary"
                onClick={() => {
                  setError("");
                  setLoading(true);
                  loadDashboard().finally(() => setLoading(false));
                }}
              >
                Retry Loading
              </button>
              <button
                type="button"
                className="cd-btn-secondary"
                onClick={() =>
                  navigate
                    ? navigate("/artist-register")
                    : (window.location.href = "/artist-register")
                }
              >
                Complete Artist Profile
              </button>
            </div>
          </div>
        </main>
        <Footer navigate={navigate} />
      </div>
    );
  }

  return (
    <div className="cd-page">
      <Navbar
        user={user}
        onLogout={onLogout}
        currentPath="/profile"
        navigate={navigate}
      />

      {/* Action Toast Notification */}
      {toastMsg && (
        <aside className="cd-toast" role="status" aria-live="polite">
          <span>{toastMsg}</span>
        </aside>
      )}

      {/* Main Dashboard Layout Shell: Docked Sidebar + Content Area */}
      <div className="cd-dashboard-shell">
        {/* =====================================================================
            LEFT SIDEBAR NAVIGATION (Role-specific for Performing Artist)
            ===================================================================== */}
        <aside className="cd-sidebar" aria-label="Performing Artist Navigation">
          <div className="cd-sidebar-header">
            <span className="cd-sidebar-brand-label">Artist Studio</span>
          </div>

          {/* Artist mini-card */}
          <div className="cd-sidebar-user-mini">
            <div className="cd-sidebar-user-avatar">
              {artist.profile_image ? (
                <img src={artist.profile_image} alt={artist.stage_name} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="cd-sidebar-user-info">
              <div className="cd-sidebar-user-name">
                {artist.stage_name || user?.username}
              </div>
              <div className="cd-sidebar-user-role">
                {artist.category_name || "Performing Artist"}
              </div>
            </div>
          </div>

          <nav className="cd-sidebar-nav">
            {/* 1. Artist Dashboard */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => switchTab("dashboard")}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Artist Dashboard</span>
            </button>

            {/* 2. Artist Profile */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => switchTab("profile")}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Artist Profile</span>
            </button>

            {/* 3. Edit Profile */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "edit-profile" ? "active" : ""}`}
              onClick={() => switchTab("edit-profile")}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit Profile</span>
            </button>

            {/* 4. Portfolio Management */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "portfolio" ? "active" : ""}`}
              onClick={() => switchTab("portfolio")}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <span>Portfolio</span>
              {portfolio.length > 0 && (
                <span className="cd-sidebar-badge">{portfolio.length}</span>
              )}
            </button>

            {/* 5. Booking Requests */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "requests" || activeTab === "booking-detail" ? "active" : ""}`}
              onClick={() => {
                setSelectedBooking(null);
                switchTab("requests");
              }}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>Booking Requests</span>
              {pendingBookingsList.length > 0 && (
                <span
                  className="cd-sidebar-badge"
                  style={{ background: "#FF5722", color: "#FFFFFF" }}
                >
                  {pendingBookingsList.length}
                </span>
              )}
            </button>

            {/* 6. Booking Calendar */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "calendar" ? "active" : ""}`}
              onClick={() => switchTab("calendar")}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Booking Calendar</span>
            </button>

            {/* 7. Accepted Bookings */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "accepted" ? "active" : ""}`}
              onClick={() => switchTab("accepted")}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>Accepted Bookings</span>
              {acceptedBookingsList.length > 0 && (
                <span className="cd-sidebar-badge">
                  {acceptedBookingsList.length}
                </span>
              )}
            </button>

            {/* 8. Payment & Earnings */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "earnings" ? "active" : ""}`}
              onClick={() => switchTab("earnings")}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <span>Payment & Earnings</span>
            </button>

            {/* 9. Reviews & Ratings */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => switchTab("reviews")}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Reviews & Ratings</span>
              {reviews.length > 0 && (
                <span className="cd-sidebar-badge">{reviews.length}</span>
              )}
            </button>

            <div className="cd-sidebar-divider" />

            {/* 10. Availability Management */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "availability" ? "active" : ""}`}
              onClick={() => switchTab("availability")}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Availability</span>
            </button>

            {/* 11. Artist Notifications */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "notifications" ? "active" : ""}`}
              onClick={() => switchTab("notifications")}
            >
              <svg
                className="cd-sidebar-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span>Notifications</span>
              {unreadNotifsCount > 0 && (
                <span
                  className="cd-sidebar-badge"
                  style={{ background: "#FF5722", color: "#FFFFFF" }}
                >
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          </nav>

          <div className="cd-sidebar-footer">
            <button
              type="button"
              className="cd-sidebar-logout"
              onClick={onLogout}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* =====================================================================
            RIGHT FLUID CONTENT AREA
            ===================================================================== */}
        <main className="cd-main-panel" id="main-content">
          {/* Top Bar with actions / verification badge */}
          <div className="cd-content-topbar">
            <div className="cd-topbar-actions">
              <span
                className={`cd-topbar-badge ${artist.is_verified ? "" : "pending"}`}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {artist.is_verified
                  ? "Verified Performing Artist"
                  : "Verification Under Review"}
              </span>
            </div>
          </div>

          {/* =================================================================
              TAB 1: ARTIST DASHBOARD OVERVIEW
              ================================================================= */}
          {activeTab === "dashboard" && (
            <div className="cd-view-container" style={{ gap: "24px" }}>
              {/* Statistics Grid - 6 Key Metrics in Canonical Grid */}
              <div className="cd-overview-stats-grid artist-grid">
                <div
                  className="cd-stat-box"
                  onClick={() => switchTab("requests")}
                >
                  <div className="cd-stat-lbl">Total Requests</div>
                  <div className="cd-stat-num">{stats.total_bookings ?? 0}</div>
                  <div className="cd-stat-sub">All-time received</div>
                </div>

                <div
                  className="cd-stat-box accent-pending"
                  onClick={() => {
                    setRequestFilter("pending");
                    switchTab("requests");
                  }}
                >
                  <div className="cd-stat-lbl" style={{ color: "#FF9800" }}>
                    Pending Requests
                  </div>
                  <div className="cd-stat-num pending">
                    {stats.pending_requests ?? 0}
                  </div>
                  <div className="cd-stat-sub">Action required</div>
                </div>

                <div
                  className="cd-stat-box"
                  onClick={() => switchTab("accepted")}
                >
                  <div className="cd-stat-lbl">Accepted Bookings</div>
                  <div className="cd-stat-num confirmed">
                    {stats.accepted_bookings ?? 0}
                  </div>
                  <div className="cd-stat-sub">Confirmed shows</div>
                </div>

                <div
                  className="cd-stat-box"
                  onClick={() => switchTab("calendar")}
                >
                  <div className="cd-stat-lbl">Completed</div>
                  <div className="cd-stat-num">
                    {stats.completed_performances ?? 0}
                  </div>
                  <div className="cd-stat-sub">Delivered on stage</div>
                </div>

                <div
                  className="cd-stat-box accent-earnings"
                  onClick={() => switchTab("earnings")}
                >
                  <div className="cd-stat-lbl" style={{ color: "#4CAF50" }}>
                    Total Earnings
                  </div>
                  <div className="cd-stat-num payments">
                    ₹{stats.total_earnings ?? "0.00"}
                  </div>
                  <div className="cd-stat-sub">Completed & secured</div>
                </div>

                <div
                  className="cd-stat-box"
                  onClick={() => switchTab("calendar")}
                >
                  <div className="cd-stat-lbl">Upcoming Shows</div>
                  <div className="cd-stat-num">
                    {stats.upcoming_performances ?? 0}
                  </div>
                  <div className="cd-stat-sub">Scheduled on calendar</div>
                </div>
              </div>

              {/* Section 1: Booking Overview (Recent Booking Requests) */}
              <div className="cd-profile-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "18px",
                  }}
                >
                  <h2 className="cd-card-title" style={{ margin: 0 }}>
                    Booking Overview
                  </h2>
                  <button
                    type="button"
                    className="cd-btn-secondary cd-btn-sm"
                    onClick={() => switchTab("requests")}
                  >
                    View All Requests ({bookings.length})
                  </button>
                </div>

                {bookings.length === 0 ? (
                  <div className="cd-empty-card">
                    <h3>No Booking Requests Yet</h3>
                    <p>
                      Incoming inquiries for your live performances will appear
                      here as soon as event hosts book you.
                    </p>
                  </div>
                ) : (
                  <div className="cd-bookings-list">
                    {bookings.slice(0, 4).map((b) => (
                      <div key={b.id} className="cd-booking-row-card">
                        <div className="cd-booking-id-block">
                          <span className="cd-booking-code">#BK-{b.id}</span>
                          <span className="cd-booking-artist-sub">
                            {b.event_type} · Host: {b.customer_name}
                          </span>
                        </div>

                        <div className="cd-booking-date-block">
                          <span className="cd-booking-date-text">
                            {b.event_date || "Date TBD"}
                          </span>
                          <span className="cd-booking-location-text">
                            {b.event_location}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span className={`cd-status-pill status-${b.status}`}>
                            {formatBookingStatus(b.status)}
                          </span>
                          <span
                            style={{
                              fontSize: "1.05rem",
                              fontWeight: 800,
                              color: "#FF5722",
                            }}
                          >
                            ₹{b.agreed_price}
                          </span>
                        </div>

                        <div className="cd-booking-actions-block">
                          <button
                            type="button"
                            className="cd-btn-secondary cd-btn-sm"
                            onClick={() => {
                              setSelectedBooking(b);
                              switchTab("booking-detail");
                            }}
                          >
                            Details
                          </button>
                          {b.status === "pending" && (
                            <button
                              type="button"
                              className="cd-btn-primary cd-btn-sm"
                              onClick={() => {
                                setRespondModal({
                                  open: true,
                                  action: "accept",
                                  booking: b,
                                  reason: "",
                                  final_price: "",
                                });
                              }}
                            >
                              Respond
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Upcoming Performances */}
              <div className="cd-profile-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h2 className="cd-card-title" style={{ margin: 0 }}>
                    Upcoming Performances
                  </h2>
                  <button
                    type="button"
                    className="cd-btn-secondary cd-btn-sm"
                    onClick={() => switchTab("calendar")}
                  >
                    Open Calendar Schedule
                  </button>
                </div>

                {upcomingPerformances.length === 0 ? (
                  <div className="cd-empty-state">
                    <p className="cd-empty-title">
                      No Upcoming Confirmed Events
                    </p>
                    <p className="cd-empty-text">
                      Accepted bookings scheduled for upcoming dates will appear
                      here.
                    </p>
                  </div>
                ) : (
                  <div className="cd-timeline">
                    {upcomingPerformances.slice(0, 3).map((perf) => (
                      <div key={perf.id} className="cd-timeline-item">
                        <div className="cd-timeline-date-box">
                          <div className="cd-timeline-date-day">
                            {perf.event_date
                              ? new Date(
                                  perf.event_date_iso || perf.event_date,
                                ).getDate()
                              : "--"}
                          </div>
                          <div className="cd-timeline-date-sub">
                            {perf.event_date
                              ? new Date(
                                  perf.event_date_iso || perf.event_date,
                                ).toLocaleString("default", { month: "short" })
                              : "DATE"}
                          </div>
                        </div>

                        <div className="cd-timeline-info">
                          <h3 className="cd-timeline-title">
                            {perf.event_type}
                          </h3>
                          <div className="cd-timeline-sub">
                            Host: {perf.customer_name} · {perf.event_location} ·
                            Time: {perf.event_date}
                          </div>
                          <div
                            style={{
                              fontSize: "0.86rem",
                              color: "#FF5722",
                              fontWeight: 600,
                              marginTop: "2px",
                            }}
                          >
                            Agreed Fee: ₹{perf.agreed_price}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="cd-btn-secondary cd-btn-sm"
                            onClick={() => {
                              setSelectedBooking(perf);
                              switchTab("booking-detail");
                            }}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="cd-btn-primary cd-btn-sm"
                            onClick={() => handleCompleteBooking(perf.id)}
                          >
                            Mark Completed
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid: Recent Activity & Earnings Overview */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                  gap: "20px",
                }}
              >
                {/* Section 3: Recent Activity */}
                <div className="cd-profile-card">
                  <h2
                    className="cd-card-title"
                    style={{ marginBottom: "14px" }}
                  >
                    Recent Activity
                  </h2>
                  {recentActivity.length === 0 ? (
                    <p style={{ color: "#888888", fontSize: "0.92rem" }}>
                      No recent activity records.
                    </p>
                  ) : (
                    <div className="cd-activity-feed">
                      {recentActivity.slice(0, 6).map((act) => (
                        <div key={act.id} className="cd-activity-item">
                          <div className="cd-activity-dot" />
                          <div className="cd-activity-content">
                            <div className="cd-activity-title">{act.title}</div>
                            <div className="cd-activity-desc">
                              {act.description}
                            </div>
                            <div className="cd-activity-time">
                              {act.formatted_time}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 4: Earnings Overview */}
                <div className="cd-profile-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <h2 className="cd-card-title" style={{ margin: 0 }}>
                      Earnings Overview
                    </h2>
                    <button
                      type="button"
                      className="cd-btn-secondary cd-btn-sm"
                      onClick={() => switchTab("earnings")}
                    >
                      Full Statement
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        background: "#191919",
                        padding: "16px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "#A0A0A0",
                          textTransform: "uppercase",
                        }}
                      >
                        Completed Earnings
                      </div>
                      <div
                        style={{
                          fontSize: "1.6rem",
                          fontWeight: 800,
                          color: "#4CAF50",
                          margin: "4px 0 2px",
                        }}
                      >
                        ₹{stats.completed_earnings ?? "0.00"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#727272" }}>
                        Credited from delivered performances
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#191919",
                        padding: "16px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "#A0A0A0",
                          textTransform: "uppercase",
                        }}
                      >
                        Pending Earnings
                      </div>
                      <div
                        style={{
                          fontSize: "1.6rem",
                          fontWeight: 800,
                          color: "#FF9800",
                          margin: "4px 0 2px",
                        }}
                      >
                        ₹{stats.pending_earnings ?? "0.00"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#727272" }}>
                        In escrow / scheduled for confirmed bookings
                      </div>
                    </div>

                    {payments.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: "0.84rem",
                            color: "#888888",
                            marginBottom: "8px",
                          }}
                        >
                          Recent Payouts:
                        </div>
                        {payments.slice(0, 3).map((p) => (
                          <div
                            key={p.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "8px 0",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              fontSize: "0.88rem",
                            }}
                          >
                            <span>{p.customer_name}</span>
                            <strong
                              style={{
                                color:
                                  p.status === "success"
                                    ? "#4CAF50"
                                    : "#FF9800",
                              }}
                            >
                              ₹{p.amount}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 5: Recent Notifications */}
              <div className="cd-profile-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                  }}
                >
                  <h2 className="cd-card-title" style={{ margin: 0 }}>
                    Recent Notifications
                  </h2>
                  <button
                    type="button"
                    className="cd-btn-secondary cd-btn-sm"
                    onClick={() => switchTab("notifications")}
                  >
                    All Notifications ({unreadNotifsCount} unread)
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <p style={{ color: "#888888", fontSize: "0.92rem" }}>
                    No notifications received yet.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {notifications.slice(0, 4).map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: "12px 14px",
                          background: n.is_read
                            ? "#1E1E1E"
                            : "rgba(255, 87, 34, 0.08)",
                          borderLeft: n.is_read
                            ? "3px solid transparent"
                            : "3px solid #FF5722",
                          borderRadius: "4px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <strong
                            style={{ fontSize: "0.96rem", color: "#F7F7F7" }}
                          >
                            {n.title}
                          </strong>
                          <span
                            style={{ fontSize: "0.78rem", color: "#888888" }}
                          >
                            {n.created_at}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "0.88rem",
                            color: "#CCCCCC",
                            lineHeight: 1.4,
                          }}
                        >
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 2: ARTIST PROFILE PAGE
              ================================================================= */}
          {activeTab === "profile" && (
            <div
              className="cd-view-container cd-profile-view"
              style={{ gap: "20px" }}
            >
              <div className="cd-profile-card">
                <div className="cd-profile-card-header">
                  <div className="cd-profile-avatar-box">
                    {artist.profile_image ? (
                      <img
                        src={artist.profile_image}
                        alt={artist.stage_name}
                        className="cd-profile-avatar-img"
                      />
                    ) : (
                      <span className="cd-avatar-fallback-initials">
                        {initials}
                      </span>
                    )}
                  </div>

                  <div className="cd-profile-info-column">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <h2 className="cd-profile-fullname">
                        {artist.stage_name || user?.username}
                      </h2>
                      <span
                        className={`cd-topbar-badge ${artist.is_verified ? "" : "pending"}`}
                      >
                        {artist.is_verified
                          ? "Verified Artist"
                          : "Verification Pending"}
                      </span>
                    </div>

                    <p className="cd-profile-subtext">
                      {artist.category_name || "Performing Artist"} ·{" "}
                      {artist.gender ? artist.gender.toUpperCase() : "ARTIST"}
                    </p>
                  </div>

                  <div className="cd-profile-edit-btn-wrap">
                    <button
                      type="button"
                      className="cd-btn-primary"
                      onClick={() => switchTab("edit-profile")}
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>

                <div className="cd-profile-card-divider" />

                <div className="cd-profile-details-grid-layout">
                  <div className="cd-profile-section-block">
                    <h3 className="cd-profile-section-heading">
                      Contact & Booking Information
                    </h3>
                    <div className="cd-contact-row">
                      <span className="cd-contact-icon">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </span>
                      <span className="cd-contact-text">
                        {artist.phone || "Phone Not Added"}
                      </span>
                    </div>

                    <div className="cd-contact-row">
                      <span className="cd-contact-icon">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </span>
                      <span className="cd-contact-text">
                        {user?.email || "Email Not Specified"}
                      </span>
                    </div>

                    <div className="cd-contact-row">
                      <span className="cd-contact-icon">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="2"
                            y="7"
                            width="20"
                            height="14"
                            rx="2"
                            ry="2"
                          />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                      </span>
                      <span className="cd-contact-text">
                        {artist.years_of_experience || 0} years experience ·
                        Travel: {artist.travel_availability || "Within City"}
                      </span>
                    </div>
                  </div>

                  <div className="cd-profile-section-block">
                    <h3 className="cd-profile-section-heading">
                      Location & Starting Rate
                    </h3>
                    <div className="cd-contact-row">
                      <span className="cd-contact-icon">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </span>
                      <span className="cd-contact-text cd-address-text">
                        {artist.location || "Location Not Specified"}
                      </span>
                    </div>

                    <div className="cd-contact-row">
                      <span className="cd-contact-icon">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </span>
                      <span className="cd-contact-text">
                        Starting Fee:{" "}
                        <strong
                          style={{ color: "#FF5722", fontSize: "1.15rem" }}
                        >
                          ₹{artist.starting_price || "0"}
                        </strong>{" "}
                        / performance
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio & Details */}
              <div className="cd-profile-card">
                <h3 className="cd-card-title">
                  Artist Biography & Stage Overview
                </h3>
                <p
                  style={{
                    fontSize: "0.96rem",
                    color: "#CCCCCC",
                    lineHeight: 1.6,
                    margin: "10px 0 0",
                    whiteSpace: "pre-line",
                  }}
                >
                  {artist.bio ||
                    "No artist biography has been added yet. Click Edit Profile to describe your performing style, experience, and repertoire."}
                </p>
              </div>

              {/* Performance Types & Rates */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "20px",
                }}
              >
                <div className="cd-profile-card">
                  <h3 className="cd-card-title">Starting Performance Rate</h3>
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: "#FF5722",
                      margin: "10px 0 4px",
                    }}
                  >
                    ₹{artist.starting_price || "0"}
                  </div>
                  <p
                    style={{ fontSize: "0.85rem", color: "#888888", margin: 0 }}
                  >
                    Base performance fee per celebration. Actual booking prices
                    may vary based on duration and requirements.
                  </p>
                </div>

                <div className="cd-profile-card">
                  <h3 className="cd-card-title">Performance Types & Sets</h3>
                  {Array.isArray(artist.performance_types) &&
                  artist.performance_types.length > 0 ? (
                    <div className="cd-tag-cloud">
                      {artist.performance_types.map((type, i) => (
                        <span key={i} className="cd-tag-item active">
                          {type}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p
                      style={{
                        color: "#888888",
                        fontSize: "0.88rem",
                        margin: "8px 0 0",
                      }}
                    >
                      No performance sets selected.
                    </p>
                  )}
                </div>
              </div>

              {/* Portfolio Link & Additional Notes */}
              <div className="cd-profile-card">
                <h3 className="cd-card-title">
                  Portfolio & Additional Information
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "10px",
                  }}
                >
                  {artist.portfolio_url && (
                    <div>
                      <div style={{ fontSize: "0.84rem", color: "#888888" }}>
                        External Showreel / Video Link:
                      </div>
                      <a
                        href={artist.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#FF5722",
                          textDecoration: "none",
                          fontWeight: 600,
                          fontSize: "0.94rem",
                        }}
                      >
                        {artist.portfolio_url}
                      </a>
                    </div>
                  )}

                  {artist.additional_information && (
                    <div>
                      <div style={{ fontSize: "0.84rem", color: "#888888" }}>
                        Special Skills, Equipment & Languages:
                      </div>
                      <p
                        style={{
                          fontSize: "0.92rem",
                          color: "#D0D0D0",
                          margin: "4px 0 0",
                        }}
                      >
                        {artist.additional_information}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 3: EDIT ARTIST PROFILE PAGE
              ================================================================= */}
          {activeTab === "edit-profile" && (
            <div className="cd-form-card">
              <div className="cd-form-header">
                <h2 className="cd-form-title">Edit Artist Profile</h2>
                <p className="cd-form-subtext">
                  Update your stage credentials, category, rates, and biography
                </p>
              </div>

              {profileSuccessMsg && (
                <div className="cd-alert-success" role="status">
                  {profileSuccessMsg}
                </div>
              )}

              {profileErrorMsg && (
                <div className="cd-alert-error" role="alert">
                  {profileErrorMsg}
                </div>
              )}

              <form onSubmit={handleEditProfileSubmit} className="cd-form">
                {/* Profile Photo Upload */}
                <div className="cd-profile-photo-row">
                  <div className="cd-photo-preview-wrap">
                    {profileImagePreview ? (
                      <img
                        src={profileImagePreview}
                        alt="Preview"
                        className="cd-photo-preview-img"
                      />
                    ) : (
                      <div className="cd-photo-preview-fallback">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: "none" }}
                      id="artist-photo-input"
                    />
                    <button
                      type="button"
                      className="cd-btn-secondary cd-btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Stage Photo
                    </button>
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: "0.8rem",
                        color: "#777777",
                      }}
                    >
                      JPG, PNG or WebP. Max 5MB.
                    </p>
                  </div>
                </div>

                <div className="cd-form-grid">
                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="stage_name">
                      Stage Name / Act Name *
                    </label>
                    <input
                      id="stage_name"
                      type="text"
                      className="cd-input"
                      value={editForm.stage_name}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          stage_name: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="category">
                      Artist Category *
                    </label>
                    <select
                      id="category"
                      className="cd-select"
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, category: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="gender">
                      Gender *
                    </label>
                    <select
                      id="gender"
                      className="cd-select"
                      value={editForm.gender}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, gender: e.target.value }))
                      }
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="starting_price">
                      Starting Price (₹) *
                    </label>
                    <input
                      id="starting_price"
                      type="number"
                      min="0"
                      className="cd-input"
                      value={editForm.starting_price}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          starting_price: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="experience">
                      Years of Experience *
                    </label>
                    <input
                      id="experience"
                      type="number"
                      min="0"
                      max="100"
                      className="cd-input"
                      value={editForm.years_of_experience}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          years_of_experience: Number(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="phone">
                      Phone Number *
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      className="cd-input"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>

                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="location">
                      City / Location *
                    </label>
                    <input
                      id="location"
                      type="text"
                      className="cd-input"
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, location: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="travel">
                      Travel Availability *
                    </label>
                    <select
                      id="travel"
                      className="cd-select"
                      value={editForm.travel_availability}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          travel_availability: e.target.value,
                        }))
                      }
                    >
                      <option value="city">Within my city</option>
                      <option value="state">Across my state</option>
                      <option value="india">Across India</option>
                      <option value="international">International</option>
                    </select>
                  </div>
                </div>

                <div className="cd-form-group">
                  <label className="cd-label" htmlFor="bio">
                    Biography & Stage Description *
                  </label>
                  <textarea
                    id="bio"
                    rows="4"
                    className="cd-textarea"
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, bio: e.target.value }))
                    }
                    placeholder="Describe your repertoire, notable performances, and musical style..."
                  />
                </div>

                {/* Performance Types Tags Selector */}
                <div className="cd-form-group">
                  <label className="cd-label">Performance Types & Sets *</label>
                  <div className="cd-tag-cloud">
                    {COMMON_PERFORMANCE_TYPES.map((tag) => {
                      const active = editForm.performance_types.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`cd-tag-item ${active ? "active" : ""}`}
                          onClick={() => togglePerformanceType(tag)}
                        >
                          {active ? "- " : "+ "}
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    style={{ display: "flex", gap: "8px", marginTop: "12px" }}
                  >
                    <input
                      type="text"
                      className="cd-input"
                      placeholder="Add custom performance tag..."
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomTag();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="cd-btn-secondary"
                      onClick={addCustomTag}
                    >
                      Add Tag
                    </button>
                  </div>
                </div>

                <div className="cd-form-grid">
                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="portfolio_url">
                      External Showreel / Video URL
                    </label>
                    <input
                      id="portfolio_url"
                      type="url"
                      className="cd-input"
                      placeholder="https://youtube.com/..."
                      value={editForm.portfolio_url}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          portfolio_url: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="additional_info">
                      Additional Details (Languages, Gear)
                    </label>
                    <input
                      id="additional_info"
                      type="text"
                      className="cd-input"
                      placeholder="e.g. Hindi, English, Punjabi. Own audio equipment."
                      value={editForm.additional_information}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          additional_information: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="cd-form-actions">
                  <button
                    type="submit"
                    className="cd-btn-primary"
                    disabled={profileSaving}
                  >
                    {profileSaving
                      ? "Saving Changes..."
                      : "Save Profile Changes"}
                  </button>
                  <button
                    type="button"
                    className="cd-btn-secondary"
                    onClick={() => switchTab("profile")}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =================================================================
              TAB 4: PORTFOLIO MANAGEMENT PAGE
              ================================================================= */}
          {activeTab === "portfolio" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p style={{ margin: 0, color: "#A0A0A0", fontSize: "0.94rem" }}>
                  Upload videos, performance links, and showreels for
                  prospective event organizers.
                </p>
                <button
                  type="button"
                  className="cd-btn-primary cd-btn-sm"
                  onClick={() => setPortfolioModalOpen(true)}
                >
                  + Add Portfolio Item
                </button>
              </div>

              {portfolio.length === 0 ? (
                <div className="cd-empty-state">
                  <p className="cd-empty-title">No Portfolio Items Yet</p>
                  <p className="cd-empty-text">
                    Click "Add Portfolio Item" to showcase your performance
                    showreels.
                  </p>
                </div>
              ) : (
                <div className="cd-portfolio-grid">
                  {portfolio.map((item) => (
                    <div key={item.id} className="cd-portfolio-card">
                      <div className="cd-portfolio-media-box">
                        {item.media_url ? (
                          <a
                            href={item.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cd-portfolio-media-link"
                          >
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span>Watch Performance</span>
                          </a>
                        ) : (
                          <span
                            style={{ color: "#666666", fontSize: "0.85rem" }}
                          >
                            Audio / Showcase Media
                          </span>
                        )}
                      </div>

                      <div className="cd-portfolio-body">
                        <h3 className="cd-portfolio-title">{item.title}</h3>
                        <p className="cd-portfolio-desc">
                          {item.description || "No description provided."}
                        </p>

                        <div className="cd-portfolio-footer">
                          <span>{item.uploaded_at}</span>
                          <button
                            type="button"
                            className="cd-btn-ghost cd-btn-sm"
                            style={{ color: "#EF5350" }}
                            onClick={() => handleDeletePortfolio(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 5: BOOKING REQUESTS PAGE
              ================================================================= */}
          {activeTab === "requests" && (
            <div className="cd-view-container" style={{ gap: "20px" }}>
              {/* Filter Tabs */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`cd-btn-${requestFilter === "all" ? "primary" : "secondary"} cd-btn-sm`}
                  onClick={() => setRequestFilter("all")}
                >
                  All Requests ({bookings.length})
                </button>
                <button
                  type="button"
                  className={`cd-btn-${requestFilter === "pending" ? "primary" : "secondary"} cd-btn-sm`}
                  onClick={() => setRequestFilter("pending")}
                >
                  Pending Action ({pendingBookingsList.length})
                </button>
                <button
                  type="button"
                  className={`cd-btn-${requestFilter === "accepted" ? "primary" : "secondary"} cd-btn-sm`}
                  onClick={() => setRequestFilter("accepted")}
                >
                  Accepted ({acceptedBookingsList.length})
                </button>
                <button
                  type="button"
                  className={`cd-btn-${requestFilter === "rejected" ? "primary" : "secondary"} cd-btn-sm`}
                  onClick={() => setRequestFilter("rejected")}
                >
                  Declined
                </button>
              </div>

              {filteredBookings.length === 0 ? (
                <div className="cd-empty-card">
                  <h3>No Booking Requests Found</h3>
                  <p>No booking requests match the current filter selection.</p>
                </div>
              ) : (
                <div className="cd-bookings-list">
                  {filteredBookings.map((b) => (
                    <div key={b.id} className="cd-booking-row-card">
                      <div className="cd-booking-id-block">
                        <span className="cd-booking-code">#BK-{b.id}</span>
                        <span className="cd-booking-artist-sub">
                          {b.event_type} · Host: {b.customer_name}
                        </span>
                        {b.message && (
                          <div
                            style={{
                              fontSize: "0.86rem",
                              color: "#B0B0B0",
                              fontStyle: "italic",
                              marginTop: "4px",
                            }}
                          >
                            "{b.message}"
                          </div>
                        )}
                        {b.response_message && (
                          <div
                            style={{
                              fontSize: "0.82rem",
                              color: "#FF9800",
                              marginTop: "4px",
                            }}
                          >
                            Artist Note: {b.response_message}
                          </div>
                        )}
                      </div>

                      <div className="cd-booking-date-block">
                        <span className="cd-booking-date-text">
                          {b.event_date || "Date TBD"}
                        </span>
                        <span className="cd-booking-location-text">
                          {b.event_location}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span className={`cd-status-pill status-${b.status}`}>
                          {formatBookingStatus(b.status)}
                        </span>
                        <span
                          style={{
                            fontSize: "1.05rem",
                            fontWeight: 800,
                            color: "#FF5722",
                          }}
                        >
                          ₹{b.agreed_price}
                        </span>
                      </div>

                      <div className="cd-booking-actions-block">
                        <button
                          type="button"
                          className="cd-btn-secondary cd-btn-sm"
                          onClick={() => {
                            setSelectedBooking(b);
                            switchTab("booking-detail");
                          }}
                        >
                          Details
                        </button>

                        {b.status === "pending" && (
                          <>
                            <button
                              type="button"
                              className="cd-btn-primary cd-btn-sm"
                              onClick={() => {
                                setRespondModal({
                                  open: true,
                                  action: "accept",
                                  booking: b,
                                  reason: "",
                                  final_price: "",
                                });
                              }}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="cd-btn-ghost cd-btn-sm"
                              style={{ color: "#EF5350" }}
                              onClick={() => {
                                setRespondModal({
                                  open: true,
                                  action: "reject",
                                  booking: b,
                                  reason: "",
                                  final_price: "",
                                });
                              }}
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {b.status === "accepted" && (
                          <button
                            type="button"
                            className="cd-btn-secondary cd-btn-sm"
                            style={{ borderColor: "#4CAF50", color: "#4CAF50" }}
                            onClick={() => handleCompleteBooking(b.id)}
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 6: BOOKING DETAILS PAGE
              ================================================================= */}
          {activeTab === "booking-detail" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  className="cd-btn-secondary cd-btn-sm"
                  onClick={() => switchTab("requests")}
                >
                  ← Back to Booking Requests
                </button>
                {selectedBooking && (
                  <span
                    className={`cd-status-pill status-${selectedBooking.status}`}
                  >
                    {formatBookingStatus(selectedBooking.status)}
                  </span>
                )}
              </div>

              {!selectedBooking ? (
                <div className="cd-empty-state">
                  <p className="cd-empty-title">No Booking Selected</p>
                  <p className="cd-empty-text">
                    Please select a booking from the Booking Requests list to
                    view complete details.
                  </p>
                  <button
                    type="button"
                    className="cd-btn-primary"
                    onClick={() => switchTab("requests")}
                  >
                    Go to Booking Requests
                  </button>
                </div>
              ) : (
                <div className="cd-profile-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      paddingBottom: "16px",
                    }}
                  >
                    <div>
                      <h2
                        className="cd-card-title"
                        style={{ fontSize: "1.4rem" }}
                      >
                        {selectedBooking.event_type}
                      </h2>
                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "#888888",
                          fontSize: "0.9rem",
                        }}
                      >
                        Reference Code: BK-{selectedBooking.id} · Requested on{" "}
                        {selectedBooking.created_at}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.8rem", color: "#A0A0A0" }}>
                        Agreed Performance Fee
                      </div>
                      <div
                        style={{
                          fontSize: "1.6rem",
                          fontWeight: 800,
                          color: "#FF5722",
                        }}
                      >
                        ₹{selectedBooking.agreed_price}
                      </div>
                    </div>
                  </div>

                  {/* Grid details */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "20px",
                      marginTop: "20px",
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          color: "#FF5722",
                          textTransform: "uppercase",
                          fontSize: "0.82rem",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Event Host Information
                      </h4>
                      <p
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          margin: "8px 0 4px",
                          color: "#F7F7F7",
                        }}
                      >
                        {selectedBooking.customer_name}
                      </p>
                      <p
                        style={{
                          fontSize: "0.92rem",
                          color: "#A0A0A0",
                          margin: "2px 0",
                        }}
                      >
                        Email:{" "}
                        {selectedBooking.customer_email || "Not provided"}
                      </p>
                      <p
                        style={{
                          fontSize: "0.92rem",
                          color: "#A0A0A0",
                          margin: "2px 0",
                        }}
                      >
                        Phone:{" "}
                        {selectedBooking.customer_phone || "Not provided"}
                      </p>
                      <p
                        style={{
                          fontSize: "0.92rem",
                          color: "#A0A0A0",
                          margin: "2px 0",
                        }}
                      >
                        Host City:{" "}
                        {selectedBooking.customer_location || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <h4
                        style={{
                          color: "#FF5722",
                          textTransform: "uppercase",
                          fontSize: "0.82rem",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Schedule & Location
                      </h4>
                      <p
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          margin: "8px 0 4px",
                          color: "#F7F7F7",
                        }}
                      >
                        {selectedBooking.event_date || "Date not finalized"}
                      </p>
                      <p
                        style={{
                          fontSize: "0.92rem",
                          color: "#A0A0A0",
                          margin: "2px 0",
                        }}
                      >
                        Venue: {selectedBooking.event_location}
                      </p>
                      <p
                        style={{
                          fontSize: "0.92rem",
                          color: "#A0A0A0",
                          margin: "2px 0",
                        }}
                      >
                        Payment Status:{" "}
                        {selectedBooking.payment
                          ? formatBookingStatus(selectedBooking.payment.status)
                          : "Pending Escrow"}
                      </p>
                    </div>
                  </div>

                  {/* Message box */}
                  <div
                    style={{
                      marginTop: "20px",
                      background: "#191919",
                      padding: "16px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.84rem",
                        color: "#888888",
                        textTransform: "uppercase",
                        marginBottom: "6px",
                      }}
                    >
                      Host's Event Notes & Special Inquiries
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.94rem",
                        color: "#E0E0E0",
                        lineHeight: 1.5,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {selectedBooking.message ||
                        "No special instructions submitted by host."}
                    </p>
                  </div>

                  {selectedBooking.response_message && (
                    <div
                      style={{
                        marginTop: "14px",
                        background: "rgba(255,87,34,0.08)",
                        padding: "14px",
                        borderRadius: "6px",
                        borderLeft: "3px solid #FF5722",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "#FF5722",
                          textTransform: "uppercase",
                        }}
                      >
                        Artist Response Note
                      </div>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "0.92rem",
                          color: "#F7F7F7",
                        }}
                      >
                        {selectedBooking.response_message}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      marginTop: "24px",
                      flexWrap: "wrap",
                    }}
                  >
                    {selectedBooking.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="cd-btn-primary"
                          onClick={() => {
                            setRespondModal({
                              open: true,
                              action: "accept",
                              booking: selectedBooking,
                              reason: "",
                              final_price: "",
                            });
                          }}
                        >
                          Accept Booking Request
                        </button>
                        <button
                          type="button"
                          className="cd-btn-secondary"
                          style={{ borderColor: "#EF5350", color: "#EF5350" }}
                          onClick={() => {
                            setRespondModal({
                              open: true,
                              action: "reject",
                              booking: selectedBooking,
                              reason: "",
                              final_price: "",
                            });
                          }}
                        >
                          Decline Request
                        </button>
                      </>
                    )}

                    {selectedBooking.status === "accepted" && (
                      <button
                        type="button"
                        className="cd-btn-primary"
                        onClick={() =>
                          handleCompleteBooking(selectedBooking.id)
                        }
                      >
                        Mark Performance as Completed
                      </button>
                    )}

                    <button
                      type="button"
                      className="cd-btn-secondary"
                      onClick={() => window.print()}
                    >
                      Print Event Specification
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 7: BOOKING CALENDAR PAGE
              ================================================================= */}
          {activeTab === "calendar" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p style={{ margin: 0, color: "#A0A0A0", fontSize: "0.94rem" }}>
                  Confirmed celebration schedule and performance agenda.
                </p>
                <button
                  type="button"
                  className="cd-btn-secondary cd-btn-sm"
                  onClick={() => switchTab("availability")}
                >
                  Manage Blocked Dates
                </button>
              </div>

              {upcomingPerformances.length === 0 ? (
                <div className="cd-empty-state">
                  <p className="cd-empty-title">Calendar Schedule Clear</p>
                  <p className="cd-empty-text">
                    No confirmed performances are currently scheduled on your
                    calendar.
                  </p>
                </div>
              ) : (
                <div className="cd-timeline">
                  {upcomingPerformances.map((perf) => {
                    const eventDateObj = new Date(
                      perf.event_date_iso || perf.event_date,
                    );
                    return (
                      <div key={perf.id} className="cd-timeline-item">
                        <div className="cd-timeline-date-box">
                          <div className="cd-timeline-date-day">
                            {!isNaN(eventDateObj.getTime())
                              ? eventDateObj.getDate()
                              : "--"}
                          </div>
                          <div className="cd-timeline-date-sub">
                            {!isNaN(eventDateObj.getTime())
                              ? eventDateObj.toLocaleString("default", {
                                  month: "short",
                                })
                              : "DATE"}
                          </div>
                        </div>

                        <div className="cd-timeline-info">
                          <h3 className="cd-timeline-title">
                            {perf.event_type}
                          </h3>
                          <div className="cd-timeline-sub">
                            Host:{" "}
                            <strong style={{ color: "#F7F7F7" }}>
                              {perf.customer_name}
                            </strong>{" "}
                            · Venue: {perf.event_location}
                          </div>
                          <div
                            style={{
                              fontSize: "0.86rem",
                              color: "#A0A0A0",
                              marginTop: "2px",
                            }}
                          >
                            Time: {perf.event_date} · Agreed Fee:{" "}
                            <strong style={{ color: "#FF5722" }}>
                              ₹{perf.agreed_price}
                            </strong>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="cd-btn-secondary cd-btn-sm"
                            onClick={() => {
                              setSelectedBooking(perf);
                              switchTab("booking-detail");
                            }}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="cd-btn-primary cd-btn-sm"
                            onClick={() => handleCompleteBooking(perf.id)}
                          >
                            Complete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 8: ACCEPTED BOOKINGS PAGE
              ================================================================= */}
          {activeTab === "accepted" && (
            <div className="cd-view-container" style={{ gap: "20px" }}>
              <p style={{ margin: 0, color: "#A0A0A0", fontSize: "0.96rem" }}>
                All confirmed bookings scheduled with event organizers.
              </p>

              {acceptedBookingsList.length === 0 ? (
                <div className="cd-empty-card">
                  <h3>No Accepted Bookings</h3>
                  <p>
                    When you accept booking requests, they will be listed here
                    for event execution.
                  </p>
                </div>
              ) : (
                <div className="cd-bookings-list">
                  {acceptedBookingsList.map((b) => (
                    <div key={b.id} className="cd-booking-row-card">
                      <div className="cd-booking-id-block">
                        <span className="cd-booking-code">#BK-{b.id}</span>
                        <span className="cd-booking-artist-sub">
                          {b.event_type} · Host: {b.customer_name}
                        </span>
                      </div>

                      <div className="cd-booking-date-block">
                        <span className="cd-booking-date-text">
                          {b.event_date || "Date TBD"}
                        </span>
                        <span className="cd-booking-location-text">
                          {b.event_location}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span className="cd-status-pill status-accepted">
                          Confirmed
                        </span>
                        <span
                          style={{
                            fontSize: "1.05rem",
                            fontWeight: 800,
                            color: "#FF5722",
                          }}
                        >
                          ₹{b.agreed_price}
                        </span>
                      </div>

                      <div className="cd-booking-actions-block">
                        <button
                          type="button"
                          className="cd-btn-secondary cd-btn-sm"
                          onClick={() => {
                            setSelectedBooking(b);
                            switchTab("booking-detail");
                          }}
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          className="cd-btn-primary cd-btn-sm"
                          onClick={() => handleCompleteBooking(b.id)}
                        >
                          Mark Completed
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 9: PAYMENT & EARNINGS PAGE
              ================================================================= */}
          {activeTab === "earnings" && (
            <div className="cd-view-container" style={{ gap: "24px" }}>
              <div
                className="cd-overview-stats-grid"
                style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
              >
                <div className="cd-stat-box accent-earnings">
                  <div className="cd-stat-lbl">Total Earnings</div>
                  <div className="cd-stat-num payments">
                    ₹{stats.total_earnings ?? "0.00"}
                  </div>
                  <div className="cd-stat-sub">Across all bookings</div>
                </div>

                <div className="cd-stat-box">
                  <div className="cd-stat-lbl" style={{ color: "#4CAF50" }}>
                    Completed Payouts
                  </div>
                  <div className="cd-stat-num confirmed">
                    ₹{stats.completed_earnings ?? "0.00"}
                  </div>
                  <div className="cd-stat-sub">Delivered performances</div>
                </div>

                <div className="cd-stat-box accent-pending">
                  <div className="cd-stat-lbl" style={{ color: "#FF9800" }}>
                    Pending Payouts
                  </div>
                  <div className="cd-stat-num pending">
                    ₹{stats.pending_earnings ?? "0.00"}
                  </div>
                  <div className="cd-stat-sub">
                    In escrow for upcoming shows
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="cd-table-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h3 className="cd-table-title" style={{ margin: 0 }}>
                    Payment & Transaction History
                  </h3>
                  <button
                    type="button"
                    className="cd-btn-secondary cd-btn-sm"
                    onClick={() => window.print()}
                  >
                    Print Statement
                  </button>
                </div>

                {payments.length === 0 ? (
                  <div className="cd-empty-state">
                    <p className="cd-empty-title">No Transactions Recorded</p>
                    <p className="cd-empty-text">
                      Transactions will appear as booking agreements and payouts
                      are processed.
                    </p>
                  </div>
                ) : (
                  <div className="cd-table-wrapper">
                    <table className="cd-table">
                      <thead>
                        <tr>
                          <th>Transaction ID</th>
                          <th>Host / Customer</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((pay) => (
                          <tr key={pay.id}>
                            <td>
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  color: "#A0A0A0",
                                }}
                              >
                                {pay.transaction_id}
                              </span>
                            </td>
                            <td>{pay.customer_name}</td>
                            <td>{pay.date}</td>
                            <td>
                              <strong style={{ color: "#F7F7F7" }}>
                                ₹{pay.amount}
                              </strong>
                            </td>
                            <td>
                              <span
                                className={`cd-status-pill status-${pay.status}`}
                              >
                                {formatBookingStatus(pay.status)}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="cd-btn-ghost cd-btn-sm"
                                onClick={() => setReceiptItem(pay)}
                              >
                                View Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 10: REVIEWS & RATINGS PAGE
              ================================================================= */}
          {activeTab === "reviews" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Score Summary */}
              <div
                className="cd-profile-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "24px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ textAlign: "center", minWidth: "120px" }}>
                  <div
                    style={{
                      fontSize: "3rem",
                      fontWeight: 800,
                      color: "#FF5722",
                      lineHeight: 1,
                    }}
                  >
                    {stats.average_rating ? stats.average_rating : "5.0"}
                  </div>
                  <div style={{ marginTop: "6px" }}>
                    {renderStars(stats.average_rating || 5)}
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "#888888",
                      marginTop: "4px",
                    }}
                  >
                    {stats.total_reviews ?? 0} reviews
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    borderLeft: "1px solid rgba(255,255,255,0.08)",
                    paddingLeft: "24px",
                  }}
                >
                  <h3
                    style={{ margin: 0, fontSize: "1.2rem", color: "#F7F7F7" }}
                  >
                    Client Satisfaction & Stage Feedback
                  </h3>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "#A0A0A0",
                      fontSize: "0.92rem",
                      lineHeight: 1.5,
                    }}
                  >
                    Verified reviews left by event hosts and celebration
                    organizers following your performances. High ratings
                    increase your profile visibility on the Explore Artists
                    page.
                  </p>
                </div>
              </div>

              {/* Reviews List */}
              {reviews.length === 0 ? (
                <div className="cd-empty-card">
                  <h3>No Reviews Yet</h3>
                  <p>
                    Client feedback and ratings will appear here following
                    completed performances.
                  </p>
                </div>
              ) : (
                <div className="cd-reviews-grid">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="cd-review-card">
                      <div className="cd-review-header">
                        <div className="cd-review-author">
                          {rev.customer_name}
                        </div>
                        <div className="cd-review-stars">
                          {renderStars(rev.rating)}
                        </div>
                      </div>

                      <p className="cd-review-comment">"{rev.comment}"</p>

                      <div className="cd-review-meta">
                        Event: {rev.event_type || "Private Celebration"} ·
                        Reviewed on {rev.created_at}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 11: ARTIST NOTIFICATIONS PAGE
              ================================================================= */}
          {activeTab === "notifications" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p style={{ margin: 0, color: "#A0A0A0", fontSize: "0.94rem" }}>
                  Real-time updates regarding bookings, payments, and system
                  notifications.
                </p>
                {unreadNotifsCount > 0 && (
                  <button
                    type="button"
                    className="cd-btn-secondary cd-btn-sm"
                    onClick={handleMarkNotifsRead}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="cd-empty-state">
                  <p className="cd-empty-title">No Notifications</p>
                  <p className="cd-empty-text">
                    You are all caught up! New alerts will appear here in real
                    time.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "16px 20px",
                        background: n.is_read
                          ? "#212121"
                          : "rgba(255, 87, 34, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderLeft: n.is_read
                          ? "3px solid transparent"
                          : "3px solid #FF5722",
                        borderRadius: "6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <strong style={{ fontSize: "1rem", color: "#F7F7F7" }}>
                          {n.title}
                        </strong>
                        <span style={{ fontSize: "0.8rem", color: "#888888" }}>
                          {n.created_at}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.92rem",
                          color: "#CCCCCC",
                          lineHeight: 1.5,
                        }}
                      >
                        {n.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 12: AVAILABILITY MANAGEMENT PAGE
              ================================================================= */}
          {activeTab === "availability" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* Form to Set Availability */}
              <div className="cd-form-card">
                <h3 className="cd-card-title" style={{ marginBottom: "14px" }}>
                  Set Date Availability Status
                </h3>
                <form onSubmit={handleSaveAvailability} className="cd-form">
                  <div className="cd-form-grid">
                    <div className="cd-form-group">
                      <label className="cd-label" htmlFor="avail_date">
                        Select Date *
                      </label>
                      <input
                        id="avail_date"
                        type="date"
                        className="cd-input"
                        value={availForm.date}
                        onChange={(e) =>
                          setAvailForm((p) => ({ ...p, date: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="cd-form-group">
                      <label className="cd-label" htmlFor="avail_status">
                        Status *
                      </label>
                      <select
                        id="avail_status"
                        className="cd-select"
                        value={availForm.is_available ? "true" : "false"}
                        onChange={(e) =>
                          setAvailForm((p) => ({
                            ...p,
                            is_available: e.target.value === "true",
                          }))
                        }
                      >
                        <option value="false">
                          Unavailable / Blocked Date
                        </option>
                        <option value="true">Available for Bookings</option>
                      </select>
                    </div>

                    <div className="cd-form-group">
                      <label className="cd-label" htmlFor="avail_reason">
                        Reason / Note (Optional)
                      </label>
                      <input
                        id="avail_reason"
                        type="text"
                        className="cd-input"
                        placeholder="e.g. Studio recording, Out of town, Private event"
                        value={availForm.reason}
                        onChange={(e) =>
                          setAvailForm((p) => ({
                            ...p,
                            reason: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="cd-form-actions">
                    <button
                      type="submit"
                      className="cd-btn-primary cd-btn-sm"
                      disabled={availSaving}
                    >
                      {availSaving ? "Saving..." : "Save Date Status"}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Custom Date Overrides */}
              <div className="cd-profile-card">
                <h3 className="cd-card-title" style={{ marginBottom: "14px" }}>
                  Configured Date Overrides
                </h3>
                {availability.length === 0 ? (
                  <p style={{ color: "#888888", fontSize: "0.92rem" }}>
                    No dates are currently marked unavailable. Your profile
                    appears open for inquiries on all regular calendar dates.
                  </p>
                ) : (
                  <div className="cd-avail-grid">
                    {availability.map((av) => (
                      <div key={av.id} className="cd-avail-card">
                        <div>
                          <div className="cd-avail-date">
                            {av.date_formatted}
                          </div>
                          <span
                            className={`cd-status-pill ${av.is_available ? "status-accepted" : "status-cancelled"}`}
                            style={{
                              display: "inline-block",
                              marginTop: "6px",
                            }}
                          >
                            {av.is_available ? "Available" : "Unavailable"}
                          </span>
                          {av.reason && (
                            <div className="cd-avail-reason">{av.reason}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="cd-btn-ghost cd-btn-sm"
                          style={{ color: "#EF5350" }}
                          onClick={() => handleDeleteAvailability(av.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =====================================================================
          MODAL: RESPOND TO BOOKING (ACCEPT / DECLINE)
          ===================================================================== */}
      {respondModal.open && respondModal.booking && (
        <div className="cd-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cd-modal-card">
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">
                {respondModal.action === "accept"
                  ? "Accept Booking Request"
                  : "Decline Booking Request"}
              </h3>
              <button
                type="button"
                className="cd-modal-close"
                onClick={() =>
                  setRespondModal({
                    open: false,
                    action: "accept",
                    booking: null,
                    reason: "",
                    final_price: "",
                  })
                }
                aria-label="Close"
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

            <div className="cd-modal-body">
              <p
                style={{
                  margin: 0,
                  fontSize: "0.94rem",
                  color: "#CCCCCC",
                  lineHeight: 1.5,
                }}
              >
                {respondModal.action === "accept"
                  ? `Confirm booking for ${respondModal.booking.event_type} on ${respondModal.booking.event_date} with ${respondModal.booking.customer_name}.`
                  : `Please provide a reason for declining the request from ${respondModal.booking.customer_name}.`}
              </p>

              {respondModal.action === "accept" && (
                <div style={{ marginTop: "16px" }}>
                  <label className="cd-label" htmlFor="final_price">
                    Final Performance Price (₹) *
                  </label>

                  <input
                    id="final_price"
                    type="number"
                    min="1"
                    step="0.01"
                    className="cd-input"
                    placeholder="Enter your final performance price"
                    value={respondModal.final_price}
                    onChange={(e) => {
                      console.log("Input changed:", e.target.value);

                      setRespondModal((p) => ({
                        ...p,
                        final_price: e.target.value,
                      }));
                    }}
                    required
                  />

                  <small
                    style={{
                      color: "#AAAAAA",
                      display: "block",
                      marginTop: "6px",
                    }}
                  >
                    Enter the final amount you expect to receive for this
                    performance.
                  </small>
                </div>
              )}

              <div style={{ marginTop: "14px" }}>
                <label className="cd-label" htmlFor="respond_reason">
                  {respondModal.action === "accept"
                    ? "Optional Note to Host"
                    : "Reason for Declining *"}
                </label>
                <textarea
                  id="respond_reason"
                  rows="3"
                  className="cd-textarea"
                  placeholder={
                    respondModal.action === "accept"
                      ? "e.g. Looking forward to performing! Will connect regarding sound check."
                      : "e.g. Date already booked for another show, Unable to travel..."
                  }
                  value={respondModal.reason}
                  onChange={(e) =>
                    setRespondModal((p) => ({ ...p, reason: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="cd-modal-actions">
              <button
                type="button"
                className={`cd-btn-${respondModal.action === "accept" ? "primary" : "secondary"}`}
                style={
                  respondModal.action === "reject"
                    ? { borderColor: "#EF5350", color: "#EF5350" }
                    : {}
                }
                disabled={responding}
                onClick={handleConfirmBookingResponse}
              >
                {responding
                  ? "Processing..."
                  : respondModal.action === "accept"
                    ? "Confirm Acceptance"
                    : "Confirm Decline"}
              </button>
              <button
                type="button"
                className="cd-btn-secondary"
                onClick={() =>
                  setRespondModal({
                    open: false,
                    action: "accept",
                    booking: null,
                    reason: "",
                    final_price: "",
                  })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD PORTFOLIO ITEM
          ===================================================================== */}
      {portfolioModalOpen && (
        <div className="cd-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cd-modal-card">
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">Add Portfolio Showreel</h3>
              <button
                type="button"
                className="cd-modal-close"
                onClick={() => setPortfolioModalOpen(false)}
                aria-label="Close"
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

            <form onSubmit={handleAddPortfolioSubmit}>
              <div className="cd-modal-body">
                <div className="cd-form-group">
                  <label className="cd-label" htmlFor="port_title">
                    Performance Title *
                  </label>
                  <input
                    id="port_title"
                    type="text"
                    className="cd-input"
                    placeholder="e.g. Live at Royal Opera Gala 2026"
                    value={portfolioForm.title}
                    onChange={(e) =>
                      setPortfolioForm((p) => ({ ...p, title: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="cd-form-group">
                  <label className="cd-label" htmlFor="port_url">
                    Media / Showreel URL (YouTube / Vimeo / SoundCloud) *
                  </label>
                  <input
                    id="port_url"
                    type="url"
                    className="cd-input"
                    placeholder="https://youtube.com/watch?v=..."
                    value={portfolioForm.media_url}
                    onChange={(e) =>
                      setPortfolioForm((p) => ({
                        ...p,
                        media_url: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="cd-form-group">
                  <label className="cd-label" htmlFor="port_desc">
                    Description
                  </label>
                  <textarea
                    id="port_desc"
                    rows="3"
                    className="cd-textarea"
                    placeholder="Describe the set, genre, and celebration..."
                    value={portfolioForm.description}
                    onChange={(e) =>
                      setPortfolioForm((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="cd-modal-actions">
                <button
                  type="submit"
                  className="cd-btn-primary"
                  disabled={portfolioSaving}
                >
                  {portfolioSaving ? "Adding..." : "Add Portfolio Item"}
                </button>
                <button
                  type="button"
                  className="cd-btn-secondary"
                  onClick={() => setPortfolioModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: RECEIPT
          ===================================================================== */}
      {receiptItem && (
        <div className="cd-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cd-modal-card" style={{ maxWidth: "480px" }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">Payment Payout Receipt</h3>
              <button
                type="button"
                className="cd-modal-close"
                onClick={() => setReceiptItem(null)}
                aria-label="Close"
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

            <div
              className="cd-modal-body"
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  padding: "16px",
                  background: "#191919",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ color: "#888888" }}>Transaction ID:</span>
                  <strong style={{ color: "#F7F7F7", fontFamily: "monospace" }}>
                    {receiptItem.transaction_id}
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ color: "#888888" }}>Customer / Host:</span>
                  <strong style={{ color: "#F7F7F7" }}>
                    {receiptItem.customer_name}
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ color: "#888888" }}>Date:</span>
                  <span>{receiptItem.date}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ color: "#888888" }}>Payout Amount:</span>
                  <strong style={{ color: "#FF5722", fontSize: "1.2rem" }}>
                    ₹{receiptItem.amount}
                  </strong>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "#888888" }}>Status:</span>
                  <span
                    className={`cd-status-pill status-${receiptItem.status}`}
                  >
                    {formatBookingStatus(receiptItem.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="cd-modal-actions">
              <button
                type="button"
                className="cd-btn-primary"
                onClick={() => window.print()}
              >
                Print Receipt
              </button>
              <button
                type="button"
                className="cd-btn-secondary"
                onClick={() => setReceiptItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer navigate={navigate} />
    </div>
  );
}

export default ArtistDashboard;
