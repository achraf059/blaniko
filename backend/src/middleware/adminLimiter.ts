import { rateLimit } from "express-rate-limit";

/**
 * Rate limiter for admin endpoints (/api/admin/*).
 * 10 attempts per IP per 15-minute window — strict enough to prevent
 * brute-force PIN guessing while allowing legitimate admin use.
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,  // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: { success: false, error: "too_many_requests" },
});
