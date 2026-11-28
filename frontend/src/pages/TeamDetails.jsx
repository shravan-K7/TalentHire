import { useState, useEffect } from "react";
import {
  Users,
  Layers,
  Film,
  Play,
  Video,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  CheckCircle2,
  Calendar,
  MapPin,
  Send,
  AlertCircle,
} from "lucide-react";
import { fetchPublicTeamDetail, createTeamBooking } from "../js/auth";
import "../css/ArtistDetails.css";
import "../css/ArtistCollaboration.css";

export default function TeamDetails({
  teamId,
  user = null,
  navigate = null,
  onLogout = null,
}) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Portfolio Filter & Lightbox/Modal State
  const [portfolioTab, setPortfolioTab] = useState("all"); // 'all' | 'photo' | 'video'
  const [activeVideo, setActiveVideo] = useState(null);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Team Booking Modal State (Phase 6)
  const [selectedPackageForBooking, setSelectedPackageForBooking] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    event_type: "Wedding",
    event_date: "",
    venue_name: "",
    event_location: "",
    event_address: "",
    city: "",
    state: "",
    expected_audience_size: "",
    customer_phone: "",
    performance_duration: "",
    additional_requirements: "",
    customer_message: "",
  });

  function handleOpenBookingModal(pkg) {
    setSelectedPackageForBooking(pkg);
    setBookingError("");
    setBookingSuccessData(null);
    setBookingForm({
      event_type: "Wedding",
      event_date: "",
      venue_name: "",
      event_location: "",
      event_address: "",
      city: "",
      state: "",
      expected_audience_size: "",
      customer_phone: user?.customer_profile?.phone || user?.phone || "",
      performance_duration: pkg.duration_display || `${pkg.duration_minutes} mins`,
      additional_requirements: "",
      customer_message: "",
    });
  }

  function handleCloseBookingModal() {
    setSelectedPackageForBooking(null);
    setBookingError("");
    setBookingSuccessData(null);
  }

  async function handleSubmitTeamBooking(e) {
    e.preventDefault();
    if (!user) {
      setBookingError("Please sign in with a customer account to book this package.");
      return;
    }
    if (user.is_artist || user.role === "artist") {
      setBookingError("Artist accounts cannot book teams. Please use a customer account.");
      return;
    }
    if (!bookingForm.event_type) {
      setBookingError("Please specify an event type.");
      return;
    }
    if (!bookingForm.event_date) {
      setBookingError("Please select the event date and time.");
      return;
    }
    const chosenDate = new Date(bookingForm.event_date);
    if (chosenDate <= new Date()) {
      setBookingError("Event date and time must be in the future.");
      return;
    }

    setBookingSubmitting(true);
    setBookingError("");
    try {
      const res = await createTeamBooking(team.id, selectedPackageForBooking.id, {
        ...bookingForm,
        event_location: bookingForm.event_location || bookingForm.venue_name || "TBD",
      });
      setBookingSuccessData(res.booking);
    } catch (err) {
      setBookingError(err.message || "Failed to submit booking request.");
    } finally {
      setBookingSubmitting(false);
    }
  }

  useEffect(() => {
    let isCancelled = false;
    async function loadTeam() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchPublicTeamDetail(teamId);
        if (!isCancelled) {
          setTeam(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || "Failed to load team details.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    if (teamId) {
      loadTeam();
    }
    return () => {
      isCancelled = true;
    };
  }, [teamId]);

  const filteredPortfolio = (team?.portfolio || []).filter((item) => {
    if (portfolioTab === "all") return true;
    if (portfolioTab === "photo") return item.item_type === "photo";
    if (portfolioTab === "video")
      return item.item_type === "video" || item.item_type === "youtube";
    return true;
  });

  const photoPortfolio = (team?.portfolio || []).filter(
    (item) => item.item_type === "photo" && (item.media_url || item.media_file)
  );

  function openPhoto(item) {
    const idx = photoPortfolio.findIndex((p) => p.id === item.id);
    setLightboxIndex(idx !== -1 ? idx : 0);
    setShowPhotoLightbox(true);
  }

  function openVideo(item) {
    let embedUrl = item.youtube_embed_url;
    if (!embedUrl && item.youtube_url) {
      const match = item.youtube_url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
      if (match && match[1]) {
        embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
      }
    }
    setActiveVideo({
      title: item.title,
      embedUrl,
      mediaUrl: item.media_url || item.media_file,
      itemType: item.item_type,
    });
  }

  if (loading) {
    return (
      <main className="team-details-page-wrapper" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#FF5722", fontSize: "1.2rem", fontWeight: 600 }}>
          Loading team profile...
        </div>
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="team-details-page-wrapper" style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ background: "#1c1c1c", border: "1px solid #333", borderRadius: "12px", padding: "36px", maxWidth: "480px", textAlign: "center" }}>
          <AlertTriangle size={48} color="#FF5722" style={{ marginBottom: "16px" }} />
          <h2 style={{ color: "#fff", margin: "0 0 10px" }}>Team Profile Unavailable</h2>
          <p style={{ color: "#9ca3af", fontSize: "0.92rem", margin: "0 0 20px", lineHeight: 1.5 }}>
            {error || "This collaboration team cannot be viewed. It may be private, inactive, or does not exist."}
          </p>
          <button
            type="button"
            className="collab-btn-primary"
            onClick={() => {
              if (navigate) navigate("/artists");
              else window.location.href = "/artists";
            }}
          >
            <ArrowLeft size={16} />
            <span>Browse Artists</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="team-details-page-wrapper" style={{ background: "#121212", color: "#f3f4f6", minHeight: "100vh", paddingBottom: "60px" }}>
      {/* Top Banner & Hero Section */}
      <div style={{ position: "relative", width: "100%", background: "#181818", borderBottom: "1px solid #282828" }}>
        {/* Cover Photo */}
        <div
          style={{
            height: "260px",
            width: "100%",
            background: team.cover_image
              ? `linear-gradient(to bottom, rgba(18,18,18,0.3), rgba(18,18,18,0.9)), url(${team.cover_image}) center/cover no-repeat`
              : "#1a1a1a",
          }}
        />

        {/* Hero Content Container */}
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px 28px", marginTop: "-70px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", flexWrap: "wrap" }}>
              {/* Logo / Avatar */}
              {team.profile_image ? (
                <img
                  src={team.profile_image}
                  alt={team.name}
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "4px solid #121212",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                    background: "#222",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    background: "#242424",
                    border: "4px solid #121212",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.8rem",
                    fontWeight: 800,
                    color: "#FF5722",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                  }}
                >
                  {team.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Title & Category Info */}
              <div style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "6px" }}>
                  <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
                    {team.name}
                  </h1>
                  {team.category_name && (
                    <span
                      style={{
                        background: "rgba(255, 87, 34, 0.15)",
                        border: "1px solid rgba(255, 87, 34, 0.4)",
                        color: "#FF5722",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                      }}
                    >
                      {team.category_name}
                    </span>
                  )}
                  {team.is_preview && (
                    <span
                      style={{
                        background: "rgba(255, 171, 0, 0.15)",
                        border: "1px solid rgba(255, 171, 0, 0.35)",
                        color: "#ffc107",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                      }}
                    >
                      Preview Mode
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "#9ca3af", fontSize: "0.88rem", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <Users size={15} color="#FF5722" />
                    <strong>{team.members_count} Active Member{team.members_count === 1 ? "" : "s"}</strong>
                  </span>
                  <span>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <Layers size={15} color="#4ade80" />
                    <strong>{team.shared_coverage?.count || 0} Shared District{team.shared_coverage?.count === 1 ? "" : "s"}</strong>
                  </span>
                  {team.packages_count > 0 && (
                    <>
                      <span>·</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <Package size={15} color="#ff9800" />
                        <strong>{team.packages_count} Package{team.packages_count === 1 ? "" : "s"}</strong>
                      </span>
                    </>
                  )}
                  {team.owner && (
                    <>
                      <span>·</span>
                      <span>Founded by <strong>{team.owner.stage_name}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Back button */}
            <button
              type="button"
              className="collab-btn-back"
              onClick={() => {
                if (navigate) navigate("/artists");
                else window.location.href = "/artists";
              }}
              style={{ marginBottom: "8px" }}
            >
              <ArrowLeft size={16} />
              <span>Back to Artists</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ maxWidth: "1200px", margin: "32px auto 0", padding: "0 24px", display: "flex", flexDirection: "column", gap: "36px" }}>
        {/* About Team */}
        {team.description && (
          <section style={{ background: "#181818", border: "1px solid #282828", borderRadius: "12px", padding: "24px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>
              About {team.name}
            </h2>
            <p style={{ color: "#d1d5db", lineHeight: 1.6, fontSize: "0.95rem", margin: 0, whiteSpace: "pre-line" }}>
              {team.description}
            </p>
          </section>
        )}

        {/* Section 1: Active Performing Members */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={20} color="#FF5722" />
              <span>Active Performing Artists ({team.members?.length || 0})</span>
            </h2>
            <span style={{ fontSize: "0.85rem", color: "#888" }}>
              Collaborating across shared service coverage
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
            {(team.members || []).map((m) => (
              <div
                key={m.id || m.artist_id}
                style={{
                  background: "#181818",
                  border: "1px solid #282828",
                  borderRadius: "10px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  transition: "border-color 0.18s ease",
                }}
              >
                {m.profile_image ? (
                  <img
                    src={m.profile_image}
                    alt={m.stage_name}
                    style={{ width: "54px", height: "54px", borderRadius: "50%", objectFit: "cover", border: "2px solid #333", flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: "54px",
                      height: "54px",
                      borderRadius: "50%",
                      background: "#242424",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FF5722",
                      fontWeight: 700,
                      fontSize: "1.2rem",
                      flexShrink: 0,
                    }}
                  >
                    {m.stage_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.stage_name}
                    </h3>
                    {m.is_verified && <ShieldCheck size={14} color="#4ade80" title="Verified Artist" />}
                  </div>

                  <p style={{ margin: "2px 0 6px", fontSize: "0.82rem", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.category_name} · {m.base_location}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: "3px",
                        background: m.role === "owner" ? "rgba(255, 87, 34, 0.15)" : "#252525",
                        color: m.role === "owner" ? "#ff7043" : "#aaa",
                      }}
                    >
                      {m.role === "owner" ? "Team Owner" : "Member"}
                    </span>

                    <a
                      href={`/artists/${m.artist_id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "0.8rem",
                        color: "#FF5722",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      <span>Profile</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Shared Service Coverage */}
        <section style={{ background: "#181818", border: "1px solid #282828", borderRadius: "12px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Layers size={20} color="#FF5722" />
                <span>Shared Service Coverage (Intersection)</span>
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "0.86rem", color: "#9ca3af" }}>
                Strict intersection of districts covered by all active team members together.
              </p>
            </div>

            <span className="collab-badge-coverage">
              {team.shared_coverage?.count || 0} Common District{team.shared_coverage?.count === 1 ? "" : "s"} across {team.shared_coverage?.states_count || 0} State{team.shared_coverage?.states_count === 1 ? "" : "s"}
            </span>
          </div>

          {team.shared_coverage?.count > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {(team.shared_coverage.states || []).map((st) => (
                <div
                  key={st.id || st.name}
                  style={{
                    background: "#141414",
                    border: "1px solid #262626",
                    borderRadius: "8px",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>
                      {st.name}
                    </span>
                    <span style={{ color: "#888", fontSize: "0.82rem", fontWeight: 500 }}>
                      {st.districts?.length || 0} districts
                    </span>
                  </div>

                  <div className="collab-shared-pills">
                    {(st.districts || []).map((d) => (
                      <span key={d.id || d.name} className="collab-shared-pill">
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "30px", textAlign: "center", background: "#141414", borderRadius: "8px", border: "1px dashed #333", color: "#888" }}>
              <p style={{ margin: 0, fontSize: "0.92rem" }}>No common service coverage across all team members.</p>
            </div>
          )}
        </section>

        {/* Section 3: Combined Performance Packages (Phase 5B) */}
        <section style={{ background: "#181818", border: "1px solid #282828", borderRadius: "12px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Package size={20} color="#FF5722" />
                <span>Performance Packages ({team.packages?.length || 0})</span>
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "0.86rem", color: "#9ca3af" }}>
                Curated combined stage sets offered by this collaboration team.
              </p>
            </div>
            <span style={{ fontSize: "0.82rem", color: "#888" }}>
              Standard rates & durations across shared coverage
            </span>
          </div>

          {team.packages && team.packages.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
              {team.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    background: "#141414",
                    border: "1px solid #282828",
                    borderRadius: "10px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                  }}
                >
                  <div>
                    {/* Header: Name, Category, Price */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                      <div>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                          {pkg.name}
                        </h3>
                        {pkg.category && (
                          <span
                            style={{
                              background: "rgba(255, 87, 34, 0.15)",
                              border: "1px solid rgba(255, 87, 34, 0.4)",
                              color: "#FF5722",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            {pkg.category}
                          </span>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#FF5722" }}>
                          ₹{Number(pkg.starting_price).toLocaleString("en-IN")}
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#888" }}>starting from</span>
                      </div>
                    </div>

                    {/* Duration badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9ca3af", fontSize: "0.85rem", margin: "12px 0" }}>
                      <Clock size={15} color="#FF5722" />
                      <span>Duration: <strong>{pkg.duration_display || `${pkg.duration_minutes} mins`}</strong></span>
                    </div>

                    {/* Description */}
                    {pkg.description && (
                      <p style={{ color: "#d1d5db", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 16px" }}>
                        {pkg.description}
                      </p>
                    )}

                    {/* Inclusions */}
                    {pkg.included_services && pkg.included_services.length > 0 && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                          What's Included:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                          {pkg.included_services.map((item, idx) => (
                            <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.85rem", color: "#e4e4e7" }}>
                              <CheckCircle2 size={15} color="#4ade80" style={{ flexShrink: 0, marginTop: "2px" }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Requirements / Rider */}
                    {pkg.requirements && (
                      <div style={{ background: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "10px 12px", marginBottom: "16px", fontSize: "0.82rem", color: "#9ca3af" }}>
                        <strong style={{ color: "#ffc107" }}>Stage Rider / Requirements: </strong>
                        {pkg.requirements}
                      </div>
                    )}
                  </div>

                  {/* Participating Artists */}
                  {pkg.participating_members && pkg.participating_members.length > 0 && (
                    <div style={{ borderTop: "1px solid #262626", paddingTop: "14px", marginTop: "12px" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#888", marginBottom: "8px" }}>
                        Participating Artists ({pkg.participating_members.length}):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {pkg.participating_members.map((m) => (
                          <a
                            key={m.id || m.artist_id}
                            href={`/artists/${m.id || m.artist_id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "#222",
                              border: "1px solid #333",
                              borderRadius: "16px",
                              padding: "3px 10px 3px 4px",
                              textDecoration: "none",
                              color: "#fff",
                              fontSize: "0.8rem",
                            }}
                          >
                            {m.profile_image ? (
                              <img src={m.profile_image} alt={m.stage_name} style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#333", color: "#FF5722", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700 }}>
                                {m.stage_name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span>{m.stage_name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Book Package Action (Phase 6) */}
                  <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #242424" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenBookingModal(pkg)}
                      style={{
                        width: "100%",
                        padding: "11px 16px",
                        background: "#FF5722",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        transition: "background 0.2s ease, transform 0.15s ease",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = "#e64a19")}
                      onMouseOut={(e) => (e.currentTarget.style.background = "#FF5722")}
                    >
                      <Calendar size={17} />
                      <span>Book Package</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "36px", textAlign: "center", background: "#141414", borderRadius: "8px", border: "1px dashed #333", color: "#888" }}>
              <Package size={36} color="#555" style={{ marginBottom: "10px" }} />
              <p style={{ margin: 0, fontSize: "0.92rem" }}>No performance packages currently listed for this team.</p>
            </div>
          )}
        </section>

        {/* Section 4: Team Portfolio & Media */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Film size={20} color="#FF5722" />
              <span>Team Portfolio ({team.portfolio?.length || 0})</span>
            </h2>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "6px", background: "#181818", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "4px" }}>
              {[
                { key: "all", label: "All Media" },
                { key: "photo", label: "Photos" },
                { key: "video", label: "Videos" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPortfolioTab(tab.key)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "none",
                    background: portfolioTab === tab.key ? "#FF5722" : "transparent",
                    color: portfolioTab === tab.key ? "#fff" : "#9ca3af",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredPortfolio.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", background: "#181818", border: "1px dashed #333", borderRadius: "12px", color: "#888" }}>
              <Film size={36} color="#FF5722" style={{ marginBottom: "10px" }} />
              <p style={{ margin: 0, fontSize: "0.92rem" }}>No portfolio media available in this category.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
              {filteredPortfolio.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#181818",
                    border: "1px solid #282828",
                    borderRadius: "10px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "transform 0.18s ease, border-color 0.18s ease",
                  }}
                  onClick={() => {
                    if (item.item_type === "photo") {
                      openPhoto(item);
                    } else {
                      openVideo(item);
                    }
                  }}
                >
                  <div style={{ position: "relative", width: "100%", height: "180px", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {item.thumbnail_url || item.thumbnail || (item.item_type === "photo" && (item.media_url || item.media_file)) ? (
                      <img
                        src={item.thumbnail_url || item.thumbnail || item.media_url || item.media_file}
                        alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ color: "#666" }}>
                        {item.item_type === "video" ? <Video size={36} /> : <Film size={36} />}
                      </div>
                    )}

                    <span
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        background: "rgba(0,0,0,0.75)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.item_type}
                    </span>

                    {(item.item_type === "video" || item.item_type === "youtube") && (
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: "rgba(255, 87, 34, 0.9)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                        }}
                      >
                        <Play size={22} fill="#fff" />
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title}
                    </h3>
                    {item.description && (
                      <p style={{ fontSize: "0.82rem", color: "#9ca3af", margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Video Reel / YouTube Modal */}
      {activeVideo && (
        <div className="modal-overlay" onClick={() => setActiveVideo(null)}>
          <div className="video-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <h3 className="video-modal-title">
                {activeVideo.title} — {team.name}
              </h3>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setActiveVideo(null)}
                aria-label="Close video player"
              >
                <X size={22} />
              </button>
            </div>
            <div className="video-modal-player-wrap">
              {activeVideo.embedUrl ? (
                <iframe
                  src={activeVideo.embedUrl}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : activeVideo.mediaUrl ? (
                <video
                  src={activeVideo.mediaUrl}
                  controls
                  autoPlay
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888" }}>
                  Unable to play video source.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {showPhotoLightbox && photoPortfolio.length > 0 && (
        <div className="modal-overlay" onClick={() => setShowPhotoLightbox(false)}>
          <div className="gallery-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-lightbox-header">
              <span style={{ color: "#F7F7F7", fontWeight: 600, fontSize: "1rem" }}>
                {photoPortfolio[lightboxIndex]?.title || "Team Photo"} ({lightboxIndex + 1} of {photoPortfolio.length})
              </span>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setShowPhotoLightbox(false)}
                aria-label="Close photo gallery"
              >
                <X size={22} />
              </button>
            </div>
            <div className="gallery-lightbox-body">
              <img
                src={photoPortfolio[lightboxIndex]?.media_url || photoPortfolio[lightboxIndex]?.media_file}
                alt={photoPortfolio[lightboxIndex]?.title || "Stage Photo"}
                className="gallery-lightbox-img"
              />
            </div>
            <div className="gallery-lightbox-footer">
              <div style={{ color: "#aaa", fontSize: "0.85rem" }}>
                {photoPortfolio[lightboxIndex]?.description || ""}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="gallery-nav-btn"
                  onClick={() =>
                    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : photoPortfolio.length - 1))
                  }
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="gallery-nav-btn"
                  onClick={() =>
                    setLightboxIndex((prev) => (prev < photoPortfolio.length - 1 ? prev + 1 : 0))
                  }
                  aria-label="Next photo"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Team Booking Modal (Phase 6) */}
      {selectedPackageForBooking && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseBookingModal();
          }}
        >
          <div
            style={{
              background: "#181818",
              border: "1px solid #2e2e2e",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                borderBottom: "1px solid #282828",
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Package size={20} color="#FF5722" />
                  <span>Book Package: {selectedPackageForBooking.name}</span>
                </h3>
                <p style={{ margin: "4px 0 0", color: "#888", fontSize: "0.85rem" }}>
                  Team: <strong>{team.name}</strong> • Starting from ₹{Number(selectedPackageForBooking.starting_price).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseBookingModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#aaa",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "6px",
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              {bookingSuccessData ? (
                <div style={{ textAlign: "center", padding: "20px 10px" }}>
                  <CheckCircle2 size={56} color="#4ade80" style={{ margin: "0 auto 16px" }} />
                  <h4 style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 700, margin: "0 0 10px" }}>
                    Booking Request Submitted!
                  </h4>
                  <p style={{ color: "#bbb", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: "460px", margin: "0 auto 24px" }}>
                    Your request for <strong>{selectedPackageForBooking.name}</strong> with <strong>{team.name}</strong> has been sent to the team owner for review.
                  </p>

                  <div style={{ background: "#141414", border: "1px solid #282828", borderRadius: "10px", padding: "16px", textAlign: "left", marginBottom: "24px" }}>
                    <div style={{ fontSize: "0.85rem", color: "#888", marginBottom: "6px" }}>
                      Booking Reference: <strong>#{bookingSuccessData.id}</strong>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#888", marginBottom: "6px" }}>
                      Status: <span style={{ color: "#f59e0b", fontWeight: 700 }}>Pending Owner Review</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#888" }}>
                      Event Date: <strong>{bookingSuccessData.event?.date_display || bookingForm.event_date}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseBookingModal();
                        if (navigate) {
                          navigate("/customer/dashboard?tab=team-bookings");
                        } else {
                          window.location.href = "/customer/dashboard?tab=team-bookings";
                        }
                      }}
                      style={{
                        padding: "11px 22px",
                        background: "#FF5722",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      View in My Bookings
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseBookingModal}
                      style={{
                        padding: "11px 20px",
                        background: "#282828",
                        color: "#ddd",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitTeamBooking}>
                  {bookingError && (
                    <div
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid #ef4444",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        marginBottom: "18px",
                        color: "#fca5a5",
                        fontSize: "0.88rem",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  {!user && (
                    <div
                      style={{
                        background: "rgba(245, 158, 11, 0.15)",
                        border: "1px solid #f59e0b",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        marginBottom: "18px",
                        color: "#fde68a",
                        fontSize: "0.88rem",
                      }}
                    >
                      You are not logged in. Please{" "}
                      <a href="/login" style={{ color: "#FF5722", textDecoration: "underline", fontWeight: 700 }}>
                        Sign in as Customer
                      </a>{" "}
                      to submit a booking request.
                    </div>
                  )}

                  {user && (user.is_artist || user.role === "artist") && (
                    <div
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid #ef4444",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        marginBottom: "18px",
                        color: "#fca5a5",
                        fontSize: "0.88rem",
                      }}
                    >
                      You are logged in as an Artist. Only customer accounts can book collaboration teams.
                    </div>
                  )}

                  {/* Event Type & Date */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", color: "#ddd", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                        Event Type *
                      </label>
                      <select
                        value={bookingForm.event_type}
                        onChange={(e) => setBookingForm({ ...bookingForm, event_type: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px",
                          background: "#121212",
                          border: "1px solid #333",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "0.9rem",
                        }}
                        required
                      >
                        <option value="Wedding">Wedding</option>
                        <option value="Corporate Event">Corporate Event</option>
                        <option value="Music Concert">Music Concert</option>
                        <option value="College Fest">College Fest</option>
                        <option value="Birthday Party">Birthday Party</option>
                        <option value="Private Celebration">Private Celebration</option>
                        <option value="Festival">Festival</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", color: "#ddd", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                        Event Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={bookingForm.event_date}
                        min={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
                        onChange={(e) => setBookingForm({ ...bookingForm, event_date: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px",
                          background: "#121212",
                          border: "1px solid #333",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "0.9rem",
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* Venue & Location */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", color: "#ddd", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                        Venue Name / Landmark
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Grand Hyatt Ballroom"
                        value={bookingForm.venue_name}
                        onChange={(e) => setBookingForm({ ...bookingForm, venue_name: e.target.value, event_location: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px",
                          background: "#121212",
                          border: "1px solid #333",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", color: "#ddd", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                        City & State
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="City"
                          value={bookingForm.city}
                          onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })}
                          style={{
                            width: "50%",
                            padding: "10px",
                            background: "#121212",
                            border: "1px solid #333",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "0.9rem",
                          }}
                        />
                        <input
                          type="text"
                          placeholder="State"
                          value={bookingForm.state}
                          onChange={(e) => setBookingForm({ ...bookingForm, state: e.target.value })}
                          style={{
                            width: "50%",
                            padding: "10px",
                            background: "#121212",
                            border: "1px solid #333",
                            borderRadius: "8px",
                            color: "#fff",
                            fontSize: "0.9rem",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Audience & Contact Phone */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", color: "#ddd", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                        Expected Audience Size
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 250"
                        value={bookingForm.expected_audience_size}
                        onChange={(e) => setBookingForm({ ...bookingForm, expected_audience_size: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px",
                          background: "#121212",
                          border: "1px solid #333",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", color: "#ddd", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={bookingForm.customer_phone}
                        onChange={(e) => setBookingForm({ ...bookingForm, customer_phone: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px",
                          background: "#121212",
                          border: "1px solid #333",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>
                  </div>

                  {/* Requirements & Notes */}
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", color: "#ddd", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                      Special Requirements / Message
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Share details about stage setup, sound gear, guest list or any custom request..."
                      value={bookingForm.customer_message}
                      onChange={(e) => setBookingForm({ ...bookingForm, customer_message: e.target.value, additional_requirements: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "#121212",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "0.9rem",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #282828", paddingTop: "18px" }}>
                    <button
                      type="button"
                      onClick={handleCloseBookingModal}
                      style={{
                        padding: "10px 18px",
                        background: "#222",
                        color: "#ccc",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bookingSubmitting || !user || user.is_artist || user.role === "artist"}
                      style={{
                        padding: "10px 22px",
                        background: "#FF5722",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: bookingSubmitting ? "not-allowed" : "pointer",
                        opacity: bookingSubmitting || !user || user.is_artist || user.role === "artist" ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Send size={16} />
                      <span>{bookingSubmitting ? "Submitting..." : "Submit Booking Request"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
