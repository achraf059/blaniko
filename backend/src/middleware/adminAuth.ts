import type { Request, Response, NextFunction } from "express";
import {
  sessions,
  verifySignedCookie,
  getSessionSecret,
  resolveSession,
  safeCompare,
} from "../routes/adminAuth";

// ─── Allowed origins for admin state-changing requests ───────────────────────
// Localhost origins are always permitted for development.
// FRONTEND_ORIGIN is required in production.

const DEV_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
]);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (DEV_ORIGINS.has(origin)) return true;
  const frontendOrigin = process.env.FRONTEND_ORIGIN;
  return !!frontendOrigin && origin === frontendOrigin;
}

// HTTP methods that change server state and require CSRF + Origin checks
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Server-side admin session middleware.
 *
 * Validates the admin_session HttpOnly cookie for all requests.
 * For state-changing methods (POST, PUT, PATCH, DELETE), also:
 *   - Validates the X-CSRF-Token header against the session's CSRF token
 *   - Validates the Origin header against the approved origins list
 */
export function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    res.status(503).json({ success: false, error: "admin_not_configured" });
    return;
  }

  const session = resolveSession(req.cookies?.admin_session, sessionSecret);
  if (!session) {
    res.status(401).json({ success: false, error: "unauthorized" });
    return;
  }

  // State-changing requests require CSRF token and Origin validation
  if (STATE_CHANGING_METHODS.has(req.method)) {
    // Origin validation (defense in depth)
    const origin = req.headers.origin as string | undefined;
    if (!isAllowedOrigin(origin)) {
      res.status(403).json({ success: false, error: "forbidden" });
      return;
    }

    // CSRF token validation
    const csrfHeader = req.headers["x-csrf-token"];
    if (!csrfHeader || typeof csrfHeader !== "string") {
      res.status(403).json({ success: false, error: "forbidden" });
      return;
    }

    if (!safeCompare(csrfHeader, session.csrfToken)) {
      res.status(403).json({ success: false, error: "forbidden" });
      return;
    }
  }

  next();
}

/**
 * CSRF + Origin validation middleware for auth routes (e.g. logout).
 *
 * This is a standalone middleware for routes that are NOT behind the full
 * adminAuth middleware but still need CSRF protection.
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    next();
    return;
  }

  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    res.status(503).json({ success: false, error: "admin_not_configured" });
    return;
  }

  const session = resolveSession(req.cookies?.admin_session, sessionSecret);
  if (!session) {
    // No session — let the route handle it (logout is best-effort)
    next();
    return;
  }

  // Origin validation
  const origin = req.headers.origin as string | undefined;
  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ success: false, error: "forbidden" });
    return;
  }

  // CSRF token validation
  const csrfHeader = req.headers["x-csrf-token"];
  if (!csrfHeader || typeof csrfHeader !== "string") {
    res.status(403).json({ success: false, error: "forbidden" });
    return;
  }

  if (!safeCompare(csrfHeader, session.csrfToken)) {
    res.status(403).json({ success: false, error: "forbidden" });
    return;
  }

  next();
}
