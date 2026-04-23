// =============================================================
// App.jsx — Phone Book Lab: Securing the Handshake
// Covers: fetch CSRF token on mount, include header on POST,
//         credentials: "include" for session cookies
// =============================================================

import { useState, useEffect } from "react";
import axios from "axios";

// ── Axios instance ────────────────────────────────────────────
// STUDENT TASK (Bonus): credentials: "include" ensures the browser
// sends the session cookie on every request, even cross-origin.
const api = axios.create({
  baseURL: "http://localhost:3001",
  withCredentials: true, // ← "credentials: 'include'" equivalent in Axios
});

export default function App() {
  // ── State ───────────────────────────────────────────────────
  const [csrfToken,  setCsrfToken]  = useState("");   // TASK 2a
  const [loggedIn,   setLoggedIn]   = useState(false);
  const [username,   setUsername]   = useState("");
  const [password,   setPassword]   = useState("");
  const [contacts,   setContacts]   = useState([]);
  const [newName,    setNewName]     = useState("");
  const [newPhone,   setNewPhone]    = useState("");
  const [statusMsg,  setStatusMsg]  = useState("");

  // ── STUDENT TASK 2a: Fetch CSRF token on mount ───────────────
  // useEffect runs once after the first render (empty dep array).
  // We call the /api/csrf-token endpoint and store the token in state
  // so every subsequent mutating request can include it.
  useEffect(() => {
    api
      .get("/api/csrf-token")
      .then((res) => {
        setCsrfToken(res.data.csrfToken);
        console.log("✅ CSRF token received:", res.data.csrfToken);
      })
      .catch((err) => console.error("Could not fetch CSRF token:", err));
  }, []);

  // ── Login ────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Login is a mutation — include the CSRF token.
      const res = await api.post(
        "/api/login",
        { username, password },
        { headers: { "x-csrf-token": csrfToken } } // TASK 2b pattern
      );
      setLoggedIn(true);
      setStatusMsg(`👋 Welcome, ${res.data.username}!`);
      loadContacts();
    } catch {
      setStatusMsg("❌ Login failed. Try student / lab123");
    }
  };

  const handleLogout = async () => {
    await api.post("/api/logout", {}, { headers: { "x-csrf-token": csrfToken } });
    setLoggedIn(false);
    setContacts([]);
    setStatusMsg("Logged out.");
  };

  // ── Load contacts ────────────────────────────────────────────
  const loadContacts = async () => {
    try {
      const res = await api.get("/api/contacts");
      setContacts(res.data);
    } catch {
      setStatusMsg("❌ Could not load contacts (session expired?)");
    }
  };

  // ── STUDENT TASK 2b: Add contact with CSRF token header ──────
  // The x-csrf-token header is how csurf (server side) verifies the
  // request originated from OUR frontend, not a malicious third-party site.
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(
        "/api/contacts",
        { name: newName, phone: newPhone },
        {
          headers: {
            "x-csrf-token": csrfToken, // ← CSRF token attached here
          },
        }
      );
      setContacts((prev) => [...prev, res.data]);
      setNewName("");
      setNewPhone("");
      setStatusMsg(`✅ Contact "${res.data.name}" added!`);
    } catch (err) {
      // 403 means the server rejected the CSRF token
      if (err.response?.status === 403) {
        setStatusMsg("🚫 CSRF token rejected — request blocked by server.");
      } else {
        setStatusMsg("❌ Failed to add contact.");
      }
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>📒 Phone Book</h1>
        <p style={styles.subtitle}>Lab: Securing the Handshake</p>
      </header>

      {/* Status bar */}
      {statusMsg && <div style={styles.status}>{statusMsg}</div>}

      {/* Debug panel — remove in production */}
      <div style={styles.debugBox}>
        <strong>🔍 Debug</strong>
        <br />
        CSRF Token: <code>{csrfToken || "—not yet fetched—"}</code>
        <br />
        Session: {loggedIn ? "✅ Active" : "❌ None"}
      </div>

      {!loggedIn ? (
        // ── Login form ────────────────────────────────────────
        <section style={styles.card}>
          <h2>Login</h2>
          <p style={styles.hint}>Use: <code>student</code> / <code>lab123</code></p>
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button style={styles.btn} type="submit">
              Login
            </button>
          </form>
        </section>
      ) : (
        <>
          {/* ── Add Contact form ────────────────────────────── */}
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h2>Add Contact</h2>
              <button style={styles.btnSmall} onClick={handleLogout}>
                Logout
              </button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <input
                style={styles.input}
                placeholder="Full Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <input
                style={styles.input}
                placeholder="Phone Number"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
              />
              <button style={styles.btn} type="submit">
                Add Contact
              </button>
            </form>
          </section>

          {/* ── Contact list ─────────────────────────────────── */}
          <section style={styles.card}>
            <h2>Contacts ({contacts.length})</h2>
            {contacts.length === 0 ? (
              <p style={styles.hint}>No contacts yet.</p>
            ) : (
              <ul style={styles.list}>
                {contacts.map((c) => (
                  <li key={c.id} style={styles.listItem}>
                    <span style={styles.contactName}>{c.name}</span>
                    <span style={styles.contactPhone}>{c.phone}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ── Inline styles ─────────────────────────────────────────────
const styles = {
  page: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: 520,
    margin: "40px auto",
    padding: "0 16px",
    color: "#e5e7eb",
  },
  header: {
    borderBottom: "1px solid #2f3747",
    paddingBottom: 12,
    marginBottom: 20,
  },
  title:    { margin: 0, fontSize: 28, letterSpacing: -1 },
  subtitle: { margin: "4px 0 0", color: "#94a3b8", fontSize: 13 },
  status: {
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: "8px 14px",
    marginBottom: 16,
    fontSize: 14,
  },
  debugBox: {
    background: "#0f172a",
    border: "1px dashed #475569",
    borderRadius: 6,
    padding: "8px 14px",
    marginBottom: 20,
    fontSize: 12,
    lineHeight: 1.6,
  },
  card: {
    border: "1px solid #2f3747",
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    background: "#1a2233",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  form:  { display: "flex", flexDirection: "column", gap: 10 },
  input: {
    padding: "8px 12px",
    border: "1px solid #334155",
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "inherit",
    background: "#0f172a",
    color: "#e5e7eb",
  },
  btn: {
    padding: "9px 0",
    background: "#2563eb",
    color: "#ffffff",
    border: "1px solid #1d4ed8",
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "bold",
  },
  btnSmall: {
    padding: "5px 12px",
    background: "transparent",
    border: "1px solid #475569",
    color: "#e2e8f0",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
  },
  hint:  { color: "#94a3b8", fontSize: 13 },
  list:  { listStyle: "none", padding: 0, margin: 0 },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #334155",
    fontSize: 14,
  },
  contactName:  { fontWeight: "bold" },
  contactPhone: { color: "#cbd5e1" },
};
