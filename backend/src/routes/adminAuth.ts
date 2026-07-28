import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";

const router = Router();

// ─── Session store ───────────────────────────────────────────────────────────
// In-memory session store — development/MVP only.
//
// Limitations:
//   - All sessions are lost on server restart or deploy.
//   - Does not work across multiple server replicas.
//   - Capped at MAX_SESSIONS to prevent unbounded memory growth.
//
// When the backend is deployed to a platform that can restart, scale, or run
// multiple instances, migrate to a durable store (e.g. a Supabase
// admin_sessions table with hashed tokens).

interface AdminSession {
  token: string;
  csrfToken: string;
  createdAt: number;
  expiresAt: number;
}

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_SESSIONS = 100;
const sessions = new Map<string, AdminSession>();

/** Remove expired sessions periodically. */
function pruneExpired(): void {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
}

// Prune every 10 minutes
setInterval(pruneExpired, 10 * 60 * 1000).unref();

/** Evict oldest sessions when the cap is reached. */
function enforceSessionCap(): void {
  if (sessions.size < MAX_SESSIONS) return;
  // Sort by createdAt ascending (oldest first) and remove excess
  const sorted = [...sessions.entries()].sort(
    (a, b) => a[1].createdAt - b[1].createdAt,
  );
  const toRemove = sorted.slice(0, sessions.size - MAX_SESSIONS + 1);
  for (const [token] of toRemove) {
    sessions.delete(token);
  }
}

/** Timing-safe comparison of two strings. */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against self to keep constant time, then return false
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Sign a token using HMAC-SHA256. */
function signToken(token: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

/** Build the cookie value: token.signature */
function createSignedCookie(token: string, secret: string): string {
  return `${token}.${signToken(token, secret)}`;
}

/** Verify and extract the token from a signed cookie value. */
function verifySignedCookie(
  cookieValue: string,
  secret: string,
): string | null {
  const dotIndex = cookieValue.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const token = cookieValue.slice(0, dotIndex);
  const sig = cookieValue.slice(dotIndex + 1);
  const expected = signToken(token, secret);
  if (!safeCompare(sig, expected)) return null;
  return token;
}

function getSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || null;
}

function getCookieOptions(maxAge?: number) {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path: "/api/admin",
    maxAge: maxAge ?? SESSION_TTL_MS,
  };
}

/** Look up a valid (non-expired) session by its signed cookie value. */
function resolveSession(
  cookieValue: string | undefined,
  sessionSecret: string,
): AdminSession | null {
  if (!cookieValue || typeof cookieValue !== "string") return null;
  const token = verifySignedCookie(cookieValue, sessionSecret);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) sessions.delete(token);
    return null;
  }
  return session;
}

// ─── POST /api/admin/auth/login ──────────────────────────────────────────────
// Rate limiting is applied at the app level (see app.ts), not here.
router.post("/login", (req: Request, res: Response) => {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    res.status(503).json({ success: false, error: "admin_not_configured" });
    return;
  }

  const expectedPin = process.env.ADMIN_PIN;
  if (!expectedPin) {
    res.status(503).json({ success: false, error: "admin_not_configured" });
    return;
  }

  const { pin } = req.body as { pin?: string };
  if (!pin || typeof pin !== "string") {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  if (!safeCompare(pin, expectedPin)) {
    res.status(401).json({ success: false, error: "Invalid credentials" });
    return;
  }

  // Enforce session cap before creating a new one
  enforceSessionCap();

  // Create session with CSRF token
  const token = crypto.randomBytes(32).toString("hex");
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessions.set(token, {
    token,
    csrfToken,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });

  const signedValue = createSignedCookie(token, sessionSecret);
  res.cookie("admin_session", signedValue, getCookieOptions());
  res.json({ success: true, csrfToken });
});

// ─── GET /api/admin/auth/session ─────────────────────────────────────────────
router.get("/session", (req: Request, res: Response) => {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    res.json({ authenticated: false });
    return;
  }

  const session = resolveSession(req.cookies?.admin_session, sessionSecret);
  if (!session) {
    res.json({ authenticated: false });
    return;
  }

  // Return the CSRF token so page refreshes can restore it in memory
  res.json({ authenticated: true, csrfToken: session.csrfToken });
});

// ─── POST /api/admin/auth/logout ─────────────────────────────────────────────
router.post("/logout", (req: Request, res: Response) => {
  const sessionSecret = getSessionSecret();
  const cookieValue = req.cookies?.admin_session;

  if (sessionSecret && cookieValue && typeof cookieValue === "string") {
    const token = verifySignedCookie(cookieValue, sessionSecret);
    if (token) sessions.delete(token);
  }

  res.clearCookie("admin_session", getCookieOptions(0));
  res.json({ success: true });
});

// ─── Exports for middleware ──────────────────────────────────────────────────
export {
  sessions,
  verifySignedCookie,
  getSessionSecret,
  resolveSession,
  safeCompare,
};
export default router;
