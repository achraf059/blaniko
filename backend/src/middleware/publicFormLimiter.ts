import { rateLimit } from "express-rate-limit";

/**
 * Rate limiter for public POST form endpoints (/api/waitlist, /api/venue-claims).
 * 20 requests per IP per 15-minute window — enough for legitimate use,
 * tight enough to stop naive spam bots.
 */
export const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,  // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: { success: false, error: "too_many_requests" },
});
