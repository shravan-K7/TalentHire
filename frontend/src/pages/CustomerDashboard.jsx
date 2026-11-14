import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  fetchCustomerDashboard,
  updateCustomerProfile,
  changeCustomerPassword,
  deactivateCustomerAccount,
  toggleFavoriteArtist,
  cancelCustomerBooking,
  markNotificationsRead,
  submitSupportInquiry,
  fetchArtistCategories,
  updateArtistProfileData,
  getCurrentUser,
  createPaymentOrder,
  verifyPayment,
} from "../js/auth";
import "../css/CustomerDashboard.css";

function formatBookingStatus(status) {
  if (!status) return "Pending";
  if (status === "accepted") return "Confirmed";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "rejected") return "Rejected";
  return typeof status === "string" && status.length > 0
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Pending";
}

const ARTIST_PERF_OPTIONS = [
  "Solo performance",
  "Group performance",
  "Live events",
  "Weddings",
  "Corporate events",
  "Private parties",
  "Festivals",
];

function CustomerDashboard({
  user,
  onLogout,
  navigate,
  onUserUpdate,
  currentPath,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(user));
  const [error, setError] = useState("");
  const [paymentLoadingId, setPaymentLoadingId] = useState(null);

  // Active tab matches the screens in Customer Dashboard
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "profile";
  });

  const [selectedBooking, setSelectedBooking] = useState(null);

  // Receipt Modal State
  const [receiptItem, setReceiptItem] = useState(null);

  // Edit Profile Form State
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    location: "",
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  // Register as Performing Artist Form State
  const [artistCategories, setArtistCategories] = useState([]);
  const [artistCategoriesLoading, setArtistCategoriesLoading] = useState(false);
  const [artistForm, setArtistForm] = useState({
    stage_name: "",
    category: "",
    gender: "male",
    years_of_experience: "1",
    starting_price: "15000",
    location: "",
    phone: "",
    travel_availability: "city",
    performance_types: ["Live events", "Weddings"],
    bio: "",
    portfolio_url: "",
    additional_information: "",
  });
  const [artistImageFile, setArtistImageFile] = useState(null);
  const [artistImagePreview, setArtistImagePreview] = useState("");
  const [artistRegisterLoading, setArtistRegisterLoading] = useState(false);
  const [artistSuccessMsg, setArtistSuccessMsg] = useState("");
  const [artistCreatedId, setArtistCreatedId] = useState(null);
  const [artistErrorMsg, setArtistErrorMsg] = useState("");
  const [artistFieldErrors, setArtistFieldErrors] = useState({});
  const artistFileInputRef = useRef(null);

  // Password Change Form State
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");

  // Support Inquiry Form State
  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
  });
  const [supportSending, setSupportSending] = useState(false);
  const [supportSuccessMsg, setSupportSuccessMsg] = useState("");
  const [supportErrorMsg, setSupportErrorMsg] = useState("");

  // Deactivate Modal State
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState("");

  // Action status toast
  const [toastMsg, setToastMsg] = useState("");

  // Listen to browser back/forward history navigation & currentPath updates
  useEffect(() => {
    function handlePop() {
      const params = new URLSearchParams(window.location.search);
      const tabFromUrl = params.get("tab") || "profile";
      setActiveTab(tabFromUrl);
    }
    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [currentPath]);

  // Load Categories & Pre-populate when entering artist registration tab
  useEffect(() => {
    if (activeTab === "artist-register" || activeTab === "register-artist") {
      if (artistCategories.length === 0 && !artistCategoriesLoading) {
        setArtistCategoriesLoading(true);
        fetchArtistCategories()
          .then((cats) => {
            setArtistCategories(cats);
            if (cats.length > 0) {
              setArtistForm((prev) => ({
                ...prev,
                category: prev.category || String(cats[0].id),
              }));
            }
          })
          .catch((err) => {
            console.error("Failed to load artist categories:", err);
          })
          .finally(() => {
            setArtistCategoriesLoading(false);
          });
      }
      if (data?.profile) {
        setArtistForm((prev) => ({
          ...prev,
          location: prev.location || data.profile.location || "",
          phone: prev.phone || data.profile.phone || "",
        }));
      }
    }
  }, [activeTab, data]);

  function handleArtistFormChange(e) {
    const { name, value } = e.target;
    setArtistForm((prev) => ({ ...prev, [name]: value }));
    if (artistFieldErrors[name]) {
      setArtistFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function handleArtistPerformanceToggle(type) {
    setArtistForm((prev) => {
      const exists = prev.performance_types.includes(type);
      const updated = exists
        ? prev.performance_types.filter((t) => t !== type)
        : [...prev.performance_types, type];
      return { ...prev, performance_types: updated };
    });
  }

  function handleArtistImageChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setArtistImageFile(file);
      const url = URL.createObjectURL(file);
      setArtistImagePreview(url);
    }
  }

  async function handleArtistSubmit(e) {
    e.preventDefault();
    setArtistRegisterLoading(true);
    setArtistErrorMsg("");
    setArtistSuccessMsg("");
    setArtistFieldErrors({});

    const errors = {};
    if (!artistForm.stage_name.trim())
      errors.stage_name = "Stage name is required.";
    if (!artistForm.category) errors.category = "Primary category is required.";
    if (!artistForm.location.trim())
      errors.location = "Base location is required.";
    if (!artistForm.bio.trim()) errors.bio = "Stage bio is required.";
    if (!artistForm.starting_price || Number(artistForm.starting_price) <= 0) {
      errors.starting_price = "Please enter a valid starting fee.";
    }

    if (Object.keys(errors).length > 0) {
      setArtistFieldErrors(errors);
      setArtistErrorMsg("Please fill in all required fields.");
      setArtistRegisterLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(artistForm).forEach(([key, val]) => {
        if (key === "performance_types") {
          formData.append(key, JSON.stringify(val));
        } else {
          formData.append(key, val ?? "");
        }
      });
      if (artistImageFile) {
        formData.append("profile_image", artistImageFile);
      }

      const res = await updateArtistProfileData(formData);
      setArtistSuccessMsg(
        res.message ||
          "Congratulations! Your Performing Artist Profile is now active.",
      );
      if (res.artist_id || res.artist?.id) {
        setArtistCreatedId(res.artist_id || res.artist?.id);
      }
      showToast("Artist profile registered successfully!");

      try {
        const updatedUser = await getCurrentUser();
        if (onUserUpdate && updatedUser) {
          onUserUpdate(updatedUser);
        }
      } catch (userErr) {
        console.warn("Could not refresh user session:", userErr);
      }
    } catch (err) {
      setArtistErrorMsg(
        err.message ||
          "Failed to complete artist registration. Please try again.",
      );
    } finally {
      setArtistRegisterLoading(false);
    }
  }

  function switchTab(tabName) {
    setActiveTab(tabName);
    const currentUrl = new URL(window.location.href);
    if (tabName === "profile") {
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

  const refreshDashboard = useCallback(async () => {
    try {
      const res = await fetchCustomerDashboard();
      setData(res);
      const prof = res.profile || {};
      setProfileForm({
        first_name: prof.first_name || "",
        last_name: prof.last_name || "",
        phone: prof.phone || "",
        location: prof.location || "",
      });
      setProfileImagePreview(prof.profile_image || "");
    } catch (err) {
      setError(err.message || "Unable to load customer dashboard data.");
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let ignore = false;

    async function init() {
      try {
        const res = await fetchCustomerDashboard();
        if (!ignore) {
          setData(res);
          const prof = res.profile || {};
          setProfileForm({
            first_name: prof.first_name || "",
            last_name: prof.last_name || "",
            phone: prof.phone || "",
            location: prof.location || "",
          });
          setProfileImagePreview(prof.profile_image || "");
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Unable to load customer dashboard data.");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      ignore = true;
    };
  }, [user]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg("");
    }, 4000);
  }

  // Handle Profile Image Selection
  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setProfileErrorMsg("Profile picture must be under 5MB.");
        return;
      }
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
      setProfileErrorMsg("");
    }
  }

  // Handle Profile Update Submission
  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileUpdating(true);
    setProfileSuccessMsg("");
    setProfileErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("first_name", profileForm.first_name);
      formData.append("last_name", profileForm.last_name);
      formData.append("phone", profileForm.phone);
      formData.append("location", profileForm.location);
      if (profileImageFile) {
        formData.append("profile_image", profileImageFile);
      }

      const res = await updateCustomerProfile(formData);
      setProfileSuccessMsg(
        res.message || "Personal details updated successfully.",
      );
      showToast("Profile updated successfully.");
      if (onUserUpdate && res.user) {
        onUserUpdate(res.user);
      }
      refreshDashboard();
      setTimeout(() => {
        switchTab("profile");
      }, 900);
    } catch (err) {
      setProfileErrorMsg(err.message || "Failed to update personal details.");
    } finally {
      setProfileUpdating(false);
    }
  }

  // Handle Password Change Submission
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordUpdating(true);
    setPasswordSuccessMsg("");
    setPasswordErrorMsg("");

    try {
      const res = await changeCustomerPassword(passwordForm);
      setPasswordSuccessMsg(res.message || "Password updated successfully.");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      showToast("Password changed successfully.");
    } catch (err) {
      setPasswordErrorMsg(err.message || "Failed to change password.");
    } finally {
      setPasswordUpdating(false);
    }
  }

  // Handle Booking Cancellation
  async function handleCancelBooking(bookingId) {
    if (
      !window.confirm("Are you sure you want to cancel this booking request?")
    ) {
      return;
    }

    try {
      const res = await cancelCustomerBooking(bookingId);
      showToast(res.message || "Booking cancelled.");
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking((prev) =>
          prev ? { ...prev, status: "cancelled" } : null,
        );
      }
      refreshDashboard();
    } catch (err) {
      showToast(err.message || "Unable to cancel booking.");
    }
  }

  // Handle Favorite Toggle
  async function handleToggleFavorite(artistId) {
    try {
      const res = await toggleFavoriteArtist(artistId);
      showToast(res.message || "Favourites updated.");
      refreshDashboard();
    } catch (err) {
      showToast(err.message || "Unable to update favourites.");
    }
  }

  // Handle Mark Notifications as Read
  async function handleMarkNotificationsRead() {
    try {
      await markNotificationsRead();
      showToast("All notifications marked as read.");
      refreshDashboard();
    } catch (err) {
      showToast(err.message || "Unable to mark notifications.");
    }
  }

  // Handle Support Ticket Submit
  async function handleSupportSubmit(e) {
    e.preventDefault();
    setSupportSending(true);
    setSupportSuccessMsg("");
    setSupportErrorMsg("");

    try {
      const res = await submitSupportInquiry(supportForm);
      setSupportSuccessMsg(res.message || "Inquiry submitted.");
      setSupportForm({ subject: "", message: "" });
      showToast("Support request sent.");
      refreshDashboard();
    } catch (err) {
      setSupportErrorMsg(err.message || "Failed to send support request.");
    } finally {
      setSupportSending(false);
    }
  }

  // Handle Account Deactivation
  async function handleDeactivateAccount() {
    setDeactivating(true);
    setDeactivateError("");

    try {
      await deactivateCustomerAccount({
        password: deactivatePassword,
        confirm: true,
      });
      setShowDeactivateModal(false);
      if (onLogout) {
        onLogout();
      } else {
        window.location.href = "/login";
      }
    } catch (err) {
      setDeactivateError(err.message || "Account deactivation failed.");
    } finally {
      setDeactivating(false);
    }
  }

  function handleOpenReceipt(item) {
    setReceiptItem(item);
  }

  async function handlePayNow(booking) {
    if (paymentLoadingId) return;

    setPaymentLoadingId(booking.id);

    try {
      // Step 1: Create Razorpay order through Django
      const order = await createPaymentOrder(booking.id);

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout failed to load. Please refresh the page.",
        );
      }

      // Step 2: Configure Razorpay Checkout
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "TalentHire",
        description: `Booking payment - ${booking.artist_name}`,
        order_id: order.order_id,

        prefill: {
          name: profile.full_name || user?.username || "",
          email: profile.email || user?.email || "",
          contact: profile.phone || "",
        },

        theme: {
          color: "#FF5722",
        },

        // Step 3: Verify payment through Django
        handler: async function (response) {
          console.log("Razorpay response:", response);

          const payload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          try {
            // Verify payment with Django
            await verifyPayment(payload);

            showToast("Payment successful and verified!");

            // Refresh dashboard separately
            try {
              await refreshDashboard();
            } catch (refreshError) {
              console.error("Dashboard refresh failed:", refreshError);
            }
          } catch (err) {
            console.error("Payment verification error:", err);
            showToast(err.message || "Payment verification failed.");
          } finally {
            setPaymentLoadingId(null);
          }
        },

        modal: {
          ondismiss: function () {
            setPaymentLoadingId(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        showToast(
          response.error?.description || "Payment failed. Please try again.",
        );
        setPaymentLoadingId(null);
      });

      // Step 4: Open checkout
      razorpay.open();
    } catch (err) {
      showToast(err.message || "Unable to start payment.");
      setPaymentLoadingId(null);
    }
  }

  function handlePrintReceipt() {
    window.print();
  }

  const profile = data?.profile || {};
  const stats = data?.stats || {};
  const bookings = data?.bookings || [];
  const payments = data?.payments || [];
  const favorites = data?.favorites || [];
  const notifications = data?.notifications || [];
  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  const initials = (
    profile.full_name ||
    profile.username ||
    user?.username ||
    "CU"
  )
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Categorize bookings into Upcoming and Past as shown in Screen 3 of image
  const upcomingBookings = bookings.filter((b) => {
    return b.status === "pending" || b.status === "accepted";
  });

  const pastBookings = bookings.filter((b) => {
    return (
      b.status === "completed" ||
      b.status === "cancelled" ||
      b.status === "rejected"
    );
  });

  if (!user) {
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
            <h2>Authentication Required</h2>
            <p>Please sign in to access your Customer Profile Dashboard.</p>
            <button
              type="button"
              className="cd-btn-primary"
              onClick={() =>
                navigate
                  ? navigate("/login")
                  : (window.location.href = "/login")
              }
            >
              Sign In to TalentHire
            </button>
          </div>
        </main>
        <Footer navigate={navigate} />
      </div>
    );
  }

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
          <p className="cd-loading-text">Loading User Profile Dashboard...</p>
        </main>
      </div>
    );
  }

  if (error) {
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
            <h2>Unable to Load Dashboard</h2>
            <p>{error}</p>
            <button
              type="button"
              className="cd-btn-primary"
              onClick={() => window.location.reload()}
            >
              Retry Loading
            </button>
          </div>
        </main>
        <Footer navigate={navigate} />
      </div>
    );
  }

  // Get active screen title matching the reference image
  let screenTitle = "Customer Profile Page";
  if (activeTab === "edit-profile") screenTitle = "Edit Profile Page";
  else if (activeTab === "bookings") screenTitle = "My Bookings Page";
  else if (activeTab === "booking-detail") screenTitle = "Booking Details Page";
  else if (activeTab === "payments") screenTitle = "Payment History Page";
  else if (activeTab === "settings") screenTitle = "Account Settings";
  else if (activeTab === "favorites") screenTitle = "Favourite Artists";
  else if (activeTab === "notifications") screenTitle = "Notifications";
  else if (activeTab === "support") screenTitle = "Help & Support";
  else if (activeTab === "artist-register" || activeTab === "register-artist")
    screenTitle = "Register as Performing Artist";

  return (
    <div className="cd-page">
      <Navbar
        user={user}
        onLogout={onLogout}
        currentPath="/profile"
        navigate={navigate}
      />

      {/* Floating Action Toast */}
      {toastMsg && (
        <aside className="cd-toast" role="status" aria-live="polite">
          <span>{toastMsg}</span>
        </aside>
      )}

      {/* Main Dashboard Layout Shell: Left Sidebar + Right Content matching reference image */}
      <div className="cd-dashboard-shell">
        {/* =========================================================================
            LEFT SIDEBAR NAVIGATION (Matching image sidebar with 4 core tabs)
            ========================================================================= */}
        <aside className="cd-sidebar" aria-label="Customer Profile Navigation">
          <div className="cd-sidebar-header">
            <span className="cd-sidebar-brand-label">Profile Menu</span>
          </div>

          {/* User mini-card */}
          <div className="cd-sidebar-user-mini">
            <div className="cd-sidebar-user-avatar">
              {profile.profile_image ? (
                <img
                  src={profile.profile_image}
                  alt={profile.full_name || profile.username}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="cd-sidebar-user-info">
              <div className="cd-sidebar-user-name">
                {profile.full_name || profile.username || user?.username}
              </div>
              <div className="cd-sidebar-user-role">Customer</div>
            </div>
          </div>

          <nav className="cd-sidebar-nav">
            {/* 1. Dashboard (Customer Profile Page) */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "profile" || activeTab === "dashboard" ? "active" : ""}`}
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
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Dashboard</span>
            </button>

            {/* 2. My Bookings */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "bookings" || activeTab === "booking-detail" ? "active" : ""}`}
              onClick={() => {
                setSelectedBooking(null);
                switchTab("bookings");
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
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>My Bookings</span>
              {bookings.length > 0 && (
                <span className="cd-sidebar-badge">{bookings.length}</span>
              )}
            </button>

            {/* 3. Payment History */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "payments" ? "active" : ""}`}
              onClick={() => switchTab("payments")}
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
              <span>Payment History</span>
              {payments.length > 0 && (
                <span className="cd-sidebar-badge">{payments.length}</span>
              )}
            </button>

            {/* 4. Settings */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "settings" || activeTab === "edit-profile" ? "active" : ""}`}
              onClick={() => switchTab("settings")}
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
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </button>

            <div className="cd-sidebar-divider" />

            {/* Register as Performing Artist Button */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "artist-register" || activeTab === "register-artist" ? "active" : ""}`}
              onClick={() => switchTab("artist-register")}
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
              <span>Register as Artist</span>
            </button>

            {/* Quick Secondary Links */}
            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "favorites" ? "active" : ""}`}
              onClick={() => switchTab("favorites")}
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
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>Favourites</span>
              {data?.favorites?.length > 0 && (
                <span className="cd-sidebar-badge">
                  {data.favorites.length}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`cd-sidebar-item ${activeTab === "support" ? "active" : ""}`}
              onClick={() => switchTab("support")}
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
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Help & Support</span>
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

        {/* =========================================================================
            RIGHT MAIN CONTENT AREA
            ========================================================================= */}
        <main className="cd-main-panel">
          {/* Top Bar inside content view */}
          <div className="cd-content-topbar">
            <div className="cd-screen-heading-wrap">
              <h1 className="cd-screen-title">{screenTitle}</h1>
            </div>

            <div className="cd-topbar-actions">
              <span className="cd-topbar-badge">
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
                {data?.security?.account_verification_status ||
                  "Verified Customer"}
              </span>

              <button
                type="button"
                className="cd-btn-outline small cd-topbar-action-btn"
                onClick={() =>
                  navigate
                    ? navigate("/artists")
                    : (window.location.href = "/artists")
                }
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Find Artists</span>
              </button>
            </div>
          </div>

          {/* =======================================================================
              SCREEN 1: CUSTOMER PROFILE PAGE (Exact layout from reference image)
              ======================================================================= */}
          {(activeTab === "profile" || activeTab === "dashboard") && (
            <div className="cd-view-container cd-profile-view">
              <div className="cd-profile-card">
                <div className="cd-profile-card-header">
                  {/* Avatar Circle with silhouette / photo */}
                  <div className="cd-profile-avatar-box">
                    {profile.profile_image ? (
                      <img
                        src={profile.profile_image}
                        alt={profile.full_name || profile.username}
                        className="cd-profile-avatar-img"
                      />
                    ) : (
                      <div className="cd-profile-avatar-placeholder">
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Name and Subtitle */}
                  <div className="cd-profile-info-column">
                    <h2 className="cd-profile-fullname">
                      {profile.full_name || profile.username || "John Doe"}
                    </h2>
                    <p className="cd-profile-subtext">
                      Customer, {profile.username || "Active Member"}
                    </p>
                  </div>

                  {/* Edit Button */}
                  <div className="cd-profile-edit-btn-wrap">
                    <button
                      type="button"
                      className="cd-btn-edit-details"
                      onClick={() => switchTab("edit-profile")}
                      title="Edit Personal Details"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                <div className="cd-profile-card-divider" />

                {/* Contact Details & Address 2-Column Grid */}
                <div className="cd-profile-details-grid-layout">
                  <div className="cd-profile-section-block">
                    <h3 className="cd-profile-section-heading">
                      Contact Details
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
                        {profile.phone || "023-455-7789"}
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
                        {profile.email || user.email || "customer@gmail.com"}
                      </span>
                    </div>
                  </div>

                  <div className="cd-profile-section-block">
                    <h3 className="cd-profile-section-heading">
                      Address & Location
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
                        {profile.location ||
                          "344 Main Street, Somewhere, 125 Street, 915256"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Overview Metrics (Retained from previous requirements) */}
              <div className="cd-overview-stats-grid">
                <div
                  className="cd-stat-box"
                  onClick={() => switchTab("bookings")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cd-stat-num">
                    {stats.total_bookings ?? bookings.length}
                  </div>
                  <div className="cd-stat-lbl">Total Bookings</div>
                </div>
                <div
                  className="cd-stat-box"
                  onClick={() => switchTab("bookings")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cd-stat-num pending">
                    {stats.pending_bookings ?? 0}
                  </div>
                  <div className="cd-stat-lbl">Pending</div>
                </div>
                <div
                  className="cd-stat-box"
                  onClick={() => switchTab("bookings")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cd-stat-num confirmed">
                    {stats.confirmed_bookings ?? 0}
                  </div>
                  <div className="cd-stat-lbl">Confirmed</div>
                </div>
                <div
                  className="cd-stat-box"
                  onClick={() => switchTab("bookings")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cd-stat-num completed">
                    {stats.completed_bookings ?? 0}
                  </div>
                  <div className="cd-stat-lbl">Completed</div>
                </div>
                <div
                  className="cd-stat-box"
                  onClick={() => switchTab("payments")}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cd-stat-num payments">{payments.length}</div>
                  <div className="cd-stat-lbl">Payments</div>
                </div>
              </div>

              {/* Ready to Perform? Register as Artist Banner */}
              <div className="cd-artist-join-card">
                <div className="cd-artist-join-text">
                  <div className="cd-artist-join-badge">
                    WANT TO PERFORM ON TALENTHIRE?
                  </div>
                  <h3 className="cd-artist-join-title">
                    Register as a Performing Artist
                  </h3>
                  <p className="cd-artist-join-desc">
                    Are you a singer, dancer, DJ, anchor, or musician? Register
                    your stage profile to showcase your live performance reel,
                    set your pricing, and receive direct event bookings.
                  </p>
                </div>
                <button
                  type="button"
                  className="cd-artist-join-btn"
                  onClick={() => switchTab("artist-register")}
                >
                  Register as Performing Artist →
                </button>
              </div>
            </div>
          )}

          {/* =======================================================================
              SCREEN 2: EDIT PROFILE PAGE (Exact layout from reference image)
              ======================================================================= */}
          {activeTab === "edit-profile" && (
            <div className="cd-view-container cd-edit-profile-view">
              <div className="cd-form-card cd-edit-personal-details-card">
                <div className="cd-form-card-header">
                  <h2 className="cd-form-title">Edit Personal Details</h2>
                </div>

                {profileSuccessMsg && (
                  <div className="cd-alert cd-alert-success">
                    {profileSuccessMsg}
                  </div>
                )}
                {profileErrorMsg && (
                  <div className="cd-alert cd-alert-error">
                    {profileErrorMsg}
                  </div>
                )}

                <form
                  onSubmit={handleProfileSubmit}
                  className="cd-edit-profile-form"
                >
                  {/* Avatar Upload Preview */}
                  <div className="cd-form-group cd-avatar-upload-group">
                    <label className="cd-form-label">Profile Picture</label>
                    <div className="cd-avatar-picker-row">
                      <div className="cd-avatar-picker-preview">
                        {profileImagePreview ? (
                          <img src={profileImagePreview} alt="Preview" />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: "none" }}
                      />
                      <button
                        type="button"
                        className="cd-btn-outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="cd-form-group">
                    <label className="cd-form-label" htmlFor="first_name">
                      Full Name *
                    </label>
                    <div className="cd-fullname-inputs">
                      <input
                        id="first_name"
                        type="text"
                        className="cd-form-input"
                        placeholder="First Name"
                        value={profileForm.first_name}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            first_name: e.target.value,
                          }))
                        }
                      />
                      <input
                        id="last_name"
                        type="text"
                        className="cd-form-input"
                        placeholder="Last Name"
                        value={profileForm.last_name}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            last_name: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="cd-form-group">
                    <label className="cd-form-label" htmlFor="email">
                      Email *
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="cd-form-input cd-input-readonly"
                      value={profile.email || user.email || ""}
                      readOnly
                      title="Email is verified with your account login."
                    />
                  </div>

                  {/* Phone */}
                  <div className="cd-form-group">
                    <label className="cd-form-label" htmlFor="phone">
                      Phone *
                    </label>
                    <input
                      id="phone"
                      type="text"
                      className="cd-form-input"
                      placeholder="023-455-7789"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Address / Location */}
                  <div className="cd-form-group">
                    <label className="cd-form-label" htmlFor="location">
                      Address / Location *
                    </label>
                    <input
                      id="location"
                      type="text"
                      className="cd-form-input"
                      placeholder="344 Main Street, Somewhere..."
                      value={profileForm.location}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Bottom Action Buttons: Save Changes & Cancel */}
                  <div className="cd-form-actions-row">
                    <button
                      type="button"
                      className="cd-btn-secondary"
                      onClick={() => switchTab("profile")}
                      disabled={profileUpdating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="cd-btn-primary"
                      disabled={profileUpdating}
                    >
                      {profileUpdating ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* =======================================================================
              SCREEN 3: MY BOOKINGS PAGE (Exact layout from reference image)
              ======================================================================= */}
          {activeTab === "bookings" && (
            <div className="cd-view-container cd-bookings-view">
              <div className="cd-bookings-header-row">
                <h2 className="cd-bookings-main-title">Bookings</h2>
                <button
                  type="button"
                  className="cd-btn-primary cd-btn-find-artists"
                  onClick={() =>
                    navigate
                      ? navigate("/artists")
                      : (window.location.href = "/artists")
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Find Artists
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="cd-empty-card">
                  <h3>No Bookings Yet</h3>
                  <p>
                    You haven't requested any artists yet. Explore our top-tier
                    performers to get started!
                  </p>
                  <button
                    type="button"
                    className="cd-btn-primary"
                    onClick={() =>
                      navigate
                        ? navigate("/artists")
                        : (window.location.href = "/artists")
                    }
                  >
                    Explore Talent
                  </button>
                </div>
              ) : (
                <>
                  {/* Section: Upcoming Bookings */}
                  <div className="cd-bookings-group">
                    <h3 className="cd-bookings-group-heading">Upcoming</h3>
                    {upcomingBookings.length === 0 ? (
                      <p className="cd-no-items-text">
                        No upcoming bookings scheduled.
                      </p>
                    ) : (
                      <div className="cd-bookings-list">
                        {upcomingBookings.map((b) => (
                          <div key={b.id} className="cd-booking-row-card">
                            <div className="cd-booking-id-block">
                              <span className="cd-booking-code">
                                105-{String(b.id).padStart(4, "0")} Date
                              </span>
                              <span className="cd-booking-artist-sub">
                                {b.artist_name} ({b.category_name})
                              </span>
                            </div>

                            <div className="cd-booking-date-block">
                              <span className="cd-booking-date-text">
                                {b.event_date || "TBD"}
                              </span>
                              <span className="cd-booking-location-text">
                                {b.event_location}
                              </span>
                            </div>

                            <div className="cd-booking-status-block">
                              <span className={`cd-status-pill ${b.status}`}>
                                {formatBookingStatus(b.status)}
                              </span>
                            </div>

                            <div className="cd-booking-actions-block">
                              {/* Quick Act / View Details button */}
                              <button
                                type="button"
                                className="cd-btn-quick-act"
                                onClick={() => {
                                  setSelectedBooking(b);
                                  switchTab("booking-detail");
                                }}
                              >
                                View Details
                              </button>

                              {b.status === "accepted" &&
                                b.payment?.status === "pending" && (
                                  <button
                                    type="button"
                                    className="cd-btn-primary"
                                    onClick={() => handlePayNow(b)}
                                    disabled={paymentLoadingId === b.id}
                                  >
                                    {paymentLoadingId === b.id
                                      ? "Processing..."
                                      : "Pay Now"}
                                  </button>
                                )}

                              {/* Receipt Icon */}
                              <button
                                type="button"
                                className="cd-action-icon-btn"
                                title="Download Receipt"
                                onClick={() => handleOpenReceipt(b)}
                              >
                                <svg
                                  width="17"
                                  height="17"
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
                                  <polyline points="10 9 9 9 8 9" />
                                </svg>
                              </button>

                              {/* Cancel Icon */}
                              {b.status === "pending" && (
                                <button
                                  type="button"
                                  className="cd-action-icon-btn danger"
                                  title="Cancel Booking Request"
                                  onClick={() => handleCancelBooking(b.id)}
                                >
                                  <svg
                                    width="17"
                                    height="17"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section: Past Bookings */}
                  <div className="cd-bookings-group">
                    <h3 className="cd-bookings-group-heading">Past</h3>
                    {pastBookings.length === 0 ? (
                      <p className="cd-no-items-text">
                        No past bookings found.
                      </p>
                    ) : (
                      <div className="cd-bookings-list">
                        {pastBookings.map((b) => (
                          <div key={b.id} className="cd-booking-row-card past">
                            <div className="cd-booking-id-block">
                              <span className="cd-booking-code">
                                105-{String(b.id).padStart(4, "0")} Date
                              </span>
                              <span className="cd-booking-artist-sub">
                                {b.artist_name} ({b.category_name})
                              </span>
                            </div>

                            <div className="cd-booking-date-block">
                              <span className="cd-booking-date-text">
                                {b.event_date || "Past Event"}
                              </span>
                              <span className="cd-booking-location-text">
                                {b.event_location}
                              </span>
                            </div>

                            <div className="cd-booking-status-block">
                              <span className={`cd-status-pill ${b.status}`}>
                                {formatBookingStatus(b.status)}
                              </span>
                            </div>

                            <div className="cd-booking-actions-block">
                              <button
                                type="button"
                                className="cd-btn-quick-act"
                                onClick={() => {
                                  setSelectedBooking(b);
                                  switchTab("booking-detail");
                                }}
                              >
                                View Details
                              </button>

                              <button
                                type="button"
                                className="cd-action-icon-btn"
                                title="Download Receipt"
                                onClick={() => handleOpenReceipt(b)}
                              >
                                <svg
                                  width="17"
                                  height="17"
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
                                  <polyline points="10 9 9 9 8 9" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* =======================================================================
              SCREEN 4: BOOKING DETAILS PAGE (Exact layout from reference image)
              ======================================================================= */}
          {activeTab === "booking-detail" && (
            <div className="cd-view-container cd-booking-detail-view">
              {(() => {
                const b = selectedBooking || bookings[0];
                if (!b) {
                  return (
                    <div className="cd-empty-card">
                      <h3>No Booking Selected</h3>
                      <button
                        type="button"
                        className="cd-btn-primary"
                        onClick={() => switchTab("bookings")}
                      >
                        Back to Bookings
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="cd-detail-card">
                    {/* Header Row */}
                    <div className="cd-detail-header-row">
                      <div className="cd-detail-title-group">
                        <button
                          type="button"
                          className="cd-btn-back"
                          onClick={() => switchTab("bookings")}
                          title="Back to Bookings"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                          </svg>
                        </button>
                        <h2 className="cd-detail-title">
                          Booking ID:{" "}
                          <span className="cd-highlight-id">#{b.id}8892</span>
                        </h2>
                      </div>

                      <span className={`cd-status-pill ${b.status} large`}>
                        {formatBookingStatus(b.status)}
                      </span>
                    </div>

                    <div className="cd-detail-card-divider" />

                    {/* Time & Schedule Grid */}
                    <div className="cd-detail-times-grid">
                      <div className="cd-detail-time-box">
                        <span className="cd-time-label">Checking Time</span>
                        <span className="cd-time-value">
                          12:00 AM - 11:00 PM
                        </span>
                      </div>

                      <div className="cd-detail-time-box">
                        <span className="cd-time-label">Time</span>
                        <span className="cd-time-value">
                          10:00 AM - 12:00 PM
                        </span>
                      </div>
                    </div>

                    {/* Artist & Event Details */}
                    <div className="cd-detail-event-summary">
                      <div className="cd-event-summary-item">
                        <span className="cd-summary-label">Performer</span>
                        <span className="cd-summary-value">
                          {b.artist_name} ({b.category_name})
                        </span>
                      </div>
                      <div className="cd-event-summary-item">
                        <span className="cd-summary-label">Event Type</span>
                        <span className="cd-summary-value">{b.event_type}</span>
                      </div>
                      <div className="cd-event-summary-item">
                        <span className="cd-summary-label">Agreed Price</span>
                        <span className="cd-summary-value price">
                          ₹{b.agreed_price || "25,000"}
                        </span>
                      </div>
                      {b.customer_phone && (
                        <div className="cd-event-summary-item">
                          <span className="cd-summary-label">Contact Phone</span>
                          <span className="cd-summary-value">{b.customer_phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Map & Location Preview Card */}
                    <div className="cd-detail-map-section">
                      <span className="cd-map-section-label">Map</span>
                      <div className="cd-map-container">
                        <div className="cd-map-visual">
                          <div className="cd-map-pin">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="#FF5722"
                            >
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                          </div>
                          <span className="cd-map-location-badge">
                            Event Venue
                          </span>
                        </div>
                        <div className="cd-map-details-box">
                          <div className="cd-map-status-row">
                            <span className="cd-map-status-label">Status</span>
                            <span className="cd-map-status-val">
                              Verified Venue
                            </span>
                          </div>
                          <div className="cd-map-address-row">
                            <span className="cd-map-pin-icon">
                              <svg
                                width="15"
                                height="15"
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
                            <span className="cd-map-address-text">
                              {b.event_location ||
                                "Mumbai Expert Exhibition, 1102554, Sentosa St. Pelion"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons: Download Receipt & Cancel */}
                    <div className="cd-detail-actions-row">
                      <button
                        type="button"
                        className="cd-btn-primary cd-btn-download-receipt"
                        onClick={() => handleOpenReceipt(b)}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Download Receipt</span>
                      </button>

                      {b.status === "pending" && (
                        <button
                          type="button"
                          className="cd-btn-secondary cd-btn-cancel-booking"
                          onClick={() => handleCancelBooking(b.id)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* =======================================================================
              SCREEN 5: PAYMENT HISTORY PAGE (Exact layout from reference image)
              ======================================================================= */}
          {activeTab === "payments" && (
            <div className="cd-view-container cd-payments-view">
              <div className="cd-table-card">
                <div className="cd-table-card-header">
                  <h2 className="cd-table-title">Payment History</h2>
                  <span className="cd-table-count">
                    {payments.length} transactions
                  </span>
                </div>

                {payments.length === 0 ? (
                  <div className="cd-empty-card">
                    <h3>No Transactions Found</h3>
                    <p>
                      Once you book an artist and initiate transactions, payment
                      receipts and records will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="cd-table-responsive">
                    <table
                      className="cd-data-table"
                      aria-label="Customer Payment History Table"
                    >
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Transaction ID</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th className="th-actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => {
                          const isPaid =
                            p.status === "completed" ||
                            p.status === "paid" ||
                            p.status === "success" ||
                            p.status === "SUCCESS";
                          const isPending =
                            p.status === "pending" || p.status === "PENDING";
                          const relatedBooking = bookings.find(
                            (b) => b.id === p.booking_id,
                          );
                          const canPayNow =
                            isPending &&
                            (!relatedBooking ||
                              relatedBooking.status === "accepted");

                          return (
                            <tr key={p.id}>
                              <td className="td-date">
                                {p.date?.split(" ")[0] || "03-01-2023"}
                              </td>
                              <td className="td-txn">
                                <span className="cd-txn-id">
                                  {p.transaction_id || "Pending"}
                                </span>
                              </td>
                              <td className="td-amount">₹{p.amount}</td>
                              <td className="td-status">
                                <span
                                  className={`cd-status-pill ${isPaid ? "paid" : isPending ? "pending" : "refunded"}`}
                                >
                                  {isPaid
                                    ? "Paid"
                                    : isPending
                                      ? "Pending"
                                      : p.status}
                                </span>
                              </td>
                              <td className="td-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {canPayNow && (
                                  <button
                                    type="button"
                                    className="cd-btn-primary"
                                    style={{ padding: "4px 10px", fontSize: "12px", height: "auto" }}
                                    onClick={() =>
                                      handlePayNow(
                                        relatedBooking || {
                                          id: p.booking_id,
                                          artist_name: p.artist_name,
                                        },
                                      )
                                    }
                                    disabled={
                                      paymentLoadingId === (p.booking_id || p.id)
                                    }
                                  >
                                    {paymentLoadingId === (p.booking_id || p.id)
                                      ? "Processing..."
                                      : "Pay Now"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="cd-table-icon-btn"
                                  title="Download Receipt"
                                  onClick={() => handleOpenReceipt(p)}
                                >
                                  <svg
                                    width="16"
                                    height="16"
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
                                    <polyline points="10 9 9 9 8 9" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =======================================================================
              SCREEN 6: SETTINGS (Security, Password, Danger Zone)
              ======================================================================= */}
          {activeTab === "settings" && (
            <div className="cd-view-container cd-settings-view">
              <div className="cd-settings-grid">
                {/* Change Password Card */}
                <div className="cd-form-card">
                  <div className="cd-form-card-header">
                    <h2 className="cd-form-title">Security & Password</h2>
                  </div>

                  {passwordSuccessMsg && (
                    <div className="cd-alert cd-alert-success">
                      {passwordSuccessMsg}
                    </div>
                  )}
                  {passwordErrorMsg && (
                    <div className="cd-alert cd-alert-error">
                      {passwordErrorMsg}
                    </div>
                  )}

                  <form
                    onSubmit={handlePasswordSubmit}
                    className="cd-password-form"
                  >
                    <div className="cd-form-group">
                      <label
                        className="cd-form-label"
                        htmlFor="current_password"
                      >
                        Current Password *
                      </label>
                      <input
                        id="current_password"
                        type="password"
                        className="cd-form-input"
                        placeholder="••••••••"
                        value={passwordForm.current_password}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            current_password: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="cd-form-group">
                      <label className="cd-form-label" htmlFor="new_password">
                        New Password *
                      </label>
                      <input
                        id="new_password"
                        type="password"
                        className="cd-form-input"
                        placeholder="••••••••"
                        value={passwordForm.new_password}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            new_password: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="cd-form-group">
                      <label
                        className="cd-form-label"
                        htmlFor="confirm_password"
                      >
                        Confirm New Password *
                      </label>
                      <input
                        id="confirm_password"
                        type="password"
                        className="cd-form-input"
                        placeholder="••••••••"
                        value={passwordForm.confirm_password}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            confirm_password: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="cd-btn-primary"
                      disabled={passwordUpdating}
                    >
                      {passwordUpdating
                        ? "Updating Password..."
                        : "Update Password"}
                    </button>
                  </form>
                </div>

                {/* Account Details & Danger Zone */}
                <div className="cd-form-card">
                  <div className="cd-form-card-header">
                    <h2 className="cd-form-title">Account Verification</h2>
                  </div>
                  <div className="cd-security-meta-list">
                    <div className="cd-security-meta-item">
                      <span className="cd-meta-label">Verification Status</span>
                      <span className="cd-status-pill accepted">
                        Verified Customer
                      </span>
                    </div>
                    <div className="cd-security-meta-item">
                      <span className="cd-meta-label">Account Joined</span>
                      <span className="cd-meta-value">
                        {data?.security?.date_joined || "Active"}
                      </span>
                    </div>
                    <div className="cd-security-meta-item">
                      <span className="cd-meta-label">
                        Personal Information
                      </span>
                      <button
                        type="button"
                        className="cd-btn-outline small"
                        onClick={() => switchTab("edit-profile")}
                      >
                        Edit Details
                      </button>
                    </div>
                  </div>

                  <div className="cd-danger-zone-divider" />

                  <div className="cd-danger-zone-box">
                    <h3 className="cd-danger-heading">Danger Zone</h3>
                    <p className="cd-danger-text">
                      Deactivating your account will disable your bookings and
                      profile access immediately.
                    </p>
                    <button
                      type="button"
                      className="cd-btn-danger"
                      onClick={() => setShowDeactivateModal(true)}
                    >
                      Deactivate Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================================
              SECONDARY SCREENS: FAVOURITES, NOTIFICATIONS, SUPPORT
              ======================================================================= */}
          {activeTab === "favorites" && (
            <div className="cd-view-container cd-favorites-view">
              <h2 className="cd-view-title">Favourite Artists</h2>
              {favorites.length === 0 ? (
                <div className="cd-empty-card">
                  <h3>No Favourite Artists Yet</h3>
                  <p>
                    Save artists to your favourites while exploring talent to
                    book them quickly anytime.
                  </p>
                  <button
                    type="button"
                    className="cd-btn-primary"
                    onClick={() =>
                      navigate
                        ? navigate("/artists")
                        : (window.location.href = "/artists")
                    }
                  >
                    Explore Talent
                  </button>
                </div>
              ) : (
                <div className="cd-favorites-grid">
                  {favorites.map((fav) => (
                    <div key={fav.id} className="cd-favorite-artist-card">
                      <div className="cd-fav-img-wrap">
                        {fav.profile_image ? (
                          <img src={fav.profile_image} alt={fav.stage_name} />
                        ) : (
                          <div className="cd-fav-placeholder">
                            {(fav.stage_name || "A")[0]}
                          </div>
                        )}
                      </div>
                      <div className="cd-fav-body">
                        <h4 className="cd-fav-name">{fav.stage_name}</h4>
                        <span className="cd-fav-category">
                          {fav.category_name}
                        </span>
                        <span className="cd-fav-price">
                          From ₹{fav.starting_price}
                        </span>
                        <div className="cd-fav-actions">
                          <button
                            type="button"
                            className="cd-btn-primary small"
                            onClick={() =>
                              navigate
                                ? navigate(`/artists/${fav.artist_id}`)
                                : (window.location.href = `/artists/${fav.artist_id}`)
                            }
                          >
                            View & Book
                          </button>
                          <button
                            type="button"
                            className="cd-btn-outline small danger"
                            onClick={() => handleToggleFavorite(fav.artist_id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="cd-view-container cd-notifs-view">
              <div className="cd-notifs-header">
                <h2 className="cd-view-title">Notifications</h2>
                {unreadNotifsCount > 0 && (
                  <button
                    type="button"
                    className="cd-btn-outline small"
                    onClick={handleMarkNotificationsRead}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="cd-empty-card">
                  <h3>No Notifications</h3>
                  <p>
                    You're all caught up! New booking updates and activity
                    alerts will appear here.
                  </p>
                </div>
              ) : (
                <div className="cd-notifs-list">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`cd-notif-item ${n.is_read ? "read" : "unread"}`}
                    >
                      <div className="cd-notif-dot" />
                      <div className="cd-notif-content">
                        <strong className="cd-notif-title">{n.title}</strong>
                        <p className="cd-notif-msg">{n.message}</p>
                        <span className="cd-notif-time">
                          {n.formatted_time || "Recent"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "support" && (
            <div className="cd-view-container cd-support-view">
              <div className="cd-form-card cd-support-card">
                <h2 className="cd-form-title">Submit an Inquiry</h2>
                <p className="cd-form-subtext">
                  Have a question regarding your bookings or payment? Send us an
                  inquiry and our team will get back to you.
                </p>

                {supportSuccessMsg && (
                  <div className="cd-alert cd-alert-success">
                    {supportSuccessMsg}
                  </div>
                )}
                {supportErrorMsg && (
                  <div className="cd-alert cd-alert-error">
                    {supportErrorMsg}
                  </div>
                )}

                <form
                  onSubmit={handleSupportSubmit}
                  className="cd-support-form"
                >
                  <div className="cd-form-group">
                    <label className="cd-form-label" htmlFor="support_subject">
                      Subject *
                    </label>
                    <input
                      id="support_subject"
                      type="text"
                      className="cd-form-input"
                      placeholder="e.g. Booking inquiry / Reschedule"
                      value={supportForm.subject}
                      onChange={(e) =>
                        setSupportForm((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="cd-form-group">
                    <label className="cd-form-label" htmlFor="support_message">
                      Message *
                    </label>
                    <textarea
                      id="support_message"
                      className="cd-form-textarea"
                      rows={4}
                      placeholder="Describe your issue or question..."
                      value={supportForm.message}
                      onChange={(e) =>
                        setSupportForm((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="cd-btn-primary"
                    disabled={supportSending}
                  >
                    {supportSending ? "Submitting..." : "Submit Inquiry"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* =======================================================================
              SCREEN: REGISTER AS PERFORMING ARTIST (Right side in Customer Dashboard)
              ======================================================================= */}
          {(activeTab === "artist-register" ||
            activeTab === "register-artist") && (
            <div className="cd-view-container cd-artist-register-view">
              <div className="cd-form-card cd-artist-register-card">
                <div className="cd-form-card-header">
                  <div className="cd-artist-register-header-badge">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>ARTIST REGISTRATION</span>
                  </div>
                  <h2 className="cd-form-title">
                    Register as a Performing Artist
                  </h2>
                  <p className="cd-form-subtext">
                    Create your official artist stage profile on TalentHire to
                    showcase your performance reel, set your rates, and receive
                    verified booking inquiries directly from celebration hosts
                    and corporate organizers.
                  </p>
                </div>

                {artistSuccessMsg ? (
                  <div className="cd-artist-success-card">
                    <div className="cd-artist-success-icon-wrap">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00E676"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <h3 className="cd-artist-success-title">
                      Welcome to the TalentHire Performer Roster!
                    </h3>
                    <p className="cd-artist-success-desc">{artistSuccessMsg}</p>
                    <div className="cd-artist-success-actions">
                      <button
                        type="button"
                        className="cd-btn-primary"
                        onClick={() => {
                          if (navigate) navigate("/artist-dashboard");
                          else window.location.href = "/artist-dashboard";
                        }}
                      >
                        Go to Artist Dashboard →
                      </button>
                      {artistCreatedId && (
                        <button
                          type="button"
                          className="cd-btn-outline"
                          onClick={() => {
                            if (navigate)
                              navigate(`/artists/${artistCreatedId}`);
                            else
                              window.location.href = `/artists/${artistCreatedId}`;
                          }}
                        >
                          View Public Artist Page
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleArtistSubmit}
                    className="cd-artist-register-form"
                  >
                    {artistErrorMsg && (
                      <div className="cd-alert cd-alert-error" role="alert">
                        {artistErrorMsg}
                      </div>
                    )}

                    {/* Section 1: Stage Identity */}
                    <div className="cd-form-section-title">
                      1. Stage Identity & Category
                    </div>

                    <div className="cd-form-grid">
                      {/* Stage Name */}
                      <div className="cd-form-group">
                        <label
                          className="cd-form-label"
                          htmlFor="reg_stage_name"
                        >
                          Stage Name / Act Name *
                        </label>
                        <input
                          id="reg_stage_name"
                          type="text"
                          name="stage_name"
                          className={`cd-form-input ${artistFieldErrors.stage_name ? "cd-input-error" : ""}`}
                          value={artistForm.stage_name}
                          onChange={handleArtistFormChange}
                          placeholder="e.g. Neha Kapoor (Celebrity Emcee)"
                          required
                        />
                        {artistFieldErrors.stage_name && (
                          <span className="cd-field-error-text">
                            {artistFieldErrors.stage_name}
                          </span>
                        )}
                      </div>

                      {/* Primary Category */}
                      <div className="cd-form-group">
                        <label className="cd-form-label" htmlFor="reg_category">
                          Primary Performing Category *
                        </label>
                        <select
                          id="reg_category"
                          name="category"
                          className={`cd-form-input cd-form-select ${artistFieldErrors.category ? "cd-input-error" : ""}`}
                          value={artistForm.category}
                          onChange={handleArtistFormChange}
                          required
                          disabled={artistCategoriesLoading}
                        >
                          <option value="">
                            {artistCategoriesLoading
                              ? "Loading categories..."
                              : "Select Category"}
                          </option>
                          {artistCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        {artistFieldErrors.category && (
                          <span className="cd-field-error-text">
                            {artistFieldErrors.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="cd-form-grid">
                      {/* Gender */}
                      <div className="cd-form-group">
                        <label className="cd-form-label" htmlFor="reg_gender">
                          Performer Gender / Composition *
                        </label>
                        <select
                          id="reg_gender"
                          name="gender"
                          className="cd-form-input cd-form-select"
                          value={artistForm.gender}
                          onChange={handleArtistFormChange}
                        >
                          <option value="male">Male Performer</option>
                          <option value="female">Female Performer</option>
                          <option value="other">Other / Mixed Ensemble</option>
                        </select>
                      </div>

                      {/* Stage Experience */}
                      <div className="cd-form-group">
                        <label className="cd-form-label" htmlFor="reg_years">
                          Years of Stage Experience *
                        </label>
                        <input
                          id="reg_years"
                          type="number"
                          name="years_of_experience"
                          min="0"
                          max="60"
                          className="cd-form-input"
                          value={artistForm.years_of_experience}
                          onChange={handleArtistFormChange}
                          required
                        />
                      </div>
                    </div>

                    {/* Section 2: Pricing & Location */}
                    <div
                      className="cd-form-section-title"
                      style={{ marginTop: 24 }}
                    >
                      2. Performance Rates & Travel
                    </div>

                    <div className="cd-form-grid">
                      {/* Starting Price */}
                      <div className="cd-form-group">
                        <label className="cd-form-label" htmlFor="reg_price">
                          Starting Fee per Event (₹) *
                        </label>
                        <input
                          id="reg_price"
                          type="number"
                          name="starting_price"
                          min="500"
                          step="500"
                          className={`cd-form-input ${artistFieldErrors.starting_price ? "cd-input-error" : ""}`}
                          value={artistForm.starting_price}
                          onChange={handleArtistFormChange}
                          placeholder="e.g. 18000"
                          required
                        />
                        <span className="cd-form-helper-text">
                          Base fee per show. Final quotes depend on duration.
                        </span>
                        {artistFieldErrors.starting_price && (
                          <span className="cd-field-error-text">
                            {artistFieldErrors.starting_price}
                          </span>
                        )}
                      </div>

                      {/* Base Location */}
                      <div className="cd-form-group">
                        <label className="cd-form-label" htmlFor="reg_location">
                          Base City / Region *
                        </label>
                        <input
                          id="reg_location"
                          type="text"
                          name="location"
                          className={`cd-form-input ${artistFieldErrors.location ? "cd-input-error" : ""}`}
                          value={artistForm.location}
                          onChange={handleArtistFormChange}
                          placeholder="e.g. Pune, Maharashtra"
                          required
                        />
                        {artistFieldErrors.location && (
                          <span className="cd-field-error-text">
                            {artistFieldErrors.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="cd-form-grid">
                      {/* Phone */}
                      <div className="cd-form-group">
                        <label className="cd-form-label" htmlFor="reg_phone">
                          Booking Contact Phone *
                        </label>
                        <input
                          id="reg_phone"
                          type="tel"
                          name="phone"
                          className="cd-form-input"
                          value={artistForm.phone}
                          onChange={handleArtistFormChange}
                          placeholder="e.g. +91 98765 43210"
                        />
                      </div>

                      {/* Travel Radius */}
                      <div className="cd-form-group">
                        <label className="cd-form-label" htmlFor="reg_travel">
                          Travel Availability *
                        </label>
                        <select
                          id="reg_travel"
                          name="travel_availability"
                          className="cd-form-input cd-form-select"
                          value={artistForm.travel_availability}
                          onChange={handleArtistFormChange}
                        >
                          <option value="city">Within my city</option>
                          <option value="state">Across my state</option>
                          <option value="india">Across India</option>
                          <option value="international">International</option>
                        </select>
                      </div>
                    </div>

                    {/* Performance Formats (Pills) */}
                    <div className="cd-form-group" style={{ marginTop: 6 }}>
                      <label className="cd-form-label">
                        Performance Formats & Event Types *
                      </label>
                      <div className="cd-perf-types-grid">
                        {ARTIST_PERF_OPTIONS.map((opt) => {
                          const isSel =
                            artistForm.performance_types.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              className={`cd-perf-type-pill ${isSel ? "selected" : ""}`}
                              onClick={() => handleArtistPerformanceToggle(opt)}
                            >
                              <span>{isSel ? "✓" : "+"}</span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 3: Stage Bio & Reel */}
                    <div
                      className="cd-form-section-title"
                      style={{ marginTop: 28 }}
                    >
                      3. Bio, Media & Stage Photo
                    </div>

                    {/* Stage Bio */}
                    <div className="cd-form-group">
                      <label className="cd-form-label" htmlFor="reg_bio">
                        Stage Bio & Description *
                      </label>
                      <textarea
                        id="reg_bio"
                        name="bio"
                        rows={4}
                        className={`cd-form-textarea ${artistFieldErrors.bio ? "cd-input-error" : ""}`}
                        value={artistForm.bio}
                        onChange={handleArtistFormChange}
                        placeholder="Highlight your stage expertise, signature style, awards, and audience engagement approach..."
                        required
                      />
                      {artistFieldErrors.bio && (
                        <span className="cd-field-error-text">
                          {artistFieldErrors.bio}
                        </span>
                      )}
                    </div>

                    {/* Video Reel Link */}
                    <div className="cd-form-group">
                      <label className="cd-form-label" htmlFor="reg_portfolio">
                        Performance Reel / Video URL (YouTube / Vimeo)
                      </label>
                      <input
                        id="reg_portfolio"
                        type="url"
                        name="portfolio_url"
                        className="cd-form-input"
                        value={artistForm.portfolio_url}
                        onChange={handleArtistFormChange}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      <span className="cd-form-helper-text">
                        Clients will be able to watch this video reel directly
                        on your detail page.
                      </span>
                    </div>

                    {/* Additional Information / Tech Rider */}
                    <div className="cd-form-group">
                      <label className="cd-form-label" htmlFor="reg_additional">
                        Equipment & Technical Requirements (Optional)
                      </label>
                      <textarea
                        id="reg_additional"
                        name="additional_information"
                        rows={2}
                        className="cd-form-textarea"
                        value={artistForm.additional_information}
                        onChange={handleArtistFormChange}
                        placeholder="e.g. Wireless microphones, stage monitors, specific sound console requirements..."
                      />
                    </div>

                    {/* Stage Photo Upload */}
                    <div className="cd-form-group">
                      <label className="cd-form-label">
                        Primary Stage / Profile Photo
                      </label>
                      <div className="cd-artist-photo-picker-row">
                        <div className="cd-artist-photo-preview-box">
                          {artistImagePreview ? (
                            <img src={artistImagePreview} alt="Stage Preview" />
                          ) : (
                            <div className="cd-artist-photo-placeholder">
                              <svg
                                width="28"
                                height="28"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#777"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect
                                  x="3"
                                  y="3"
                                  width="18"
                                  height="18"
                                  rx="2"
                                  ry="2"
                                />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                              <span>Stage Photo</span>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={artistFileInputRef}
                          accept="image/*"
                          onChange={handleArtistImageChange}
                          style={{ display: "none" }}
                        />
                        <button
                          type="button"
                          className="cd-btn-outline"
                          onClick={() => artistFileInputRef.current?.click()}
                        >
                          Choose Photo
                        </button>
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div
                      className="cd-form-actions-row"
                      style={{ marginTop: 32 }}
                    >
                      <button
                        type="button"
                        className="cd-btn-outline"
                        onClick={() => switchTab("profile")}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="cd-btn-primary"
                        disabled={artistRegisterLoading}
                        style={{ minWidth: 220 }}
                      >
                        {artistRegisterLoading
                          ? "Registering Artist..."
                          : "Complete Artist Registration"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          RECEIPT MODAL (Download / Print Receipt)
          ========================================================================= */}
      {receiptItem && (
        <div className="cd-modal-backdrop" onClick={() => setReceiptItem(null)}>
          <div
            className="cd-receipt-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cd-receipt-header">
              <div className="cd-receipt-brand">
                TalentHire Official Receipt
              </div>
              <button
                type="button"
                className="cd-modal-close-btn"
                onClick={() => setReceiptItem(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="cd-receipt-body" id="printable-receipt">
              <div className="cd-receipt-meta-grid">
                <div>
                  <span className="cd-receipt-lbl">Receipt No:</span>
                  <strong>TH-REC-{receiptItem.id || "8892"}</strong>
                </div>
                <div>
                  <span className="cd-receipt-lbl">Date:</span>
                  <strong>
                    {receiptItem.date || receiptItem.event_date || "Today"}
                  </strong>
                </div>
                <div>
                  <span className="cd-receipt-lbl">Customer:</span>
                  <strong>
                    {profile.full_name || profile.username || "Valued Client"}
                  </strong>
                </div>
                <div>
                  <span className="cd-receipt-lbl">Performer:</span>
                  <strong>
                    {receiptItem.artist_name || "TalentHire Performer"}
                  </strong>
                </div>
                <div>
                  <span className="cd-receipt-lbl">Status:</span>
                  <strong style={{ color: "#4CAF50" }}>
                    VERIFIED & CONFIRMED
                  </strong>
                </div>
                <div>
                  <span className="cd-receipt-lbl">Transaction ID:</span>
                  <strong>
                    {receiptItem.transaction_id || "Pending"}
                  </strong>
                </div>
              </div>

              <div className="cd-receipt-divider" />

              <div className="cd-receipt-total-row">
                <span>Total Amount Paid</span>
                <span className="cd-receipt-total-price">
                  ₹
                  {receiptItem.amount ||
                    receiptItem.agreed_price ||
                    "25,000.00"}
                </span>
              </div>
            </div>

            <div className="cd-receipt-footer">
              <button
                type="button"
                className="cd-btn-secondary"
                onClick={() => setReceiptItem(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="cd-btn-primary"
                onClick={handlePrintReceipt}
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DEACTIVATE ACCOUNT CONFIRMATION MODAL
          ========================================================================= */}
      {showDeactivateModal && (
        <div
          className="cd-modal-backdrop"
          onClick={() => setShowDeactivateModal(false)}
        >
          <div
            className="cd-deactivate-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="cd-modal-title">Deactivate Customer Account</h3>
            <p className="cd-modal-desc">
              This action will disable your profile and bookings. Please enter
              your account password to confirm.
            </p>

            {deactivateError && (
              <div className="cd-alert cd-alert-error">{deactivateError}</div>
            )}

            <div className="cd-form-group">
              <label className="cd-form-label" htmlFor="deactivate_pwd">
                Password Confirmation *
              </label>
              <input
                id="deactivate_pwd"
                type="password"
                className="cd-form-input"
                placeholder="Enter your current password"
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
              />
            </div>

            <div className="cd-modal-actions">
              <button
                type="button"
                className="cd-btn-secondary"
                onClick={() => setShowDeactivateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cd-btn-danger"
                disabled={deactivating || !deactivatePassword}
                onClick={handleDeactivateAccount}
              >
                {deactivating ? "Deactivating..." : "Confirm Deactivation"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer navigate={navigate} />
    </div>
  );
}

export default CustomerDashboard;
