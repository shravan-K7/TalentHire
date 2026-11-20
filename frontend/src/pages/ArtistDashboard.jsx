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
  fetchArtistCancelPreview,
  cancelArtistBooking,
  fetchArtistPendingReschedulingRequests,
  respondArtistReschedulingRequest,
  submitSupportInquiry,
} from "../js/auth";
import {
  LayoutDashboard,
  UserRound,
  Images,
  Inbox,
  CalendarDays,
  TicketCheck,
  CalendarCheck,
  Wallet,
  Star,
  Bell,
  Headset,
  Settings,
  LogOut,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "../css/CustomerDashboard.css";
import "../css/ArtistDashboard.css";

function formatBookingStatus(status) {
  if (!status) return "Pending";
  if (status === "accepted") return "Confirmed";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "rejected") return "Declined";
  if (status === "refunded") return "Refunded";
  if (status === "partially_refunded") return "Partially Refunded";
  if (status === "unavailable") return "Unavailable";
  return typeof status === "string" && status.length > 0
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Pending";
}

function formatPrice(val) {
  if (val === null || val === undefined || val === "") return "0.00";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const [respondError, setRespondError] = useState("");

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

  // Phase 6: Pending Rescheduling Requests
  const [pendingRescheduleRequests, setPendingRescheduleRequests] = useState([]);
  const [rescheduleActionLoadingId, setRescheduleActionLoadingId] = useState(null);
  const [rejectNoteModal, setRejectNoteModal] = useState({
    open: false,
    request: null,
    reason: "",
  });

  // Phase 6: Artist Cancellation Modal State
  const [artistCancelModalBooking, setArtistCancelModalBooking] = useState(null);
  const [artistCancelPreview, setArtistCancelPreview] = useState(null);
  const [artistCancelPreviewLoading, setArtistCancelPreviewLoading] = useState(false);
  const [artistCancelReason, setArtistCancelReason] = useState("");
  const [artistCancelSubmitting, setArtistCancelSubmitting] = useState(false);
  const [artistCancelError, setArtistCancelError] = useState("");

  // Support Inquiry State
  const [supportForm, setSupportForm] = useState({ subject: "", message: "" });
  const [supportSending, setSupportSending] = useState(false);
  const [supportSuccessMsg, setSupportSuccessMsg] = useState("");
  const [supportErrorMsg, setSupportErrorMsg] = useState("");

  // Mini calendar schedule state on Dashboard overview
  const [scheduleMonth, setScheduleMonth] = useState(() => new Date());
  const [selectedScheduleDate, setSelectedScheduleDate] = useState("");

  const syncCalendarWithPerformances = useCallback((dashData) => {
    if (dashData?.upcoming_performances && dashData.upcoming_performances.length > 0) {
      const first = dashData.upcoming_performances[0];
      const rawDate = first.event_date_iso || first.event_date;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          setSelectedScheduleDate(`${y}-${m}-${day}`);
          setScheduleMonth(new Date(y, d.getMonth(), 1));
          return;
        }
      }
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    setSelectedScheduleDate(`${y}-${m}-${day}`);
  }, []);

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

  async function handleSupportSubmit(e) {
    e.preventDefault();
    setSupportSending(true);
    setSupportSuccessMsg("");
    setSupportErrorMsg("");
    try {
      const res = await submitSupportInquiry(supportForm);
      setSupportSuccessMsg(
        res.message ||
          "Your inquiry has been submitted. Our support team will assist you shortly.",
      );
      setSupportForm({ subject: "", message: "" });
      showToast("Support inquiry submitted.");
    } catch (err) {
      setSupportErrorMsg(
        err.message || "Failed to submit support inquiry. Please try again.",
      );
    } finally {
      setSupportSending(false);
    }
  }

  const loadPendingRescheduling = useCallback(async () => {
    try {
      const res = await fetchArtistPendingReschedulingRequests();
      setPendingRescheduleRequests(res.pending_requests || []);
    } catch (err) {
      console.warn("Could not load pending rescheduling requests:", err);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetchArtistDashboard();
      setData(res);
      syncCalendarWithPerformances(res);
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
      loadPendingRescheduling();
    } catch (err) {
      setError(err.message || "Unable to load artist dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [loadPendingRescheduling, syncCalendarWithPerformances]);

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const res = await fetchArtistDashboard();
        if (!ignore) {
          setData(res);
          syncCalendarWithPerformances(res);
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
          loadPendingRescheduling();
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
  }, [loadPendingRescheduling, syncCalendarWithPerformances]);

  // Phase 6: Approve Rescheduling Request
  async function handleApproveReschedule(reqItem) {
    setRescheduleActionLoadingId(reqItem.request_id);
    try {
      const res = await respondArtistReschedulingRequest(reqItem.request_id, {
        action: "approve",
      });
      showToast(res.message || "Rescheduling approved. Event date has been updated.");
      await loadDashboard();
      await loadPendingRescheduling();
    } catch (err) {
      showToast(err.message || "Failed to approve rescheduling request.");
    } finally {
      setRescheduleActionLoadingId(null);
    }
  }

  // Phase 6: Confirm Decline Rescheduling Request
  async function handleConfirmRejectReschedule() {
    if (!rejectNoteModal.request) return;
    setRescheduleActionLoadingId(rejectNoteModal.request.request_id);
    try {
      const res = await respondArtistReschedulingRequest(
        rejectNoteModal.request.request_id,
        {
          action: "reject",
          reason: rejectNoteModal.reason,
        }
      );
      showToast(res.message || "Rescheduling request declined.");
      setRejectNoteModal({ open: false, request: null, reason: "" });
      await loadDashboard();
      await loadPendingRescheduling();
    } catch (err) {
      showToast(err.message || "Failed to decline rescheduling request.");
    } finally {
      setRescheduleActionLoadingId(null);
    }
  }

  // Phase 6: Open Artist Cancellation Modal
  async function openArtistCancelModal(booking) {
    if (!booking) return;
    setArtistCancelModalBooking(booking);
    setArtistCancelReason("");
    setArtistCancelError("");
    setArtistCancelPreviewLoading(true);
    setArtistCancelPreview(null);

    try {
      const preview = await fetchArtistCancelPreview(booking.id);
      setArtistCancelPreview(preview);
    } catch (err) {
      console.warn("Could not fetch artist cancellation preview:", err);
      setArtistCancelError(err.message || "Unable to load cancellation details.");
    } finally {
      setArtistCancelPreviewLoading(false);
    }
  }

  // Phase 6: Confirm Artist Cancellation
  async function handleConfirmArtistCancel() {
    if (!artistCancelModalBooking) return;
    setArtistCancelSubmitting(true);
    setArtistCancelError("");

    try {
      const res = await cancelArtistBooking(
        artistCancelModalBooking.id,
        artistCancelReason
      );
      const refundAmt = Number(res.refund_amount);
      if (refundAmt > 0) {
        showToast(
          `Booking cancelled. Full refund of ₹${res.refund_amount} initiated to customer.`
        );
      } else {
        showToast(res.message || "Booking cancelled.");
      }

      if (selectedBooking && selectedBooking.id === artistCancelModalBooking.id) {
        setSelectedBooking((prev) => (prev ? { ...prev, status: "cancelled" } : null));
      }

      setArtistCancelModalBooking(null);
      await loadDashboard();
      await loadPendingRescheduling();
    } catch (err) {
      setArtistCancelError(err.message || "Unable to cancel booking.");
    } finally {
      setArtistCancelSubmitting(false);
    }
  }

  function openRespondModal(action, booking) {
    setRespondError("");
    setRespondModal({
      open: true,
      action,
      booking,
      reason: "",
      final_price:
        action === "accept" && booking?.customer_budget
          ? String(booking.customer_budget)
          : "",
    });
  }

  function closeRespondModal() {
    setRespondError("");
    setRespondModal({
      open: false,
      action: "accept",
      booking: null,
      reason: "",
      final_price: "",
    });
  }

  // Handle Booking Response (Accept / Reject)
  async function handleConfirmBookingResponse() {
    if (!respondModal.booking || responding) return;

    // Validate before setting loading state
    if (
      respondModal.action === "accept" &&
      (!respondModal.final_price ||
        !Number.isFinite(Number(respondModal.final_price)) ||
        Number(respondModal.final_price) <= 0)
    ) {
      setRespondError("Please enter a valid final performance price.");
      return;
    }

    setResponding(true);
    setRespondError("");

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
      setRespondError("");
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
      console.error("Booking response error:", err);
      const isConflict =
        err.status === 409 ||
        (err.message &&
          err.message.toLowerCase().includes("already has a booking"));
      const errorMsg =
        err.message ||
        (isConflict
          ? "This artist already has a booking or active reservation on this date. Please select another date."
          : "Failed to update booking status.");

      setRespondError(errorMsg);
      showToast(errorMsg);
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

  // Next upcoming performance
  const nextPerformance =
    upcomingPerformances && upcomingPerformances.length > 0
      ? upcomingPerformances[0]
      : null;

  let nextPerfDay = "--";
  let nextPerfMonth = "DATE";
  let nextPerfFormattedDate = "";
  if (nextPerformance) {
    const rawD = nextPerformance.event_date_iso || nextPerformance.event_date;
    const d = rawD ? new Date(rawD) : null;
    if (d && !isNaN(d.getTime())) {
      nextPerfDay = String(d.getDate()).padStart(2, "0");
      nextPerfMonth = d
        .toLocaleString("default", { month: "short" })
        .toUpperCase();
      const timeStr = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const monthStr = d.toLocaleString("default", { month: "short" });
      nextPerfFormattedDate = `${monthStr} ${d.getDate()}, ${d.getFullYear()} • ${timeStr}`;
    } else {
      nextPerfFormattedDate = nextPerformance.event_date || "";
    }
  }

  // Mini calendar schedule helpers
  const calYear = scheduleMonth.getFullYear();
  const calMonth = scheduleMonth.getMonth();
  const calMonthLabel = `${scheduleMonth.toLocaleString("default", { month: "short" })} ${calYear}`;
  const totalCalDays = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  const blankDays = Array.from({ length: firstDayOfWeek });
  const daysInMonth = Array.from({ length: totalCalDays }, (_, i) => i + 1);

  const confirmedBookingsList = bookings.filter(
    (b) => b.status === "accepted" || b.status === "confirmed",
  );

  function hasBookingOnDay(day) {
    const yyyy = calYear;
    const mm = String(calMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const targetDateStr = `${yyyy}-${mm}-${dd}`;
    return confirmedBookingsList.some((b) => {
      if (b.event_date_iso && b.event_date_iso.startsWith(targetDateStr))
        return true;
      if (b.event_date && b.event_date.includes(targetDateStr)) return true;
      const bDate = new Date(b.event_date_iso || b.event_date);
      if (!isNaN(bDate.getTime())) {
        return (
          bDate.getFullYear() === yyyy &&
          bDate.getMonth() === calMonth &&
          bDate.getDate() === day
        );
      }
      return false;
    });
  }

  function handlePrevScheduleMonth() {
    setScheduleMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  }

  function handleNextScheduleMonth() {
    setScheduleMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  }

  const eventsForSelectedDate = confirmedBookingsList.filter((b) => {
    if (!selectedScheduleDate) return false;
    const targetDateStr = selectedScheduleDate;
    if (b.event_date_iso && b.event_date_iso.startsWith(targetDateStr))
      return true;
    const bDate = new Date(b.event_date_iso || b.event_date);
    if (!isNaN(bDate.getTime())) {
      const yyyy = bDate.getFullYear();
      const mm = String(bDate.getMonth() + 1).padStart(2, "0");
      const dd = String(bDate.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}` === targetDateStr;
    }
    return false;
  });

  let selectedDateLabel = "Events";
  if (selectedScheduleDate) {
    const parts = selectedScheduleDate.split("-");
    if (parts.length === 3) {
      const tempD = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
      );
      if (!isNaN(tempD.getTime())) {
        selectedDateLabel = `Events on ${tempD.toLocaleString("default", { month: "short" })} ${tempD.getDate()}`;
      }
    }
  }

  const recentPayout = payments && payments.length > 0 ? payments[0] : null;

  function getActivityBadgeInfo(act) {
    const title = (act.title || "").toLowerCase();
    if (title.includes("confirm") || title.includes("accept")) {
      return { label: "Booking Confirmed", badgeClass: "badge-green" };
    }
    if (title.includes("verified") || title.includes("profile")) {
      return { label: "Profile Verified", badgeClass: "badge-blue" };
    }
    if (title.includes("request") || title.includes("received")) {
      return { label: "New Booking Request", badgeClass: "badge-gray" };
    }
    if (title.includes("payment")) {
      return { label: "Payment Update", badgeClass: "badge-green" };
    }
    if (title.includes("decline") || title.includes("cancel")) {
      return { label: "Booking Cancelled", badgeClass: "badge-red" };
    }
    return { label: act.title || "Activity", badgeClass: "badge-gray" };
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
            LEFT SIDEBAR NAVIGATION (Icons + Text Labels for Performing Artist)
            ===================================================================== */}
        <aside className="artist-sidebar" aria-label="Artist Navigation">
          {/* Category / Studio Header */}
          <div className="artist-sidebar-header-label">
            <span className="artist-sidebar-chevron">›</span> ARTIST STUDIO
          </div>

          {/* Artist mini profile summary at top */}
          <div
            className="artist-sidebar-user-mini"
            onClick={() => switchTab("profile")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") switchTab("profile");
            }}
            title="View Artist Profile"
          >
            <div className="artist-sidebar-user-avatar">
              {artist.profile_image ? (
                <img
                  src={artist.profile_image}
                  alt={artist.stage_name || user?.username || "Artist"}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="artist-sidebar-user-info">
              <div className="artist-sidebar-user-name">
                {artist.stage_name || user?.username}
              </div>
              <div className="artist-sidebar-user-role">
                {artist.category_name || "Performing Artist"}
              </div>
            </div>
          </div>

          {/* Navigation Items (Icons + Text Labels) */}
          <nav className="artist-sidebar-nav" aria-label="Artist Navigation Links">
            {/* 1. Dashboard */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => switchTab("dashboard")}
            >
              <LayoutDashboard className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Dashboard</span>
            </button>

            {/* 2. My Profile */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => switchTab("profile")}
            >
              <UserRound className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">My Profile</span>
            </button>

            {/* 3. Portfolio */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "portfolio" ? "active" : ""}`}
              onClick={() => switchTab("portfolio")}
            >
              <Images className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Portfolio</span>
            </button>

            {/* 4. Booking Requests */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "requests" || activeTab === "booking-detail" ? "active" : ""}`}
              onClick={() => {
                setSelectedBooking(null);
                switchTab("requests");
              }}
            >
              <Inbox className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Booking Requests</span>
              {pendingBookingsList.length > 0 && (
                <span className="artist-nav-badge" aria-label={`${pendingBookingsList.length} pending requests`}>
                  {pendingBookingsList.length}
                </span>
              )}
            </button>

            {/* 5. Booking Calendar */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "calendar" ? "active" : ""}`}
              onClick={() => switchTab("calendar")}
            >
              <CalendarDays className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Booking Calendar</span>
            </button>

            {/* 6. My Bookings */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "accepted" ? "active" : ""}`}
              onClick={() => switchTab("accepted")}
            >
              <TicketCheck className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">My Bookings</span>
            </button>

            {/* 7. Availability */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "availability" ? "active" : ""}`}
              onClick={() => switchTab("availability")}
            >
              <CalendarCheck className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Availability</span>
            </button>

            {/* 8. Payments & Earnings */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "earnings" ? "active" : ""}`}
              onClick={() => switchTab("earnings")}
            >
              <Wallet className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Payments & Earnings</span>
            </button>

            {/* 9. Reviews & Ratings */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => switchTab("reviews")}
            >
              <Star className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Reviews & Ratings</span>
            </button>

            {/* Spacing gap before secondary sections */}
            <div className="artist-sidebar-spacer" />

            {/* 10. Notifications */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "notifications" ? "active" : ""}`}
              onClick={() => switchTab("notifications")}
            >
              <Bell className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Notifications</span>
              {unreadNotifsCount > 0 && (
                <span className="artist-nav-badge" aria-label={`${unreadNotifsCount} unread notifications`}>
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* 11. Help & Support */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "support" ? "active" : ""}`}
              onClick={() => switchTab("support")}
            >
              <Headset className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Help & Support</span>
            </button>

            {/* 12. Settings */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "settings" || activeTab === "edit-profile" ? "active" : ""}`}
              onClick={() => switchTab("settings")}
            >
              <Settings className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Settings</span>
            </button>
          </nav>

          {/* 13. Sign Out (fixed at the bottom) */}
          <div className="artist-sidebar-footer">
            <button
              type="button"
              className="artist-nav-logout"
              onClick={onLogout}
              aria-label="Sign Out"
            >
              <LogOut className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* =====================================================================
            RIGHT FLUID CONTENT AREA
            ===================================================================== */}
        <main className="cd-main-panel" id="main-content">
          {/* Top Bar with actions / verification badge on secondary tabs */}
          {activeTab !== "dashboard" && (
            <div className="cd-content-topbar">
              <div className="cd-topbar-actions">
                <span
                  className={`cd-topbar-badge ${artist.is_verified ? "" : "pending"}`}
                >
                  <Check size={13} strokeWidth={3} />
                  {artist.is_verified
                    ? "Verified Performing Artist"
                    : "Verification Under Review"}
                </span>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 1: ARTIST DASHBOARD OVERVIEW
              ================================================================= */}
          {activeTab === "dashboard" && (
            <div className="artist-dash-view">
              {/* Dashboard Header */}
              <div className="artist-dash-header">
                <div>
                  <h1 className="artist-dash-welcome">
                    Welcome back, {artist.stage_name || user?.username || "Artist"}
                  </h1>
                  <p className="artist-dash-subtext">
                    Here's a quick overview of your bookings and earnings.
                  </p>
                </div>
                {artist.is_verified ? (
                  <span className="artist-verified-pill">
                    <Check size={14} strokeWidth={2.5} />
                    Verified Performing Artist
                  </span>
                ) : (
                  <span className="artist-pending-pill">
                    Verification Under Review
                  </span>
                )}
              </div>

              {/* Statistics Cards (4 Cards Grid) */}
              <div className="artist-dash-stats-grid">
                <div
                  className="artist-dash-stat-card"
                  onClick={() => switchTab("requests")}
                >
                  <div className="artist-stat-label">Total Requests</div>
                  <div className="artist-stat-value">
                    {stats.total_bookings ?? 0}
                  </div>
                </div>

                <div
                  className="artist-dash-stat-card card-pending"
                  onClick={() => {
                    setRequestFilter("pending");
                    switchTab("requests");
                  }}
                >
                  <div className="artist-stat-label text-pending">
                    Pending Requests
                  </div>
                  <div className="artist-stat-value text-pending">
                    {stats.pending_requests ?? 0}
                  </div>
                </div>

                <div
                  className="artist-dash-stat-card"
                  onClick={() => switchTab("accepted")}
                >
                  <div className="artist-stat-label">Confirmed Bookings</div>
                  <div className="artist-stat-value">
                    {stats.accepted_bookings ?? 0}
                  </div>
                </div>

                <div
                  className="artist-dash-stat-card card-earnings"
                  onClick={() => switchTab("earnings")}
                >
                  <div className="artist-stat-label">Total Earnings</div>
                  <div className="artist-stat-value text-earnings">
                    ₹{stats.total_earnings ?? "0.00"}
                  </div>
                </div>
              </div>

              {/* 2-Column Row 1: Next Performance & Pending Requests */}
              <div className="artist-dash-2col-grid">
                {/* Section A: Next Performance */}
                <div className="artist-dash-card">
                  <div className="artist-dash-card-header">
                    <h2 className="artist-dash-card-title">Next Performance</h2>
                  </div>

                  {nextPerformance ? (
                    <div
                      className="artist-next-perf-row"
                      onClick={() => {
                        setSelectedBooking(nextPerformance);
                        switchTab("booking-detail");
                      }}
                    >
                      <div className="artist-perf-date-box">
                        <span className="artist-perf-day">{nextPerfDay}</span>
                        <span className="artist-perf-month">
                          {nextPerfMonth}
                        </span>
                      </div>

                      <div className="artist-perf-info">
                        <h3 className="artist-perf-name">
                          {nextPerformance.event_type}
                        </h3>
                        <div className="artist-perf-location">
                          {nextPerformance.event_location ||
                            nextPerformance.city ||
                            "Location TBD"}
                        </div>
                        <div className="artist-perf-datetime">
                          {nextPerfFormattedDate}
                        </div>
                      </div>

                      <span className="artist-status-confirmed">Confirmed</span>
                    </div>
                  ) : (
                    <div className="artist-dash-empty">
                      <p className="artist-dash-empty-title">
                        No upcoming performances scheduled
                      </p>
                      <p className="artist-dash-empty-sub">
                        Confirmed bookings will appear here.
                      </p>
                    </div>
                  )}
                </div>

                {/* Section B: Pending Requests */}
                <div className="artist-dash-card">
                  <div className="artist-dash-card-header">
                    <h2 className="artist-dash-card-title">Pending Requests</h2>
                    <button
                      type="button"
                      className="artist-dash-card-btn"
                      onClick={() => {
                        setRequestFilter("pending");
                        switchTab("requests");
                      }}
                    >
                      View All
                    </button>
                  </div>

                  {pendingBookingsList.length > 0 ? (
                    <div className="artist-pending-list">
                      {pendingBookingsList.slice(0, 2).map((req) => (
                        <div
                          key={req.id}
                          className="artist-pending-item"
                          onClick={() => {
                            setSelectedBooking(req);
                            switchTab("booking-detail");
                          }}
                        >
                          <div className="artist-pending-info">
                            <div className="artist-pending-host">
                              {req.customer_name}
                            </div>
                            <div className="artist-pending-event">
                              {req.event_type} · {req.event_date || "Date TBD"}
                            </div>
                          </div>
                          <div className="artist-pending-price">
                            ₹
                            {formatPrice(
                              req.customer_budget || req.agreed_price,
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="artist-dash-empty">
                      <p className="artist-dash-empty-title">
                        No pending requests
                      </p>
                      <p className="artist-dash-empty-sub">
                        New requests will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2-Column Row 2: Upcoming Schedule & Earnings Overview */}
              <div className="artist-dash-2col-grid">
                {/* Section C: Upcoming Schedule */}
                <div className="artist-dash-card">
                  <div className="artist-dash-card-header">
                    <h2 className="artist-dash-card-title">Upcoming Schedule</h2>
                    <button
                      type="button"
                      className="artist-dash-card-btn"
                      onClick={() => switchTab("calendar")}
                    >
                      View Calendar
                    </button>
                  </div>

                  <div className="artist-sched-split">
                    {/* Compact Monthly Calendar */}
                    <div className="artist-mini-calendar">
                      <div className="artist-cal-nav">
                        <button
                          type="button"
                          className="artist-cal-arrow-btn"
                          onClick={handlePrevScheduleMonth}
                          aria-label="Previous Month"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="artist-cal-month-title">
                          {calMonthLabel}
                        </span>
                        <button
                          type="button"
                          className="artist-cal-arrow-btn"
                          onClick={handleNextScheduleMonth}
                          aria-label="Next Month"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="artist-cal-grid">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                          (d) => (
                            <span key={d} className="artist-cal-day-hdr">
                              {d}
                            </span>
                          ),
                        )}

                        {blankDays.map((_, i) => (
                          <span key={`blank-${i}`} />
                        ))}

                        {daysInMonth.map((day) => {
                          const yyyy = calYear;
                          const mm = String(calMonth + 1).padStart(2, "0");
                          const dd = String(day).padStart(2, "0");
                          const fullDateStr = `${yyyy}-${mm}-${dd}`;
                          const isBooked = hasBookingOnDay(day);
                          const isSelected =
                            selectedScheduleDate === fullDateStr;

                          return (
                            <button
                              key={`day-${day}`}
                              type="button"
                              className={`artist-cal-day-cell ${
                                isBooked ? "has-booking" : ""
                              } ${isSelected ? "is-selected" : ""}`}
                              onClick={() =>
                                setSelectedScheduleDate(fullDateStr)
                              }
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Events Panel for Selected Date */}
                    <div className="artist-sched-events-panel">
                      <div className="artist-sched-events-title">
                        {selectedDateLabel}
                      </div>

                      {eventsForSelectedDate.length > 0 ? (
                        eventsForSelectedDate.map((ev) => (
                          <div
                            key={ev.id}
                            className="artist-sched-event-card"
                            onClick={() => {
                              setSelectedBooking(ev);
                              switchTab("booking-detail");
                            }}
                          >
                            <div>
                              <div className="artist-sched-event-title">
                                {ev.event_type}
                              </div>
                              <div className="artist-sched-event-sub">
                                {(() => {
                                  const rawD =
                                    ev.event_date_iso || ev.event_date;
                                  const d = rawD ? new Date(rawD) : null;
                                  const timeStr =
                                    d && !isNaN(d.getTime())
                                      ? d.toLocaleTimeString("en-US", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "";
                                  const loc =
                                    ev.event_location || ev.city || "";
                                  return [timeStr, loc]
                                    .filter(Boolean)
                                    .join(" • ");
                                })()}
                              </div>
                            </div>
                            <span className="artist-status-confirmed">
                              Confirmed
                            </span>
                          </div>
                        ))
                      ) : (
                        <div
                          className="artist-dash-empty"
                          style={{ minHeight: "80px" }}
                        >
                          <p className="artist-dash-empty-sub">
                            No events scheduled
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section D: Earnings Overview */}
                <div className="artist-dash-card">
                  <div className="artist-dash-card-header">
                    <h2 className="artist-dash-card-title">Earnings Overview</h2>
                    <button
                      type="button"
                      className="artist-dash-card-btn"
                      onClick={() => switchTab("earnings")}
                    >
                      Full Statement
                    </button>
                  </div>

                  <div className="artist-earnings-body">
                    <div className="artist-earnings-row">
                      <span className="artist-earnings-label">
                        Completed Earnings
                      </span>
                      <span className="artist-earnings-val">
                        ₹{stats.completed_earnings ?? "0.00"}
                      </span>
                    </div>

                    <div className="artist-earnings-row">
                      <span className="artist-earnings-label">
                        Pending Earnings
                      </span>
                      <span className="artist-earnings-val val-orange">
                        ₹{stats.pending_earnings ?? "0.00"}
                      </span>
                    </div>

                    <div className="artist-earnings-divider" />

                    <div>
                      <div className="artist-payout-header">Recent Payout</div>
                      {recentPayout ? (
                        <div
                          className="artist-earnings-row"
                          style={{ marginTop: "6px" }}
                        >
                          <span
                            style={{ fontSize: "0.9rem", color: "#FFFFFF" }}
                          >
                            {recentPayout.customer_name}
                          </span>
                          <span
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 700,
                              color: "#FFFFFF",
                            }}
                          >
                            ₹{recentPayout.amount}
                          </span>
                        </div>
                      ) : (
                        <div
                          className="artist-payout-empty"
                          style={{ marginTop: "6px" }}
                        >
                          No payout records yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-Width Row 3: Recent Activity */}
              <div className="artist-dash-card">
                <div className="artist-dash-card-header">
                  <h2 className="artist-dash-card-title">Recent Activity</h2>
                  <button
                    type="button"
                    className="artist-dash-card-btn"
                    onClick={() => switchTab("notifications")}
                  >
                    View All
                  </button>
                </div>

                {recentActivity && recentActivity.length > 0 ? (
                  <div className="artist-activity-list">
                    {recentActivity.slice(0, 5).map((act) => {
                      const badge = getActivityBadgeInfo(act);
                      return (
                        <div key={act.id} className="artist-activity-row">
                          <span
                            className={`artist-activity-badge ${badge.badgeClass}`}
                          >
                            {badge.label}
                          </span>
                          <span className="artist-activity-desc">
                            {act.description}
                          </span>
                          <span className="artist-activity-time">
                            {act.formatted_time}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="artist-dash-empty">
                    <p className="artist-dash-empty-sub">
                      No recent activity recorded.
                    </p>
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
              TAB 12: ARTIST SETTINGS & PROFILE PAGE
              ================================================================= */}
          {(activeTab === "settings" || activeTab === "edit-profile") && (
            <div className="cd-form-card">
              <div className="cd-form-header">
                <h2 className="cd-form-title">Artist Settings & Profile</h2>
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
                  className={`cd-btn-${requestFilter === "reschedule" ? "primary" : "secondary"} cd-btn-sm`}
                  onClick={() => setRequestFilter("reschedule")}
                >
                  Reschedule Requests ({pendingRescheduleRequests.length})
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

              {/* Phase 6: Pending Rescheduling Requests Section */}
              {pendingRescheduleRequests.length > 0 &&
                (requestFilter === "all" ||
                  requestFilter === "pending" ||
                  requestFilter === "reschedule") && (
                  <div className="cd-reschedule-banner">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          color: "#FFA726",
                        }}
                      >
                        Pending Rescheduling Requests (
                        {pendingRescheduleRequests.length})
                      </h3>
                      <span style={{ fontSize: "0.82rem", color: "#A0A0A0" }}>
                        Action required to accept or decline date changes
                      </span>
                    </div>

                    {pendingRescheduleRequests.map((req) => (
                      <div
                        key={req.request_id}
                        className="cd-reschedule-card"
                      >
                        <div className="cd-reschedule-card-header">
                          <div>
                            <span
                              className="cd-booking-code"
                              style={{ marginRight: "8px" }}
                            >
                              #BK-{req.booking_id}
                            </span>
                            <span
                              style={{ fontWeight: 700, color: "#FFFFFF" }}
                            >
                              {req.customer_name}
                            </span>{" "}
                            <span
                              style={{
                                color: "#888888",
                                fontSize: "0.86rem",
                              }}
                            >
                              ({req.customer_email})
                            </span>
                            <div
                              style={{
                                color: "#CCCCCC",
                                fontSize: "0.88rem",
                                marginTop: "2px",
                              }}
                            >
                              Event: <strong>{req.event_type}</strong>
                            </div>
                          </div>
                          <span className="cd-history-badge pending">
                            Pending Artist Approval
                          </span>
                        </div>

                        <div className="cd-reschedule-dates-grid">
                          <div className="cd-reschedule-date-box">
                            <span
                              style={{
                                fontSize: "0.76rem",
                                color: "#888888",
                                textTransform: "uppercase",
                              }}
                            >
                              Current Scheduled Date
                            </span>
                            <strong
                              style={{
                                color: "#D4D4D4",
                                fontSize: "0.92rem",
                              }}
                            >
                              {req.original_event_date_formatted}
                            </strong>
                          </div>
                          <div className="cd-reschedule-arrow">➔</div>
                          <div className="cd-reschedule-date-box">
                            <span
                              style={{
                                fontSize: "0.76rem",
                                color: "#FF5722",
                                textTransform: "uppercase",
                              }}
                            >
                              Proposed New Date
                            </span>
                            <strong
                              style={{
                                color: "#FF5722",
                                fontSize: "0.92rem",
                              }}
                            >
                              {req.new_event_date_formatted}
                            </strong>
                          </div>
                        </div>

                        {req.reason && (
                          <div
                            style={{
                              fontSize: "0.88rem",
                              color: "#B0B0B0",
                              background: "#151515",
                              padding: "8px 12px",
                              borderRadius: "6px",
                            }}
                          >
                            <strong style={{ color: "#FFFFFF" }}>
                              Host Note:
                            </strong>{" "}
                            "{req.reason}"
                          </div>
                        )}

                        <div className="cd-reschedule-actions">
                          <button
                            type="button"
                            className="cd-btn-primary cd-btn-sm"
                            disabled={
                              rescheduleActionLoadingId === req.request_id
                            }
                            onClick={() => handleApproveReschedule(req)}
                          >
                            {rescheduleActionLoadingId === req.request_id
                              ? "Updating..."
                              : "Approve New Date"}
                          </button>
                          <button
                            type="button"
                            className="cd-btn-ghost cd-btn-sm"
                            style={{ color: "#EF5350" }}
                            disabled={
                              rescheduleActionLoadingId === req.request_id
                            }
                            onClick={() =>
                              setRejectNoteModal({
                                open: true,
                                request: req,
                                reason: "",
                              })
                            }
                          >
                            Decline Request
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {requestFilter === "reschedule" &&
              pendingRescheduleRequests.length === 0 ? (
                <div className="cd-empty-card">
                  <h3>No Rescheduling Requests Found</h3>
                  <p>
                    No customer rescheduling requests are awaiting your
                    approval at this time.
                  </p>
                </div>
              ) : requestFilter !== "reschedule" &&
                filteredBookings.length === 0 ? (
                <div className="cd-empty-card">
                  <h3>No Booking Requests Found</h3>
                  <p>No booking requests match the current filter selection.</p>
                </div>
              ) : requestFilter !== "reschedule" ? (
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
                          gap: "2px",
                        }}
                      >
                        <span className={`cd-status-pill status-${b.status}`}>
                          {formatBookingStatus(b.status)}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "#A0A0A0",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            marginTop: "2px",
                          }}
                        >
                          {b.status === "pending" ? "Offered Price" : "Agreed Fee"}
                        </span>
                        <span
                          style={{
                            fontSize: "1.05rem",
                            fontWeight: 800,
                            color: "#FF5722",
                          }}
                        >
                          ₹{b.status === "pending" && b.customer_budget
                            ? formatPrice(b.customer_budget)
                            : formatPrice(b.agreed_price)}
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
                              onClick={() => openRespondModal("accept", b)}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="cd-btn-ghost cd-btn-sm"
                              style={{ color: "#EF5350" }}
                              onClick={() => openRespondModal("reject", b)}
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
              ) : null}
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
                      {selectedBooking.status === "pending" ? (
                        <>
                          <div style={{ fontSize: "0.82rem", color: "#A0A0A0" }}>
                            Offered Price
                          </div>
                          <div
                            style={{
                              fontSize: "1.6rem",
                              fontWeight: 800,
                              color: "#FF5722",
                            }}
                          >
                            ₹{selectedBooking.customer_budget
                              ? formatPrice(selectedBooking.customer_budget)
                              : formatPrice(selectedBooking.agreed_price)}
                          </div>
                          <div
                            style={{
                              fontSize: "0.76rem",
                              color: "#888888",
                              marginTop: "2px",
                            }}
                          >
                            Pending Artist Acceptance
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: "0.82rem", color: "#A0A0A0" }}>
                            Agreed Performance Fee
                          </div>
                          <div
                            style={{
                              fontSize: "1.6rem",
                              fontWeight: 800,
                              color: "#FF5722",
                            }}
                          >
                            ₹{formatPrice(selectedBooking.agreed_price)}
                          </div>
                          {selectedBooking.customer_budget && (
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "#888888",
                                marginTop: "3px",
                              }}
                            >
                              Offered: ₹{formatPrice(selectedBooking.customer_budget)}
                            </div>
                          )}
                        </>
                      )}
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
                        Venue:{" "}
                        <strong style={{ color: "#F7F7F7" }}>
                          {selectedBooking.venue_name || selectedBooking.event_location || "Venue TBD"}
                        </strong>
                      </p>
                      {selectedBooking.event_area && (
                        <p
                          style={{
                            fontSize: "0.92rem",
                            color: "#A0A0A0",
                            margin: "2px 0",
                          }}
                        >
                          Area / Locality:{" "}
                          <strong style={{ color: "#F7F7F7" }}>
                            {selectedBooking.event_area}
                          </strong>
                          {selectedBooking.city ? `, ${selectedBooking.city}` : ""}
                          {selectedBooking.state ? `, ${selectedBooking.state}` : ""}
                        </p>
                      )}
                      {selectedBooking.event_address && selectedBooking.event_address !== selectedBooking.event_area && (
                        <p
                          style={{
                            fontSize: "0.92rem",
                            color: "#A0A0A0",
                            margin: "2px 0",
                          }}
                        >
                          Address: {selectedBooking.event_address}
                        </p>
                      )}
                      {(selectedBooking.latitude != null && selectedBooking.longitude != null) && (
                        <p
                          style={{
                            fontSize: "0.92rem",
                            color: "#A0A0A0",
                            margin: "2px 0",
                          }}
                        >
                          Coordinates: {selectedBooking.latitude},{" "}
                          {selectedBooking.longitude}
                        </p>
                      )}
                      {(selectedBooking.google_maps_url || (selectedBooking.latitude != null && selectedBooking.longitude != null)) && (
                        <p
                          style={{
                            fontSize: "0.92rem",
                            color: "#FF5722",
                            margin: "4px 0",
                          }}
                        >
                          <a
                            href={
                              selectedBooking.google_maps_url ||
                              `https://www.google.com/maps/search/?api=1&query=${selectedBooking.latitude},${selectedBooking.longitude}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#FF8A65",
                              textDecoration: "underline",
                              fontWeight: 600,
                            }}
                          >
                            Open in Google Maps
                          </a>
                        </p>
                      )}
                      {selectedBooking.location_instructions && (
                        <p
                          style={{
                            fontSize: "0.90rem",
                            color: "#CCCCCC",
                            margin: "6px 0 2px",
                            background: "rgba(255,255,255,0.04)",
                            padding: "8px 10px",
                            borderRadius: "4px",
                          }}
                        >
                          Directions / Instructions: {selectedBooking.location_instructions}
                        </p>
                      )}
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
                      {selectedBooking.customer_budget && (
                        <p
                          style={{
                            fontSize: "0.92rem",
                            color: "#A0A0A0",
                            margin: "2px 0",
                          }}
                        >
                          Offered Price:{" "}
                          <strong style={{ color: "#F7F7F7" }}>
                            ₹{formatPrice(selectedBooking.customer_budget)}
                          </strong>
                        </p>
                      )}
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
                          onClick={() => openRespondModal("accept", selectedBooking)}
                        >
                          Accept Booking Request
                        </button>
                        <button
                          type="button"
                          className="cd-btn-secondary"
                          style={{ borderColor: "#EF5350", color: "#EF5350" }}
                          onClick={() => openRespondModal("reject", selectedBooking)}
                        >
                          Decline Request
                        </button>
                      </>
                    )}

                    {selectedBooking.status === "accepted" && (
                      <>
                        <button
                          type="button"
                          className="cd-btn-primary"
                          onClick={() =>
                            handleCompleteBooking(selectedBooking.id)
                          }
                        >
                          Mark Performance as Completed
                        </button>
                        <button
                          type="button"
                          className="cd-btn-secondary"
                          style={{ borderColor: "#EF5350", color: "#EF5350" }}
                          onClick={() => openArtistCancelModal(selectedBooking)}
                        >
                          Cancel Booking (100% Refund)
                        </button>
                      </>
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
                          gap: "2px",
                        }}
                      >
                        <span className="cd-status-pill status-accepted">
                          Confirmed
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "#A0A0A0",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            marginTop: "2px",
                          }}
                        >
                          Agreed Fee
                        </span>
                        <span
                          style={{
                            fontSize: "1.05rem",
                            fontWeight: 800,
                            color: "#FF5722",
                          }}
                        >
                          ₹{formatPrice(b.agreed_price)}
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
                        <button
                          type="button"
                          className="cd-btn-ghost cd-btn-sm"
                          style={{ color: "#EF5350" }}
                          onClick={() => openArtistCancelModal(b)}
                        >
                          Cancel
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
                                {pay.transaction_id || "Pending"}
                              </span>
                            </td>
                            <td>{pay.customer_name}</td>
                            <td>{pay.date}</td>
                            <td>
                              <strong style={{ color: "#F7F7F7" }}>
                                ₹{pay.artist_amount || pay.amount}
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

          {/* =================================================================
              TAB 11: ARTIST HELP & SUPPORT PAGE
              ================================================================= */}
          {activeTab === "support" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="cd-form-card">
                <div className="cd-form-header">
                  <h2 className="cd-form-title">Artist Help & Support</h2>
                  <p className="cd-form-subtext">
                    Have questions about bookings, payments, or your artist profile? Submit an inquiry and our support team will respond promptly.
                  </p>
                </div>

                {supportSuccessMsg && (
                  <div className="cd-alert-success" role="status" style={{ marginBottom: "16px" }}>
                    {supportSuccessMsg}
                  </div>
                )}
                {supportErrorMsg && (
                  <div className="cd-alert-error" role="alert" style={{ marginBottom: "16px" }}>
                    {supportErrorMsg}
                  </div>
                )}

                <form onSubmit={handleSupportSubmit} className="cd-form">
                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="support_subject">
                      Inquiry Subject *
                    </label>
                    <input
                      id="support_subject"
                      type="text"
                      className="cd-input"
                      placeholder="e.g. Question about booking payout, cancellation, or schedule"
                      value={supportForm.subject}
                      onChange={(e) =>
                        setSupportForm((p) => ({ ...p, subject: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="support_message">
                      Message Details *
                    </label>
                    <textarea
                      id="support_message"
                      rows={5}
                      className="cd-textarea"
                      placeholder="Describe your inquiry with relevant details such as booking reference or dates..."
                      value={supportForm.message}
                      onChange={(e) =>
                        setSupportForm((p) => ({ ...p, message: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="cd-form-actions">
                    <button
                      type="submit"
                      className="cd-btn-primary cd-btn-sm"
                      disabled={supportSending}
                    >
                      {supportSending ? "Submitting..." : "Submit Support Request"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Quick Help & FAQs Card */}
              <div className="cd-profile-card">
                <h3 className="cd-card-title" style={{ marginBottom: "14px" }}>
                  Frequently Asked Questions
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <strong style={{ color: "#F7F7F7", fontSize: "0.95rem" }}>When do I receive booking payouts?</strong>
                    <p style={{ margin: "6px 0 0", color: "#AAAAAA", fontSize: "0.88rem", lineHeight: 1.5 }}>
                      Payouts are released directly after the event date and completion verification by the host. Check the Payments & Earnings tab for real-time history and payout receipts.
                    </p>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <strong style={{ color: "#F7F7F7", fontSize: "0.95rem" }}>How do I block unavailable dates?</strong>
                    <p style={{ margin: "6px 0 0", color: "#AAAAAA", fontSize: "0.88rem", lineHeight: 1.5 }}>
                      Navigate to Availability tab (CalendarCheck icon) to mark specific dates as unavailable for bookings so clients cannot inquire for those days.
                    </p>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px 16px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <strong style={{ color: "#F7F7F7", fontSize: "0.95rem" }}>What happens if I cancel a confirmed booking?</strong>
                    <p style={{ margin: "6px 0 0", color: "#AAAAAA", fontSize: "0.88rem", lineHeight: 1.5 }}>
                      Under TalentHire's Artist Cancellation Policy, cancelling an accepted booking releases your calendar date and immediately issues a full 100% refund to the client.
                    </p>
                  </div>
                </div>
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
                disabled={responding}
                onClick={closeRespondModal}
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
              {respondError && (
                <div
                  className="cd-alert cd-alert-error"
                  role="alert"
                  style={{ marginBottom: "16px" }}
                >
                  {respondError}
                </div>
              )}

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
                  {respondModal.booking?.customer_budget && (
                    <div
                      style={{
                        background: "rgba(255, 87, 34, 0.08)",
                        border: "1px solid rgba(255, 87, 34, 0.25)",
                        borderRadius: "6px",
                        padding: "10px 14px",
                        marginBottom: "14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.88rem", color: "#CCCCCC" }}>
                        Offered Price:
                      </span>
                      <span
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          color: "#FF5722",
                        }}
                      >
                        ₹{formatPrice(respondModal.booking.customer_budget)}
                      </span>
                    </div>
                  )}

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
                      setRespondError("");
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
                  onChange={(e) => {
                    setRespondError("");
                    setRespondModal((p) => ({ ...p, reason: e.target.value }));
                  }}
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
                disabled={responding}
                onClick={closeRespondModal}
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
                    {receiptItem.transaction_id || "Pending"}
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

      {/* =========================================================================
          PHASE 6: ARTIST CANCELLATION MODAL (100% FULL REFUND TO CUSTOMER)
          ========================================================================= */}
      {artistCancelModalBooking && (
        <div
          className="cd-modal-backdrop"
          onClick={() =>
            !artistCancelSubmitting && setArtistCancelModalBooking(null)
          }
        >
          <div
            className="cd-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "560px" }}
          >
            <div className="cd-modal-header">
              <h3 className="cd-modal-title" style={{ color: "#EF5350" }}>
                Cancel Confirmed Booking #BK-{artistCancelModalBooking.id}
              </h3>
              <button
                type="button"
                className="cd-modal-close"
                onClick={() =>
                  !artistCancelSubmitting && setArtistCancelModalBooking(null)
                }
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="cd-modal-body">
              <div
                style={{
                  marginBottom: "16px",
                  color: "#D4D4D4",
                  fontSize: "0.92rem",
                  lineHeight: "1.6",
                }}
              >
                <div>
                  <strong>Host / Organizer:</strong>{" "}
                  {artistCancelModalBooking.customer_name}
                </div>
                <div>
                  <strong>Event Type:</strong>{" "}
                  {artistCancelModalBooking.event_type}
                </div>
                <div>
                  <strong>Scheduled Date:</strong>{" "}
                  {artistCancelModalBooking.event_date}
                </div>
              </div>

              {artistCancelPreviewLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#A0A0A0",
                  }}
                >
                  Loading cancellation refund details...
                </div>
              ) : (
                <div
                  className="cd-policy-preview-card"
                  style={{ borderColor: "#EF5350" }}
                >
                  <div className="cd-policy-header">
                    <span
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: "#FFFFFF",
                      }}
                    >
                      Artist Cancellation Policy
                    </span>
                    <span className="cd-policy-badge success">
                      100% Customer Refund
                    </span>
                  </div>

                  <div className="cd-policy-breakdown">
                    <div className="cd-policy-row">
                      <span>Policy Rule:</span>
                      <strong>Full 100% Customer Refund Guarantee</strong>
                    </div>
                    <div className="cd-policy-row">
                      <span>Customer Paid Amount:</span>
                      <strong>
                        ₹
                        {artistCancelPreview?.paid_amount ||
                          artistCancelModalBooking.payment?.amount ||
                          artistCancelModalBooking.agreed_price ||
                          "0.00"}
                      </strong>
                    </div>
                    <div
                      className="cd-policy-row"
                      style={{
                        paddingTop: "8px",
                        borderTop: "1px solid #282828",
                      }}
                    >
                      <span>Refund Issued to Customer:</span>
                      <span className="cd-policy-highlight">
                        ₹
                        {artistCancelPreview?.refund_amount ||
                          artistCancelModalBooking.payment?.amount ||
                          artistCancelModalBooking.agreed_price ||
                          "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="cd-policy-info-box">
                <strong>Important:</strong> Cancelling an accepted booking
                releases the reserved date on your calendar and immediately
                initiates a full refund to the event host.
              </div>

              {artistCancelError && (
                <div
                  className="cd-alert cd-alert-error"
                  style={{ marginBottom: "16px" }}
                >
                  {artistCancelError}
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label
                  className="cd-label"
                  htmlFor="artist_cancel_reason"
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "0.88rem",
                  }}
                >
                  Reason for Cancellation *
                </label>
                <textarea
                  id="artist_cancel_reason"
                  className="cd-form-textarea"
                  placeholder="Please provide the host with a clear reason for cancellation (e.g., medical emergency, travel disruption)..."
                  value={artistCancelReason}
                  onChange={(e) => setArtistCancelReason(e.target.value)}
                  disabled={artistCancelSubmitting}
                />
              </div>
            </div>

            <div className="cd-modal-actions">
              <button
                type="button"
                className="cd-btn-secondary"
                onClick={() => setArtistCancelModalBooking(null)}
                disabled={artistCancelSubmitting}
              >
                Keep Booking
              </button>
              <button
                type="button"
                className="cd-btn-danger"
                onClick={handleConfirmArtistCancel}
                disabled={
                  artistCancelSubmitting || !artistCancelReason.trim()
                }
              >
                {artistCancelSubmitting
                  ? "Cancelling..."
                  : "Confirm Cancellation (100% Refund)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PHASE 6: DECLINE RESCHEDULING MINI-MODAL
          ========================================================================= */}
      {rejectNoteModal.open && (
        <div
          className="cd-modal-backdrop"
          onClick={() =>
            setRejectNoteModal({ open: false, request: null, reason: "" })
          }
        >
          <div
            className="cd-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <div className="cd-modal-header">
              <h3 className="cd-modal-title" style={{ color: "#EF5350" }}>
                Decline Rescheduling Request
              </h3>
              <button
                type="button"
                className="cd-modal-close"
                onClick={() =>
                  setRejectNoteModal({ open: false, request: null, reason: "" })
                }
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="cd-modal-body">
              <p
                style={{
                  color: "#B0B0B0",
                  fontSize: "0.9rem",
                  margin: "0 0 16px 0",
                }}
              >
                Decline this date change request for #BK-
                {rejectNoteModal.request?.booking_id}. The booking will remain
                confirmed on its original date.
              </p>

              <div style={{ marginBottom: "16px" }}>
                <label
                  className="cd-label"
                  htmlFor="reject_reason"
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "0.88rem",
                  }}
                >
                  Reason for Declining (Optional note to host)
                </label>
                <textarea
                  id="reject_reason"
                  className="cd-form-textarea"
                  placeholder="e.g., I have a prior recording session on that day..."
                  value={rejectNoteModal.reason}
                  onChange={(e) =>
                    setRejectNoteModal((p) => ({
                      ...p,
                      reason: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="cd-modal-actions">
              <button
                type="button"
                className="cd-btn-secondary"
                onClick={() =>
                  setRejectNoteModal({ open: false, request: null, reason: "" })
                }
              >
                Back
              </button>
              <button
                type="button"
                className="cd-btn-danger"
                onClick={handleConfirmRejectReschedule}
                disabled={
                  rescheduleActionLoadingId ===
                  rejectNoteModal.request?.request_id
                }
              >
                {rescheduleActionLoadingId ===
                rejectNoteModal.request?.request_id
                  ? "Declining..."
                  : "Decline Request"}
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
