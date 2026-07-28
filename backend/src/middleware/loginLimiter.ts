import { rateLimit } from "express-rate-limit";

/**
 * Strict rate limiter for the admin login endpoint.
 * 5 attempts per IP per 15-minute window — limits PIN brute-force attempts.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "too_many_requests" },
});
