import { useState, useEffect } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001",
  withCredentials: true, 
});

export default function App() {
  const [csrfToken,  setCsrfToken]  = useState("");  
  const [loggedIn,   setLoggedIn]   = useState(false);
  const [username,   setUsername]   = useState("");
  const [password,   setPassword]   = useState("");
  const [contacts,   setContacts]   = useState([]);
  const [newName,    setNewName]    = useState("");
  const [newPhone,   setNewPhone]   = useState("");
  const [statusMsg,  setStatusMsg]  = useState("");
  const [editId,     setEditId]     = useState(null);
  const [editName,   setEditName]   = useState("");
  const [editPhone,  setEditPhone]  = useState("");

  useEffect(() => {
    api.get("/api/csrf-token").then((res) => {
      setCsrfToken(res.data.csrfToken);
    });

    api.get("/api/me")
      .then((res) => {
        setLoggedIn(true);
        setStatusMsg(`Welcome back, ${res.data.username}!`);
        api.get("/api/contacts").then((r) => setContacts(r.data));
      })
      .catch(() => {});
  }, []);

  const csrfHeader = { "x-csrf-token": csrfToken };

  // ── Login ────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Login is a mutation — include the CSRF token.
      const res = await api.post(
        "/api/login",
        { username, password },
        { headers: csrfHeader }
      );
      setLoggedIn(true);
      setStatusMsg(`Welcome, ${res.data.username}!`);
      loadContacts();
    } catch {
      setStatusMsg(" Login failed. Try student / lab123");
    }
  };

  const handleLogout = async () => {
    await api.post("/api/logout", {}, { headers: csrfHeader });
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
      setStatusMsg("Could not load contacts (session expired?)");
    }
  };

  // ── Create ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(
        "/api/contacts",
        { name: newName, phone: newPhone },
        { headers: csrfHeader }
      );
      setContacts((prev) => [...prev, res.data]);
      setNewName("");
      setNewPhone("");
      setStatusMsg(`Contact "${res.data.name}" added!`);
    } catch (err) {
      if (err.response?.status === 403) {
        setStatusMsg("CSRF token rejected — request blocked by server.");
      } else {
        setStatusMsg("Failed to add contact.");
      }
    }
  };

  // ── Edit helpers ──────────────────────────────────────────────
  const startEdit = (contact) => {
    setEditId(contact.id);
    setEditName(contact.name);
    setEditPhone(contact.phone);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditPhone("");
  };

  // ── Update ────────────────────────────────────────────────────
  const handleUpdate = async (e, id) => {
    e.preventDefault();
    try {
      const res = await api.put(
        `/api/contacts/${id}`,
        { name: editName, phone: editPhone },
        { headers: csrfHeader }
      );
      setContacts((prev) => prev.map((c) => (c.id === id ? res.data : c)));
      setStatusMsg(`Contact "${res.data.name}" updated!`);
      cancelEdit();
    } catch (err) {
      if (err.response?.status === 403) {
        setStatusMsg("CSRF token rejected — request blocked by server.");
      } else {
        setStatusMsg("Failed to update contact.");
      }
    }
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/api/contacts/${id}`, { headers: csrfHeader });
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setStatusMsg(`Contact "${name}" deleted.`);
    } catch (err) {
      if (err.response?.status === 403) {
        setStatusMsg("CSRF token rejected — request blocked by server.");
      } else {
        setStatusMsg("Failed to delete contact.");
      }
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Phone Book</h1>
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
        Session: {loggedIn ? "Active" : "None"}
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
                {contacts.map((c) =>
                  editId === c.id ? (
                    <li key={c.id} style={styles.listItem}>
                      <form
                        onSubmit={(e) => handleUpdate(e, c.id)}
                        style={styles.editForm}
                      >
                        <input
                          style={styles.inputSm}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                        />
                        <input
                          style={styles.inputSm}
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          required
                        />
                        <div style={styles.editActions}>
                          <button style={styles.btnSave} type="submit">Save</button>
                          <button style={styles.btnCancel} type="button" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </form>
                    </li>
                  ) : (
                    <li key={c.id} style={styles.listItem}>
                      <span style={styles.contactName}>{c.name}</span>
                      <span style={styles.contactPhone}>{c.phone}</span>
                      <div style={styles.rowActions}>
                        <button style={styles.btnEdit} onClick={() => startEdit(c)}>Edit</button>
                        <button style={styles.btnDelete} onClick={() => handleDelete(c.id, c.name)}>Delete</button>
                      </div>
                    </li>
                  )
                )}
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
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #334155",
    fontSize: 14,
    gap: 8,
  },
  contactName:  { fontWeight: "bold", flex: 1 },
  contactPhone: { color: "#cbd5e1", flex: 1 },
  rowActions: { display: "flex", gap: 6, flexShrink: 0 },
  inputSm: {
    padding: "5px 8px",
    border: "1px solid #334155",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
    background: "#0f172a",
    color: "#e5e7eb",
    flex: 1,
    minWidth: 0,
  },
  editForm: {
    display: "flex",
    gap: 6,
    width: "100%",
    alignItems: "center",
    flexWrap: "wrap",
  },
  editActions: { display: "flex", gap: 6 },
  btnEdit: {
    padding: "3px 10px",
    background: "transparent",
    border: "1px solid #475569",
    color: "#93c5fd",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
  },
  btnDelete: {
    padding: "3px 10px",
    background: "transparent",
    border: "1px solid #475569",
    color: "#f87171",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
  },
  btnSave: {
    padding: "4px 12px",
    background: "#16a34a",
    border: "none",
    color: "#fff",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
  },
  btnCancel: {
    padding: "4px 12px",
    background: "transparent",
    border: "1px solid #475569",
    color: "#e2e8f0",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
  },
};
