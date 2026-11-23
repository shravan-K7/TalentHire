import { useState, useEffect, useCallback } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import ArtistsList from "./pages/ArtistsList";
import ArtistDetails from "./pages/ArtistDetails";
import Navbar from "./components/Navbar";
import { getCurrentUser, logoutUser } from "./js/auth";
import Chatbot from "./components/Chatbot";
import ArtistRegistration from "./components/ArtistRegistration";
import CustomerDashboard from "./pages/CustomerDashboard";
import ArtistDashboard from "./pages/ArtistDashboard";
import BookingPage from "./pages/BookingPage";
import AdminDashboard from "./pages/AdminDashboard";
import LogoutModal from "./components/LogoutModal";

function LoadingScreen({ message = "Loading..." }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        background: "#181818",
        color: "#F7F7F7",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "3px solid rgba(255, 87, 34, 0.2)",
          borderTopColor: "#FF5722",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: "0.95rem", color: "#A0A0A0" }}>
        {message}
      </p>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [currentPath, setCurrentPath] = useState(window.location.pathname + window.location.search);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Sync client-side navigation with browser history
  useEffect(() => {
    function handlePopState() {
      setCurrentPath(window.location.pathname + window.location.search);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigate = useCallback((path) => {
    const currentFull = window.location.pathname + window.location.search;
    if (currentFull !== path) {
      window.history.pushState(null, "", path);
      setCurrentPath(path);
    }
  }, []);

  async function checkSession() {
    setChecking(true);
    setSessionError("");

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.warn("Session check failed:", err);
      setUser(null);
      setSessionError("Could not verify existing session. Please sign in.");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function initialCheck() {
      try {
        const currentUser = await getCurrentUser();
        if (!ignore) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn("Session check failed:", err);
        if (!ignore) {
          setUser(null);
          setSessionError("Could not verify existing session. Please sign in.");
        }
      } finally {
        if (!ignore) {
          setChecking(false);
        }
      }
    }

    initialCheck();

    return () => {
      ignore = true;
    };
  }, []);

  function handleLoginSuccess(loggedInUser, isArtist = false, redirectTo = null) {
    setUser(loggedInUser);
    setSessionError("");

    const isAdmin = Boolean(
      loggedInUser?.role === "admin" ||
      loggedInUser?.is_staff ||
      loggedInUser?.is_superuser
    );

    // 1. Admin accounts: always land on /admin-dashboard
    if (isAdmin) {
      if (redirectTo && redirectTo.startsWith("/admin-dashboard")) {
        navigate(redirectTo);
      } else {
        navigate("/admin-dashboard");
      }
      return;
    }

    // 2. Non-admin users attempting to access admin routes must not be allowed
    const params = new URLSearchParams(window.location.search);
    const urlRedirect = params.get("redirect");
    if (urlRedirect && !urlRedirect.startsWith("/admin")) {
      navigate(urlRedirect);
      return;
    }

    if (
      redirectTo &&
      !redirectTo.startsWith("/admin") &&
      redirectTo !== "/" &&
      redirectTo !== "/profile" &&
      redirectTo !== "/customer-dashboard" &&
      redirectTo !== "/artist-dashboard"
    ) {
      navigate(redirectTo);
      return;
    }

    // 3. Non-admin users (both user and artist) land on the home page
    navigate("/");
  }

  function handleArtistProfileSaved(artistData) {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        is_artist: true,
        artist_profile: artistData,
      };
    });
    navigate("/profile");
  }

  function handleRequestLogout() {
    setShowLogoutModal(true);
  }

  function handleCancelLogout() {
    if (!loggingOut) {
      setShowLogoutModal(false);
    }
  }

  async function handleConfirmLogout() {
    setLoggingOut(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
      setUser(null);
      setSessionError("");
      navigate("/login");
    }
  }

  // Extract path without query parameters or trailing slashes for clean matching
  const pathWithoutQuery = currentPath.split("?")[0].replace(/\/+$/, "") || "/";

  const isLogin = pathWithoutQuery === "/login";
  const isRegister = pathWithoutQuery === "/register";

  // Check if navigating to dashboard views (handles both Customer & Performing Artist)
  const isDashboard =
    pathWithoutQuery === "/profile" ||
    pathWithoutQuery === "/customer-profile" ||
    pathWithoutQuery === "/customer-dashboard" ||
    pathWithoutQuery === "/artist-dashboard" ||
    pathWithoutQuery === "/dashboard" ||
    pathWithoutQuery === "/my-bookings" ||
    pathWithoutQuery === "/bookings";

  const isAdminRoute =
    pathWithoutQuery === "/admin-dashboard" ||
    pathWithoutQuery === "/admin" ||
    pathWithoutQuery.startsWith("/admin/") ||
    pathWithoutQuery.startsWith("/admin-dashboard/");

  const isArtistRegistration =
    pathWithoutQuery === "/artist-register" ||
    pathWithoutQuery === "/artist-registration";

  // Extract booking artist ID and check if currently visiting booking route
  const matchBookArtist = pathWithoutQuery.match(/^\/(?:book-artist|booking)(?:\/(\d+))?$/);
  const isBookingRoute = Boolean(matchBookArtist);

  let bookArtistId = null;
  if (isBookingRoute) {
    if (matchBookArtist[1]) {
      bookArtistId = matchBookArtist[1];
    } else {
      const queryIdx = currentPath.indexOf("?");
      const searchStr = queryIdx !== -1 ? currentPath.substring(queryIdx) : "";
      const params = new URLSearchParams(searchStr);
      bookArtistId = params.get("id") || "9";
    }
  }

  // Extract artist detail ID if path is /artists/123 or /artists?id=123
  let artistDetailId = null;
  const matchArtist = pathWithoutQuery.match(/^\/artists\/(\d+)\/?$/);
  if (matchArtist) {
    artistDetailId = matchArtist[1];
  } else {
    const queryIdx = currentPath.indexOf("?");
    const searchStr = queryIdx !== -1 ? currentPath.substring(queryIdx) : "";
    const params = new URLSearchParams(searchStr);
    if ((pathWithoutQuery === "/artists" || pathWithoutQuery === "/artist") && params.get("id")) {
      artistDetailId = params.get("id");
    }
  }

  const isArtistsList = pathWithoutQuery === "/artists" && !artistDetailId;

  // Automatically redirect unauthenticated users visiting protected dashboard views to /login
  useEffect(() => {
    if (!checking && !user && isDashboard) {
      queueMicrotask(() => navigate("/login"));
    }
  }, [checking, user, isDashboard, navigate]);

  // Prevent admins from accidentally landing on customer/artist dashboard views
  useEffect(() => {
    if (!checking && user && isDashboard) {
      if (user.is_staff || user.is_superuser || user.role === "admin") {
        queueMicrotask(() => navigate("/admin-dashboard"));
      }
    }
  }, [checking, user, isDashboard, navigate]);

  // Automatically redirect unauthenticated users visiting admin console to /login
  useEffect(() => {
    if (!checking && !user && isAdminRoute) {
      queueMicrotask(() => navigate(`/login?redirect=${encodeURIComponent(currentPath)}`));
    }
  }, [checking, user, isAdminRoute, navigate, currentPath]);

  // Prevent non-admin users (customers & artists) from accessing admin routes
  useEffect(() => {
    if (!checking && user && isAdminRoute) {
      if (!user.is_staff && !user.is_superuser && user.role !== "admin") {
        const dest = (user.role === "artist" || user.is_artist) ? "/artist-dashboard" : "/customer-dashboard";
        queueMicrotask(() => navigate(dest));
      }
    }
  }, [checking, user, isAdminRoute, navigate]);

  // Automatically redirect unauthenticated users visiting protected booking page to /login
  useEffect(() => {
    if (!checking && !user && isBookingRoute) {
      queueMicrotask(() => navigate(`/login?redirect=${encodeURIComponent(currentPath)}`));
    }
  }, [checking, user, isBookingRoute, navigate, currentPath]);

  return (
    <>
      {sessionError && (
        <aside
          role="status"
          style={{
            background: "rgba(255, 87, 34, 0.15)",
            borderBottom: "1px solid #FF5722",
            color: "#F7F7F7",
            padding: "10px 20px",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            zIndex: 1000,
          }}
        >
          <small>{sessionError}</small>
          <button
            type="button"
            onClick={checkSession}
            style={{
              background: "#FF5722",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "4px",
              padding: "4px 10px",
              fontSize: "0.78rem",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </aside>
      )}

      {isAdminRoute ? (
        checking ? (
          <LoadingScreen message="Loading admin console..." />
        ) : !user ? (
          <LoadingScreen message="Redirecting to sign in..." />
        ) : (!user.is_staff && !user.is_superuser && user.role !== "admin") ? (
          (user.role === "artist" || user.is_artist) ? (
            <ArtistDashboard
              user={user}
              onLogout={handleRequestLogout}
              navigate={navigate}
              onUserUpdate={(updatedUser) => setUser(updatedUser)}
            />
          ) : (
            <CustomerDashboard
              user={user}
              onLogout={handleRequestLogout}
              navigate={navigate}
              onUserUpdate={(updatedUser) => setUser(updatedUser)}
              currentPath={currentPath}
            />
          )
        ) : (
          <AdminDashboard
            user={user}
            onLogout={handleRequestLogout}
            navigate={navigate}
          />
        )
      ) : isLogin ? (
        <Login onLogin={handleLoginSuccess} navigate={navigate} currentPath={currentPath} />
      ) : isRegister ? (
        <Register onLogin={handleLoginSuccess} navigate={navigate} currentPath={currentPath} />
      ) : isDashboard ? (
        checking ? (
          <LoadingScreen message="Loading profile..." />
        ) : !user ? (
          <LoadingScreen message="Redirecting to sign in..." />
        ) : (user?.is_staff || user?.is_superuser || user?.role === "admin") ? (
          <AdminDashboard
            user={user}
            onLogout={handleRequestLogout}
            navigate={navigate}
          />
        ) : (user?.role === "artist" || user?.is_artist) ? (
          <ArtistDashboard
            user={user}
            onLogout={handleRequestLogout}
            navigate={navigate}
            onUserUpdate={(updatedUser) => setUser(updatedUser)}
          />
        ) : (
          <CustomerDashboard
            user={user}
            onLogout={handleRequestLogout}
            navigate={navigate}
            onUserUpdate={(updatedUser) => setUser(updatedUser)}
            currentPath={currentPath}
          />
        )
      ) : isArtistRegistration ? (
        checking ? (
          <LoadingScreen message="Loading artist registration..." />
        ) : (
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#181818" }}>
            <Navbar user={user} currentPath="/artist-register" navigate={navigate} />
            <ArtistRegistration
              user={user}
              onProfileSaved={handleArtistProfileSaved}
              onCancel={() => navigate("/")}
              navigate={navigate}
            />
          </div>
        )
      ) : isBookingRoute ? (
        checking ? (
          <LoadingScreen message="Loading booking details..." />
        ) : !user ? (
          <LoadingScreen message="Redirecting to sign in..." />
        ) : (
          <BookingPage
            artistId={bookArtistId}
            user={user}
            onLogout={handleRequestLogout}
            navigate={navigate}
            checking={checking}
          />
        )
      ) : artistDetailId ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#181818" }}>
          <ArtistDetails
            artistId={artistDetailId}
            user={user}
            onLogout={handleRequestLogout}
            navigate={navigate}
          />
        </div>
      ) : isArtistsList ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#181818" }}>
          <ArtistsList
            key={currentPath}
            user={user}
            onLogout={handleRequestLogout}
            navigate={navigate}
          />
        </div>
      ) : (
        <Home user={user} onLogout={handleRequestLogout} navigate={navigate} />
      )}

      {!isLogin && !isRegister && !isAdminRoute && <Chatbot />}

      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        loading={loggingOut}
      />
    </>
  );
}

export default App;
