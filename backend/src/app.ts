import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import waitlistRouter from "./routes/waitlist";
import venuesRouter from "./routes/venues";
import adminRouter from "./routes/admin";
import adminAuthRouter from "./routes/adminAuth";
import venueClaimsRouter from "./routes/venue-claims";
import { publicFormLimiter } from "./middleware/publicFormLimiter";
import { adminLimiter } from "./middleware/adminLimiter";
import { loginLimiter } from "./middleware/loginLimiter";
import { csrfProtection } from "./middleware/adminAuth";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  ...(process.env.FRONTEND_ORIGIN ? [process.env.FRONTEND_ORIGIN] : []),
];

// Security headers — applied before routes so every response is covered.
// Configuration is tuned for a pure JSON API (no HTML served):
//   - contentSecurityPolicy disabled: CSP is a browser directive for HTML/scripts;
//     it is irrelevant when all responses are application/json.
//   - crossOriginEmbedderPolicy disabled: COEP is a browser document isolation
//     mechanism (for SharedArrayBuffer etc.) and does not apply to an API.
//   - crossOriginResourcePolicy set to "cross-origin": the default "same-origin"
//     would block no-cors cross-origin reads; "cross-origin" lets the CORS setup
//     below govern access as intended.
// All other Helmet defaults are kept — they add:
//   X-Content-Type-Options: nosniff
//   X-Frame-Options: SAMEORIGIN
//   Strict-Transport-Security: max-age=15552000; includeSubDomains
//   Referrer-Policy: no-referrer
//   X-DNS-Prefetch-Control: off
//   Origin-Agent-Cluster: ?1
//   X-Permitted-Cross-Domain-Policies: none
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  })
);

app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "blaniko-backend" });
});

app.use("/api/waitlist", publicFormLimiter, waitlistRouter);
app.use("/api/venues", venuesRouter);
app.post("/api/admin/auth/login", loginLimiter);
app.use("/api/admin/auth", csrfProtection, adminAuthRouter);
app.use("/api/admin", adminLimiter, adminRouter);
app.use("/api/venue-claims", publicFormLimiter, venueClaimsRouter);

export default app;
