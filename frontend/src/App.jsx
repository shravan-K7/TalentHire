import { useState, useEffect } from "react";

const API = "/api/auth";

function App() {
  const [csrfToken, setCsrfToken] = useState("");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function getCsrfToken() {
    const response = await fetch(`${API}/csrf/`, {
      credentials: "include",
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`CSRF request failed: ${response.status} - ${text}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Expected JSON but received: ${text.slice(0, 200)}`);
    }

    setCsrfToken(data.csrfToken);
    return data.csrfToken;
  }

  async function checkLogin() {
    const response = await fetch(`${API}/me/`, {
      credentials: "include",
    });

    if (response.ok) {
      setUser(await response.json());
    } else {
      setUser(null);
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        await getCsrfToken();
        await checkLogin();
      } catch (error) {
        console.error("Initialization error:", error);
        setMessage(error.message);
      }
    }
    initialize();
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Obtain a current CSRF token before submitting.
      const token = csrfToken || (await getCsrfToken());

      const response = await fetch(`${API}/login/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": token,
        },
        body: JSON.stringify({
          username_or_email: usernameOrEmail,
          password: password,
        }),
      });
      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Non-JSON response:", text);
        setMessage(
          `Server returned HTML instead of JSON. HTTP status: ${response.status}`,
        );
        return;
      }

      if (!response.ok) {
        const errors = data.errors
          ? Object.values(data.errors)
              .flat()
              .map((error) => error.message)
              .join(" ")
          : data.error;

        setMessage(errors || "Login failed.");
        return;
      }
      setUser(data.user);
      setPassword("");
      setMessage(data.message);

      await getCsrfToken();
    } catch (error) {
      console.error("Login error:", error);
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setMessage("");
    try {
      const token = csrfToken || (await getCsrfToken());
      const response = await fetch(`${API}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": token,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Logout failed.");
        return;
      }
      setUser(null);
      setPassword("");
      setMessage(data.message);
      await getCsrfToken();
    } catch {
      setMessage("Unable to connect to the server.");
    }
  }

  if (user) {
    return (
      <main>
        <h1>TalentHire</h1>
        <h2>Welcome, {user.username}</h2>

        <p>Email: {user.email || "Not provided"}</p>
        <p>Account type: {user.is_staff ? "Staff" : "User"}</p>

        <button onClick={checkLogin}>Refresh User</button>
        <button onClick={handleLogout}>Logout</button>

        <p role="status">{message}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>TalentHire Login</h1>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="usernameOrEmail">Username or Email</label>
          <input
            id="usernameOrEmail"
            type="text"
            value={usernameOrEmail}
            onChange={(event) => setUsernameOrEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p role="status">{message}</p>
    </main>
  );
}

export default App;
