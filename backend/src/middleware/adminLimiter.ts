import { rateLimit } from "express-rate-limit";

/**
 * General abuse limiter for authenticated admin data endpoints
 * (/api/admin/venues, /api/admin/venues/:id).
 *
 * This is NOT the login brute-force limiter — that is loginLimiter,
 * scoped to POST /api/admin/auth/login only.
 *
 * This limiter does NOT cover /api/admin/auth/* (session check, logout).
 * Session checks are lightweight, read-only, and called on every page
 * load; rate-limiting them would lock admins out of the dashboard.
 *
 * 100 requests per IP per 15-minute window — high enough for normal
 * dashboard use (page loads, venue edits, repeated refreshes) while
 * still capping runaway scripts or accidental loops.
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,  // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: { success: false, error: "too_many_requests" },
});
