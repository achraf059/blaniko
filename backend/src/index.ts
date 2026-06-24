import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import waitlistRouter from "./routes/waitlist";
import venuesRouter from "./routes/venues";
import adminRouter from "./routes/admin";
import venueClaimsRouter from "./routes/venue-claims";
import { publicFormLimiter } from "./middleware/publicFormLimiter";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  ...(process.env.FRONTEND_ORIGIN ? [process.env.FRONTEND_ORIGIN] : []),
];

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
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "x-admin-pin"],
  })
);

app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "blaniko-backend" });
});

app.use("/api/waitlist", publicFormLimiter, waitlistRouter);
app.use("/api/venues", venuesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/venue-claims", publicFormLimiter, venueClaimsRouter);

app.listen(PORT, () => {
  console.log(`blaniko-backend running on http://localhost:${PORT}`);
});
