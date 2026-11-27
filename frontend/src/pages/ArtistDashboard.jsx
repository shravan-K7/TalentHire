import { useState, useEffect, useCallback, useRef } from "react";
import gsap from "gsap";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ArtistSupportTab from "../components/artist/ArtistSupportTab";
import ArtistCollaborationTab from "../components/artist/ArtistCollaborationTab";
import ArtistLocationCoverageFields from "../components/artist/ArtistLocationCoverageFields";
import {
  fetchArtistDashboard,
  respondArtistBooking,
  completeArtistBooking,
  addArtistPortfolio,
  updateArtistPortfolio,
  setArtistPortfolioFeatured,
  removeArtistPortfolioFeatured,
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
  MapPin,
  ChevronDown,
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  FileText,
  Mail,
  Phone,
  Printer,
  ExternalLink,
  PhoneCall,
  MessageCircle,
  Plus,
  Image as ImageIcon,
  Video as VideoIcon,
  UploadCloud,
} from "lucide-react";
import { extractVideoMetadataAndThumbnail } from "../js/videoUtils";
import "../css/CustomerDashboard.css";
import "../css/ArtistDashboard.css";
import EventCountdown from "../components/booking/EventCountdown";

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

function getWhatsAppUrl(phone, customerName = "", bookingId = "", eventType = "") {
  if (!phone) return "#";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "#";
  const fullNum = digits.length === 10 ? `91${digits}` : digits;
  const msg = encodeURIComponent(
    `Hi ${customerName || "there"}, I'm contacting you regarding TalentHire booking #BK-${bookingId || ""}${eventType ? ` (${eventType})` : ""}.`
  );
  return `https://wa.me/${fullNum}?text=${msg}`;
}

function getGmailUrl(email, customerName = "", bookingId = "", eventType = "", artistName = "") {
  if (!email) return "#";
  const subject = encodeURIComponent(`TalentHire Booking #BK-${bookingId || ""} - ${eventType || "Event"}`);
  const body = encodeURIComponent(
    `Hi ${customerName || "Host"},\n\nI am contacting you regarding your booking request #BK-${bookingId || ""} for ${eventType || "the performance"}.\n\nBest regards,\n${artistName || "Artist"}`
  );
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
}

function getGmapsUrl(query, googleMapsUrl = null, lat = null, lng = null) {
  if (googleMapsUrl) return googleMapsUrl;
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (!query) return "#";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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

const CURRENT_NOW = new Date();
const CURRENT_MONTH = CURRENT_NOW.getMonth();
const CURRENT_YEAR = CURRENT_NOW.getFullYear();
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

  const timelineTrackRef = useRef(null);
  const timelineStepperRef = useRef(null);

  // Portfolio Management States
  const [portfolioFilter, setPortfolioFilter] = useState("all"); // 'all' | 'photos' | 'videos' | 'youtube'
  const [portfolioModal, setPortfolioModal] = useState({
    open: false,
    mode: "add", // 'add' | 'edit'
    item_type: "photo", // 'photo' | 'video' | 'youtube'
    id: null,
    title: "",
    description: "",
    media_file: null,
    media_url: "",
    youtube_url: "",
    duration: "",
    dimensions: "",
    thumbnail_file: null,
    thumbnail_preview: null,
    extracting: false,
    is_featured: false,
    is_public: true,
    saving: false,
    error: "",
  });
  const [featuredModalOpen, setFeaturedModalOpen] = useState(false);
  const portfolioFileInputRef = useRef(null);

  const [receiptItem, setReceiptItem] = useState(null);

  // Availability state
  const [availForm, setAvailForm] = useState({
    date: "",
    is_available: false,
    reason: "",
  });
  const [availSaving, setAvailSaving] = useState(false);
  const [availMonth, setAvailMonth] = useState(() => new Date());

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    stage_name: "",
    category: "",
    other_category: "",
    gender: "male",
    starting_price: "",
    years_of_experience: 0,
    phone: "",
    location: "",
    state: "",
    district: "",
    city: "",
    service_districts: [],
    service_states: [],
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
  const [requestFilter, setRequestFilter] = useState("all"); // 'all' | 'pending' | 'reschedule' | 'accepted' | 'declined' | 'completed'
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'event_date_asc' | 'event_date_desc' | 'price_desc' | 'price_asc'
  const [requestPage, setRequestPage] = useState(1);
  const [rescheduleModal, setRescheduleModal] = useState({
    open: false,
    request: null,
    booking: null,
  });
  const itemsPerPage = 5;

  // Booking Calendar states
  const [calendarFilter, setCalendarFilter] = useState("upcoming"); // 'upcoming' | 'completed' | 'all'
  const [completeModal, setCompleteModal] = useState({
    open: false,
    booking: null,
    loading: false,
  });

  // Payments & Earnings states
  const [payStatusFilter, setPayStatusFilter] = useState("all");
  const [payDateFilter, setPayDateFilter] = useState("all");
  const [payPage, setPayPage] = useState(1);

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
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
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
          setAvailMonth(new Date(y, d.getMonth(), 1));
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

  // GSAP animation for Booking Timeline track & steps
  useEffect(() => {
    if (activeTab === "booking-detail" && selectedBooking && timelineTrackRef.current) {
      const b = selectedBooking;
      const isDeclined = b.status === "rejected" || b.status === "declined";
      const step2Done = ["accepted", "completed", "rejected", "declined"].includes(b.status);
      const step3Done = Boolean(
        b.payment?.status === "success" ||
        b.payment?.status === "completed" ||
        b.payment?.status === "held_in_escrow" ||
        b.status === "completed"
      );
      const step4Done = b.status === "completed";

      let targetProgress = "0%";
      if (step4Done) targetProgress = "100%";
      else if (step3Done) targetProgress = "66.6%";
      else if (step2Done && !isDeclined) targetProgress = "33.3%";

      const ctx = gsap.context(() => {
        const tl = gsap.timeline();

        // 1. Animate track progress width cleanly behind the icons
        tl.fromTo(
          timelineTrackRef.current,
          { width: "0%" },
          {
            width: targetProgress,
            duration: 1.1,
            ease: "power1.inOut",
          },
          0
        );

        // 2. Pop each completed dot as the track reaches it without touching opacity
        if (timelineStepperRef.current) {
          const dots = timelineStepperRef.current.querySelectorAll(".artist-timeline-dot");
          if (dots[0]) {
            tl.fromTo(dots[0], { scale: 0.8 }, { scale: 1, duration: 0.35, ease: "back.out(2)" }, 0.05);
          }
          if (step2Done && dots[1]) {
            tl.fromTo(dots[1], { scale: 0.8 }, { scale: 1, duration: 0.35, ease: "back.out(2)" }, 0.38);
          }
          if (step3Done && dots[2]) {
            tl.fromTo(dots[2], { scale: 0.8 }, { scale: 1, duration: 0.35, ease: "back.out(2)" }, 0.75);
          }
          if (step4Done && dots[3]) {
            tl.fromTo(dots[3], { scale: 0.8 }, { scale: 1, duration: 0.35, ease: "back.out(2)" }, 1.05);
          }
        }
      });

      return () => ctx.revert();
    }
  }, [activeTab, selectedBooking]);

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
        state: artist.state?.id ? String(artist.state.id) : "",
        district: artist.district?.id ? String(artist.district.id) : "",
        city: artist.city?.id ? String(artist.city.id) : "",
        service_districts: Array.isArray(artist.service_district_ids)
          ? artist.service_district_ids
          : [],
        service_states: Array.isArray(artist.service_states)
          ? artist.service_states
          : [],
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
            state: artist.state?.id ? String(artist.state.id) : "",
            district: artist.district?.id ? String(artist.district.id) : "",
            city: artist.city?.id ? String(artist.city.id) : "",
            service_districts: Array.isArray(artist.service_district_ids)
              ? artist.service_district_ids
              : [],
            service_states: Array.isArray(artist.service_states)
              ? artist.service_states
              : [],
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

  // Handle Confirm Complete Booking Modal
  async function handleConfirmCompleteBooking() {
    if (!completeModal.booking) return;
    setCompleteModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await completeArtistBooking(completeModal.booking.id);
      showToast(res.message || "Performance marked as completed.");
      if (selectedBooking && selectedBooking.id === completeModal.booking.id) {
        setSelectedBooking((prev) => ({ ...prev, status: "completed" }));
      }
      setCompleteModal({ open: false, booking: null, loading: false });
      await loadDashboard();
    } catch (err) {
      showToast(err.message || "Failed to complete performance.");
      setCompleteModal((prev) => ({ ...prev, loading: false }));
    }
  }

  // Helper: Format Show Date for Booking Calendar
  function formatShowDate(perf) {
    const d = perf.event_date_iso
      ? new Date(perf.event_date_iso)
      : perf.event_date
      ? new Date(perf.event_date)
      : null;
    const isValid = d && !isNaN(d.getTime());
    const day = isValid ? String(d.getDate()).padStart(2, "0") : "--";
    const month = isValid
      ? d.toLocaleString("en-US", { month: "short" }).toUpperCase()
      : "DATE";
    const year = isValid ? String(d.getFullYear()) : "";

    let timeStr = "";
    if (isValid) {
      timeStr = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } else if (perf.event_date) {
      const parts = perf.event_date.split(" ");
      timeStr = parts.slice(-2).join(" ");
    }
    return { day, month, year, timeStr };
  }

  // Portfolio Management Handlers
  function handleOpenAddModal(defaultType = "photo") {
    setPortfolioModal({
      open: true,
      mode: "add",
      item_type: defaultType,
      id: null,
      title: "",
      description: "",
      media_file: null,
      media_url: "",
      youtube_url: "",
      duration: "",
      dimensions: "",
      thumbnail_file: null,
      thumbnail_preview: null,
      extracting: false,
      is_featured: false,
      is_public: true,
      saving: false,
      error: "",
    });
  }

  function handleOpenEditModal(item) {
    setPortfolioModal({
      open: true,
      mode: "edit",
      item_type: item.item_type || "photo",
      id: item.id,
      title: item.title || "",
      description: item.description || "",
      media_file: null,
      media_url: item.media_url || "",
      youtube_url: item.youtube_url || item.media_url || "",
      duration: item.duration || "",
      dimensions: item.dimensions || "",
      thumbnail_file: null,
      thumbnail_preview: item.thumbnail_url || null,
      extracting: false,
      is_featured: Boolean(item.is_featured),
      is_public: item.is_public !== false,
      saving: false,
      error: "",
    });
  }

  async function handleVideoFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const cleanFileName = file.name
      ? file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim()
      : "";

    setPortfolioModal((p) => ({
      ...p,
      media_file: file,
      title: p.title ? p.title : cleanFileName,
      extracting: true,
      error: "",
    }));

    try {
      const meta = await extractVideoMetadataAndThumbnail(file);
      setPortfolioModal((p) => ({
        ...p,
        duration: meta.duration || p.duration,
        dimensions: meta.dimensions || p.dimensions,
        thumbnail_file: meta.thumbnailFile || p.thumbnail_file,
        thumbnail_preview: meta.previewUrl || p.thumbnail_preview,
        candidateTimes: meta.candidateTimes || [],
        selectedCandidateIndex: 0,
        extracting: false,
      }));
    } catch (err) {
      console.warn("Auto video metadata extraction failed:", err);
      setPortfolioModal((p) => ({
        ...p,
        extracting: false,
      }));
    }
  }

  async function handleCycleVideoFrame() {
    if (!portfolioModal.media_file) return;
    const candidates = portfolioModal.candidateTimes && portfolioModal.candidateTimes.length > 0
      ? portfolioModal.candidateTimes
      : [1.5, 3.0, 5.0, 8.0];
    const nextIdx = ((portfolioModal.selectedCandidateIndex || 0) + 1) % candidates.length;
    const nextTime = candidates[nextIdx];

    setPortfolioModal((p) => ({
      ...p,
      extracting: true,
      selectedCandidateIndex: nextIdx,
    }));

    try {
      const meta = await extractVideoMetadataAndThumbnail(portfolioModal.media_file, nextTime);
      setPortfolioModal((p) => ({
        ...p,
        thumbnail_file: meta.thumbnailFile || p.thumbnail_file,
        thumbnail_preview: meta.previewUrl || p.thumbnail_preview,
        extracting: false,
      }));
    } catch (err) {
      console.warn("Cycle frame error:", err);
      setPortfolioModal((p) => ({ ...p, extracting: false }));
    }
  }

  function handleCustomThumbnailUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const preview = URL.createObjectURL(file);
      setPortfolioModal((p) => ({
        ...p,
        thumbnail_file: file,
        thumbnail_preview: preview,
      }));
    } catch (err) {
      console.warn("Custom thumbnail preview failed:", err);
    }
  }

  async function handleSavePortfolioItem(e) {
    e.preventDefault();
    if (!portfolioModal.title.trim()) {
      setPortfolioModal((prev) => ({ ...prev, error: "Title is required." }));
      return;
    }

    if (
      portfolioModal.item_type === "youtube" &&
      !portfolioModal.youtube_url.trim() &&
      !portfolioModal.media_url.trim()
    ) {
      setPortfolioModal((prev) => ({
        ...prev,
        error: "A valid YouTube URL is required.",
      }));
      return;
    }

    if (
      portfolioModal.mode === "add" &&
      portfolioModal.item_type !== "youtube" &&
      !portfolioModal.media_file &&
      !portfolioModal.media_url.trim()
    ) {
      setPortfolioModal((prev) => ({
        ...prev,
        error: "Please select a media file to upload or enter a URL.",
      }));
      return;
    }

    setPortfolioModal((prev) => ({ ...prev, saving: true, error: "" }));

    try {
      let payload;
      if (portfolioModal.media_file || portfolioModal.thumbnail_file) {
        payload = new FormData();
        payload.append("title", portfolioModal.title.trim());
        payload.append("description", portfolioModal.description.trim());
        payload.append("item_type", portfolioModal.item_type);
        if (portfolioModal.media_file) {
          payload.append("media_file", portfolioModal.media_file);
        }
        if (portfolioModal.thumbnail_file) {
          payload.append("thumbnail", portfolioModal.thumbnail_file);
        }
        payload.append("duration", portfolioModal.duration.trim());
        if (portfolioModal.dimensions) {
          payload.append("dimensions", portfolioModal.dimensions);
        }
        payload.append("is_featured", portfolioModal.is_featured ? "true" : "false");
        payload.append("is_public", portfolioModal.is_public ? "true" : "false");
        if (portfolioModal.youtube_url) {
          payload.append("youtube_url", portfolioModal.youtube_url.trim());
        }
      } else {
        payload = {
          title: portfolioModal.title.trim(),
          description: portfolioModal.description.trim(),
          item_type: portfolioModal.item_type,
          media_url: portfolioModal.media_url.trim() || portfolioModal.youtube_url.trim(),
          youtube_url: portfolioModal.youtube_url.trim(),
          duration: portfolioModal.duration.trim(),
          dimensions: portfolioModal.dimensions || "",
          is_featured: portfolioModal.is_featured,
          is_public: portfolioModal.is_public,
        };
      }

      if (portfolioModal.mode === "edit") {
        await updateArtistPortfolio(portfolioModal.id, payload);
        showToast("Portfolio item updated.");
      } else {
        await addArtistPortfolio(payload);
        showToast("Portfolio item added.");
      }

      setPortfolioModal((prev) => ({ ...prev, open: false, saving: false }));
      loadDashboard();
    } catch (err) {
      setPortfolioModal((prev) => ({
        ...prev,
        saving: false,
        error: err.message || "Failed to save portfolio item.",
      }));
    }
  }

  async function handleSetFeatured(itemId) {
    try {
      await setArtistPortfolioFeatured(itemId);
      showToast("Featured image updated.");
      setFeaturedModalOpen(false);
      loadDashboard();
    } catch (err) {
      showToast(err.message || "Failed to set featured image.");
    }
  }

  async function handleRemoveFeatured() {
    try {
      await removeArtistPortfolioFeatured();
      showToast("Featured image removed.");
      loadDashboard();
    } catch (err) {
      showToast(err.message || "Failed to remove featured image.");
    }
  }

  async function handleToggleVisibility(item) {
    try {
      await updateArtistPortfolio(item.id, { is_public: !item.is_public });
      showToast(item.is_public ? "Item hidden from public profile." : "Item visible on public profile.");
      loadDashboard();
    } catch (err) {
      showToast(err.message || "Failed to update visibility.");
    }
  }

  async function handleDeletePortfolioItem(itemId) {
    if (!window.confirm("Are you sure you want to delete this portfolio item?")) {
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

  function handleViewPublicProfile() {
    if (artist?.id) {
      navigate(`/artists/${artist.id}`);
    } else {
      showToast("Artist profile not loaded yet.");
    }
  }

  // Handle Add / Set Availability
  async function handleSaveAvailability(e) {
    e.preventDefault();
    if (!availForm.date) {
      showToast("Please select a date.");
      return;
    }

    // Client-side guard: Cannot block date with confirmed booking
    if (!availForm.is_available && confirmedBookingsMap[availForm.date]) {
      const b = confirmedBookingsMap[availForm.date];
      showToast(
        `Cannot block ${availForm.date}: Confirmed show "${b.event_type || "Booking"}" is already scheduled.`
      );
      return;
    }

    setAvailSaving(true);
    try {
      await updateArtistAvailability(availForm);
      showToast(availForm.is_available ? "Date marked available." : "Date successfully blocked.");
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
      showToast("Date block removed.");
      setAvailForm((prev) => {
        const wasDeleted = availability.find(
          (av) => av.id === availId && av.date?.startsWith(prev.date)
        );
        return wasDeleted ? { date: "", is_available: false, reason: "" } : prev;
      });
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
      if (editForm.category === "other" && editForm.other_category) {
        formData.append("other_category", editForm.other_category.trim());
      }
      formData.append("gender", editForm.gender);
      formData.append("starting_price", editForm.starting_price);
      formData.append(
        "years_of_experience",
        String(editForm.years_of_experience || 0),
      );
      formData.append("phone", editForm.phone);
      formData.append("location", editForm.location);
      formData.append("state", editForm.state || "");
      formData.append("district", editForm.district || "");
      formData.append("city", editForm.city || "");
      formData.append(
        "service_districts",
        JSON.stringify(editForm.service_districts || []),
      );
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
  const featuredItem = data?.featured_item || portfolio.find((p) => p.is_featured) || null;
  const photos = portfolio.filter((p) => p.item_type === "photo");
  const videos = portfolio.filter((p) => p.item_type === "video");
  const youtubeLinks = portfolio.filter((p) => p.item_type === "youtube");
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

  // Dynamic filter counts
  const allRequestsCount = bookings.length;
  const pendingActionCount = bookings.filter(
    (b) => b.status === "pending" && !b.has_pending_reschedule
  ).length;
  const rescheduleRequestsCount = bookings.filter(
    (b) => b.has_pending_reschedule
  ).length;
  const acceptedRequestsCount = bookings.filter(
    (b) => b.status === "accepted" && !b.has_pending_reschedule
  ).length;
  const declinedRequestsCount = bookings.filter(
    (b) => b.status === "rejected" || b.status === "declined"
  ).length;
  const completedRequestsCount = bookings.filter(
    (b) => b.status === "completed"
  ).length;

  // Filtered requests
  const filteredBookings = bookings.filter((b) => {
    if (requestFilter === "pending") {
      return b.status === "pending" && !b.has_pending_reschedule;
    }
    if (requestFilter === "reschedule") {
      return b.has_pending_reschedule;
    }
    if (requestFilter === "accepted") {
      return b.status === "accepted" && !b.has_pending_reschedule;
    }
    if (requestFilter === "declined" || requestFilter === "rejected") {
      return b.status === "rejected" || b.status === "declined";
    }
    if (requestFilter === "completed") {
      return b.status === "completed";
    }
    return true; // 'all'
  });

  // Sorted requests
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (sortBy === "newest") {
      return (b.id || 0) - (a.id || 0);
    }
    if (sortBy === "oldest") {
      return (a.id || 0) - (b.id || 0);
    }
    if (sortBy === "event_date_asc") {
      const da = new Date(a.event_date_iso || a.event_date).getTime() || 0;
      const db = new Date(b.event_date_iso || b.event_date).getTime() || 0;
      return da - db;
    }
    if (sortBy === "event_date_desc") {
      const da = new Date(a.event_date_iso || a.event_date).getTime() || 0;
      const db = new Date(b.event_date_iso || b.event_date).getTime() || 0;
      return db - da;
    }
    if (sortBy === "price_desc") {
      const pa = Number(a.agreed_price || a.customer_budget || 0);
      const pb = Number(b.agreed_price || b.customer_budget || 0);
      return pb - pa;
    }
    if (sortBy === "price_asc") {
      const pa = Number(a.agreed_price || a.customer_budget || 0);
      const pb = Number(b.agreed_price || b.customer_budget || 0);
      return pa - pb;
    }
    return 0;
  });

  // Paginated requests
  const totalPages = Math.max(1, Math.ceil(sortedBookings.length / itemsPerPage));
  const paginatedBookings = sortedBookings.slice(
    (requestPage - 1) * itemsPerPage,
    requestPage * itemsPerPage
  );

  function handleOpenRescheduleModal(booking) {
    const matchingReq = pendingRescheduleRequests.find(
      (r) => r.booking_id === booking.id
    ) || {
      request_id: booking.pending_reschedule?.id,
      booking_id: booking.id,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      event_type: booking.event_type,
      original_event_date_formatted:
        booking.pending_reschedule?.original_event_date_formatted ||
        booking.event_date,
      new_event_date_formatted:
        booking.pending_reschedule?.new_event_date_formatted,
      reason: booking.pending_reschedule?.reason,
      status: booking.pending_reschedule?.status,
    };
    setRescheduleModal({
      open: true,
      request: matchingReq,
      booking,
    });
  }

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

  // Booking Calendar derived data
  const upcomingShows = bookings
    .filter((b) => b.status === "accepted")
    .sort((a, b) => {
      const da = new Date(a.event_date_iso || a.event_date).getTime() || 0;
      const db = new Date(b.event_date_iso || b.event_date).getTime() || 0;
      return da - db;
    });

  const completedShows = bookings
    .filter((b) => b.status === "completed")
    .sort((a, b) => {
      const da = new Date(a.event_date_iso || a.event_date).getTime() || 0;
      const db = new Date(b.event_date_iso || b.event_date).getTime() || 0;
      return db - da;
    });

  const allShows = [...upcomingShows, ...completedShows];
  const blockedDatesList = availability.filter((av) => !av.is_available);

  // Helper: extract local YYYY-MM-DD from booking
  function getBookingLocalDateStr(booking) {
    if (!booking) return null;
    const raw = booking.event_date_iso || booking.event_date;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Helper: format blocked date for table
  function formatBlockedDate(rawDate) {
    if (!rawDate) return "";
    const d = new Date(rawDate.includes("T") ? rawDate : rawDate + "T00:00:00");
    if (isNaN(d.getTime())) return rawDate;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Availability helpers and derived calendar data
  const confirmedBookingsMap = {};
  bookings.forEach((b) => {
    if (b.status === "accepted" || b.status === "completed") {
      const dStr = getBookingLocalDateStr(b);
      if (dStr) {
        confirmedBookingsMap[dStr] = b;
      }
    }
  });

  const blockedDatesMap = {};
  availability.forEach((av) => {
    if (!av.is_available && av.date) {
      const dStr = av.date.slice(0, 10);
      blockedDatesMap[dStr] = av;
    }
  });

  // Calendar month computations
  const availYear = availMonth.getFullYear();
  const availMonthIndex = availMonth.getMonth();
  const availMonthName = availMonth.toLocaleString("en-US", { month: "long" });
  const availMonthHeaderTitle = `${availMonthName} ${availYear}`;

  const availFirstDayOfWeek = new Date(availYear, availMonthIndex, 1).getDay();
  const availTotalDaysInMonth = new Date(availYear, availMonthIndex + 1, 0).getDate();

  let availableDaysThisMonthCount = 0;
  for (let day = 1; day <= availTotalDaysInMonth; day++) {
    const dStr = `${availYear}-${String(availMonthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isBooked = Boolean(confirmedBookingsMap[dStr]);
    const isBlocked = Boolean(blockedDatesMap[dStr]);
    if (!isBooked && !isBlocked) {
      availableDaysThisMonthCount++;
    }
  }

  const availCalendarCells = [];
  for (let i = 0; i < availFirstDayOfWeek; i++) {
    availCalendarCells.push({ empty: true, key: `empty-${i}` });
  }
  for (let day = 1; day <= availTotalDaysInMonth; day++) {
    const dateStr = `${availYear}-${String(availMonthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const bookedBooking = confirmedBookingsMap[dateStr];
    const blockedOverride = blockedDatesMap[dateStr];

    const isBooked = Boolean(bookedBooking);
    const isBlocked = !isBooked && Boolean(blockedOverride);
    const isAvailable = !isBooked && !isBlocked;
    const isSelected = availForm.date === dateStr;

    availCalendarCells.push({
      empty: false,
      day,
      dateStr,
      isBooked,
      isBlocked,
      isAvailable,
      isSelected,
      booking: bookedBooking,
      override: blockedOverride,
      key: dateStr,
    });
  }

  const handleAvailPrevMonth = () => {
    setAvailMonth(new Date(availYear, availMonthIndex - 1, 1));
  };
  const handleAvailNextMonth = () => {
    setAvailMonth(new Date(availYear, availMonthIndex + 1, 1));
  };

  const handleSelectCalendarDate = (cell) => {
    if (cell.empty) return;
    setAvailForm({
      date: cell.dateStr,
      is_available: cell.override ? cell.override.is_available : false,
      reason: cell.override ? (cell.override.reason || "") : "",
    });
  };

  const handleEditBlockedRow = (av) => {
    const dStr = av.date ? av.date.slice(0, 10) : "";
    setAvailForm({
      date: dStr,
      is_available: false,
      reason: av.reason || "",
    });
    if (av.date) {
      const d = new Date(av.date.includes("T") ? av.date : av.date + "T00:00:00");
      if (!isNaN(d.getTime())) {
        setAvailMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  };

  const displayedShows =
    calendarFilter === "completed"
      ? completedShows
      : calendarFilter === "all"
      ? allShows
      : upcomingShows;

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

  // Financial breakdown derived data
  const grossBookingAmount = bookings.reduce((sum, b) => {
    if (b.status === "accepted" || b.status === "completed") {
      const p = Number(b.agreed_price || b.customer_budget || 0);
      return sum + (isNaN(p) ? 0 : p);
    }
    return sum;
  }, 0);

  const platformCommission = Number((grossBookingAmount * 0.08).toFixed(2));
  const netArtistEarnings = Number((grossBookingAmount * 0.92).toFixed(2));

  // Transactions filtering and pagination
  const filteredPayments = payments.filter((pay) => {
    // Status filter
    if (payStatusFilter !== "all") {
      if (payStatusFilter === "pending" && pay.status !== "pending") return false;
      if (payStatusFilter === "success" && pay.status !== "success") return false;
      if (payStatusFilter === "refunded" && !pay.status.includes("refund")) return false;
      if (payStatusFilter === "failed" && pay.status !== "failed") return false;
    }

    // Date range filter
    if (payDateFilter !== "all" && (pay.created_at_iso || pay.date)) {
      const rawDate = pay.created_at_iso || pay.date;
      const payDate = new Date(rawDate);
      const payTime = payDate.getTime();
      if (!isNaN(payTime)) {
        if (payDateFilter === "this_month") {
          if (
            payDate.getMonth() !== CURRENT_MONTH ||
            payDate.getFullYear() !== CURRENT_YEAR
          ) {
            return false;
          }
        } else if (payDateFilter === "last_30_days") {
          if (CURRENT_NOW.getTime() - payTime > THIRTY_DAYS_MS) return false;
        } else if (payDateFilter === "this_year") {
          if (payDate.getFullYear() !== CURRENT_YEAR) return false;
        }
      }
    }

    return true;
  });

  const payItemsPerPage = 5;
  const payTotalPages = Math.max(1, Math.ceil(filteredPayments.length / payItemsPerPage));
  const currentPayPage = Math.min(payPage, payTotalPages);
  const paginatedPayments = filteredPayments.slice(
    (currentPayPage - 1) * payItemsPerPage,
    currentPayPage * payItemsPerPage
  );

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

            {/* Smart Collaboration Discovery (Phase 3) */}
            <button
              type="button"
              className={`artist-nav-item ${activeTab === "collaborations" ? "active" : ""}`}
              onClick={() => switchTab("collaborations")}
            >
              <Users className="artist-nav-icon" size={19} strokeWidth={2} />
              <span className="artist-nav-label">Collaborations</span>
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
              {unreadSupportCount > 0 && (
                <span className="artist-nav-badge" aria-label={`${unreadSupportCount} unread support replies`}>
                  {unreadSupportCount}
                </span>
              )}
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
          {activeTab !== "dashboard" && activeTab !== "requests" && activeTab !== "booking-detail" && activeTab !== "calendar" && (
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
                        {Boolean(
                          (nextPerformance.payment?.status === "success" ||
                            nextPerformance.payment?.status === "completed" ||
                            nextPerformance.payment?.status === "held_in_escrow" ||
                            nextPerformance.payment?.status === "paid" ||
                            nextPerformance.status === "accepted") &&
                          (nextPerformance.event_date_iso || nextPerformance.event_date)
                        ) && (
                          <div style={{ marginTop: "6px", maxWidth: "260px" }}>
                            <EventCountdown
                              eventDate={nextPerformance.event_date_iso || nextPerformance.event_date}
                              variant="pill"
                            />
                          </div>
                        )}
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
                        {artist.years_of_experience || 0} years experience ·{" "}
                        {Array.isArray(artist.service_districts) &&
                        artist.service_districts.length > 0
                          ? `Covers ${artist.service_districts.length} district${
                              artist.service_districts.length === 1 ? "" : "s"
                            } across ${
                              (artist.service_states || []).length || 1
                            } state${
                              (artist.service_states || []).length === 1
                                ? ""
                                : "s"
                            }`
                          : `Travel: ${artist.travel_availability || "Within City"}`}
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
                    style={{ fontSize: "0.94rem", color: "#888888", margin: 0 }}
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
                        fontSize: "0.96rem",
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
                      <div style={{ fontSize: "0.92rem", color: "#888888" }}>
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
                      <div style={{ fontSize: "0.92rem", color: "#888888" }}>
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
                        fontSize: "0.88rem",
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
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {editForm.category === "other" && (
                    <div className="cd-form-group">
                      <label className="cd-label" htmlFor="other_category">
                        Specify Category *
                      </label>
                      <input
                        id="other_category"
                        type="text"
                        className="cd-input"
                        value={editForm.other_category || ""}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, other_category: e.target.value }))
                        }
                        placeholder="Enter new category (e.g. Magician, Comedian, Illusionist)"
                        required
                        maxLength={100}
                        autoFocus
                      />
                    </div>
                  )}

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

                  <ArtistLocationCoverageFields
                    stateId={editForm.state}
                    districtId={editForm.district}
                    cityId={editForm.city}
                    serviceDistrictIds={editForm.service_districts}
                    initialServiceStates={editForm.service_states}
                    legacyLocation={editForm.location}
                    onBaseLocationChange={(loc) =>
                      setEditForm((p) => ({
                        ...p,
                        state: loc.state,
                        district: loc.district,
                        city: loc.city,
                        location: loc.location,
                      }))
                    }
                    onServiceDistrictsChange={(ids) =>
                      setEditForm((p) => ({ ...p, service_districts: ids }))
                    }
                  />
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
              TAB 4: PORTFOLIO MANAGEMENT PAGE (REDESIGNED TO REFERENCE UI)
              ================================================================= */}
          {activeTab === "portfolio" && (
            <div className="artist-port-view">
              {/* A. Portfolio Header */}
              <div className="artist-port-header">
                <div>
                  <h1 className="artist-port-title">Portfolio Management</h1>
                  <p className="artist-port-desc">
                    Manage your photos, videos and performance links. These items appear on your public artist profile.
                  </p>
                </div>

                <div className="artist-port-header-actions">
                  <div className="artist-port-btn-group">
                    <button
                      type="button"
                      className="artist-port-btn-primary"
                      onClick={() => handleOpenAddModal("photo")}
                    >
                      <Plus size={16} />
                      Add Portfolio Item
                    </button>
                    <button
                      type="button"
                      className="artist-port-btn-secondary"
                      onClick={handleViewPublicProfile}
                    >
                      View Public Profile
                    </button>
                  </div>
                  <p className="artist-port-preview-hint">
                    Preview how your portfolio looks to event organizers.
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="artist-port-tabs-bar" role="tablist">
                <button
                  type="button"
                  className={`artist-port-tab ${portfolioFilter === "all" ? "active" : ""}`}
                  onClick={() => setPortfolioFilter("all")}
                >
                  All Items ({portfolio.length})
                </button>
                <button
                  type="button"
                  className={`artist-port-tab ${portfolioFilter === "photos" ? "active" : ""}`}
                  onClick={() => setPortfolioFilter("photos")}
                >
                  Photos ({photos.length})
                </button>
                <button
                  type="button"
                  className={`artist-port-tab ${portfolioFilter === "videos" ? "active" : ""}`}
                  onClick={() => setPortfolioFilter("videos")}
                >
                  Videos ({videos.length})
                </button>
                <button
                  type="button"
                  className={`artist-port-tab ${portfolioFilter === "youtube" ? "active" : ""}`}
                  onClick={() => setPortfolioFilter("youtube")}
                >
                  YouTube Links ({youtubeLinks.length})
                </button>
              </div>

              {/* B. Featured Image Card */}
              {(portfolioFilter === "all" || portfolioFilter === "photos") && (
                <div className="artist-port-featured-card">
                  <div className="artist-port-featured-left">
                    <h3 className="artist-port-featured-title">Featured Image</h3>
                    <p className="artist-port-featured-desc">
                      The main image displayed at the top of your public profile.
                    </p>
                  </div>

                  <div className="artist-port-featured-preview-box">
                    {featuredItem ? (
                      <img
                        src={
                          featuredItem.thumbnail_url ||
                          (featuredItem.item_type === "photo" ? featuredItem.media_url : "") ||
                          "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80"
                        }
                        alt={featuredItem.title}
                        className="artist-port-featured-img"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                    ) : artist.profile_image ? (
                      <img
                        src={artist.profile_image}
                        alt={artist.stage_name}
                        className="artist-port-featured-img"
                      />
                    ) : (
                      <div className="artist-port-featured-placeholder">
                        <UploadCloud size={32} />
                        <span>No featured image selected</span>
                      </div>
                    )}
                  </div>

                  <div className="artist-port-featured-right">
                    <span className="artist-port-featured-pill">
                      Shown first on public profile
                    </span>
                    <h4 className="artist-port-featured-name" title={featuredItem?.title}>
                      {featuredItem?.title || (artist.profile_image ? "Artist Profile Photo" : "No Featured Image")}
                    </h4>
                    <p className="artist-port-featured-meta">
                      {featuredItem?.format_ext || "JPG"} • {featuredItem?.dimensions || "1920 × 1080"} • {featuredItem?.file_size || "2.4 MB"}
                    </p>

                    <div className="artist-port-featured-actions">
                      <button
                        type="button"
                        className="artist-port-btn-change-feat"
                        onClick={() => setFeaturedModalOpen(true)}
                      >
                        Change Featured Image
                      </button>
                      {featuredItem && (
                        <button
                          type="button"
                          className="artist-port-btn-remove-feat"
                          onClick={handleRemoveFeatured}
                        >
                          Remove Featured
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* C. Photo Gallery Section */}
              {(portfolioFilter === "all" || portfolioFilter === "photos") && (
                <div className="artist-port-section-card">
                  <div className="artist-port-section-top">
                    <div>
                      <h3 className="artist-port-section-heading">Photo Gallery</h3>
                      <p className="artist-port-section-sub">
                        Showcase your performances, events and stage presence with photos.
                      </p>
                    </div>
                  </div>

                  {photos.length === 0 ? (
                    <div className="artist-port-empty-notice">
                      No photos uploaded yet. Showcase your stage presence by adding high-quality photos.
                    </div>
                  ) : (
                    <div className="artist-port-photo-grid">
                      {photos.map((item) => (
                        <div key={item.id} className="artist-port-photo-item">
                          <div className="artist-port-photo-thumb-wrap">
                            <img
                              src={item.media_url || item.thumbnail_url}
                              alt={item.title}
                              className="artist-port-photo-thumb"
                            />
                          </div>
                          <div className="artist-port-photo-body">
                            <h4 className="artist-port-photo-title" title={item.title}>
                              {item.title}
                            </h4>
                            <span
                              className={`artist-port-pill ${item.is_public ? "visible" : "hidden"}`}
                              onClick={() => handleToggleVisibility(item)}
                              style={{ cursor: "pointer" }}
                              title="Click to toggle visibility"
                            >
                              {item.is_public ? "Visible on profile" : "Hidden"}
                            </span>
                            <div className="artist-port-item-actions">
                              {!item.is_featured ? (
                                <button
                                  type="button"
                                  className="artist-port-action-link"
                                  onClick={() => handleSetFeatured(item.id)}
                                >
                                  Set as Featured
                                </button>
                              ) : (
                                <span style={{ color: "#4ADE80", fontWeight: 600 }}>Featured</span>
                              )}
                              <span>|</span>
                              <button
                                type="button"
                                className="artist-port-action-link secondary"
                                onClick={() => handleOpenEditModal(item)}
                              >
                                Edit
                              </button>
                              <span>|</span>
                              <button
                                type="button"
                                className="artist-port-action-link danger"
                                onClick={() => handleDeletePortfolioItem(item.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="artist-port-bottom-bar">
                    <button
                      type="button"
                      className="artist-port-btn-add-photos"
                      onClick={() => handleOpenAddModal("photo")}
                    >
                      Add Photos
                    </button>
                    <p className="artist-port-file-hint">
                      Upload high-quality images (JPG, JPEG, PNG) • Max file size: 10 MB per image
                    </p>
                  </div>
                </div>
              )}

              {/* D. Performance Videos Section */}
              {(portfolioFilter === "all" || portfolioFilter === "videos") && (
                <div className="artist-port-section-card">
                  <div className="artist-port-section-top">
                    <div>
                      <h3 className="artist-port-section-heading">Performance Videos</h3>
                      <p className="artist-port-section-sub">
                        Add your performance reels or highlight videos.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="artist-port-btn-add-action"
                      onClick={() => handleOpenAddModal("video")}
                    >
                      Add Video
                    </button>
                  </div>

                  {videos.length === 0 ? (
                    <div className="artist-port-empty-notice">
                      No performance videos uploaded yet. Add video highlights to let clients see you in action.
                    </div>
                  ) : (
                    <div className="artist-port-videos-list">
                      {videos.map((item) => (
                        <div key={item.id} className="artist-port-video-row">
                          <div className="artist-port-video-thumb-box">
                            <img
                              src={
                                item.thumbnail_url ||
                                (item.item_type === "photo" ? item.media_url : "") ||
                                "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80"
                              }
                              alt={item.title}
                              className="artist-port-video-thumb"
                              onError={(e) => {
                                e.target.src = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80";
                              }}
                            />
                            <div className="artist-port-video-play-overlay">
                              <div className="artist-port-play-icon">▶</div>
                            </div>
                            <span className="artist-port-duration-tag">
                              {item.duration || "03:24"}
                            </span>
                          </div>

                          <div className="artist-port-video-info">
                            <h4 className="artist-port-video-title">{item.title}</h4>
                            <p className="artist-port-video-desc">
                              {item.description || "A compilation of live performances from recent events."}
                            </p>
                            <p className="artist-port-video-meta">
                              {item.format_ext || "MP4"} • {item.dimensions || "1920 × 1080"} • {item.file_size || "85.4 MB"}
                            </p>
                          </div>

                          <div className="artist-port-video-actions">
                            <button
                              type="button"
                              className="artist-port-action-link secondary"
                              onClick={() => handleOpenEditModal(item)}
                            >
                              Edit
                            </button>
                            <span style={{ color: "#555" }}>|</span>
                            <button
                              type="button"
                              className="artist-port-action-link danger"
                              onClick={() => handleDeletePortfolioItem(item.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* E. YouTube Performance Links Section */}
              {(portfolioFilter === "all" || portfolioFilter === "youtube") && (
                <div className="artist-port-section-card">
                  <div className="artist-port-section-top">
                    <div>
                      <h3 className="artist-port-section-heading">YouTube Performance Links</h3>
                      <p className="artist-port-section-sub">
                        Add YouTube links to live performances or official videos.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="artist-port-btn-add-action"
                      onClick={() => handleOpenAddModal("youtube")}
                    >
                      Add YouTube Link
                    </button>
                  </div>

                  {youtubeLinks.length === 0 ? (
                    <div className="artist-port-empty-notice">
                      No YouTube links added yet. Paste YouTube links to stream highlights on your public profile.
                    </div>
                  ) : (
                    <div className="artist-port-yt-table-wrap">
                      <table className="artist-port-yt-table">
                        <thead>
                          <tr>
                            <th style={{ width: "25%" }}>Title</th>
                            <th style={{ width: "45%" }}>YouTube URL</th>
                            <th style={{ width: "15%" }}>Visibility</th>
                            <th style={{ width: "15%", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {youtubeLinks.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <span className="artist-port-yt-title">{item.title}</span>
                              </td>
                              <td>
                                <a
                                  href={item.youtube_url || item.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="artist-port-yt-link"
                                >
                                  {item.youtube_url || item.media_url}
                                  <ExternalLink size={12} />
                                </a>
                              </td>
                              <td>
                                <span
                                  className={`artist-port-pill ${item.is_public ? "visible" : "hidden"}`}
                                  onClick={() => handleToggleVisibility(item)}
                                  style={{ cursor: "pointer" }}
                                  title="Click to toggle visibility"
                                >
                                  {item.is_public ? "Visible on profile" : "Hidden"}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: "10px", alignItems: "center" }}>
                                  <button
                                    type="button"
                                    className="artist-port-action-link secondary"
                                    onClick={() => handleOpenEditModal(item)}
                                  >
                                    Edit
                                  </button>
                                  <span style={{ color: "#555" }}>|</span>
                                  <button
                                    type="button"
                                    className="artist-port-action-link danger"
                                    onClick={() => handleDeletePortfolioItem(item.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 5: BOOKING REQUESTS PAGE (Matching Reference UI)
              ================================================================= */}
          {activeTab === "requests" && (
            <div className="artist-req-page">
              {/* Header: Title + Subtitle + Sort Dropdown */}
              <div className="artist-req-header">
                <div>
                  <h1 className="artist-req-title">Booking Requests</h1>
                  <p className="artist-req-subtext">
                    Manage incoming requests, view details and take action.
                  </p>
                </div>

                <div className="artist-req-sort-box">
                  <select
                    className="artist-req-sort-select"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setRequestPage(1);
                    }}
                    aria-label="Sort booking requests"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                    <option value="event_date_asc">Sort: Event Date (Soonest)</option>
                    <option value="event_date_desc">Sort: Event Date (Latest)</option>
                    <option value="price_desc">Sort: Price (High to Low)</option>
                    <option value="price_asc">Sort: Price (Low to High)</option>
                  </select>
                  <ChevronDown className="artist-req-sort-chevron" size={15} />
                </div>
              </div>

              {/* Status Filter Tabs with Dynamic Counts */}
              <div className="artist-req-tabs-bar" role="tablist">
                <button
                  type="button"
                  className={`artist-req-tab ${requestFilter === "all" ? "active" : ""}`}
                  onClick={() => {
                    setRequestFilter("all");
                    setRequestPage(1);
                  }}
                >
                  <span>All Requests</span>
                  <span className="artist-req-tab-badge">{allRequestsCount}</span>
                </button>

                <button
                  type="button"
                  className={`artist-req-tab ${requestFilter === "pending" ? "active" : ""}`}
                  onClick={() => {
                    setRequestFilter("pending");
                    setRequestPage(1);
                  }}
                >
                  <span>Pending Action</span>
                  <span className="artist-req-tab-badge">{pendingActionCount}</span>
                </button>

                <button
                  type="button"
                  className={`artist-req-tab ${requestFilter === "reschedule" ? "active" : ""}`}
                  onClick={() => {
                    setRequestFilter("reschedule");
                    setRequestPage(1);
                  }}
                >
                  <span>Reschedule Requests</span>
                  <span className="artist-req-tab-badge">{rescheduleRequestsCount}</span>
                </button>

                <button
                  type="button"
                  className={`artist-req-tab ${requestFilter === "accepted" ? "active" : ""}`}
                  onClick={() => {
                    setRequestFilter("accepted");
                    setRequestPage(1);
                  }}
                >
                  <span>Accepted</span>
                  <span className="artist-req-tab-badge">{acceptedRequestsCount}</span>
                </button>

                <button
                  type="button"
                  className={`artist-req-tab ${requestFilter === "declined" ? "active" : ""}`}
                  onClick={() => {
                    setRequestFilter("declined");
                    setRequestPage(1);
                  }}
                >
                  <span>Declined</span>
                  <span className="artist-req-tab-badge">{declinedRequestsCount}</span>
                </button>

                <button
                  type="button"
                  className={`artist-req-tab ${requestFilter === "completed" ? "active" : ""}`}
                  onClick={() => {
                    setRequestFilter("completed");
                    setRequestPage(1);
                  }}
                >
                  <span>Completed</span>
                  <span className="artist-req-tab-badge">{completedRequestsCount}</span>
                </button>
              </div>

              {/* Booking Cards Stack in Table Structure */}
              {paginatedBookings.length === 0 ? (
                <div
                  className="cd-empty-card"
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    background: "#161616",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.15rem",
                      color: "#FFFFFF",
                      marginBottom: "8px",
                    }}
                  >
                    No Booking Requests Found
                  </h3>
                  <p
                    style={{
                      color: "#8E8E93",
                      fontSize: "0.9rem",
                      margin: "0 0 16px 0",
                    }}
                  >
                    No requests match the current "
                    {requestFilter === "all" ? "All" : requestFilter}" filter
                    selection.
                  </p>
                  {requestFilter !== "all" && (
                    <button
                      type="button"
                      className="artist-btn-view"
                      onClick={() => {
                        setRequestFilter("all");
                        setRequestPage(1);
                      }}
                    >
                      Show All Requests
                    </button>
                  )}
                </div>
              ) : (
                <div className="artist-req-table-wrapper">
                  <div className="artist-req-list">
                    {paginatedBookings.map((b) => {
                      const rawDate = b.event_date_iso || b.event_date;
                      const d = rawDate ? new Date(rawDate) : null;
                      const isValidDate = d && !isNaN(d.getTime());
                      const day = isValidDate
                        ? String(d.getDate()).padStart(2, "0")
                        : "--";
                      const month = isValidDate
                        ? d
                            .toLocaleString("en-US", { month: "short" })
                            .toUpperCase()
                        : "DATE";
                      const year = isValidDate ? d.getFullYear() : "2026";
                      const timeStr = isValidDate
                        ? d.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : b.event_date
                          ? b.event_date.split(" ").slice(-2).join(" ")
                          : "--";

                      const duration = b.performance_duration
                        ? b.performance_duration.toLowerCase().includes("hour")
                          ? b.performance_duration
                          : `${b.performance_duration} Hours`
                        : "—";

                      const audience = b.expected_audience_size
                        ? String(b.expected_audience_size)
                        : "—";
                      const priceVal =
                        b.status === "pending"
                          ? b.customer_budget || b.agreed_price
                          : b.agreed_price || b.customer_budget;

                      let statusBadge = {
                        label: "Pending Action",
                        className: "status-pending",
                      };
                      if (b.has_pending_reschedule) {
                        statusBadge = {
                          label: "Reschedule Request",
                          className: "status-reschedule",
                        };
                      } else if (b.status === "accepted") {
                        statusBadge = {
                          label: "Accepted",
                          className: "status-accepted",
                        };
                      } else if (
                        b.status === "rejected" ||
                        b.status === "declined"
                      ) {
                        statusBadge = {
                          label: "Declined",
                          className: "status-declined",
                        };
                      } else if (b.status === "completed") {
                        statusBadge = {
                          label: "Completed",
                          className: "status-completed",
                        };
                      } else if (b.status === "cancelled") {
                        statusBadge = {
                          label: "Cancelled",
                          className: "status-declined",
                        };
                      }

                      return (
                        <div key={b.id} className="artist-req-card">
                          {/* Col 1: Date Box */}
                          <div className="artist-req-date-box">
                            <span className="artist-req-date-day">{day}</span>
                            <span className="artist-req-date-month">{month}</span>
                            <span className="artist-req-date-year">{year}</span>
                          </div>

                          {/* Col 2: Main Event & Host Info */}
                          <div className="artist-req-main-info">
                            <h3 className="artist-req-event-title">
                              {b.event_type}
                            </h3>
                            <div className="artist-req-host">
                              Host: {b.customer_name}
                            </div>
                            <div className="artist-req-location">
                              <MapPin
                                size={13}
                                style={{ color: "#FF5722", flexShrink: 0 }}
                              />
                              <span>
                                {b.event_location || b.city || "Location TBD"}
                              </span>
                            </div>
                            {Boolean(
                              (b.payment?.status === "success" ||
                                b.payment?.status === "completed" ||
                                b.payment?.status === "held_in_escrow" ||
                                b.payment?.status === "paid") &&
                              b.status === "accepted" &&
                              (b.event_date_iso || b.event_date)
                            ) && (
                              <div style={{ marginTop: "6px", maxWidth: "260px" }}>
                                <EventCountdown
                                  eventDate={b.event_date_iso || b.event_date}
                                  variant="pill"
                                />
                              </div>
                            )}
                          </div>

                          {/* Col 3: Event Time */}
                          <div className="artist-req-meta-col">
                            <span className="artist-req-meta-lbl">
                              Event Time
                            </span>
                            <span className="artist-req-meta-val">
                              {timeStr}
                            </span>
                          </div>

                          {/* Col 4: Duration */}
                          <div className="artist-req-meta-col">
                            <span className="artist-req-meta-lbl">
                              Duration
                            </span>
                            <span className="artist-req-meta-val">
                              {duration}
                            </span>
                          </div>

                          {/* Col 5: Audience */}
                          <div className="artist-req-meta-col">
                            <span className="artist-req-meta-lbl">
                              Audience
                            </span>
                            <span className="artist-req-meta-val">
                              {audience}
                            </span>
                          </div>

                          {/* Col 6: Offered Price */}
                          <div className="artist-req-meta-col">
                            <span className="artist-req-meta-lbl">
                              Offered Price
                            </span>
                            <span className="artist-req-meta-val price">
                              ₹{formatPrice(priceVal)}
                            </span>
                          </div>

                          {/* Col 7: Status Indicator */}
                          <div className="artist-req-status-col">
                            <span
                              className={`artist-req-status-pill ${statusBadge.className}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>

                          {/* Col 8: Actions */}
                          <div className="artist-req-actions">
                            <button
                              type="button"
                              className="artist-btn-view"
                              onClick={() => {
                                setSelectedBooking(b);
                                switchTab("booking-detail");
                              }}
                            >
                              View Details
                            </button>

                            {b.has_pending_reschedule ? (
                              <button
                                type="button"
                                className="artist-btn-respond"
                                onClick={() => handleOpenRescheduleModal(b)}
                              >
                                Respond
                              </button>
                            ) : b.status === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  className="artist-btn-accept"
                                  onClick={() => openRespondModal("accept", b)}
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="artist-btn-decline"
                                  onClick={() => openRespondModal("reject", b)}
                                >
                                  Decline
                                </button>
                              </>
                            ) : b.status === "accepted" ? (
                              <button
                                type="button"
                                className="artist-btn-complete"
                                onClick={() => handleCompleteBooking(b.id)}
                              >
                                Mark Completed
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer / Pagination */}
              {sortedBookings.length > 0 && (
                <div className="artist-req-footer">
                  <div className="artist-req-count-text">
                    {sortedBookings.length <= itemsPerPage
                      ? `Showing ${sortedBookings.length} requests`
                      : `Showing ${(requestPage - 1) * itemsPerPage + 1}–${Math.min(
                          requestPage * itemsPerPage,
                          sortedBookings.length,
                        )} of ${sortedBookings.length} requests`}
                  </div>

                  {totalPages > 1 && (
                    <div className="artist-req-pagination">
                      <button
                        type="button"
                        className="artist-page-nav-btn"
                        disabled={requestPage <= 1}
                        onClick={() =>
                          setRequestPage((p) => Math.max(1, p - 1))
                        }
                      >
                        &lt; Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (pageNum) => (
                          <button
                            key={pageNum}
                            type="button"
                            className={`artist-page-num-btn ${pageNum === requestPage ? "active" : ""}`}
                            onClick={() => setRequestPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        ),
                      )}

                      <button
                        type="button"
                        className="artist-page-nav-btn"
                        disabled={requestPage >= totalPages}
                        onClick={() =>
                          setRequestPage((p) => Math.min(totalPages, p + 1))
                        }
                      >
                        Next &gt;
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 6: BOOKING DETAILS PAGE
              ================================================================= */}
          {activeTab === "booking-detail" && (
            <div className="artist-booking-detail-page">
              <button
                type="button"
                className="artist-detail-back-btn"
                onClick={() => switchTab("requests")}
              >
                <ArrowLeft size={14} />
                Back to Booking Requests
              </button>
              <div className="artist-detail-header-text">
                <h1>Booking Details</h1>
                <p>Complete information about this booking request.</p>
              </div>

              {!selectedBooking ? (
                <div className="cd-empty-state">
                  <p className="cd-empty-title">No Booking Selected</p>
                  <p className="cd-empty-text">
                    Please select a booking from the Booking Requests list to view complete details.
                  </p>
                  <button
                    type="button"
                    className="cd-btn-primary"
                    onClick={() => switchTab("requests")}
                  >
                    Go to Booking Requests
                  </button>
                </div>
              ) : (() => {
                const b = selectedBooking;

                // Status Badge logic
                let summaryBadge = {
                  label: "Pending Action",
                  className: "status-pending",
                };
                if (b.has_pending_reschedule) {
                  summaryBadge = {
                    label: "Reschedule Request",
                    className: "status-reschedule",
                  };
                } else if (b.status === "completed") {
                  summaryBadge = {
                    label: "Completed",
                    className: "status-completed",
                  };
                } else if (b.status === "accepted") {
                  summaryBadge = {
                    label: "Accepted",
                    className: "status-accepted",
                  };
                } else if (b.status === "rejected" || b.status === "declined") {
                  summaryBadge = {
                    label: "Declined",
                    className: "status-declined",
                  };
                } else if (b.status === "cancelled") {
                  summaryBadge = {
                    label: "Cancelled",
                    className: "status-declined",
                  };
                }

                // Event Date & Time formatting: e.g. "Nov 10, 2026 • 06:00 PM"
                let eventDateTime = b.event_date || "Date & Time TBD";
                const dateParts = (b.event_date || "").split(" ");
                if (dateParts.length >= 5) {
                  eventDateTime = `${dateParts.slice(0, 3).join(" ")} • ${dateParts.slice(3).join(" ")}`;
                }

                const venue = b.venue_name || b.event_location || b.event_area || "Venue TBD";
                const locationArea = [
                  b.event_area,
                  b.city || b.event_location,
                ].filter(Boolean).join(", ") || b.event_location || "Location TBD";

                const duration = b.performance_duration
                  ? b.performance_duration.toLowerCase().includes("hour")
                    ? b.performance_duration
                    : `${b.performance_duration} Hours`
                  : "Not Specified";

                const audience = b.expected_audience_size ? String(b.expected_audience_size) : "Not Specified";

                const offeredPrice = b.customer_budget || b.agreed_price || "0.00";
                const agreedFee = b.agreed_price || b.customer_budget || "0.00";

                let payBadge = {
                  text: "Payment Pending",
                  isPending: true,
                };
                if (b.status === "completed") {
                  payBadge = { text: "Escrow Completed", isPending: false };
                } else if (b.payment?.status === "held_in_escrow") {
                  payBadge = { text: "Escrow Held", isPending: false };
                } else if (b.payment?.status === "completed" || b.payment?.status === "success") {
                  payBadge = { text: "Escrow Completed", isPending: false };
                } else if (b.payment?.status === "refunded") {
                  payBadge = { text: "Refunded", isPending: true };
                } else if (b.status === "accepted") {
                  payBadge = { text: "Awaiting Escrow Deposit", isPending: true };
                }

                // Stepper Calculations
                const isDeclined = b.status === "rejected" || b.status === "declined";
                const step1Done = true;
                const step1Date = b.created_at || "Recent";

                const step2Done = ["accepted", "completed", "rejected", "declined"].includes(b.status);
                const step2Date = b.accepted_at || (["accepted", "completed"].includes(b.status) ? b.created_at : "Pending");

                const step3Done = Boolean(
                  b.payment?.status === "success" ||
                  b.payment?.status === "completed" ||
                  b.payment?.status === "held_in_escrow" ||
                  b.status === "completed"
                );
                const step3Date = b.payment?.date
                  ? b.payment.date.split(" ").slice(0, 3).join(" ")
                  : (b.status === "completed" ? (b.accepted_at || b.created_at) : "Pending");

                const step4Done = b.status === "completed";
                const step4Date = b.status === "completed"
                  ? (b.event_date ? b.event_date.split(" ").slice(0, 3).join(" ") : "Completed")
                  : "Pending";

                let progressWidth = "0%";
                if (step4Done) {
                  progressWidth = "100%";
                } else if (step3Done) {
                  progressWidth = "66.6%";
                } else if (step2Done && !isDeclined) {
                  progressWidth = "33.3%";
                }

                return (
                  <>
                    {/* 1. Booking Summary */}
                    <div className="artist-detail-summary-card">
                      <div>
                        <h2 className="artist-detail-summary-title">
                          {b.event_type || "Event"}
                        </h2>
                        <p className="artist-detail-summary-ref">
                          Reference Code: BK-{b.id} • Requested on {b.created_at || "Recent"}
                        </p>
                      </div>
                      <span className={`artist-req-status-pill ${summaryBadge.className}`}>
                        {summaryBadge.label}
                      </span>
                    </div>

                    {/* Live Event Countdown Banner when payment is received and booking is active */}
                    {step3Done && !isDeclined && b.status !== "cancelled" && (b.event_date_iso || b.event_date) && (
                      <EventCountdown
                        eventDate={b.event_date_iso || b.event_date}
                        variant="banner"
                        title="Upcoming Event Countdown"
                      />
                    )}

                    {/* 2. Middle 2-Column Grid */}
                    <div className="artist-detail-grid">
                      {/* Left Column */}
                      <div className="artist-detail-left-col">
                        {/* Event Details */}
                        <div className="artist-detail-card">
                          <h3 className="artist-detail-card-title">Event Details</h3>
                          <div className="artist-detail-rows">
                            <div className="artist-detail-row">
                              <span className="artist-detail-row-lbl">
                                <Calendar size={14} />
                                Event Date & Time
                              </span>
                              <span className="artist-detail-row-val">{eventDateTime}</span>
                            </div>

                            <div className="artist-detail-row">
                              <span className="artist-detail-row-lbl">
                                <MapPin size={14} />
                                Event Venue
                              </span>
                              <span className="artist-detail-row-val" style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <span>{venue}</span>
                                {venue && venue !== "Venue not specified" && (
                                  <a
                                    href={getGmapsUrl(venue, b.google_maps_url, b.latitude, b.longitude)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="artist-info-action-btn map"
                                    title="Open Venue in Google Maps"
                                  >
                                    <ExternalLink size={11} /> See Location
                                  </a>
                                )}
                              </span>
                            </div>

                            <div className="artist-detail-row">
                              <span className="artist-detail-row-lbl">
                                <MapPin size={14} />
                                Location / Area
                              </span>
                              <span className="artist-detail-row-val" style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <span>{locationArea}</span>
                                {locationArea && locationArea !== "Location not specified" && (
                                  <a
                                    href={getGmapsUrl(locationArea, null, b.area_latitude, b.area_longitude)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="artist-info-action-btn map"
                                    title="Open Location in Google Maps"
                                  >
                                    <ExternalLink size={11} /> See Location
                                  </a>
                                )}
                              </span>
                            </div>

                            <div className="artist-detail-row">
                              <span className="artist-detail-row-lbl">
                                <Clock size={14} />
                                Performance Duration
                              </span>
                              <span className="artist-detail-row-val">{duration}</span>
                            </div>

                            <div className="artist-detail-row">
                              <span className="artist-detail-row-lbl">
                                <Users size={14} />
                                Expected Audience
                              </span>
                              <span className="artist-detail-row-val">{audience}</span>
                            </div>
                          </div>
                        </div>

                        {/* Host's Event Notes & Special Inquiries */}
                        <div className="artist-detail-card">
                          <h3 className="artist-detail-card-title">
                            <FileText size={16} />
                            Host&apos;s Event Notes & Special Inquiries
                          </h3>
                          <div className="artist-detail-notes-box">
                            {b.message ? (
                              b.message
                            ) : (
                              <span style={{ color: "#777777", fontStyle: "italic" }}>
                                No special instructions submitted by host.
                              </span>
                            )}
                          </div>
                          {b.response_message && (
                            <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#FF5722", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
                                Artist Response Note
                              </div>
                              <div style={{ fontSize: "0.95rem", color: "#E0E0E0" }}>
                                {b.response_message}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="artist-detail-right-col">
                        {/* Host Information */}
                        <div className="artist-detail-card">
                          <h3 className="artist-detail-card-title">Host Information</h3>
                          <div className="artist-host-name">
                            {b.customer_name || "Host"}
                          </div>
                          <div className="artist-host-info-list">
                            <div className="artist-host-row">
                              <div className="artist-host-row-left">
                                <Mail size={14} style={{ color: "#8E8E93", flexShrink: 0 }} />
                                {b.customer_email ? (
                                  <span className="artist-host-text" title={b.customer_email}>
                                    {b.customer_email}
                                  </span>
                                ) : (
                                  <span style={{ color: "#777777" }}>Not Provided</span>
                                )}
                              </div>
                              {b.customer_email && (
                                <a
                                  href={getGmailUrl(
                                    b.customer_email,
                                    b.customer_name,
                                    b.id,
                                    b.event_type,
                                    artist.stage_name || user?.username,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="artist-info-action-btn mail"
                                  title="Compose email via Gmail"
                                >
                                  <Mail size={12} /> Mail
                                </a>
                              )}
                            </div>

                            <div className="artist-host-row">
                              <div className="artist-host-row-left">
                                <Phone size={14} style={{ color: "#8E8E93", flexShrink: 0 }} />
                                {b.customer_phone ? (
                                  <span className="artist-host-text">
                                    {b.customer_phone}
                                  </span>
                                ) : (
                                  <span style={{ color: "#777777" }}>Not Provided</span>
                                )}
                              </div>
                              {b.customer_phone && (
                                <div style={{ display: "inline-flex", gap: "6px", flexShrink: 0 }}>
                                  <a
                                    href={`tel:${String(b.customer_phone).replace(/\s+/g, "")}`}
                                    className="artist-info-action-btn call"
                                    title="Call Host"
                                  >
                                    <PhoneCall size={12} /> Call
                                  </a>
                                  <a
                                    href={getWhatsAppUrl(
                                      b.customer_phone,
                                      b.customer_name,
                                      b.id,
                                      b.event_type,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="artist-info-action-btn whatsapp"
                                    title="Chat on WhatsApp"
                                  >
                                    <MessageCircle size={12} /> WhatsApp
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="artist-host-row">
                              <div className="artist-host-row-left">
                                <MapPin size={14} style={{ color: "#8E8E93", flexShrink: 0 }} />
                                {b.customer_location || b.city ? (
                                  <span className="artist-host-text" title={b.customer_location || b.city}>
                                    {b.customer_location || b.city}
                                  </span>
                                ) : (
                                  <span style={{ color: "#777777" }}>Not Provided</span>
                                )}
                              </div>
                              {(b.customer_location || b.city) && (
                                <a
                                  href={getGmapsUrl(b.customer_location || b.city)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="artist-info-action-btn map"
                                  title="Open in Google Maps"
                                >
                                  <ExternalLink size={12} /> See Location
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Offer & Payment */}
                        <div className="artist-detail-card">
                          <h3 className="artist-detail-card-title">Offer & Payment</h3>
                          <div className="artist-pay-rows">
                            <div className="artist-pay-row">
                              <span className="artist-pay-lbl">Offered Price</span>
                              <span className="artist-pay-val">₹{formatPrice(offeredPrice)}</span>
                            </div>
                            <div className="artist-pay-row">
                              <span className="artist-pay-lbl">Agreed Performance Fee</span>
                              <span className="artist-pay-val orange">₹{formatPrice(agreedFee)}</span>
                            </div>
                            <div className="artist-pay-row">
                              <span className="artist-pay-lbl">Payment Status</span>
                              <span className={`artist-pay-badge ${payBadge.isPending ? "pending" : ""}`}>
                                {payBadge.text}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Booking Timeline */}
                    <div className="artist-timeline-card">
                      <h3 className="artist-timeline-title">Booking Timeline</h3>
                      <div className="artist-timeline-stepper" ref={timelineStepperRef}>
                        <div className="artist-timeline-track">
                          <div
                            ref={timelineTrackRef}
                            className="artist-timeline-track-progress"
                            style={{ width: progressWidth }}
                          />
                        </div>

                        {/* Step 1: Request Received */}
                        <div className={`artist-timeline-step ${step1Done ? "completed" : ""}`}>
                          <div className="artist-timeline-dot">
                            <Check size={16} strokeWidth={2.5} />
                          </div>
                          <span className="artist-timeline-step-label">Request Received</span>
                          <span className="artist-timeline-step-date">{step1Date}</span>
                        </div>

                        {/* Step 2: Accepted or Declined */}
                        <div className={`artist-timeline-step ${isDeclined ? "declined" : (step2Done ? "completed" : "")}`}>
                          <div className="artist-timeline-dot">
                            {isDeclined ? "✕" : (step2Done ? <Check size={16} strokeWidth={2.5} /> : "2")}
                          </div>
                          <span className="artist-timeline-step-label">
                            {isDeclined ? "Declined" : "Accepted"}
                          </span>
                          <span className="artist-timeline-step-date">{step2Date}</span>
                        </div>

                        {/* Step 3: Payment Completed */}
                        <div className={`artist-timeline-step ${step3Done ? "completed" : ""}`}>
                          <div className="artist-timeline-dot">
                            {step3Done ? <Check size={16} strokeWidth={2.5} /> : "3"}
                          </div>
                          <span className="artist-timeline-step-label">Payment Completed</span>
                          <span className="artist-timeline-step-date">{step3Date}</span>
                        </div>

                        {/* Step 4: Completed */}
                        <div className={`artist-timeline-step ${step4Done ? "completed" : ""}`}>
                          <div className="artist-timeline-dot">
                            {step4Done ? <Check size={16} strokeWidth={2.5} /> : "4"}
                          </div>
                          <span className="artist-timeline-step-label">Completed</span>
                          <span className="artist-timeline-step-date">{step4Date}</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. Actions Bottom Bar */}
                    <div className="artist-detail-bottom-bar">
                      <button
                        type="button"
                        className="artist-detail-btn"
                        onClick={() => window.print()}
                      >
                        <Printer size={15} />
                        Print Event Specification
                      </button>

                      {/* Contextual actions */}
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        {b.status === "pending" && (
                          <>
                            <button
                              type="button"
                              className="cd-btn-primary"
                              onClick={() => openRespondModal("accept", b)}
                            >
                              Accept Booking Request
                            </button>
                            <button
                              type="button"
                              className="cd-btn-secondary"
                              style={{ borderColor: "#EF5350", color: "#EF5350" }}
                              onClick={() => openRespondModal("reject", b)}
                            >
                              Decline Request
                            </button>
                          </>
                        )}

                        {b.status === "accepted" && (
                          <>
                            <button
                              type="button"
                              className="cd-btn-primary"
                              onClick={() => handleCompleteBooking(b.id)}
                            >
                              Mark Completed
                            </button>
                            <button
                              type="button"
                              className="cd-btn-secondary"
                              style={{ borderColor: "#EF5350", color: "#EF5350" }}
                              onClick={() => openArtistCancelModal(b)}
                            >
                              Cancel Booking
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* =================================================================
              TAB 7: BOOKING CALENDAR PAGE (REDESIGNED)
              ================================================================= */}
          {activeTab === "calendar" && (
            <div className="artist-cal-view">
              {/* Header */}
              <div className="artist-cal-header">
                <div>
                  <h1 className="artist-cal-title">Booking Calendar</h1>
                  <p className="artist-cal-desc">
                    Your confirmed performances and schedule.
                  </p>
                </div>
                <div>
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

              {/* Summary Cards Row */}
              <div className="artist-cal-stats-row">
                <div className="artist-cal-stats-group">
                  <div
                    className={`artist-cal-stat-card ${calendarFilter === "upcoming" ? "active" : ""}`}
                    onClick={() => setCalendarFilter("upcoming")}
                    role="button"
                    tabIndex={0}
                    title="View Upcoming Shows"
                  >
                    <div className="artist-cal-stat-lbl">Upcoming Shows</div>
                    <div className="artist-cal-stat-val">{upcomingShows.length}</div>
                  </div>

                  <div
                    className={`artist-cal-stat-card ${calendarFilter === "completed" ? "active" : ""}`}
                    onClick={() => setCalendarFilter("completed")}
                    role="button"
                    tabIndex={0}
                    title="View Completed Shows"
                  >
                    <div className="artist-cal-stat-lbl">Completed Shows</div>
                    <div className="artist-cal-stat-val">{completedShows.length}</div>
                  </div>

                  <div
                    className="artist-cal-stat-card"
                    onClick={() => switchTab("availability")}
                    role="button"
                    tabIndex={0}
                    title="Manage Blocked Dates in Availability"
                  >
                    <div className="artist-cal-stat-lbl">Blocked Dates</div>
                    <div className="artist-cal-stat-val">{blockedDatesList.length}</div>
                  </div>
                </div>

                <button
                  type="button"
                  className="artist-cal-manage-btn"
                  onClick={() => switchTab("availability")}
                >
                  Manage Blocked Dates
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="artist-cal-filter-tabs">
                <button
                  type="button"
                  className={`artist-cal-tab-btn ${calendarFilter === "upcoming" ? "active" : ""}`}
                  onClick={() => setCalendarFilter("upcoming")}
                >
                  Upcoming ({upcomingShows.length})
                </button>
                <button
                  type="button"
                  className={`artist-cal-tab-btn ${calendarFilter === "completed" ? "active" : ""}`}
                  onClick={() => setCalendarFilter("completed")}
                >
                  Completed ({completedShows.length})
                </button>
                <button
                  type="button"
                  className={`artist-cal-tab-btn ${calendarFilter === "all" ? "active" : ""}`}
                  onClick={() => setCalendarFilter("all")}
                >
                  All Shows ({allShows.length})
                </button>
              </div>

              {/* Performance List or Empty State */}
              {displayedShows.length === 0 ? (
                <div className="artist-cal-empty">
                  <p className="artist-cal-empty-title">
                    {calendarFilter === "upcoming"
                      ? "No upcoming shows"
                      : calendarFilter === "completed"
                      ? "No completed shows"
                      : "No shows found"}
                  </p>
                  <p className="artist-cal-empty-text">
                    {calendarFilter === "upcoming"
                      ? "You have no confirmed performances scheduled on your calendar."
                      : calendarFilter === "completed"
                      ? "You haven't marked any performances as completed yet."
                      : "No confirmed or completed performances scheduled on your calendar."}
                  </p>
                </div>
              ) : (
                <div className="artist-cal-list">
                  {displayedShows.map((perf) => {
                    const { day, month, year, timeStr } = formatShowDate(perf);
                    const venueStr =
                      perf.venue_name || perf.event_location || perf.city || "Venue not specified";

                    return (
                      <div key={perf.id} className="artist-cal-card">
                        {/* Date Badge */}
                        <div className="artist-cal-date-badge">
                          <span className="artist-cal-date-day">{day}</span>
                          <span className="artist-cal-date-month">{month}</span>
                          <span className="artist-cal-date-year">{year}</span>
                        </div>

                        {/* Center Info */}
                        <div className="artist-cal-info">
                          <h3 className="artist-cal-name">
                            {perf.event_type || perf.event_name || "Performance"}
                          </h3>
                          <div className="artist-cal-meta-row">
                            <span>
                              Host:{" "}
                              <strong className="artist-cal-highlight">
                                {perf.customer_name || "Host"}
                              </strong>
                            </span>
                            <span className="artist-cal-sep">|</span>
                            <span>
                              Venue:{" "}
                              <span className="artist-cal-highlight">{venueStr}</span>
                            </span>
                          </div>
                          <div className="artist-cal-meta-row">
                            <span>
                              Event Time:{" "}
                              <span className="artist-cal-highlight">{timeStr}</span>
                            </span>
                            <span className="artist-cal-sep">|</span>
                            <span>
                              Agreed Fee:{" "}
                              <strong className="artist-cal-fee">
                                ₹{formatPrice(perf.agreed_price)}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="artist-cal-actions">
                          <button
                            type="button"
                            className="artist-cal-btn-details"
                            onClick={() => {
                              setSelectedBooking(perf);
                              switchTab("booking-detail");
                            }}
                          >
                            Details
                          </button>
                          {perf.status === "accepted" ? (
                            <button
                              type="button"
                              className="artist-cal-btn-complete"
                              onClick={() =>
                                setCompleteModal({
                                  open: true,
                                  booking: perf,
                                  loading: false,
                                })
                              }
                            >
                              Mark Completed
                            </button>
                          ) : perf.status === "completed" ? (
                            <span className="artist-cal-status-completed">
                              Completed
                            </span>
                          ) : null}
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
                            fontSize: "0.85rem",
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
              TAB 9: PAYMENT & EARNINGS PAGE (REDESIGNED)
              ================================================================= */}
          {activeTab === "earnings" && (
            <div className="artist-pay-view">
              {/* Header */}
              <div className="artist-pay-header">
                <div>
                  <h1 className="artist-pay-title">Payments & Earnings</h1>
                  <p className="artist-pay-desc">
                    Track your earnings, payouts and transaction history.
                  </p>
                </div>
                <div>
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

              {/* 1. Summary Cards (Row of 4) */}
              <div className="artist-pay-stats-grid">
                <div className="artist-pay-stat-card green-accent">
                  <div className="artist-pay-stat-lbl">Total Earnings</div>
                  <div className="artist-pay-stat-val green">
                    ₹{formatPrice(stats.total_earnings ?? netArtistEarnings)}
                  </div>
                  <div className="artist-pay-stat-sub">Across all bookings</div>
                </div>

                <div className="artist-pay-stat-card">
                  <div className="artist-pay-stat-lbl">Completed Payouts</div>
                  <div className="artist-pay-stat-val white">
                    ₹{formatPrice(stats.completed_earnings ?? "0.00")}
                  </div>
                  <div className="artist-pay-stat-sub">Transferred to your account</div>
                </div>

                <div className="artist-pay-stat-card orange-accent">
                  <div className="artist-pay-stat-lbl">Pending Payouts</div>
                  <div className="artist-pay-stat-val orange">
                    ₹{formatPrice(stats.pending_earnings ?? netArtistEarnings)}
                  </div>
                  <div className="artist-pay-stat-sub">In escrow for upcoming shows</div>
                </div>

                <div className="artist-pay-stat-card">
                  <div className="artist-pay-stat-lbl">Total Bookings</div>
                  <div className="artist-pay-stat-val white">
                    {bookings.length}
                  </div>
                  <div className="artist-pay-stat-sub">Paid and unpaid</div>
                </div>
              </div>

              {/* 2. Middle Section: Earnings Breakdown & Escrow Protection */}
              <div className="artist-pay-middle-grid">
                {/* Earnings Breakdown */}
                <div className="artist-pay-card">
                  <h3 className="artist-pay-card-title">Earnings Breakdown</h3>
                  <div className="artist-pay-breakdown-list">
                    <div className="artist-pay-breakdown-row">
                      <span>Gross Booking Amount</span>
                      <span className="artist-pay-breakdown-val">
                        ₹{formatPrice(grossBookingAmount)}
                      </span>
                    </div>

                    <div className="artist-pay-breakdown-row">
                      <span>Platform Commission (8%)</span>
                      <span className="artist-pay-breakdown-val">
                        - ₹{formatPrice(platformCommission)}
                      </span>
                    </div>

                    <div className="artist-pay-divider" />

                    <div className="artist-pay-breakdown-total">
                      <span className="artist-pay-total-lbl">Your Earnings</span>
                      <span className="artist-pay-total-val">
                        ₹{formatPrice(netArtistEarnings || stats.total_earnings)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Escrow Protection & Terms */}
                <div className="artist-pay-card">
                  <h3 className="artist-pay-card-title">Escrow Protection & Payouts</h3>
                  <div className="artist-pay-escrow-list">
                    <div className="artist-pay-escrow-item secure">
                      <span className="artist-pay-escrow-dot" />
                      <div>
                        <div className="artist-pay-escrow-heading">100% Escrow Protection</div>
                        <p className="artist-pay-escrow-desc">
                          Client booking funds are charged and deposited safely in TalentHire escrow upon booking confirmation.
                        </p>
                      </div>
                    </div>

                    <div className="artist-pay-escrow-item">
                      <span className="artist-pay-escrow-dot" />
                      <div>
                        <div className="artist-pay-escrow-heading">Automated Settlement</div>
                        <p className="artist-pay-escrow-desc">
                          Payouts are released directly to your account immediately after show delivery and completion verification.
                        </p>
                      </div>
                    </div>

                    <div className="artist-pay-escrow-item">
                      <span className="artist-pay-escrow-dot" />
                      <div>
                        <div className="artist-pay-escrow-heading">Transparent Pricing</div>
                        <p className="artist-pay-escrow-desc">
                          Platform commission is fixed at 8%, covering payment gateway charges, contracts, and artist guarantee.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Payment & Transaction History Card */}
              <div className="artist-pay-table-card">
                <div className="artist-pay-tx-top">
                  <h3 className="artist-pay-card-title" style={{ margin: 0 }}>
                    Payment & Transaction History
                  </h3>
                  <div className="artist-pay-tx-controls">
                    {/* Status filter */}
                    <select
                      className="artist-pay-filter-select"
                      value={payStatusFilter}
                      onChange={(e) => {
                        setPayStatusFilter(e.target.value);
                        setPayPage(1);
                      }}
                      aria-label="Filter by payment status"
                    >
                      <option value="all">All Transactions</option>
                      <option value="pending">Pending</option>
                      <option value="success">Completed / Success</option>
                      <option value="refunded">Refunded</option>
                      <option value="failed">Failed</option>
                    </select>

                    {/* Date filter */}
                    <select
                      className="artist-pay-filter-select"
                      value={payDateFilter}
                      onChange={(e) => {
                        setPayDateFilter(e.target.value);
                        setPayPage(1);
                      }}
                      aria-label="Filter by date range"
                    >
                      <option value="all">All Time</option>
                      <option value="this_month">This Month</option>
                      <option value="last_30_days">Last 30 Days</option>
                      <option value="this_year">This Year</option>
                    </select>

                    <button
                      type="button"
                      className="artist-pay-btn-print"
                      onClick={() => window.print()}
                      title="Print Financial Statement"
                    >
                      Print Statement
                    </button>
                  </div>
                </div>

                {paginatedPayments.length === 0 ? (
                  <div className="artist-pay-empty-box">
                    <p className="artist-pay-empty-title">No Transactions Recorded</p>
                    <p className="artist-pay-empty-text">
                      {filteredPayments.length === 0 && (payStatusFilter !== "all" || payDateFilter !== "all")
                        ? "No transactions match your selected filter criteria."
                        : "Transactions will appear as booking agreements and payouts are processed."}
                    </p>
                  </div>
                ) : (
                  <div className="artist-pay-table-wrap">
                    <table className="artist-pay-table">
                      <thead>
                        <tr>
                          <th>Transaction ID</th>
                          <th>Booking / Event</th>
                          <th>Customer</th>
                          <th>Date & Time</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPayments.map((pay) => (
                          <tr key={pay.id}>
                            <td>
                              <span className="artist-pay-tx-id">
                                {pay.transaction_id || `PAY-${String(pay.id).padStart(4, "0")}`}
                              </span>
                            </td>
                            <td>
                              <div className="artist-pay-event-cell">
                                <span className="artist-pay-event-title">
                                  {pay.event_type || "Booking"}
                                </span>
                                <span className="artist-pay-booking-ref">
                                  {pay.booking_reference || `BK-${pay.booking_id}`}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="artist-pay-customer">
                                {pay.customer_name}
                              </span>
                            </td>
                            <td>
                              <span className="artist-pay-datetime">
                                {pay.date}
                              </span>
                            </td>
                            <td>
                              <span className="artist-pay-amount">
                                ₹{formatPrice(pay.artist_amount || pay.amount)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`artist-pay-pill ${
                                  pay.status === "success"
                                    ? "success"
                                    : pay.status === "pending"
                                    ? "pending"
                                    : pay.status?.includes("refund")
                                    ? "refunded"
                                    : "failed"
                                }`}
                              >
                                {pay.status === "success"
                                  ? "Completed"
                                  : pay.status === "pending"
                                  ? "Pending"
                                  : formatBookingStatus(pay.status)}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="artist-pay-btn-receipt"
                                onClick={() => setReceiptItem(pay)}
                                title="View transaction receipt"
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

                {/* Footer with counts and pagination */}
                {filteredPayments.length > 0 && (
                  <div className="artist-pay-footer">
                    <span className="artist-pay-count-text">
                      Showing {paginatedPayments.length} of {filteredPayments.length} {filteredPayments.length === 1 ? "transaction" : "transactions"}
                    </span>

                    {payTotalPages > 1 && (
                      <div className="artist-pay-pagination">
                        <button
                          type="button"
                          className="artist-pay-page-nav-btn"
                          disabled={currentPayPage <= 1}
                          onClick={() => setPayPage((p) => Math.max(1, p - 1))}
                        >
                          &lt; Previous
                        </button>

                        {Array.from({ length: payTotalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            className={`artist-pay-page-number ${page === currentPayPage ? "active" : ""}`}
                            onClick={() => setPayPage(page)}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          type="button"
                          className="artist-pay-page-nav-btn"
                          disabled={currentPayPage >= payTotalPages}
                          onClick={() => setPayPage((p) => Math.min(payTotalPages, p + 1))}
                        >
                          Next &gt;
                        </button>
                      </div>
                    )}
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
              TAB 12: AVAILABILITY MANAGEMENT PAGE (REDESIGNED)
              ================================================================= */}
          {activeTab === "availability" && (
            <div className="artist-avail-view">
              {/* Header */}
              <div className="artist-avail-header">
                <div>
                  <h1 className="artist-avail-title">Availability Management</h1>
                  <p className="artist-avail-desc">
                    Set your available and unavailable dates to manage bookings.
                  </p>
                </div>
                <div>
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

              {/* 1. Summary Cards Row */}
              <div className="artist-avail-stats-row">
                <div className="artist-avail-stat-card active">
                  <div className="artist-avail-stat-lbl">Upcoming Shows</div>
                  <div className="artist-avail-stat-val">{upcomingShows.length}</div>
                </div>

                <div className="artist-avail-stat-card">
                  <div className="artist-avail-stat-lbl">Blocked Dates</div>
                  <div className="artist-avail-stat-val">{blockedDatesList.length}</div>
                </div>

                <div className="artist-avail-stat-card">
                  <div className="artist-avail-stat-lbl">Available Dates (This Month)</div>
                  <div className="artist-avail-stat-val">{availableDaysThisMonthCount}</div>
                </div>
              </div>

              {/* 2. Middle Grid: Monthly Calendar & Set Date Availability */}
              <div className="artist-avail-middle-grid">
                {/* Left Column: Monthly Calendar */}
                <div className="artist-avail-cal-card">
                  {/* Month Navigation */}
                  <div className="artist-avail-cal-nav">
                    <button
                      type="button"
                      className="artist-avail-cal-nav-btn"
                      onClick={handleAvailPrevMonth}
                      aria-label="Previous Month"
                      title="Previous Month"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="artist-avail-cal-month-title">
                      {availMonthHeaderTitle}
                    </span>
                    <button
                      type="button"
                      className="artist-avail-cal-nav-btn"
                      onClick={handleAvailNextMonth}
                      aria-label="Next Month"
                      title="Next Month"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Day of Week Headers */}
                  <div className="artist-avail-cal-dow-row">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dow) => (
                      <div key={dow} className="artist-avail-cal-dow">
                        {dow}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days Grid */}
                  <div className="artist-avail-cal-days-grid">
                    {availCalendarCells.map((cell) => {
                      if (cell.empty) {
                        return (
                          <div
                            key={cell.key}
                            className="artist-avail-cal-cell empty"
                          />
                        );
                      }
                      const cellClass = [
                        "artist-avail-cal-cell",
                        cell.isBooked
                          ? "booked"
                          : cell.isBlocked
                          ? "blocked"
                          : "available",
                        cell.isSelected ? "selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <button
                          key={cell.key}
                          type="button"
                          className={cellClass}
                          onClick={() => handleSelectCalendarDate(cell)}
                          title={
                            cell.isBooked
                              ? `Booked: ${cell.booking?.event_type || "Confirmed Show"}`
                              : cell.isBlocked
                              ? `Blocked: ${cell.override?.reason || "Unavailable"}`
                              : `Available (Click to select ${cell.dateStr})`
                          }
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="artist-avail-cal-legend">
                    <div className="artist-avail-legend-item">
                      <span className="artist-avail-legend-dot booked" />
                      <span>Booked / Confirmed</span>
                    </div>
                    <div className="artist-avail-legend-item">
                      <span className="artist-avail-legend-dot blocked" />
                      <span>Unavailable / Blocked</span>
                    </div>
                    <div className="artist-avail-legend-item">
                      <span className="artist-avail-legend-dot available" />
                      <span>Available</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Set Date Availability Form */}
                <div className="artist-avail-form-card">
                  <h3 className="artist-avail-card-title">Set Date Availability</h3>
                  <form onSubmit={handleSaveAvailability} className="artist-avail-form">
                    <div className="artist-avail-form-row">
                      <div className="artist-avail-form-group">
                        <label className="artist-avail-label" htmlFor="avail_date_picker">
                          Date *
                        </label>
                        <input
                          id="avail_date_picker"
                          type="date"
                          className="artist-avail-input"
                          value={availForm.date}
                          onChange={(e) =>
                            setAvailForm((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      <div className="artist-avail-form-group">
                        <label className="artist-avail-label" htmlFor="avail_status_selector">
                          Status *
                        </label>
                        <select
                          id="avail_status_selector"
                          className="artist-avail-select"
                          value={availForm.is_available ? "available" : "unavailable"}
                          onChange={(e) =>
                            setAvailForm((prev) => ({
                              ...prev,
                              is_available: e.target.value === "available",
                            }))
                          }
                        >
                          <option value="unavailable">Unavailable / Blocked Date</option>
                          <option value="available">Available</option>
                        </select>
                      </div>
                    </div>

                    <div className="artist-avail-form-group">
                      <label className="artist-avail-label" htmlFor="avail_reason_input">
                        Reason / Note (Optional)
                      </label>
                      <input
                        id="avail_reason_input"
                        type="text"
                        className="artist-avail-input"
                        placeholder="e.g. Personal commitment, Out of town, Private event"
                        value={availForm.reason}
                        onChange={(e) =>
                          setAvailForm((prev) => ({
                            ...prev,
                            reason: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* Conflict Alert if date is booked */}
                    {availForm.date && confirmedBookingsMap[availForm.date] && (
                      <div className="artist-avail-conflict-alert">
                        Cannot block this date: Confirmed booking (
                        <strong>{confirmedBookingsMap[availForm.date].event_type || "Event"}</strong>)
                        is already scheduled. Confirmed bookings take precedence.
                      </div>
                    )}

                    {/* Notice if editing existing override */}
                    {availForm.date &&
                      !confirmedBookingsMap[availForm.date] &&
                      blockedDatesMap[availForm.date] && (
                        <div className="artist-avail-info-alert">
                          Currently configured as blocked ({blockedDatesMap[availForm.date].reason || "Unavailable"}).
                          Updating this form will modify or unblock this date.
                        </div>
                      )}

                    <div className="artist-avail-form-actions">
                      <button
                        type="submit"
                        className="artist-avail-submit-btn"
                        disabled={
                          availSaving ||
                          (Boolean(availForm.date && confirmedBookingsMap[availForm.date]) &&
                            !availForm.is_available)
                        }
                      >
                        {availSaving ? "Saving..." : "Save Availability"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* 3. Bottom Table: Configured Unavailable Dates */}
              <div className="artist-avail-table-card">
                <h3 className="artist-avail-card-title">Configured Unavailable Dates</h3>
                {blockedDatesList.length === 0 ? (
                  <div className="artist-avail-empty-box">
                    <p className="artist-avail-empty-title">No blocked dates configured</p>
                    <p className="artist-avail-empty-text">
                      All calendar dates without confirmed bookings are open for inquiries.
                    </p>
                  </div>
                ) : (
                  <div className="artist-avail-table-wrap">
                    <table className="artist-avail-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Reason / Note</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockedDatesList.map((av) => (
                          <tr
                            key={av.id}
                            onClick={() => handleEditBlockedRow(av)}
                            style={{ cursor: "pointer" }}
                            title="Click to edit in availability form"
                          >
                            <td className="artist-avail-td-date">
                              {av.date_formatted || formatBlockedDate(av.date)}
                            </td>
                            <td>
                              <span className="artist-avail-status-blocked">
                                Unavailable
                              </span>
                            </td>
                            <td className="artist-avail-td-reason">
                              {av.reason || "—"}
                            </td>
                            <td
                              style={{ textAlign: "right" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="artist-avail-btn-remove"
                                onClick={() => handleDeleteAvailability(av.id)}
                                title="Remove blocked date"
                              >
                                Remove
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
              TAB 11: ARTIST HELP & SUPPORT PAGE
              ================================================================= */}
          {activeTab === "support" && (
            <ArtistSupportTab onUnreadChange={setUnreadSupportCount} />
          )}

          {/* =================================================================
              TAB 12: SMART COLLABORATION DISCOVERY (PHASE 3)
              ================================================================= */}
          {activeTab === "collaborations" && (
            <ArtistCollaborationTab
              artistProfile={data?.artist}
              navigate={navigate}
              onSwitchTab={switchTab}
            />
          )}
        </main>
      </div>

      {/* =====================================================================
          MODAL: RESPOND TO RESCHEDULING REQUEST
          ===================================================================== */}
      {rescheduleModal.open && rescheduleModal.request && (
        <div
          className="cd-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setRescheduleModal({ open: false, request: null, booking: null })
          }
        >
          <div
            className="cd-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">Customer Rescheduling Request</h3>
              <button
                type="button"
                className="cd-modal-close"
                onClick={() =>
                  setRescheduleModal({ open: false, request: null, booking: null })
                }
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="cd-modal-body">
              <p
                style={{
                  color: "#D4D4D4",
                  fontSize: "0.92rem",
                  margin: "0 0 16px 0",
                }}
              >
                <strong>{rescheduleModal.request.customer_name}</strong> requested
                a date change for{" "}
                <strong>{rescheduleModal.request.event_type}</strong>.
              </p>

              <div
                className="cd-reschedule-dates-grid"
                style={{ marginBottom: "16px" }}
              >
                <div className="cd-reschedule-date-box">
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#8E8E93",
                      textTransform: "uppercase",
                    }}
                  >
                    Current Date
                  </span>
                  <strong style={{ color: "#FFFFFF", fontSize: "0.98rem" }}>
                    {rescheduleModal.request.original_event_date_formatted ||
                      rescheduleModal.request.original_event_date}
                  </strong>
                </div>
                <div className="cd-reschedule-arrow">➔</div>
                <div className="cd-reschedule-date-box">
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#FF5722",
                      textTransform: "uppercase",
                    }}
                  >
                    Proposed New Date
                  </span>
                  <strong style={{ color: "#FF5722", fontSize: "0.98rem" }}>
                    {rescheduleModal.request.new_event_date_formatted ||
                      rescheduleModal.request.new_event_date}
                  </strong>
                </div>
              </div>

              {rescheduleModal.request.reason && (
                <div
                  style={{
                    background: "#1C1C1E",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    fontSize: "0.88rem",
                    color: "#B0B0B0",
                    marginBottom: "16px",
                  }}
                >
                  <strong style={{ color: "#FFFFFF" }}>Host Note:</strong> "
                  {rescheduleModal.request.reason}"
                </div>
              )}
            </div>

            <div className="cd-modal-actions">
              <button
                type="button"
                className="cd-btn-primary"
                disabled={
                  rescheduleActionLoadingId ===
                  rescheduleModal.request.request_id
                }
                onClick={async () => {
                  await handleApproveReschedule(rescheduleModal.request);
                  setRescheduleModal({
                    open: false,
                    request: null,
                    booking: null,
                  });
                }}
              >
                {rescheduleActionLoadingId ===
                rescheduleModal.request.request_id
                  ? "Approving..."
                  : "Approve New Date"}
              </button>
              <button
                type="button"
                className="cd-btn-secondary"
                style={{ borderColor: "#EF5350", color: "#EF5350" }}
                disabled={
                  rescheduleActionLoadingId ===
                  rescheduleModal.request.request_id
                }
                onClick={() => {
                  const req = rescheduleModal.request;
                  setRescheduleModal({
                    open: false,
                    request: null,
                    booking: null,
                  });
                  setRejectNoteModal({ open: true, request: req, reason: "" });
                }}
              >
                Decline Request
              </button>
              <button
                type="button"
                className="cd-btn-secondary"
                onClick={() =>
                  setRescheduleModal({
                    open: false,
                    request: null,
                    booking: null,
                  })
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
          MODAL: ADD / EDIT PORTFOLIO ITEM
          ===================================================================== */}
      {portfolioModal.open && (
        <div className="cd-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cd-modal-card" style={{ maxWidth: "560px" }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">
                {portfolioModal.mode === "edit"
                  ? "Edit Portfolio Item"
                  : "Add Portfolio Item"}
              </h3>
              <button
                type="button"
                className="cd-modal-close"
                disabled={portfolioModal.saving}
                onClick={() =>
                  setPortfolioModal((p) => ({ ...p, open: false, error: "" }))
                }
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePortfolioItem} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
              <div className="cd-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px", flex: "1 1 auto", minHeight: 0, overflowY: "auto", paddingRight: "6px" }}>
                {portfolioModal.error && (
                  <div
                    className="cd-alert cd-alert-error"
                    role="alert"
                    style={{ marginBottom: "8px" }}
                  >
                    {portfolioModal.error}
                  </div>
                )}

                {/* Type Switcher Tabs (Only selectable in Add mode) */}
                {portfolioModal.mode === "add" && (
                  <div>
                    <label className="cd-label">Item Category</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                      <button
                        type="button"
                        className={`artist-port-tab ${portfolioModal.item_type === "photo" ? "active" : ""}`}
                        style={{ justifyContent: "center", width: "100%" }}
                        onClick={() =>
                          setPortfolioModal((p) => ({
                            ...p,
                            item_type: "photo",
                            error: "",
                          }))
                        }
                      >
                        <ImageIcon size={14} />
                        Photo
                      </button>
                      <button
                        type="button"
                        className={`artist-port-tab ${portfolioModal.item_type === "video" ? "active" : ""}`}
                        style={{ justifyContent: "center", width: "100%" }}
                        onClick={() =>
                          setPortfolioModal((p) => ({
                            ...p,
                            item_type: "video",
                            error: "",
                          }))
                        }
                      >
                        <VideoIcon size={14} />
                        Video
                      </button>
                      <button
                        type="button"
                        className={`artist-port-tab ${portfolioModal.item_type === "youtube" ? "active" : ""}`}
                        style={{ justifyContent: "center", width: "100%" }}
                        onClick={() =>
                          setPortfolioModal((p) => ({
                            ...p,
                            item_type: "youtube",
                            error: "",
                          }))
                        }
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                          <polygon points="10 15 15 12 10 9" />
                        </svg>
                        YouTube Link
                      </button>
                    </div>
                  </div>
                )}

                <div className="cd-form-group">
                  <label className="cd-label" htmlFor="port_item_title">
                    Performance Title *
                  </label>
                  <input
                    id="port_item_title"
                    type="text"
                    className="cd-input"
                    placeholder="e.g. Live Concert Performance"
                    value={portfolioModal.title}
                    onChange={(e) =>
                      setPortfolioModal((p) => ({ ...p, title: e.target.value, error: "" }))
                    }
                    required
                  />
                </div>

                <div className="cd-form-group">
                  <label className="cd-label" htmlFor="port_item_desc">
                    Description (Optional)
                  </label>
                  <textarea
                    id="port_item_desc"
                    rows="3"
                    className="cd-textarea"
                    placeholder="Provide details about the venue, crowd, and highlights..."
                    value={portfolioModal.description}
                    onChange={(e) =>
                      setPortfolioModal((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Photo Specific Inputs */}
                {portfolioModal.item_type === "photo" && (
                  <>
                    <div className="cd-form-group">
                      <label className="cd-label">Upload Photo File</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        ref={portfolioFileInputRef}
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPortfolioModal((p) => ({
                              ...p,
                              media_file: file,
                              error: "",
                            }));
                          }
                        }}
                      />
                      <div
                        style={{
                          border: "1px dashed rgba(255,255,255,0.2)",
                          borderRadius: "8px",
                          padding: "16px",
                          textAlign: "center",
                          background: "#18181A",
                          cursor: "pointer",
                        }}
                        onClick={() => portfolioFileInputRef.current?.click()}
                      >
                        <UploadCloud size={24} style={{ color: "#FF5722", marginBottom: "6px" }} />
                        <div style={{ color: "#FFFFFF", fontSize: "0.92rem", fontWeight: 500 }}>
                          {portfolioModal.media_file
                            ? portfolioModal.media_file.name
                            : "Click to choose image file"}
                        </div>
                        <span style={{ fontSize: "0.78rem", color: "#8E8E93" }}>
                          JPG, JPEG, PNG, WEBP (Max 10 MB)
                        </span>
                      </div>
                    </div>

                    <div className="cd-form-group">
                      <label className="cd-label" htmlFor="port_photo_url">
                        Or External Image URL
                      </label>
                      <input
                        id="port_photo_url"
                        type="url"
                        className="cd-input"
                        placeholder="https://..."
                        value={portfolioModal.media_url}
                        onChange={(e) =>
                          setPortfolioModal((p) => ({
                            ...p,
                            media_url: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                      <input
                        id="port_set_feat_check"
                        type="checkbox"
                        checked={portfolioModal.is_featured}
                        onChange={(e) =>
                          setPortfolioModal((p) => ({
                            ...p,
                            is_featured: e.target.checked,
                          }))
                        }
                        style={{ width: "16px", height: "16px", accentColor: "#FF5722" }}
                      />
                      <label htmlFor="port_set_feat_check" style={{ color: "#E0E0E0", fontSize: "0.90rem", cursor: "pointer" }}>
                        Set as Featured Image on public profile
                      </label>
                    </div>
                  </>
                )}

                {/* Video Specific Inputs */}
                {portfolioModal.item_type === "video" && (
                  <>
                    <div className="cd-form-group">
                      <label className="cd-label">Upload Video File</label>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                        ref={portfolioFileInputRef}
                        style={{ display: "none" }}
                        onChange={handleVideoFileSelect}
                      />
                      <div
                        style={{
                          border: portfolioModal.media_file
                            ? "1px solid #FF5722"
                            : "1px dashed rgba(255,255,255,0.2)",
                          borderRadius: "8px",
                          padding: "16px",
                          textAlign: "center",
                          background: portfolioModal.media_file ? "rgba(255, 87, 34, 0.06)" : "#18181A",
                          cursor: portfolioModal.extracting ? "wait" : "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onClick={() => {
                          if (!portfolioModal.extracting) {
                            portfolioFileInputRef.current?.click();
                          }
                        }}
                      >
                        {portfolioModal.extracting ? (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                            <div className="cd-spinner" style={{ width: "24px", height: "24px", borderWidth: "2px" }} />
                            <div style={{ color: "#FF5722", fontSize: "0.88rem", fontWeight: 600 }}>
                              Analyzing video, fetching duration & capturing thumbnail...
                            </div>
                          </div>
                        ) : (
                          <>
                            <VideoIcon size={24} style={{ color: "#FF5722", marginBottom: "6px" }} />
                            <div style={{ color: "#FFFFFF", fontSize: "0.92rem", fontWeight: 500 }}>
                              {portfolioModal.media_file
                                ? portfolioModal.media_file.name
                                : "Click to choose video file"}
                            </div>
                            <span style={{ fontSize: "0.78rem", color: "#8E8E93" }}>
                              MP4, WEBM, MOV (Max 100 MB) • Duration & Thumbnail auto-captured
                            </span>
                          </>
                        )}
                      </div>

                      {/* Auto-Captured Video Thumbnail Preview */}
                      {portfolioModal.thumbnail_preview && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "12px 14px",
                            background: "#141416",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "14px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              style={{
                                position: "relative",
                                width: "120px",
                                height: "68px",
                                borderRadius: "6px",
                                overflow: "hidden",
                                flexShrink: 0,
                                background: "#1C1C22",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                              }}
                            >
                              <img
                                src={portfolioModal.thumbnail_preview}
                                alt="Generated Video Thumbnail"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                              {portfolioModal.duration && (
                                <span
                                  style={{
                                    position: "absolute",
                                    bottom: "4px",
                                    right: "4px",
                                    background: "rgba(0, 0, 0, 0.82)",
                                    color: "#FF5722",
                                    fontSize: "0.70rem",
                                    fontWeight: 700,
                                    padding: "1px 5px",
                                    borderRadius: "3px",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {portfolioModal.duration}
                                </span>
                              )}
                            </div>
                            <div>
                              <div
                                style={{
                                  color: "#22C55E",
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <span>✓</span> Thumbnail Ready
                              </div>
                              <div
                                style={{
                                  color: "#A0A0A5",
                                  fontSize: "0.78rem",
                                  marginTop: "3px",
                                  lineHeight: "1.35",
                                }}
                              >
                                {portfolioModal.thumbnail_file && portfolioModal.thumbnail_file.type?.startsWith("image/")
                                  ? "Active video cover"
                                  : "Frame captured from video"}
                                {portfolioModal.dimensions && ` (${portfolioModal.dimensions})`}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            {portfolioModal.media_file && (
                              <button
                                type="button"
                                onClick={handleCycleVideoFrame}
                                disabled={portfolioModal.extracting}
                                className="cd-btn-secondary"
                                style={{
                                  padding: "6px 10px",
                                  fontSize: "0.76rem",
                                  borderRadius: "6px",
                                  cursor: portfolioModal.extracting ? "wait" : "pointer",
                                  background: "#222226",
                                  border: "1px solid #38383E",
                                  color: "#E2E2E2",
                                }}
                                title="Try another non-black frame from video"
                              >
                                {portfolioModal.extracting ? "Sampling..." : "Next Frame"}
                              </button>
                            )}
                            <label
                              className="cd-btn-secondary"
                              style={{
                                padding: "6px 10px",
                                fontSize: "0.76rem",
                                borderRadius: "6px",
                                cursor: "pointer",
                                marginBottom: 0,
                                background: "#222226",
                                border: "1px solid #38383E",
                                color: "#E2E2E2",
                              }}
                              title="Upload custom image cover"
                            >
                              Custom Cover
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={handleCustomThumbnailUpload}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="cd-form-group">
                      <label className="cd-label" htmlFor="port_video_duration">
                        Video Duration (mm:ss)
                      </label>
                      <input
                        id="port_video_duration"
                        type="text"
                        className="cd-input"
                        placeholder="Auto-detected from video (e.g. 03:24)"
                        value={portfolioModal.duration}
                        onChange={(e) =>
                          setPortfolioModal((p) => ({
                            ...p,
                            duration: e.target.value,
                          }))
                        }
                      />
                      <small style={{ color: "#727272", display: "block", marginTop: "4px" }}>
                        Auto-fetched from video file. You can adjust if needed.
                      </small>
                    </div>

                    <div className="cd-form-group">
                      <label className="cd-label" htmlFor="port_video_url">
                        Or Video Stream URL
                      </label>
                      <input
                        id="port_video_url"
                        type="url"
                        className="cd-input"
                        placeholder="https://..."
                        value={portfolioModal.media_url}
                        onChange={(e) =>
                          setPortfolioModal((p) => ({
                            ...p,
                            media_url: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}

                {/* YouTube Link Specific Inputs */}
                {portfolioModal.item_type === "youtube" && (
                  <div className="cd-form-group">
                    <label className="cd-label" htmlFor="port_yt_url">
                      YouTube Performance URL *
                    </label>
                    <input
                      id="port_yt_url"
                      type="url"
                      className="cd-input"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={portfolioModal.youtube_url || portfolioModal.media_url}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPortfolioModal((p) => ({
                          ...p,
                          youtube_url: val,
                          media_url: val,
                          error: "",
                        }));
                      }}
                      required
                    />
                    <small style={{ color: "#727272", display: "block", marginTop: "4px" }}>
                      Supports standard youtube.com/watch?v=, youtu.be/, and embed URLs.
                    </small>
                  </div>
                )}

                {/* Visibility Option */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                  <input
                    id="port_public_check"
                    type="checkbox"
                    checked={portfolioModal.is_public}
                    onChange={(e) =>
                      setPortfolioModal((p) => ({
                        ...p,
                        is_public: e.target.checked,
                      }))
                    }
                    style={{ width: "16px", height: "16px", accentColor: "#FF5722" }}
                  />
                  <label htmlFor="port_public_check" style={{ color: "#E0E0E0", fontSize: "0.90rem", cursor: "pointer" }}>
                    Visible on public artist profile
                  </label>
                </div>
              </div>

              <div className="cd-modal-actions" style={{ flexShrink: 0, marginTop: "16px", paddingTop: "14px" }}>
                <button
                  type="submit"
                  className="cd-btn-primary"
                  disabled={portfolioModal.saving}
                >
                  {portfolioModal.saving
                    ? "Saving..."
                    : portfolioModal.mode === "edit"
                    ? "Update Item"
                    : "Save Portfolio Item"}
                </button>
                <button
                  type="button"
                  className="cd-btn-secondary"
                  disabled={portfolioModal.saving}
                  onClick={() =>
                    setPortfolioModal((p) => ({ ...p, open: false, error: "" }))
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CHANGE FEATURED IMAGE
          ===================================================================== */}
      {featuredModalOpen && (
        <div className="cd-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cd-modal-card" style={{ maxWidth: "640px" }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">Select Featured Image</h3>
              <button
                type="button"
                className="cd-modal-close"
                onClick={() => setFeaturedModalOpen(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="cd-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ margin: 0, color: "#8E8E93", fontSize: "0.92rem" }}>
                Select an image from your portfolio to display as the primary hero image on your public artist profile.
              </p>

              {photos.length === 0 ? (
                <div className="artist-port-empty-notice">
                  You don't have any photos uploaded yet. Add photos to your portfolio to set one as featured.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "12px",
                    maxHeight: "360px",
                    overflowY: "auto",
                    padding: "4px",
                  }}
                >
                  {photos.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: item.is_featured ? "rgba(255, 87, 34, 0.12)" : "#1B1B1D",
                        border: item.is_featured ? "2px solid #FF5722" : "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "8px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                      }}
                      onClick={() => handleSetFeatured(item.id)}
                    >
                      <div style={{ width: "100%", aspectRatio: "16 / 10", overflow: "hidden", background: "#252525" }}>
                        <img
                          src={
                            item.thumbnail_url ||
                            (item.item_type === "photo" ? item.media_url : "") ||
                            "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80"
                          }
                          alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80";
                          }}
                        />
                      </div>
                      <div style={{ padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "0.84rem",
                            fontWeight: 600,
                            color: "#FFFFFF",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "110px",
                          }}
                          title={item.title}
                        >
                          {item.title}
                        </span>
                        {item.is_featured ? (
                          <span style={{ fontSize: "0.72rem", color: "#FF5722", fontWeight: 700 }}>
                            Current
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.72rem", color: "#8E8E93" }}>
                            Select
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cd-modal-actions" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="artist-port-btn-primary"
                onClick={() => {
                  setFeaturedModalOpen(false);
                  handleOpenAddModal("photo");
                }}
              >
                + Upload New Photo
              </button>
              <button
                type="button"
                className="cd-btn-secondary"
                onClick={() => setFeaturedModalOpen(false)}
              >
                Close
              </button>
            </div>
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
                    {receiptItem.transaction_id || `PAY-${String(receiptItem.id).padStart(4, "0")}`}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ color: "#888888" }}>Booking Reference:</span>
                  <strong style={{ color: "#F7F7F7" }}>
                    {receiptItem.booking_reference || `BK-${receiptItem.booking_id}`}
                    {receiptItem.event_type ? ` • ${receiptItem.event_type}` : ""}
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
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color: "#888888" }}>Date & Time:</span>
                  <span style={{ color: "#ccc" }}>{receiptItem.date}</span>
                </div>

                <div
                  style={{
                    height: "1px",
                    background: "rgba(255,255,255,0.08)",
                    margin: "10px 0",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                    fontSize: "0.95rem",
                  }}
                >
                  <span style={{ color: "#888888" }}>Gross Booking Amount:</span>
                  <span style={{ color: "#F7F7F7" }}>
                    ₹{formatPrice(receiptItem.gross_amount || receiptItem.amount)}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    fontSize: "0.95rem",
                  }}
                >
                  <span style={{ color: "#888888" }}>Platform Commission (8%):</span>
                  <span style={{ color: "#888888" }}>
                    - ₹{formatPrice(receiptItem.commission_amount || (Number(receiptItem.gross_amount || receiptItem.amount) * 0.08))}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    paddingTop: "6px",
                    borderTop: "1px dashed rgba(255,255,255,0.1)",
                  }}
                >
                  <span style={{ color: "#FF5722", fontWeight: 600 }}>Net Artist Payout:</span>
                  <strong style={{ color: "#FF5722", fontSize: "1.2rem" }}>
                    ₹{formatPrice(receiptItem.artist_amount || (Number(receiptItem.gross_amount || receiptItem.amount) * 0.92))}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#888888" }}>Status:</span>
                  <span
                    className={`artist-pay-pill ${
                      receiptItem.status === "success"
                        ? "success"
                        : receiptItem.status === "pending"
                        ? "pending"
                        : receiptItem.status?.includes("refund")
                        ? "refunded"
                        : "failed"
                    }`}
                  >
                    {receiptItem.status === "success"
                      ? "Completed"
                      : receiptItem.status === "pending"
                      ? "Pending"
                      : formatBookingStatus(receiptItem.status)}
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

      {/* Mark Completed Confirmation Modal */}
      {completeModal.open && completeModal.booking && (
        <div
          className="cd-modal-overlay"
          onClick={() => {
            if (!completeModal.loading) {
              setCompleteModal({ open: false, booking: null, loading: false });
            }
          }}
        >
          <div
            className="cd-modal-card"
            style={{ maxWidth: "460px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cd-modal-header">
              <h3 style={{ margin: 0, color: "#FFFFFF", fontSize: "1.2rem", fontWeight: 700 }}>
                Mark Performance Completed
              </h3>
            </div>
            <div className="cd-modal-body" style={{ color: "#CCCCCC", fontSize: "0.92rem", lineHeight: 1.6 }}>
              <p style={{ marginTop: 0 }}>
                Are you sure you want to mark this performance as successfully completed?
              </p>
              <div
                style={{
                  background: "#161618",
                  padding: "14px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  fontSize: "0.88rem",
                  margin: "14px 0",
                }}
              >
                <div>
                  <span style={{ color: "#8E8E93" }}>Event: </span>
                  <strong style={{ color: "#FFFFFF" }}>
                    {completeModal.booking.event_type || "Performance"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#8E8E93" }}>Host: </span>
                  <strong style={{ color: "#FFFFFF" }}>
                    {completeModal.booking.customer_name || "Host"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#8E8E93" }}>Agreed Fee: </span>
                  <strong style={{ color: "#FF5722" }}>
                    ₹{formatPrice(completeModal.booking.agreed_price)}
                  </strong>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#8E8E93" }}>
                This will update the booking record and notify the host to leave a review.
              </p>
            </div>
            <div className="cd-modal-actions" style={{ justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                className="cd-btn-secondary"
                disabled={completeModal.loading}
                onClick={() =>
                  setCompleteModal({ open: false, booking: null, loading: false })
                }
              >
                Cancel
              </button>
              <button
                type="button"
                className="cd-btn-primary"
                disabled={completeModal.loading}
                onClick={handleConfirmCompleteBooking}
              >
                {completeModal.loading ? "Completing..." : "Confirm Completion"}
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
