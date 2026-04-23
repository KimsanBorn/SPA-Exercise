// =============================================================
// server.js — Phone Book Lab: Securing the Handshake
// Covers: express-session, csurf, CSRF token route, CORS, test
// =============================================================

const express = require("express");
const session = require("express-session");
const csrf    = require("csurf");
const cors    = require("cors");

const app = express();

// ── 1. Parse JSON bodies ──────────────────────────────────────
app.use(express.json());

// ── 2. CORS — allow the React dev server and send credentials ─
app.use(
  cors({
    origin: "http://localhost:5173", // Vite default; change if needed
    credentials: true,               // ← lets the browser send cookies
  })
);

// ── 3. Session middleware ──────────────────────────────────────
//   STUDENT TASK 1a: Initialize express-session with a secret.
app.use(
  session({
    secret: "super-secret-lab-key",   // In production: use an env variable!
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,   // JS cannot read the cookie → XSS protection
      sameSite: "lax",  // Sent on same-site navigations; blocks CSRF for most cases
      secure: false,    // Set to true in production (HTTPS only)
      maxAge: 1000 * 60 * 30, // 30 minutes
    },
  })
);

// ── 4. CSRF protection middleware ─────────────────────────────
//   STUDENT TASK 1b: Apply csurf({ cookie: false }) — token lives in the SESSION.
//   We use the session (not a cookie) so the secret never travels to the client.
const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);

// ── 5. In-memory "database" ───────────────────────────────────
//   Replace with a real DB in production.
let contacts = [
  { id: 1, name: "Ada Lovelace",  phone: "555-0001" },
  { id: 2, name: "Grace Hopper",  phone: "555-0002" },
];
let nextId = 3;

// ── 6. Fake login — sets req.session.user ─────────────────────
//   A real app would verify a hashed password from a DB.
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  // Demo credentials — replace with real auth
  if (username === "student" && password === "lab123") {
    req.session.user = { username };
    return res.json({ ok: true, username });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// CSRF Token route
//   STUDENT TASK 1c: GET /api/csrf-token → { csrfToken }
app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Auth guard middleware 
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// Protected routes 
//   GET /api/contacts/:id — read single contact
app.get("/api/contacts/:id", requireAuth, (req, res) => {
  const contact = contacts.find((c) => c.id === Number(req.params.id));
  if (!contact) return res.status(404).json({ error: "Contact not found" });
  res.json(contact);
});

//   PUT /api/contacts/:id — update; csurf checks the token automatically
app.put("/api/contacts/:id", requireAuth, (req, res) => {
  const index = contacts.findIndex((c) => c.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Contact not found" });

  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "name and phone are required" });
  }

  contacts[index] = { ...contacts[index], name, phone };
  res.json(contacts[index]);
});

//   DELETE /api/contacts/:id — mutating; csurf checks the token automatically
app.delete("/api/contacts/:id", requireAuth, (req, res) => {
  const index = contacts.findIndex((c) => c.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Contact not found" });

  contacts.splice(index, 1);
  res.status(204).send();
});

// CSRF error handler
//   csurf throws an error with code "EBADCSRFTOKEN" when the token is
//   missing or invalid.  This handler turns it into a clean 403 response.
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      error: "CSRF token missing or invalid — request rejected.",
    });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server 
const PORT = 3001;
app.listen(PORT, () =>
  console.log(`🔒 Phone Book API listening on http://localhost:${PORT}`)
);