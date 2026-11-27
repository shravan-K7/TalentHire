import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Calendar,
  MapPin,
  Star,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
  Plus,
  Shield,
  UserCheck,
  UserX,
  LogOut,
  Mail,
  ChevronRight,
  ArrowLeft,
  Send,
  AlertTriangle,
  ImageIcon,
  Video,
  Film,
  Eye,
  EyeOff,
  Trash2,
  Globe,
  ArrowUp,
  ArrowDown,
  Play,
  Upload,
} from "lucide-react";
import {
  fetchCollaborationRecommendations,
  fetchArtistTeams,
  createArtistTeam,
  fetchArtistTeamDetail,
  inviteArtistToTeam,
  fetchReceivedTeamInvitations,
  respondToTeamInvitation,
  removeTeamMember,
  leaveTeam,
  updateTeamProfile,
  fetchTeamPortfolio,
  createTeamPortfolioItem,
  updateTeamPortfolioItem,
  deleteTeamPortfolioItem,
  reorderTeamPortfolioItems,
} from "../../js/auth";
import "../../css/ArtistCollaboration.css";

const CATEGORIES = [
  "All Categories",
  "Singers",
  "Dancers",
  "DJs",
  "Instrumentalists",
  "Bands",
  "Standup Comedians",
  "Magicians",
  "Anchors & Emcees",
];

export default function ArtistCollaborationTab({
  artistProfile = null,
  navigate = null,
  onSwitchTab = null,
}) {
  // Main Navigation within Collaborations Tab
  const [activeSubTab, setActiveSubTab] = useState("teams"); // 'teams' | 'discover' | 'invitations'

  // Teams State
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamDetail, setTeamDetail] = useState(null);
  const [teamDetailLoading, setTeamDetailLoading] = useState(false);
  const [teamViewTab, setTeamViewTab] = useState("overview"); // 'overview' | 'profile' | 'portfolio'

  // Categories list for Team Category
  const [teamCategories, setTeamCategories] = useState([]);

  // Team Profile Form State (Owner)
  const [profileForm, setProfileForm] = useState({
    name: "",
    description: "",
    category_id: "",
    is_publicly_visible: true,
  });
  const [profileLogoFile, setProfileLogoFile] = useState(null);
  const [profileLogoPreview, setProfileLogoPreview] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [removeProfileLogo, setRemoveProfileLogo] = useState(false);
  const [removeCoverImage, setRemoveCoverImage] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });

  // Team Portfolio State
  const [teamPortfolio, setTeamPortfolio] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [showAddPortfolioModal, setShowAddPortfolioModal] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({
    item_type: "photo",
    title: "",
    description: "",
    youtube_url: "",
    is_public: true,
  });
  const [portfolioFile, setPortfolioFile] = useState(null);
  const [portfolioFilePreview, setPortfolioFilePreview] = useState(null);
  const [portfolioSaving, setPortfolioSaving] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");
  const [activePreviewMedia, setActivePreviewMedia] = useState(null);

  // Invitations State
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsCount, setInvitationsCount] = useState(0);

  // Discovery / Collaborators State
  const [collaborators, setCollaborators] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [myDistrictsCount, setMyDistrictsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters for Discovery
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [eventDate, setEventDate] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    teamId: "",
    teamName: "",
    artistId: "",
    artistName: "",
    message: "",
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ newOwnerId: "", closeTeam: false });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const [viewingArtist, setViewingArtist] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  const myBaseDistrictName = useMemo(() => {
    return (
      artistProfile?.district?.name ||
      artistProfile?.base_district?.name ||
      (typeof artistProfile?.base_district === "string" ? artistProfile.base_district : "")
    )?.toLowerCase().trim();
  }, [artistProfile]);

  const myBaseStateName = useMemo(() => {
    return (
      artistProfile?.state?.name ||
      artistProfile?.base_state?.name ||
      (typeof artistProfile?.base_state === "string" ? artistProfile.base_state : "")
    )?.toLowerCase().trim();
  }, [artistProfile]);

  const viewingBaseDistrictName = useMemo(() => {
    return (
      viewingArtist?.district?.name ||
      viewingArtist?.base_district?.name ||
      (typeof viewingArtist?.base_district === "string" ? viewingArtist.base_district : "")
    )?.toLowerCase().trim();
  }, [viewingArtist]);

  const viewingBaseStateName = useMemo(() => {
    return (
      viewingArtist?.state?.name ||
      viewingArtist?.base_state?.name ||
      (typeof viewingArtist?.base_state === "string" ? viewingArtist.base_state : "")
    )?.toLowerCase().trim();
  }, [viewingArtist]);

  const viewingArtistGroupedCoverage = useMemo(() => {
    if (!viewingArtist?.shared_districts || viewingArtist.shared_districts.length === 0) {
      return [];
    }
    const stateMap = new Map();
    for (const d of viewingArtist.shared_districts) {
      const stateName = d.state_name || "Other State";
      if (!stateMap.has(stateName)) {
        stateMap.set(stateName, {
          name: stateName,
          state_id: d.state_id,
          districts: [],
        });
      }
      stateMap.get(stateName).districts.push(d);
    }
    return Array.from(stateMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((st) => ({
        ...st,
        districts: st.districts.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [viewingArtist]);

  const todayIso = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  function showActionToast(msg) {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg((prev) => (prev === msg ? "" : prev));
    }, 4000);
  }

  // --------------------------------------------------------------------------
  // Data Loaders
  // --------------------------------------------------------------------------

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true);
    setTeamsError("");
    try {
      const res = await fetchArtistTeams();
      setTeams(res.teams || []);
      setInvitationsCount(res.received_invitations_count || 0);
    } catch (err) {
      setTeamsError(err.message || "Failed to load teams.");
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      const res = await fetchReceivedTeamInvitations();
      setInvitations(res.invitations || []);
      setInvitationsCount(res.count || 0);
    } catch (err) {
      console.warn("Could not load invitations:", err);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  const loadTeamDetail = useCallback(async (teamId) => {
    setTeamDetailLoading(true);
    try {
      const res = await fetchArtistTeamDetail(teamId);
      setTeamDetail(res.team || null);
    } catch (err) {
      showActionToast(err.message || "Failed to load team details.");
    } finally {
      setTeamDetailLoading(false);
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category && category !== "All Categories") params.category = category;
      if (eventDate) params.event_date = eventDate;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;

      const res = await fetchCollaborationRecommendations(params);
      setCollaborators(res.collaborators || []);
      setTotalCount(res.total_count || 0);
      setMyDistrictsCount(res.my_districts_count || 0);
    } catch (err) {
      setError(err.message || "Failed to load collaboration recommendations.");
    } finally {
      setLoading(false);
    }
  }, [search, category, eventDate, minPrice, maxPrice]);

  useEffect(() => {
    loadTeams();
    loadInvitations();
  }, [loadTeams, loadInvitations]);

  useEffect(() => {
    if (activeSubTab === "discover") {
      loadRecommendations();
    }
  }, [activeSubTab, loadRecommendations]);

  // Load categories for team category dropdown
  useEffect(() => {
    fetch("/api/artist/categories/")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeamCategories(data);
        }
      })
      .catch((err) => console.warn("Failed to load categories:", err));
  }, []);

  const loadTeamPortfolio = useCallback(async (teamId) => {
    setPortfolioLoading(true);
    try {
      const res = await fetchTeamPortfolio(teamId);
      setTeamPortfolio(res.portfolio || []);
    } catch (err) {
      console.warn("Failed to load team portfolio:", err);
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamDetail(selectedTeamId);
      loadTeamPortfolio(selectedTeamId);
    } else {
      setTeamDetail(null);
      setTeamPortfolio([]);
      setTeamViewTab("overview");
    }
  }, [selectedTeamId, loadTeamDetail, loadTeamPortfolio]);

  useEffect(() => {
    if (teamDetail) {
      setProfileForm({
        name: teamDetail.name || "",
        description: teamDetail.description || "",
        category_id: teamDetail.category?.id || teamDetail.category_id || "",
        is_publicly_visible: teamDetail.is_publicly_visible !== false,
      });
      setProfileLogoFile(null);
      setProfileLogoPreview(teamDetail.profile_image || null);
      setCoverImageFile(null);
      setCoverImagePreview(teamDetail.cover_image || null);
      setRemoveProfileLogo(false);
      setRemoveCoverImage(false);
      setProfileMsg({ text: "", type: "" });
    }
  }, [teamDetail]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    setProfileSaving(true);
    setProfileMsg({ text: "", type: "" });
    try {
      const formData = new FormData();
      formData.append("name", profileForm.name.trim());
      formData.append("description", profileForm.description.trim());
      if (profileForm.category_id) {
        formData.append("category_id", profileForm.category_id);
      } else {
        formData.append("category_id", "");
      }
      formData.append("is_publicly_visible", profileForm.is_publicly_visible ? "true" : "false");

      if (profileLogoFile) {
        formData.append("profile_image", profileLogoFile);
      } else if (removeProfileLogo) {
        formData.append("remove_profile_image", "true");
      }

      if (coverImageFile) {
        formData.append("cover_image", coverImageFile);
      } else if (removeCoverImage) {
        formData.append("remove_cover_image", "true");
      }

      const res = await updateTeamProfile(selectedTeamId, formData);
      setProfileMsg({ text: res.message || "Team profile updated successfully!", type: "success" });
      showActionToast(res.message || "Team profile updated!");
      loadTeamDetail(selectedTeamId);
      loadTeams();
    } catch (err) {
      setProfileMsg({ text: err.message || "Failed to update profile.", type: "error" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddPortfolioItem = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    setPortfolioSaving(true);
    setPortfolioError("");
    try {
      const formData = new FormData();
      formData.append("item_type", portfolioForm.item_type);
      formData.append("title", portfolioForm.title.trim());
      formData.append("description", portfolioForm.description.trim());
      formData.append("is_public", portfolioForm.is_public ? "true" : "false");

      if (portfolioForm.item_type === "youtube") {
        if (!portfolioForm.youtube_url.trim()) {
          throw new Error("YouTube URL is required.");
        }
        formData.append("youtube_url", portfolioForm.youtube_url.trim());
      } else {
        if (!portfolioFile) {
          throw new Error("Please select a file to upload.");
        }
        formData.append("media_file", portfolioFile);
      }

      const res = await createTeamPortfolioItem(selectedTeamId, formData);
      showActionToast(res.message || "Portfolio item added!");
      setShowAddPortfolioModal(false);
      setPortfolioForm({
        item_type: "photo",
        title: "",
        description: "",
        youtube_url: "",
        is_public: true,
      });
      setPortfolioFile(null);
      setPortfolioFilePreview(null);
      loadTeamPortfolio(selectedTeamId);
    } catch (err) {
      setPortfolioError(err.message || "Failed to add portfolio item.");
    } finally {
      setPortfolioSaving(false);
    }
  };

  const handleDeletePortfolioItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this portfolio item?")) return;
    try {
      const res = await deleteTeamPortfolioItem(selectedTeamId, itemId);
      showActionToast(res.message || "Item deleted.");
      loadTeamPortfolio(selectedTeamId);
    } catch (err) {
      showActionToast(err.message || "Failed to delete item.");
    }
  };

  const handleTogglePortfolioVisibility = async (item) => {
    try {
      await updateTeamPortfolioItem(selectedTeamId, item.id, {
        is_public: !item.is_public,
      });
      showActionToast(`Item set to ${!item.is_public ? "public" : "private"}.`);
      loadTeamPortfolio(selectedTeamId);
    } catch (err) {
      showActionToast(err.message || "Failed to update item visibility.");
    }
  };

  const handleMovePortfolioItem = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= teamPortfolio.length) return;
    const reordered = [...teamPortfolio];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    setTeamPortfolio(reordered);
    try {
      await reorderTeamPortfolioItems(selectedTeamId, reordered.map((item) => item.id));
    } catch (err) {
      showActionToast("Failed to save new order.");
      loadTeamPortfolio(selectedTeamId);
    }
  };

  // --------------------------------------------------------------------------
  // Handlers: Team Creation
  // --------------------------------------------------------------------------

  async function handleCreateTeamSubmit(e) {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError("");
    try {
      const res = await createArtistTeam(createForm);
      showActionToast(res.message || "Team created successfully!");
      setShowCreateModal(false);
      setCreateForm({ name: "", description: "" });
      await loadTeams();
      if (res.team?.id) {
        setSelectedTeamId(res.team.id);
      }
    } catch (err) {
      setCreateError(err.message || "Failed to create team.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  // --------------------------------------------------------------------------
  // Handlers: Invitations
  // --------------------------------------------------------------------------

  function openInviteModalForTeam(team) {
    const t = team || teamDetail || teams[0];
    if (t?.id) {
      setSelectedTeamId(t.id);
    }
    setInviteForm({
      teamId: t?.id || "",
      teamName: t?.name || "",
      artistId: "",
      artistName: "",
      message: "",
    });
    setInviteError("");
    setInviteSuccess("");
    setShowInviteModal(true);
  }

  function handleInviteFromDiscovery(collabArtist) {
    if (teams.length === 0) {
      showActionToast("Please create a team first before inviting members.");
      setShowCreateModal(true);
      return;
    }
    // Select currently viewed team or first team
    const targetTeam = teamDetail || teams[0];
    if (targetTeam?.id) {
      setSelectedTeamId(targetTeam.id);
    }
    setInviteForm({
      teamId: targetTeam.id,
      teamName: targetTeam.name,
      artistId: String(collabArtist.id),
      artistName: collabArtist.stage_name,
      message: `Hi ${collabArtist.stage_name}, I'd love for you to join our team '${targetTeam.name}'!`,
    });
    setInviteError("");
    setInviteSuccess("");
    setShowInviteModal(true);
  }

  async function handleSendInvitationSubmit(e) {
    e.preventDefault();
    const targetTeamId = inviteForm.teamId || selectedTeamId || teams[0]?.id;
    if (!targetTeamId) {
      setInviteError("Please select a team to invite to.");
      return;
    }
    if (!String(inviteForm.artistId).trim()) {
      setInviteError("Please specify an artist ID or stage name.");
      return;
    }
    setInviteSubmitting(true);
    setInviteError("");
    try {
      const res = await inviteArtistToTeam(targetTeamId, {
        artist_id: inviteForm.artistId,
        message: inviteForm.message,
      });
      showActionToast(res.message || "Invitation sent successfully!");
      setShowInviteModal(false);
      if (selectedTeamId) {
        loadTeamDetail(selectedTeamId);
      }
      loadTeams();
    } catch (err) {
      setInviteError(err.message || "Failed to send invitation.");
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleRespondInvitation(invitationId, action) {
    try {
      const res = await respondToTeamInvitation(invitationId, action);
      showActionToast(res.message);
      loadInvitations();
      loadTeams();
      if (action === "accept" && res.team_id) {
        setSelectedTeamId(res.team_id);
        setActiveSubTab("teams");
      }
    } catch (err) {
      showActionToast(err.message || "Failed to respond to invitation.");
    }
  }

  // --------------------------------------------------------------------------
  // Handlers: Member Management & Leaving
  // --------------------------------------------------------------------------

  async function handleRemoveMember(memberId, stageName) {
    if (!window.confirm(`Are you sure you want to remove ${stageName} from the team?`)) {
      return;
    }
    try {
      const res = await removeTeamMember(selectedTeamId, memberId);
      showActionToast(res.message || "Member removed.");
      loadTeamDetail(selectedTeamId);
      loadTeams();
    } catch (err) {
      showActionToast(err.message || "Failed to remove member.");
    }
  }

  async function handleLeaveTeamSubmit(e) {
    e.preventDefault();
    if (!selectedTeamId) return;
    setLeaveSubmitting(true);
    setLeaveError("");
    try {
      const payload = {};
      if (teamDetail?.is_owner) {
        if (leaveForm.closeTeam) {
          payload.close_team = true;
        } else if (leaveForm.newOwnerId) {
          payload.new_owner_id = leaveForm.newOwnerId;
        }
      }
      const res = await leaveTeam(selectedTeamId, payload);
      showActionToast(res.message || "You have left the team.");
      setShowLeaveModal(false);
      setSelectedTeamId(null);
      loadTeams();
    } catch (err) {
      setLeaveError(err.message || "Failed to leave team.");
    } finally {
      setLeaveSubmitting(false);
    }
  }

  function handleResetFilters() {
    setSearch("");
    setCategory("All Categories");
    setEventDate("");
    setMinPrice("");
    setMaxPrice("");
  }

  function handleViewProfile(artistId) {
    if (typeof navigate === "function") {
      navigate(`/artists/${artistId}`);
    } else {
      window.location.href = `/artists/${artistId}`;
    }
  }

  return (
    <div className="collab-container">
      {/* Toast Banner */}
      {actionSuccessMsg && (
        <div
          style={{
            background: "rgba(34, 197, 94, 0.15)",
            border: "1px solid rgba(34, 197, 94, 0.4)",
            color: "#4ade80",
            padding: "12px 18px",
            borderRadius: "8px",
            fontSize: "0.9rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Page Heading */}
      <h1 className="artist-collab-title">Collaboration Hub</h1>

      {/* Sub-Navigation Bar */}
      <div className="collab-nav-bar">
        <button
          type="button"
          className={`collab-nav-pill ${activeSubTab === "teams" ? "active" : ""}`}
          onClick={() => {
            setActiveSubTab("teams");
            setSelectedTeamId(null);
          }}
        >
          <Users size={16} />
          <span>My Teams</span>
          <span className="collab-nav-count-badge">{teams.length}</span>
        </button>

        <button
          type="button"
          className={`collab-nav-pill ${activeSubTab === "invitations" ? "active" : ""}`}
          onClick={() => setActiveSubTab("invitations")}
        >
          <Mail size={16} />
          <span>Invitations</span>
          {invitationsCount > 0 && (
            <span
              className="collab-nav-count-badge"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              {invitationsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`collab-nav-pill ${activeSubTab === "discover" ? "active" : ""}`}
          onClick={() => setActiveSubTab("discover")}
        >
          <Sparkles size={16} />
          <span>Find Collaborators</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: MY TEAMS (LIST OR DETAIL)
          ===================================================================== */}
      {activeSubTab === "teams" && (
        <>
          {selectedTeamId && teamDetail ? (
            /* TEAM DETAILS VIEW */
            <div className="collab-team-detail">
              <div className="collab-team-top-bar">
                <button
                  type="button"
                  className="collab-btn-back"
                  onClick={() => setSelectedTeamId(null)}
                >
                  <ArrowLeft size={16} />
                  <span>Back to My Teams</span>
                </button>

                <div className="collab-team-actions">
                  <a
                    href={`/teams/${teamDetail.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="collab-btn-public-preview"
                    title="View public team profile"
                  >
                    <ExternalLink size={15} />
                    <span>Public Profile</span>
                  </a>

                  {teamDetail.is_owner && (
                    <button
                      type="button"
                      className="collab-btn-invite"
                      onClick={() => openInviteModalForTeam(teamDetail)}
                    >
                      <Plus size={16} />
                      <span>Invite Artist</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="collab-btn-leave"
                    onClick={() => {
                      setLeaveError("");
                      setLeaveForm({ newOwnerId: "", closeTeam: false });
                      setShowLeaveModal(true);
                    }}
                  >
                    <LogOut size={15} />
                    <span>{teamDetail.is_owner ? "Manage / Leave Team" : "Leave Team"}</span>
                  </button>
                </div>
              </div>

              {/* Team Banner */}
              <div className="collab-team-banner">
                <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", flex: 1, minWidth: "280px" }}>
                  {teamDetail.profile_image ? (
                    <img
                      src={teamDetail.profile_image}
                      alt={teamDetail.name}
                      style={{
                        width: "68px",
                        height: "68px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #FF5722",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "68px",
                        height: "68px",
                        borderRadius: "50%",
                        background: "#242424",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.6rem",
                        fontWeight: 700,
                        color: "#FF5722",
                        border: "1px solid #333",
                        flexShrink: 0,
                      }}
                    >
                      {teamDetail.name?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="collab-team-banner-left">
                    <div className="collab-team-banner-title">
                      <span>{teamDetail.name}</span>
                      {teamDetail.is_owner ? (
                        <span className="collab-owner-tag">You are Owner</span>
                      ) : (
                        <span className="collab-member-tag">Member</span>
                      )}
                      {teamDetail.category_name && (
                        <span
                          style={{
                            background: "rgba(255, 87, 34, 0.15)",
                            color: "#ff7043",
                            fontSize: "0.78rem",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            border: "1px solid rgba(255, 87, 34, 0.3)",
                            fontWeight: 600,
                          }}
                        >
                          {teamDetail.category_name}
                        </span>
                      )}
                    </div>
                    <p className="collab-team-banner-desc">
                      {teamDetail.description || "No description provided."}
                    </p>
                    <div style={{ marginTop: "10px", fontSize: "0.84rem", color: "#888", display: "flex", flexWrap: "wrap", gap: "14px" }}>
                      <span>Owner: <strong>{teamDetail.owner?.stage_name}</strong></span>
                      <span>Created on {teamDetail.created_at}</span>
                      <span>Visibility: <strong style={{ color: teamDetail.is_publicly_visible !== false ? "#4ade80" : "#a1a1aa" }}>{teamDetail.is_publicly_visible !== false ? "Public" : "Private"}</strong></span>
                    </div>
                  </div>
                </div>

                <div>
                  {teamDetail.is_eligible_for_discovery ? (
                    <div className="collab-eligibility-badge eligible">
                      <CheckCircle2 size={16} />
                      <span>Eligible for Discovery</span>
                    </div>
                  ) : (
                    <div
                      className="collab-eligibility-badge ineligible"
                      title={teamDetail.eligibility_reason || ""}
                    >
                      <AlertTriangle size={16} />
                      <span>Ineligible: {teamDetail.eligibility_reason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-nav inside Team Detail */}
              <div className="collab-team-subnav">
                <button
                  type="button"
                  className={`collab-subnav-btn ${teamViewTab === "overview" ? "active" : ""}`}
                  onClick={() => setTeamViewTab("overview")}
                >
                  <Users size={16} />
                  <span>Overview & Members</span>
                </button>

                <button
                  type="button"
                  className={`collab-subnav-btn ${teamViewTab === "profile" ? "active" : ""}`}
                  onClick={() => setTeamViewTab("profile")}
                >
                  <Globe size={16} />
                  <span>{teamDetail.is_owner ? "Edit Team Profile" : "Team Profile"}</span>
                </button>

                <button
                  type="button"
                  className={`collab-subnav-btn ${teamViewTab === "portfolio" ? "active" : ""}`}
                  onClick={() => setTeamViewTab("portfolio")}
                >
                  <Film size={16} />
                  <span>Team Portfolio ({teamPortfolio.length})</span>
                </button>
              </div>

              {/* TAB CONTENT 1: OVERVIEW */}
              {teamViewTab === "overview" && (
                <div className="collab-team-detail-sections">
                  {/* 1. Shared Service Coverage */}
                  <div className="collab-members-card">
                    <div className="collab-members-card-header">
                      <h3 className="collab-members-card-title">
                        <Layers size={18} color="#ff5722" />
                        <span>Team Shared Coverage (Intersection)</span>
                      </h3>
                      <span className="collab-badge-coverage">
                        {teamDetail.shared_coverage?.count || 0} Common District
                        {teamDetail.shared_coverage?.count === 1 ? "" : "s"}
                      </span>
                    </div>

                    {teamDetail.shared_coverage?.count > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {(teamDetail.shared_coverage.states || []).map((st) => (
                          <div
                            key={st.id || st.name}
                            style={{
                              background: "#161616",
                              border: "1px solid #282828",
                              borderRadius: "8px",
                              padding: "14px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "10px",
                                fontSize: "0.92rem",
                                fontWeight: 700,
                                color: "#fff",
                              }}
                            >
                              <span>{st.name}</span>
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
                      <div
                        style={{
                          padding: "24px",
                          textAlign: "center",
                          background: "#161616",
                          borderRadius: "8px",
                          border: "1px dashed #333",
                          color: "#999",
                        }}
                      >
                        <AlertCircle size={28} style={{ color: "#ff7043", marginBottom: "8px" }} />
                        <p style={{ fontWeight: 600, color: "#fff", margin: "0 0 4px" }}>
                          No common service coverage
                        </p>
                        <p style={{ fontSize: "0.86rem", margin: 0 }}>
                          The active members of this team do not currently share any overlapping service districts.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 2. Active Members */}
                  <div className="collab-members-card">
                    <div className="collab-members-card-header">
                      <h3 className="collab-members-card-title">
                        <UserCheck size={18} color="#4ade80" />
                        <span>Active Members ({teamDetail.active_members?.length || 0})</span>
                      </h3>
                    </div>

                    <div className="collab-members-table">
                      {(teamDetail.active_members || []).map((m) => (
                        <div key={m.id} className="collab-member-row">
                          <div className="collab-member-info">
                            {m.profile_image ? (
                              <img
                                src={m.profile_image}
                                alt={m.stage_name}
                                className="collab-member-avatar"
                              />
                            ) : (
                              <div className="collab-member-avatar-placeholder">
                                {m.stage_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="collab-member-names">
                              <span className="collab-member-stage-name">
                                {m.stage_name}
                              </span>
                              <span className="collab-member-sub">
                                {m.category_name} · {m.base_location}
                              </span>
                            </div>
                          </div>

                          <div className="collab-member-actions">
                            {m.role === "owner" ? (
                              <span className="collab-owner-tag">Owner</span>
                            ) : (
                              <span className="collab-member-tag">Member</span>
                            )}

                            <button
                              type="button"
                              className="collab-btn-back"
                              style={{ padding: "5px 10px", fontSize: "0.78rem" }}
                              onClick={() => handleViewProfile(m.artist_id)}
                            >
                              Profile
                            </button>

                            {teamDetail.is_owner && m.role !== "owner" && (
                              <button
                                type="button"
                                className="collab-btn-remove"
                                onClick={() => handleRemoveMember(m.id, m.stage_name)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. Pending Invitations (visible to owner) */}
                  {teamDetail.is_owner && (
                    <div className="collab-members-card">
                      <div className="collab-members-card-header">
                        <h3 className="collab-members-card-title">
                          <Mail size={18} color="#ff7043" />
                          <span>Pending Invitations ({teamDetail.pending_invitations?.length || 0})</span>
                        </h3>
                      </div>

                      {teamDetail.pending_invitations && teamDetail.pending_invitations.length > 0 ? (
                        <div className="collab-members-table">
                          {teamDetail.pending_invitations.map((p) => (
                            <div key={p.id} className="collab-member-row">
                              <div className="collab-member-info">
                                <div className="collab-member-avatar-placeholder">
                                  {p.stage_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="collab-member-names">
                                  <span className="collab-member-stage-name">{p.stage_name}</span>
                                  <span className="collab-member-sub">
                                    {p.category_name} · Invited on {p.created_at}
                                  </span>
                                  {p.message && (
                                    <span style={{ fontSize: "0.78rem", color: "#bbb", fontStyle: "italic" }}>
                                      &ldquo;{p.message}&rdquo;
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span
                                  style={{
                                    background: "rgba(255, 171, 0, 0.15)",
                                    border: "1px solid rgba(255, 171, 0, 0.3)",
                                    color: "#ffc107",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.76rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  Awaiting Response
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "#777", fontSize: "0.88rem", margin: 0 }}>
                          No pending invitations. Click &quot;Invite Artist&quot; above to add members.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT 2: PROFILE MANAGEMENT */}
              {teamViewTab === "profile" && (
                <div className="collab-profile-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #282828", paddingBottom: "14px" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
                        Team Public Profile
                      </h3>
                      <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#9ca3af" }}>
                        Customize your team logo, cover image, category and visibility on TalentHire.
                      </p>
                    </div>
                    <a
                      href={`/teams/${teamDetail.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="collab-btn-public-preview"
                    >
                      <ExternalLink size={15} />
                      <span>View Live Page</span>
                    </a>
                  </div>

                  {profileMsg.text && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "0.88rem",
                        background: profileMsg.type === "success" ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                        border: `1px solid ${profileMsg.type === "success" ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
                        color: profileMsg.type === "success" ? "#4ade80" : "#f87171",
                      }}
                    >
                      {profileMsg.text}
                    </div>
                  )}

                  {!teamDetail.is_owner ? (
                    <div style={{ padding: "20px", background: "#141414", borderRadius: "8px", border: "1px solid #262626", color: "#bbb" }}>
                      <p style={{ margin: "0 0 10px", fontWeight: 600, color: "#fff" }}>Only the team owner can edit profile settings.</p>
                      <p style={{ margin: 0, fontSize: "0.88rem" }}>Team Name: <strong>{teamDetail.name}</strong></p>
                      <p style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>Category: <strong>{teamDetail.category_name || "Uncategorized"}</strong></p>
                      <p style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>Public Visibility: <strong>{teamDetail.is_publicly_visible !== false ? "Visible" : "Private"}</strong></p>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div className="collab-profile-grid">
                        {/* Team Logo */}
                        <div className="collab-image-upload-box">
                          <label style={{ fontSize: "0.84rem", fontWeight: 700, color: "#e4e4e7" }}>Team Logo / Avatar</label>
                          {profileLogoPreview && !removeProfileLogo ? (
                            <img src={profileLogoPreview} alt="Logo Preview" className="collab-image-preview-logo" />
                          ) : (
                            <div className="collab-image-placeholder">
                              <ImageIcon size={32} />
                            </div>
                          )}
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                            <label className="collab-btn-back" style={{ cursor: "pointer", fontSize: "0.78rem", padding: "5px 10px" }}>
                              <Upload size={13} style={{ marginRight: "4px" }} />
                              <span>{profileLogoPreview ? "Change Logo" : "Upload Logo"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setProfileLogoFile(file);
                                    setProfileLogoPreview(URL.createObjectURL(file));
                                    setRemoveProfileLogo(false);
                                  }
                                }}
                              />
                            </label>
                            {profileLogoPreview && !removeProfileLogo && (
                              <button
                                type="button"
                                className="collab-btn-remove"
                                style={{ fontSize: "0.78rem", padding: "5px 8px" }}
                                onClick={() => {
                                  setProfileLogoFile(null);
                                  setRemoveProfileLogo(true);
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <span style={{ fontSize: "0.72rem", color: "#71717a" }}>Square image recommended (Max 5MB)</span>
                        </div>

                        {/* Team Cover Banner */}
                        <div className="collab-image-upload-box">
                          <label style={{ fontSize: "0.84rem", fontWeight: 700, color: "#e4e4e7" }}>Cover Banner Image</label>
                          {coverImagePreview && !removeCoverImage ? (
                            <img src={coverImagePreview} alt="Cover Preview" className="collab-image-preview-cover" />
                          ) : (
                            <div className="collab-cover-placeholder">
                              <ImageIcon size={32} />
                            </div>
                          )}
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                            <label className="collab-btn-back" style={{ cursor: "pointer", fontSize: "0.78rem", padding: "5px 10px" }}>
                              <Upload size={13} style={{ marginRight: "4px" }} />
                              <span>{coverImagePreview ? "Change Cover" : "Upload Cover"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setCoverImageFile(file);
                                    setCoverImagePreview(URL.createObjectURL(file));
                                    setRemoveCoverImage(false);
                                  }
                                }}
                              />
                            </label>
                            {coverImagePreview && !removeCoverImage && (
                              <button
                                type="button"
                                className="collab-btn-remove"
                                style={{ fontSize: "0.78rem", padding: "5px 8px" }}
                                onClick={() => {
                                  setCoverImageFile(null);
                                  setRemoveCoverImage(true);
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <span style={{ fontSize: "0.72rem", color: "#71717a" }}>Wide ratio recommended (Max 5MB)</span>
                        </div>
                      </div>

                      {/* Name & Category */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                        <div className="collab-form-group">
                          <label className="collab-label">Team Display Name *</label>
                          <input
                            type="text"
                            required
                            maxLength={150}
                            className="collab-input"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                          />
                        </div>

                        <div className="collab-form-group">
                          <label className="collab-label">Performance Category</label>
                          <select
                            className="collab-select"
                            value={profileForm.category_id}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, category_id: e.target.value }))}
                          >
                            <option value="">-- Select Team Category --</option>
                            {teamCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="collab-form-group">
                        <label className="collab-label">About the Team / Bio</label>
                        <textarea
                          rows={4}
                          className="collab-textarea"
                          placeholder="Describe your team, musical or performance style, stage setup..."
                          value={profileForm.description}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, description: e.target.value }))}
                        />
                      </div>

                      {/* Visibility Toggle */}
                      <div style={{ background: "#141414", border: "1px solid #282828", borderRadius: "8px", padding: "14px 16px" }}>
                        <label className="collab-toggle-label">
                          <input
                            type="checkbox"
                            checked={profileForm.is_publicly_visible}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, is_publicly_visible: e.target.checked }))}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: "#fff" }}>Publicly Visible Team Profile</div>
                            <div style={{ fontSize: "0.8rem", color: "#888" }}>
                              When enabled, your team profile can be visited publicly at /teams/{teamDetail.id}. If disabled, only team members can view it.
                            </div>
                          </div>
                        </label>
                      </div>

                      {/* Save Button */}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="collab-btn-primary"
                          style={{ padding: "10px 24px" }}
                        >
                          {profileSaving ? "Saving..." : "Save Profile Changes"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB CONTENT 3: TEAM PORTFOLIO */}
              {teamViewTab === "portfolio" && (
                <div className="collab-profile-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #282828", paddingBottom: "14px", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
                        Team Portfolio & Media
                      </h3>
                      <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#9ca3af" }}>
                        Showcase high-energy photos, videos, and YouTube stage performances for your team.
                      </p>
                    </div>

                    {teamDetail.is_owner && (
                      <button
                        type="button"
                        className="collab-btn-primary"
                        onClick={() => {
                          setPortfolioError("");
                          setPortfolioForm({
                            item_type: "photo",
                            title: "",
                            description: "",
                            youtube_url: "",
                            is_public: true,
                          });
                          setPortfolioFile(null);
                          setPortfolioFilePreview(null);
                          setShowAddPortfolioModal(true);
                        }}
                      >
                        <Plus size={16} />
                        <span>Add Portfolio Item</span>
                      </button>
                    )}
                  </div>

                  {portfolioLoading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                      Loading team media...
                    </div>
                  ) : teamPortfolio.length === 0 ? (
                    <div
                      style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        background: "#141414",
                        borderRadius: "10px",
                        border: "1px dashed #333",
                        color: "#888",
                      }}
                    >
                      <Film size={36} color="#FF5722" style={{ marginBottom: "12px" }} />
                      <h4 style={{ color: "#fff", margin: "0 0 6px" }}>No portfolio items yet</h4>
                      <p style={{ fontSize: "0.88rem", margin: 0, maxWidth: "420px", marginInline: "auto" }}>
                        {teamDetail.is_owner
                          ? "Add photos, live concert videos, or YouTube links to make your team profile stand out."
                          : "The team owner has not uploaded any portfolio items yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="collab-portfolio-grid">
                      {teamPortfolio.map((item, index) => (
                        <div key={item.id} className="collab-portfolio-card">
                          <div
                            className="collab-portfolio-media-thumb"
                            onClick={() => setActivePreviewMedia(item)}
                            style={{ cursor: "pointer" }}
                          >
                            {item.thumbnail_url || item.thumbnail || (item.item_type === "photo" && (item.media_url || item.media_file)) ? (
                              <img
                                src={item.thumbnail_url || item.thumbnail || item.media_url || item.media_file}
                                alt={item.title}
                              />
                            ) : (
                              <div style={{ color: "#71717a", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                {item.item_type === "video" ? <Video size={36} /> : <Film size={36} />}
                                <span style={{ fontSize: "0.75rem" }}>Media Preview</span>
                              </div>
                            )}

                            <span className="collab-portfolio-type-pill">
                              {item.item_type}
                            </span>

                            {(item.item_type === "video" || item.item_type === "youtube") && (
                              <div className="collab-portfolio-play-overlay">
                                <Play size={20} fill="#fff" />
                              </div>
                            )}
                          </div>

                          <div className="collab-portfolio-body">
                            <h4 className="collab-portfolio-title" title={item.title}>
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className="collab-portfolio-desc" title={item.description}>
                                {item.description}
                              </p>
                            )}

                            <div className="collab-portfolio-footer">
                              <span className={item.is_public ? "collab-badge-public" : "collab-badge-private"}>
                                {item.is_public ? (
                                  <>
                                    <Eye size={12} /> Public
                                  </>
                                ) : (
                                  <>
                                    <EyeOff size={12} /> Private
                                  </>
                                )}
                              </span>

                              {teamDetail.is_owner && (
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  {index > 0 && (
                                    <button
                                      type="button"
                                      className="collab-portfolio-btn-icon"
                                      title="Move Up"
                                      onClick={() => handleMovePortfolioItem(index, "up")}
                                    >
                                      <ArrowUp size={14} />
                                    </button>
                                  )}

                                  {index < teamPortfolio.length - 1 && (
                                    <button
                                      type="button"
                                      className="collab-portfolio-btn-icon"
                                      title="Move Down"
                                      onClick={() => handleMovePortfolioItem(index, "down")}
                                    >
                                      <ArrowDown size={14} />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="collab-portfolio-btn-icon"
                                    title={item.is_public ? "Make Private" : "Make Public"}
                                    onClick={() => handleTogglePortfolioVisibility(item)}
                                  >
                                    {item.is_public ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>

                                  <button
                                    type="button"
                                    className="collab-portfolio-btn-icon delete"
                                    title="Delete item"
                                    onClick={() => handleDeletePortfolioItem(item.id)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* TEAMS LIST VIEW */
            <div>
              {/* Alert banner if pending invitations exist */}
              {invitationsCount > 0 && (
                <div
                  style={{
                    background: "rgba(255, 87, 34, 0.12)",
                    border: "1px solid rgba(255, 87, 34, 0.35)",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    marginBottom: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Mail size={22} color="#ff5722" />
                    <div>
                      <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>
                        You have {invitationsCount} pending collaboration invitation{invitationsCount === 1 ? "" : "s"}!
                      </div>
                      <div style={{ color: "#9ca3af", fontSize: "0.82rem" }}>
                        Another artist invited you to join their performing team across shared districts.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="collab-btn-primary"
                    onClick={() => setActiveSubTab("invitations")}
                    style={{ padding: "7px 14px", fontSize: "0.84rem" }}
                  >
                    View Invitations ({invitationsCount})
                  </button>
                </div>
              )}

              {teamsLoading ? (
                <div className="collab-loading-state">
                  <div className="collab-spinner" />
                  <p style={{ color: "#9ca3af", margin: 0 }}>Loading your collaboration teams...</p>
                </div>
              ) : teamsError ? (
                <div className="collab-error-state">
                  <AlertCircle size={40} />
                  <h3 className="collab-empty-title">Error Loading Teams</h3>
                  <p className="collab-empty-desc">{teamsError}</p>
                  <button type="button" className="collab-btn-primary" onClick={loadTeams}>
                    Try Again
                  </button>
                </div>
              ) : teams.length === 0 ? (
                <div className="collab-empty-state">
                  <Users size={44} />
                  <h3 className="collab-empty-title">You have not joined any teams yet</h3>
                  {invitationsCount > 0 ? (
                    <>
                      <p className="collab-empty-desc">
                        You have <strong>{invitationsCount}</strong> pending team invitation{invitationsCount === 1 ? "" : "s"} waiting for your response. Review and accept to join!
                      </p>
                      <button
                        type="button"
                        className="collab-btn-primary"
                        onClick={() => setActiveSubTab("invitations")}
                      >
                        Review Received Invitations ({invitationsCount})
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="collab-empty-desc">
                        Create a new collaboration team or check your pending invitations to partner
                        with fellow artists across shared districts.
                      </p>
                      <button
                        type="button"
                        className="collab-btn-primary"
                        onClick={() => {
                          setCreateForm({ name: "", description: "" });
                          setCreateError("");
                          setShowCreateModal(true);
                        }}
                      >
                        Create Your First Team
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "0.92rem", color: "#9ca3af", fontWeight: 600 }}>
                      Teams you own or have joined as an active member ({teams.length})
                    </span>
                    <button
                      type="button"
                      className="collab-btn-invite"
                      onClick={() => {
                        setCreateForm({ name: "", description: "" });
                        setCreateError("");
                        setShowCreateModal(true);
                      }}
                      style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                    >
                      <Plus size={15} />
                      <span>Create Team</span>
                    </button>
                  </div>

                  <div className="collab-teams-grid">
                  {teams.map((t) => (
                    <div key={t.id} className="collab-team-card">
                      <div className="collab-team-card-header">
                        <div>
                          <h4 className="collab-team-name">{t.name}</h4>
                          <p className="collab-team-desc">
                            {t.description || "No description provided."}
                          </p>
                        </div>
                        {t.is_owner ? (
                          <span className="collab-owner-tag">Owner</span>
                        ) : (
                          <span className="collab-member-tag">Member</span>
                        )}
                      </div>

                      <div className="collab-team-meta-row">
                        <div className="collab-team-meta-item">
                          <span className="collab-team-meta-label">Active Members</span>
                          <span className="collab-team-meta-val">{t.active_members_count}</span>
                        </div>
                        <div className="collab-team-meta-item">
                          <span className="collab-team-meta-label">Shared Coverage</span>
                          <span className="collab-team-meta-val highlight">
                            {t.shared_districts_count} District
                            {t.shared_districts_count === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="collab-team-meta-item">
                          <span className="collab-team-meta-label">Status</span>
                          <span
                            className="collab-team-meta-val"
                            style={{
                              color: t.is_eligible_for_discovery ? "#4ade80" : "#f87171",
                              fontSize: "0.82rem",
                            }}
                          >
                            {t.is_eligible_for_discovery ? "Eligible" : "Ineligible"}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          type="button"
                          className="collab-btn-profile"
                          onClick={() => setSelectedTeamId(t.id)}
                        >
                          <span>Manage Team</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          )}
        </>
      )}

      {/* =====================================================================
          TAB 2: RECEIVED INVITATIONS
          ===================================================================== */}
      {activeSubTab === "invitations" && (
        <div>
          {invitationsLoading ? (
            <div className="collab-loading-state">
              <div className="collab-spinner" />
              <p style={{ color: "#9ca3af", margin: 0 }}>Checking for invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="collab-empty-state">
              <Mail size={44} />
              <h3 className="collab-empty-title">No Pending Invitations</h3>
              <p className="collab-empty-desc">
                When other artists invite you to join their collaboration teams, they will appear
                here for your review.
              </p>
            </div>
          ) : (
            <div className="collab-invitations-grid">
              {invitations.map((inv) => (
                <div key={inv.id} className="collab-invitation-card">
                  <div className="collab-invitation-header">
                    <div>
                      <h4 className="collab-invitation-team-name">{inv.team_name}</h4>
                      <span className="collab-invitation-date">
                        Invited by {inv.invited_by_name} on {inv.created_at}
                      </span>
                    </div>
                  </div>

                  {inv.team_description && (
                    <p style={{ fontSize: "0.88rem", color: "#a0a0a0", margin: 0 }}>
                      {inv.team_description}
                    </p>
                  )}

                  {inv.message && (
                    <p className="collab-invitation-message">
                      &ldquo;{inv.message}&rdquo;
                    </p>
                  )}

                  <div
                    style={{
                      background: "#161616",
                      padding: "10px",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      color: "#999",
                    }}
                  >
                    Current team coverage:{" "}
                    <strong style={{ color: "#ff7043" }}>
                      {inv.team_current_coverage?.districts_count || 0} districts
                    </strong>
                  </div>

                  <div className="collab-invitation-actions">
                    <button
                      type="button"
                      className="collab-btn-accept"
                      onClick={() => handleRespondInvitation(inv.id, "accept")}
                    >
                      Accept Invitation
                    </button>
                    <button
                      type="button"
                      className="collab-btn-decline"
                      onClick={() => handleRespondInvitation(inv.id, "decline")}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: FIND COLLABORATORS (PHASE 3 ENHANCED)
          ===================================================================== */}
      {activeSubTab === "discover" && (
        <div>
          {/* Filter Card */}
          <div className="collab-filter-card">
            <div className="collab-filter-row">
              <div className="collab-filter-field">
                <label htmlFor="collab-search">Search Collaborator</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="collab-search"
                    type="text"
                    className="collab-input"
                    placeholder="Name, category or skill..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: "36px" }}
                  />
                  <Search
                    size={16}
                    color="#6b7280"
                    style={{ position: "absolute", left: "12px", top: "12px" }}
                  />
                </div>
              </div>

              <div className="collab-filter-field">
                <label htmlFor="collab-category">Category</label>
                <select
                  id="collab-category"
                  className="collab-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="collab-filter-field">
                <label htmlFor="collab-event-date">Optional Event Date</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="collab-event-date"
                    type="date"
                    className="collab-input"
                    min={todayIso}
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    style={{ paddingLeft: "36px" }}
                  />
                  <Calendar
                    size={16}
                    color="#ff5722"
                    style={{ position: "absolute", left: "12px", top: "12px" }}
                  />
                </div>
              </div>

              <div className="collab-filter-field">
                <label>Starting Price (₹)</label>
                <div className="collab-price-inputs">
                  <input
                    type="number"
                    className="collab-input"
                    placeholder="Min"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <span className="collab-price-divider">-</span>
                  <input
                    type="number"
                    className="collab-input"
                    placeholder="Max"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="collab-filter-actions">
                <button type="button" className="collab-btn-reset" onClick={handleResetFilters}>
                  <RotateCcw size={14} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="collab-results-meta" style={{ marginTop: "16px", marginBottom: "16px" }}>
            <span>
              Showing <strong>{collaborators.length}</strong> compatible collaborator
              {collaborators.length === 1 ? "" : "s"}
              {eventDate ? ` available on ${eventDate}` : ""}
            </span>
          </div>

          {loading ? (
            <div className="collab-loading-state">
              <div className="collab-spinner" />
              <p style={{ color: "#9ca3af", margin: 0 }}>Finding compatible collaborators...</p>
            </div>
          ) : error ? (
            <div className="collab-error-state">
              <AlertCircle size={40} />
              <h3 className="collab-empty-title">Error Loading Collaborators</h3>
              <p className="collab-empty-desc">{error}</p>
              <button type="button" className="collab-btn-primary" onClick={loadRecommendations}>
                Try Again
              </button>
            </div>
          ) : collaborators.length === 0 ? (
            <div className="collab-empty-state">
              <Users size={44} />
              <h3 className="collab-empty-title">No Compatible Collaborators Found</h3>
              <p className="collab-empty-desc">
                No active artists currently share service coverage for the selected filters.
              </p>
              <button type="button" className="collab-btn-primary" onClick={handleResetFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="collab-grid">
              {collaborators.map((c) => {
                const sharedDistricts = c.shared_districts || [];
                const sharedCount = c.shared_districts_count || sharedDistricts.length;
                const previewDistricts = sharedDistricts.slice(0, 3);
                const remainingCount = sharedCount - previewDistricts.length;

                return (
                  <div key={c.id} className="collab-card">
                    <div className="collab-card-header">
                      {c.profile_image || c.featured_image ? (
                        <img
                          src={c.profile_image || c.featured_image}
                          alt={c.stage_name}
                          className="collab-avatar"
                        />
                      ) : (
                        <div className="collab-avatar-placeholder">
                          {c.stage_name ? c.stage_name.charAt(0).toUpperCase() : "A"}
                        </div>
                      )}
                      <div className="collab-title-area">
                        <h4 className="collab-stage-name" title={c.stage_name}>
                          {c.stage_name}
                        </h4>
                        <span className="collab-category-badge">{c.category_name || "Artist"}</span>
                      </div>
                    </div>

                    <div className="collab-card-body">
                      <div className="collab-meta-row">
                        <span className="collab-rating">
                          <Star size={14} fill="#ffb74d" color="#ffb74d" />
                          {c.avg_rating || "4.8"}
                        </span>
                        <span className="collab-price">
                          From <span>₹{Number(c.starting_price || 0).toLocaleString("en-IN")}</span>
                        </span>
                      </div>

                      <div className="collab-location-row">
                        <MapPin size={15} />
                        <span>
                          Base:{" "}
                          {c.district?.name && c.state?.name
                            ? `${c.district.name}, ${c.state.name}`
                            : c.location || "India"}
                        </span>
                      </div>

                      <div className="collab-shared-box">
                        <div className="collab-shared-title">
                          <span>
                            <Sparkles
                              size={14}
                              style={{ marginRight: "4px", verticalAlign: "middle" }}
                            />
                            {sharedCount} Shared District{sharedCount === 1 ? "" : "s"}
                          </span>
                          {sharedCount > 3 && (
                            <button
                              type="button"
                              onClick={() => setViewingArtist(c)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ff7043",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                textDecoration: "underline",
                                padding: 0,
                              }}
                            >
                              View all ({c.shared_states?.length || 1} state{c.shared_states?.length === 1 ? "" : "s"})
                            </button>
                          )}
                        </div>

                        {c.shared_states && c.shared_states.length > 0 && (
                          <div className="collab-shared-states-line">
                            <span className="collab-shared-states-label">Common States:</span>{" "}
                            <span className="collab-shared-states-names">
                              {c.shared_states.join(", ")}
                            </span>
                          </div>
                        )}

                        <div className="collab-shared-pills">
                          {previewDistricts.map((d) => (
                            <span key={d.id} className="collab-shared-pill">
                              {d.name} {d.state_name ? `(${d.state_name})` : ""}
                            </span>
                          ))}
                          {remainingCount > 0 && (
                            <span className="collab-shared-more">+{remainingCount} more</span>
                          )}
                        </div>
                      </div>

                      {eventDate && c.is_available_on_date && (
                        <div className="collab-date-badge available">
                          <CheckCircle2 size={14} />
                          <span>Available on {eventDate}</span>
                        </div>
                      )}
                    </div>

                    <div className="collab-card-footer">
                      <button
                        type="button"
                        className="collab-btn-profile"
                        onClick={() => handleViewProfile(c.id)}
                      >
                        <span>Profile</span>
                        <ExternalLink size={14} />
                      </button>

                      <button
                        type="button"
                        className="collab-btn-invite"
                        style={{ padding: "8px 12px", fontSize: "0.82rem" }}
                        onClick={() => handleInviteFromDiscovery(c)}
                      >
                        <Plus size={14} />
                        <span>Invite</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE TEAM
          ===================================================================== */}
      {showCreateModal && (
        <div
          className="collab-coverage-modal-backdrop"
          onClick={() => setShowCreateModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="collab-coverage-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="collab-modal-header">
              <h3>Create Collaboration Team</h3>
              <button
                type="button"
                className="collab-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div style={{ color: "#ef4444", fontSize: "0.88rem", fontWeight: 600 }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTeamSubmit}>
              <div className="collab-form-group">
                <label className="collab-form-label">Team Name *</label>
                <input
                  type="text"
                  className="collab-form-input"
                  placeholder="e.g. Kozhikode Live Fusion Ensemble"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="collab-form-group">
                <label className="collab-form-label">Description (Optional)</label>
                <textarea
                  className="collab-form-textarea"
                  placeholder="Describe your collaborative group, musical genre, and performance setup..."
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                />
              </div>

              <div className="collab-form-actions">
                <button
                  type="button"
                  className="collab-btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="collab-btn-invite" disabled={createSubmitting}>
                  {createSubmitting ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: INVITE ARTIST
          ===================================================================== */}
      {showInviteModal && (
        <div
          className="collab-coverage-modal-backdrop"
          onClick={() => setShowInviteModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="collab-coverage-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="collab-modal-header">
              <h3>Invite Artist to Team</h3>
              <button
                type="button"
                className="collab-modal-close"
                onClick={() => setShowInviteModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {inviteError && (
              <div style={{ color: "#ef4444", fontSize: "0.88rem", fontWeight: 600 }}>
                {inviteError}
              </div>
            )}

            <form onSubmit={handleSendInvitationSubmit}>
              {/* Target Team Selection */}
              <div className="collab-form-group">
                <label className="collab-form-label">Team *</label>
                {teams.length > 1 ? (
                  <select
                    className="collab-select"
                    value={inviteForm.teamId || selectedTeamId || teams[0]?.id || ""}
                    onChange={(e) => {
                      const selId = Number(e.target.value);
                      const selTeam = teams.find((t) => t.id === selId);
                      setInviteForm({
                        ...inviteForm,
                        teamId: selId,
                        teamName: selTeam?.name || "",
                      });
                      setSelectedTeamId(selId);
                    }}
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.is_owner ? "(Owner)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    style={{
                      background: "#202020",
                      border: "1px solid #333",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      color: "#ffab91",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                    }}
                  >
                    {inviteForm.teamName || teams[0]?.name || "Your Team"}
                  </div>
                )}
              </div>

              <div className="collab-form-group">
                <label className="collab-form-label">Artist Stage Name or ID *</label>
                {inviteForm.artistName ? (
                  <div
                    style={{
                      background: "#222",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      color: "#fff",
                      fontWeight: 600,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      Inviting: <strong>{inviteForm.artistName}</strong> (#{inviteForm.artistId})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setInviteForm({ ...inviteForm, artistName: "", artistId: "" })
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ff7043",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        textDecoration: "underline",
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    className="collab-form-input"
                    placeholder="Enter artist ID or Stage Name..."
                    value={inviteForm.artistId}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, artistId: e.target.value })
                    }
                    required
                  />
                )}
              </div>

              <div className="collab-form-group">
                <label className="collab-form-label">Invitation Message (Optional)</label>
                <textarea
                  className="collab-form-textarea"
                  placeholder="Add a personalized message explaining why you'd like to collaborate..."
                  value={inviteForm.message}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, message: e.target.value })
                  }
                />
              </div>

              <div className="collab-form-actions">
                <button
                  type="button"
                  className="collab-btn-cancel"
                  onClick={() => setShowInviteModal(false)}
                  disabled={inviteSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="collab-btn-invite" disabled={inviteSubmitting}>
                  {inviteSubmitting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: LEAVE TEAM / TRANSFER OWNERSHIP
          ===================================================================== */}
      {showLeaveModal && teamDetail && (
        <div
          className="collab-coverage-modal-backdrop"
          onClick={() => setShowLeaveModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="collab-coverage-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="collab-modal-header">
              <h3>{teamDetail.is_owner ? "Manage Team Ownership" : "Leave Team"}</h3>
              <button
                type="button"
                className="collab-modal-close"
                onClick={() => setShowLeaveModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {leaveError && (
              <div style={{ color: "#ef4444", fontSize: "0.88rem", fontWeight: 600 }}>
                {leaveError}
              </div>
            )}

            <form onSubmit={handleLeaveTeamSubmit}>
              {teamDetail.is_owner ? (
                <div>
                  <p style={{ color: "#a0a0a0", fontSize: "0.9rem", margin: "0 0 16px" }}>
                    You are the owner of <strong>{teamDetail.name}</strong>. To leave, you can
                    transfer ownership to another active member, or close and disband the team.
                  </p>

                  {teamDetail.active_members?.filter((m) => m.artist_id !== artistProfile?.id)
                    .length > 0 ? (
                    <>
                      <div className="collab-form-group">
                        <label className="collab-form-label">
                          Transfer Ownership to Active Member:
                        </label>
                        <select
                          className="collab-select"
                          value={leaveForm.newOwnerId}
                          disabled={leaveForm.closeTeam}
                          onChange={(e) =>
                            setLeaveForm({ ...leaveForm, newOwnerId: e.target.value })
                          }
                        >
                          <option value="">Select a new owner...</option>
                          {teamDetail.active_members
                            .filter((m) => m.artist_id !== artistProfile?.id)
                            .map((m) => (
                              <option key={m.artist_id} value={m.artist_id}>
                                {m.stage_name} ({m.category_name})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div style={{ margin: "16px 0" }}>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "0.88rem",
                            fontWeight: 600,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={leaveForm.closeTeam}
                            onChange={(e) =>
                              setLeaveForm({
                                ...leaveForm,
                                closeTeam: e.target.checked,
                                newOwnerId: "",
                              })
                            }
                          />
                          <span>Or close and disband this team completely</span>
                        </label>
                      </div>
                    </>
                  ) : (
                    <p style={{ color: "#ef4444", fontSize: "0.9rem" }}>
                      You are the only member in this team. Leaving will close and disband the team.
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ color: "#a0a0a0", fontSize: "0.9rem" }}>
                  Are you sure you want to leave <strong>{teamDetail.name}</strong>? Your service
                  districts will no longer contribute to the team&apos;s shared coverage.
                </p>
              )}

              <div className="collab-form-actions">
                <button
                  type="button"
                  className="collab-btn-cancel"
                  onClick={() => setShowLeaveModal(false)}
                  disabled={leaveSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="collab-btn-leave"
                  disabled={leaveSubmitting}
                >
                  {leaveSubmitting ? "Processing..." : "Confirm & Leave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: VIEW ALL SHARED DISTRICTS (DISCOVERY)
          ===================================================================== */}
      {viewingArtist && (
        <div
          className="collab-coverage-modal-backdrop"
          onClick={() => setViewingArtist(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="collab-coverage-modal-card collab-shared-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="collab-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sparkles size={20} color="#ff5722" />
                <h3 style={{ margin: 0 }}>Shared Coverage with {viewingArtist.stage_name}</h3>
              </div>
              <button
                type="button"
                className="collab-modal-close"
                onClick={() => setViewingArtist(null)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Coverage Summary Banner */}
            <div className="collab-modal-summary-banner">
              <div className="collab-modal-summary-top">
                <span className="collab-modal-summary-title">Common Service Coverage</span>
                <span className="collab-modal-summary-count">
                  {viewingArtist.shared_districts?.length || 0} Districts Across{" "}
                  {viewingArtistGroupedCoverage.length} State
                  {viewingArtistGroupedCoverage.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="collab-modal-summary-desc">
                Both you and <strong>{viewingArtist.stage_name}</strong> actively provide booking
                coverage across these shared districts:
              </p>
              <div className="collab-modal-summary-states">
                {viewingArtistGroupedCoverage.map((st) => (
                  <span key={st.name} className="collab-modal-state-badge">
                    <span className="collab-modal-state-badge-dot" />
                    <strong>{st.name}</strong> ({st.districts.length} district
                    {st.districts.length === 1 ? "" : "s"})
                  </span>
                ))}
              </div>
            </div>

            {/* Grouped Common Districts by State */}
            <div className="collab-modal-states-list">
              {viewingArtistGroupedCoverage.map((st) => {
                const isMyBaseState =
                  myBaseStateName && st.name.toLowerCase() === myBaseStateName;
                const isViewingBaseState =
                  viewingBaseStateName && st.name.toLowerCase() === viewingBaseStateName;

                return (
                  <div key={st.name} className="collab-modal-state-group">
                    <div className="collab-modal-state-header">
                      <div className="collab-modal-state-title">
                        <MapPin size={16} color="#ff5722" />
                        <span className="collab-modal-state-name">{st.name}</span>
                        {isMyBaseState && (
                          <span className="collab-tag-base-location">Your Base State</span>
                        )}
                        {isViewingBaseState && !isMyBaseState && (
                          <span className="collab-tag-base-location">
                            {viewingArtist.stage_name}&apos;s Base
                          </span>
                        )}
                      </div>
                      <span className="collab-modal-state-count">
                        {st.districts.length} district{st.districts.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="collab-modal-districts-grid">
                      {st.districts.map((d) => {
                        const dLower = (d.name || "").toLowerCase().trim();
                        const isMyBaseDistrict = myBaseDistrictName && dLower === myBaseDistrictName;
                        const isViewingBaseDistrict =
                          viewingBaseDistrictName && dLower === viewingBaseDistrictName;

                        return (
                          <span
                            key={d.id}
                            className={`collab-modal-district-chip ${
                              isMyBaseDistrict || isViewingBaseDistrict ? "highlight-base" : ""
                            }`}
                          >
                            <span className="collab-district-dot" />
                            <span className="collab-district-name">{d.name}</span>
                            {isMyBaseDistrict && (
                              <span className="collab-chip-base-tag">Your Base</span>
                            )}
                            {isViewingBaseDistrict && !isMyBaseDistrict && (
                              <span className="collab-chip-base-tag">Partner Base</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="collab-modal-footer">
              <span className="collab-modal-footer-info">
                Total Overlapping Coverage:{" "}
                <strong>{viewingArtist.shared_districts?.length || 0} districts</strong>
              </span>
              <button
                type="button"
                className="collab-btn-primary"
                onClick={() => setViewingArtist(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD TEAM PORTFOLIO ITEM
          ===================================================================== */}
      {showAddPortfolioModal && (
        <div
          className="collab-coverage-modal-backdrop"
          onClick={() => setShowAddPortfolioModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="collab-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "560px" }}
          >
            <div className="collab-modal-header">
              <div className="collab-modal-title">
                <Film size={20} color="#ff5722" />
                <span>Add Team Portfolio Item</span>
              </div>
              <button
                type="button"
                className="collab-modal-close"
                onClick={() => setShowAddPortfolioModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {portfolioError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#f87171",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  marginBottom: "14px",
                }}
              >
                {portfolioError}
              </div>
            )}

            <form onSubmit={handleAddPortfolioItem} className="collab-form">
              {/* Item Type Selector */}
              <div className="collab-form-group">
                <label className="collab-label">Media Type *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  {[
                    { type: "photo", label: "Photo", icon: ImageIcon },
                    { type: "video", label: "Video Upload", icon: Video },
                    { type: "youtube", label: "YouTube Link", icon: Play },
                  ].map((t) => {
                    const IconComp = t.icon;
                    const isActive = portfolioForm.item_type === t.type;
                    return (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => {
                          setPortfolioForm((prev) => ({ ...prev, item_type: t.type }));
                          setPortfolioFile(null);
                          setPortfolioFilePreview(null);
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                          padding: "12px 8px",
                          borderRadius: "8px",
                          border: isActive ? "2px solid #FF5722" : "1px solid #333",
                          background: isActive ? "rgba(255, 87, 34, 0.12)" : "#181818",
                          color: isActive ? "#FF5722" : "#a1a1aa",
                          fontWeight: 600,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                        }}
                      >
                        <IconComp size={20} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* YouTube Link or File Upload */}
              {portfolioForm.item_type === "youtube" ? (
                <div className="collab-form-group">
                  <label className="collab-label">YouTube Video URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="collab-input"
                    value={portfolioForm.youtube_url}
                    onChange={(e) => setPortfolioForm((prev) => ({ ...prev, youtube_url: e.target.value }))}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#888", marginTop: "4px" }}>
                    Standard YouTube links, Shorts, and youtu.be links are supported.
                  </span>
                </div>
              ) : (
                <div className="collab-form-group">
                  <label className="collab-label">
                    {portfolioForm.item_type === "photo" ? "Select Photo (JPG, PNG, WebP up to 10MB) *" : "Select Video (MP4 up to 100MB) *"}
                  </label>
                  <input
                    type="file"
                    required
                    accept={portfolioForm.item_type === "photo" ? "image/*" : "video/*"}
                    className="collab-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPortfolioFile(file);
                        if (portfolioForm.item_type === "photo") {
                          setPortfolioFilePreview(URL.createObjectURL(file));
                        }
                      }
                    }}
                  />
                  {portfolioFilePreview && portfolioForm.item_type === "photo" && (
                    <div style={{ marginTop: "10px", maxHeight: "160px", overflow: "hidden", borderRadius: "8px", border: "1px solid #333" }}>
                      <img src={portfolioFilePreview} alt="Preview" style={{ width: "100%", maxHeight: "160px", objectFit: "contain" }} />
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div className="collab-form-group">
                <label className="collab-label">Title / Caption</label>
                <input
                  type="text"
                  placeholder="e.g. Live at Grand Arena 2026"
                  maxLength={150}
                  className="collab-input"
                  value={portfolioForm.title}
                  onChange={(e) => setPortfolioForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="collab-form-group">
                <label className="collab-label">Short Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or credit..."
                  className="collab-textarea"
                  value={portfolioForm.description}
                  onChange={(e) => setPortfolioForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Public Toggle */}
              <label className="collab-toggle-label" style={{ background: "#141414", padding: "10px 14px", borderRadius: "8px", border: "1px solid #282828" }}>
                <input
                  type="checkbox"
                  checked={portfolioForm.is_public}
                  onChange={(e) => setPortfolioForm((prev) => ({ ...prev, is_public: e.target.checked }))}
                />
                <div>
                  <span style={{ fontWeight: 600, color: "#fff", fontSize: "0.86rem" }}>Display on Public Team Profile</span>
                  <div style={{ fontSize: "0.75rem", color: "#888" }}>Uncheck to keep this media visible only to team members.</div>
                </div>
              </label>

              <div className="collab-form-actions" style={{ marginTop: "10px" }}>
                <button
                  type="button"
                  className="collab-btn-cancel"
                  onClick={() => setShowAddPortfolioModal(false)}
                  disabled={portfolioSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="collab-btn-primary"
                  disabled={portfolioSaving}
                >
                  {portfolioSaving ? "Uploading..." : "Add to Portfolio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MEDIA PREVIEW (PHOTO / VIDEO / YOUTUBE)
          ===================================================================== */}
      {activePreviewMedia && (
        <div
          className="collab-coverage-modal-backdrop"
          onClick={() => setActivePreviewMedia(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="collab-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "780px", width: "95%", padding: "16px", background: "#121212" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 style={{ margin: 0, color: "#fff", fontSize: "1.05rem", fontWeight: 700 }}>
                {activePreviewMedia.title || "Media Preview"}
              </h4>
              <button
                type="button"
                className="collab-modal-close"
                onClick={() => setActivePreviewMedia(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ width: "100%", maxHeight: "500px", background: "#000", borderRadius: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {activePreviewMedia.item_type === "youtube" ? (
                <iframe
                  src={activePreviewMedia.youtube_embed_url || (activePreviewMedia.youtube_url ? `https://www.youtube.com/embed/${activePreviewMedia.youtube_url.split("v=")[1]?.split("&")[0]}` : "")}
                  title={activePreviewMedia.title}
                  style={{ width: "100%", height: "420px", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : activePreviewMedia.item_type === "video" ? (
                <video
                  src={activePreviewMedia.media_url || activePreviewMedia.media_file}
                  controls
                  autoPlay
                  style={{ maxWidth: "100%", maxHeight: "450px" }}
                />
              ) : (
                <img
                  src={activePreviewMedia.media_url || activePreviewMedia.media_file}
                  alt={activePreviewMedia.title}
                  style={{ maxWidth: "100%", maxHeight: "450px", objectFit: "contain" }}
                />
              )}
            </div>

            {activePreviewMedia.description && (
              <p style={{ marginTop: "12px", color: "#a1a1aa", fontSize: "0.88rem", lineHeight: 1.5, margin: "12px 0 0" }}>
                {activePreviewMedia.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
