import { useState, useEffect } from "react";
import {
  Users,
  MapPin,
  Layers,
  Film,
  Play,
  ImageIcon,
  Video,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { fetchPublicTeamDetail } from "../js/auth";
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

        {/* Section 3: Team Portfolio & Media */}
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
    </main>
  );
}
