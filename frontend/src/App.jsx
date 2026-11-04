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

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [currentPath, setCurrentPath] = useState(window.location.pathname + window.location.search);

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
    if (redirectTo === "/admin/" || loggedInUser?.role === "admin") {
      window.location.href = "/admin/";
      return;
    }
    if (redirectTo && redirectTo !== "/artist-register") {
      navigate(redirectTo);
      return;
    }
    const hasProfile = Boolean(loggedInUser?.artist_profile || loggedInUser?.is_artist);
    if ((isArtist || loggedInUser?.role === "artist") && !hasProfile) {
      navigate("/artist-register");
    } else {
      navigate("/profile");
    }
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

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setSessionError("");
      navigate("/login");
    }
  }

  // Check if navigating to dashboard views (handles both Customer & Performing Artist)
  const isDashboard =
    currentPath === "/profile" ||
    currentPath === "/profile/" ||
    currentPath.startsWith("/profile?") ||
    currentPath === "/customer-profile" ||
    currentPath === "/customer-profile/" ||
    currentPath.startsWith("/customer-profile?") ||
    currentPath === "/customer-dashboard" ||
    currentPath === "/customer-dashboard/" ||
    currentPath.startsWith("/customer-dashboard?") ||
    currentPath === "/artist-dashboard" ||
    currentPath === "/artist-dashboard/" ||
    currentPath.startsWith("/artist-dashboard?") ||
    currentPath === "/dashboard" ||
    currentPath === "/dashboard/" ||
    currentPath.startsWith("/dashboard?");

  // Extract booking artist ID if path is /book-artist/123 or /book-artist?id=123
  let bookArtistId = null;
  const matchBookArtist = currentPath.match(/^\/book-artist\/(\d+)\/?$/);
  if (matchBookArtist) {
    bookArtistId = matchBookArtist[1];
  } else {
    const params = new URLSearchParams(window.location.search);
    if ((currentPath === "/book-artist" || currentPath === "/book-artist/") && params.get("id")) {
      bookArtistId = params.get("id");
    }
  }

  // Automatically redirect unauthenticated users visiting protected dashboard views to /login
  useEffect(() => {
    if (!checking && !user && isDashboard) {
      queueMicrotask(() => navigate("/login"));
    }
  }, [checking, user, isDashboard, navigate]);

  // Automatically redirect unauthenticated users visiting protected booking page to /login
  useEffect(() => {
    if (!checking && !user && bookArtistId) {
      queueMicrotask(() => navigate(`/login?redirect=${encodeURIComponent(currentPath)}`));
    }
  }, [checking, user, bookArtistId, navigate, currentPath]);

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#181818",
          color: "#F7F7F7",
          gap: "16px",
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
          Loading TalentHire...
        </p>
      </main>
    );
  }

  // Extract artist detail ID if path is /artists/123 or /artists?id=123
  let artistDetailId = null;
  const matchArtist = currentPath.match(/^\/artists\/(\d+)\/?$/);
  if (matchArtist) {
    artistDetailId = matchArtist[1];
  } else {
    const params = new URLSearchParams(window.location.search);
    if ((currentPath === "/artists" || currentPath === "/artist") && params.get("id")) {
      artistDetailId = params.get("id");
    }
  }

  const isArtistsList =
    currentPath === "/artists" ||
    currentPath === "/artists/" ||
    currentPath.startsWith("/artists?");

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

      {currentPath === "/login" ? (
        <Login onLogin={handleLoginSuccess} navigate={navigate} />
      ) : currentPath === "/register" ? (
        <Register onLogin={handleLoginSuccess} navigate={navigate} />
      ) : isDashboard ? (
        (user?.role === "artist" || user?.is_artist) ? (
          <ArtistDashboard
            user={user}
            onLogout={handleLogout}
            navigate={navigate}
            onUserUpdate={(updatedUser) => setUser(updatedUser)}
          />
        ) : (
          <CustomerDashboard
            user={user}
            onLogout={handleLogout}
            navigate={navigate}
            onUserUpdate={(updatedUser) => setUser(updatedUser)}
            currentPath={currentPath}
          />
        )
      ) : currentPath === "/artist-register" || currentPath === "/artist-registration" ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#181818" }}>
          <Navbar user={user} onLogout={handleLogout} currentPath="/artist-register" navigate={navigate} />
          <ArtistRegistration
            user={user}
            onProfileSaved={handleArtistProfileSaved}
            onCancel={() => navigate("/")}
            navigate={navigate}
          />
          <Chatbot />
        </div>
      ) : bookArtistId ? (
        <BookingPage
          artistId={bookArtistId}
          user={user}
          onLogout={handleLogout}
          navigate={navigate}
        />
      ) : artistDetailId ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#181818" }}>
          <ArtistDetails
            artistId={artistDetailId}
            user={user}
            onLogout={handleLogout}
            navigate={navigate}
          />
          <Chatbot />
        </div>
      ) : isArtistsList ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#181818" }}>
          <ArtistsList
            key={currentPath}
            user={user}
            onLogout={handleLogout}
            navigate={navigate}
          />
          <Chatbot />
        </div>
      ) : (
        <>
          <Home user={user} onLogout={handleLogout} navigate={navigate} />
          <Chatbot />
        </>
      )}
    </>
  );
}

export default App;
