import type { Request, Response, NextFunction } from "express";

/**
 * Server-side admin PIN middleware.
 *
 * Reads the expected PIN from process.env.ADMIN_PIN.
 * The client must send the correct PIN in the x-admin-pin request header.
 *
 * This is NOT a substitute for real authentication — it is a lightweight
 * gate that prevents public writes to the admin endpoints.
 * Never log the PIN value.
 */
export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedPin = process.env.ADMIN_PIN;

  if (!expectedPin) {
    // ADMIN_PIN not configured — block all admin writes
    res.status(503).json({ success: false, error: "admin_not_configured" });
    return;
  }

  const provided = req.headers["x-admin-pin"];

  if (!provided || provided !== expectedPin) {
    res.status(401).json({ success: false, error: "unauthorized" });
    return;
  }

  next();
}
