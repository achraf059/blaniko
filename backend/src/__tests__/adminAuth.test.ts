import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";

// ─── Stub environment before imports ─────────────────────────────────────────
process.env.ADMIN_PIN = "test-pin-12345";
process.env.ADMIN_SESSION_SECRET = "test-session-secret-abcdef";
process.env.NODE_ENV = "test";
process.env.FRONTEND_ORIGIN = "https://blaniko.netlify.app";

// Mock Supabase to avoid real DB calls
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { code: "PGRST116" } }),
          }),
        }),
      }),
    }),
  },
}));

import adminAuthRouter, { sessions } from "../routes/adminAuth";
import adminRouter from "../routes/admin";
import { adminAuth, csrfProtection } from "../middleware/adminAuth";

/** Create a test app WITHOUT rate limiting, WITH CSRF on auth routes */
function createTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api/admin/auth", csrfProtection, adminAuthRouter);
  app.use("/api/admin", adminAuth, adminRouter);
  return app;
}

/** Login and return { cookie, csrfToken } */
async function loginAndGetCredentials(
  app: express.Express,
): Promise<{ cookie: string; csrfToken: string }> {
  const res = await request(app)
    .post("/api/admin/auth/login")
    .send({ pin: "test-pin-12345" });
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  if (!cookies || cookies.length === 0) throw new Error("No cookie set on login");
  if (!res.body.csrfToken) throw new Error("No CSRF token in login response");
  return { cookie: cookies[0], csrfToken: res.body.csrfToken };
}

describe("Admin Authentication", () => {
  let app: express.Express;

  beforeEach(() => {
    sessions.clear();
    app = createTestApp();
  });

  // ── Login ──────────────────────────────────────────────────────────────────

  describe("POST /api/admin/auth/login", () => {
    it("returns success, sets HttpOnly cookie, and returns CSRF token", async () => {
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({ pin: "test-pin-12345" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.csrfToken).toBeDefined();
      expect(typeof res.body.csrfToken).toBe("string");
      expect(res.body.csrfToken.length).toBeGreaterThan(0);

      const cookies = res.headers["set-cookie"] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain("admin_session=");
      expect(cookies[0]).toContain("HttpOnly");
      expect(cookies[0]).toContain("Path=/api/admin");
    });

    it("rejects incorrect PIN with 401", async () => {
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({ pin: "wrong-pin" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials");
      expect(res.headers["set-cookie"]).toBeUndefined();
      expect(res.body.csrfToken).toBeUndefined();
    });

    it("rejects missing PIN with 401", async () => {
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials");
    });

    it("rejects empty string PIN with 401", async () => {
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({ pin: "" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid credentials");
    });

    it("does not return the PIN in the response body", async () => {
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({ pin: "test-pin-12345" });

      const body = JSON.stringify(res.body);
      expect(body).not.toContain("test-pin-12345");
    });

    it("uses generic error messages (does not reveal PIN details)", async () => {
      const res = await request(app)
        .post("/api/admin/auth/login")
        .send({ pin: "wrong" });

      expect(res.body.error).toBe("Invalid credentials");
      const body = JSON.stringify(res.body);
      expect(body).not.toContain("close");
      expect(body).not.toContain("malformed");
    });
  });

  // ── Session check ──────────────────────────────────────────────────────────

  describe("GET /api/admin/auth/session", () => {
    it("returns authenticated: true and CSRF token with valid session", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      const res = await request(app)
        .get("/api/admin/auth/session")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.csrfToken).toBe(csrfToken);
    });

    it("returns authenticated: false without a cookie", async () => {
      const res = await request(app).get("/api/admin/auth/session");

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
      expect(res.body.csrfToken).toBeUndefined();
    });

    it("returns authenticated: false with an invalid cookie", async () => {
      const res = await request(app)
        .get("/api/admin/auth/session")
        .set("Cookie", "admin_session=invalid.signature");

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
    });
  });

  // ── Logout ─────────────────────────────────────────────────────────────────

  describe("POST /api/admin/auth/logout", () => {
    it("clears the session with valid CSRF token", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      const logoutRes = await request(app)
        .post("/api/admin/auth/logout")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", csrfToken)
        .set("Origin", "http://localhost:5173");

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Session check should now fail
      const sessionRes = await request(app)
        .get("/api/admin/auth/session")
        .set("Cookie", cookie);

      expect(sessionRes.body.authenticated).toBe(false);
    });

    it("rejects logout without CSRF token", async () => {
      const { cookie } = await loginAndGetCredentials(app);

      const res = await request(app)
        .post("/api/admin/auth/logout")
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:5173");

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("forbidden");
    });
  });

  // ── CSRF protection ────────────────────────────────────────────────────────

  describe("CSRF protection", () => {
    it("valid session + valid CSRF token succeeds on PATCH", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      const res = await request(app)
        .patch("/api/admin/venues/BLK-0001")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", csrfToken)
        .set("Origin", "http://localhost:5173")
        .send({ name: "Test" });

      // 404 because the venue doesn't exist in the mock, but NOT 403
      expect(res.status).toBe(404);
    });

    it("valid session + missing CSRF token fails with 403", async () => {
      const { cookie } = await loginAndGetCredentials(app);

      const res = await request(app)
        .patch("/api/admin/venues/BLK-0001")
        .set("Cookie", cookie)
        .set("Origin", "http://localhost:5173")
        .send({ name: "Test" });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("forbidden");
    });

    it("valid session + incorrect CSRF token fails with 403", async () => {
      const { cookie } = await loginAndGetCredentials(app);

      const res = await request(app)
        .patch("/api/admin/venues/BLK-0001")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", "wrong-token-value")
        .set("Origin", "http://localhost:5173")
        .send({ name: "Test" });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("forbidden");
    });

    it("GET requests do not require CSRF token", async () => {
      const { cookie } = await loginAndGetCredentials(app);

      const res = await request(app)
        .get("/api/admin/venues")
        .set("Cookie", cookie);

      // Should succeed (200) — no CSRF header needed for GET
      expect(res.status).toBe(200);
    });
  });

  // ── Origin validation ──────────────────────────────────────────────────────

  describe("Origin validation", () => {
    it("rejects state-changing request from unapproved origin", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      const res = await request(app)
        .patch("/api/admin/venues/BLK-0001")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", csrfToken)
        .set("Origin", "https://evil.example.com")
        .send({ name: "Test" });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("forbidden");
    });

    it("rejects state-changing request with missing origin", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      // supertest does not send Origin by default — so this tests the missing-origin case
      const res = await request(app)
        .patch("/api/admin/venues/BLK-0001")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", csrfToken)
        .send({ name: "Test" });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("forbidden");
    });

    it("accepts state-changing request from configured FRONTEND_ORIGIN", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      const res = await request(app)
        .patch("/api/admin/venues/BLK-0001")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", csrfToken)
        .set("Origin", "https://blaniko.netlify.app")
        .send({ name: "Test" });

      // 404 from Supabase mock, not 403 — the request passed CSRF + Origin checks
      expect(res.status).toBe(404);
    });

    it("accepts state-changing request from localhost dev origins", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      const res = await request(app)
        .patch("/api/admin/venues/BLK-0001")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", csrfToken)
        .set("Origin", "http://localhost:5173")
        .send({ name: "Test" });

      expect(res.status).toBe(404); // past CSRF/Origin, hit Supabase mock
    });
  });

  // ── Protected routes ───────────────────────────────────────────────────────

  describe("Protected admin routes", () => {
    it("rejects GET /api/admin/venues without session", async () => {
      const res = await request(app).get("/api/admin/venues");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("unauthorized");
    });

    it("allows GET /api/admin/venues with valid session (no CSRF needed)", async () => {
      const { cookie } = await loginAndGetCredentials(app);

      const res = await request(app)
        .get("/api/admin/venues")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
    });

    it("rejects PATCH /api/admin/venues/:id without session", async () => {
      const res = await request(app)
        .patch("/api/admin/venues/BLK-0001")
        .send({ name: "Test" });

      expect(res.status).toBe(401);
    });
  });

  // ── Missing configuration ──────────────────────────────────────────────────

  describe("Missing configuration", () => {
    it("returns 503 when ADMIN_SESSION_SECRET is missing", async () => {
      const original = process.env.ADMIN_SESSION_SECRET;
      delete process.env.ADMIN_SESSION_SECRET;

      try {
        const res = await request(app)
          .post("/api/admin/auth/login")
          .send({ pin: "test-pin-12345" });

        expect(res.status).toBe(503);
        expect(res.body.error).toBe("admin_not_configured");
      } finally {
        process.env.ADMIN_SESSION_SECRET = original;
      }
    });

    it("returns 503 when ADMIN_PIN is missing", async () => {
      const original = process.env.ADMIN_PIN;
      delete process.env.ADMIN_PIN;

      try {
        const res = await request(app)
          .post("/api/admin/auth/login")
          .send({ pin: "test-pin-12345" });

        expect(res.status).toBe(503);
        expect(res.body.error).toBe("admin_not_configured");
      } finally {
        process.env.ADMIN_PIN = original;
      }
    });

    it("adminAuth middleware returns 503 when ADMIN_SESSION_SECRET is missing", async () => {
      const original = process.env.ADMIN_SESSION_SECRET;
      delete process.env.ADMIN_SESSION_SECRET;

      try {
        const res = await request(app).get("/api/admin/venues");
        expect(res.status).toBe(503);
        expect(res.body.error).toBe("admin_not_configured");
      } finally {
        process.env.ADMIN_SESSION_SECRET = original;
      }
    });
  });

  // ── Session persistence (refresh scenario) ─────────────────────────────────

  describe("Session persistence across multiple checks", () => {
    it("50 consecutive session checks remain authenticated after login", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      for (let i = 0; i < 50; i++) {
        const res = await request(app)
          .get("/api/admin/auth/session")
          .set("Cookie", cookie);

        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(true);
        expect(res.body.csrfToken).toBe(csrfToken);
      }
    });

    it("returns CSRF token on session check so refreshes can restore it", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      const res = await request(app)
        .get("/api/admin/auth/session")
        .set("Cookie", cookie);

      expect(res.body.csrfToken).toBeDefined();
      expect(res.body.csrfToken).toBe(csrfToken);
    });

    it("logout still works after many session checks", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      // Many session checks first
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get("/api/admin/auth/session")
          .set("Cookie", cookie);
      }

      // Logout
      const logoutRes = await request(app)
        .post("/api/admin/auth/logout")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", csrfToken)
        .set("Origin", "http://localhost:5173");
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Session check after logout returns unauthenticated
      const afterLogout = await request(app)
        .get("/api/admin/auth/session")
        .set("Cookie", cookie);
      expect(afterLogout.body.authenticated).toBe(false);
      expect(afterLogout.body.csrfToken).toBeUndefined();
    });

    it("session remains invalid after logout (cannot be reused)", async () => {
      const { cookie, csrfToken } = await loginAndGetCredentials(app);

      await request(app)
        .post("/api/admin/auth/logout")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", csrfToken)
        .set("Origin", "http://localhost:5173");

      // Multiple checks — all must remain unauthenticated
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .get("/api/admin/auth/session")
          .set("Cookie", cookie);
        expect(res.body.authenticated).toBe(false);
      }
    });
  });

  // ── Rate limiter isolation ────────────────────────────────────────────────

  describe("Rate limiter isolation", () => {
    it("repeated session checks do NOT consume loginLimiter", async () => {
      // Build an app that mirrors production: loginLimiter only on POST /login
      const { loginLimiter } = await import("../middleware/loginLimiter");

      const rlApp = express();
      rlApp.use(cookieParser());
      rlApp.use(express.json());
      rlApp.post("/api/admin/auth/login", loginLimiter);
      rlApp.use("/api/admin/auth", csrfProtection, adminAuthRouter);

      // Login once
      const loginRes = await request(rlApp)
        .post("/api/admin/auth/login")
        .send({ pin: "test-pin-12345" });
      expect(loginRes.status).toBe(200);

      const cookies = loginRes.headers["set-cookie"] as unknown as string[];
      const cookie = cookies[0];

      // 20 session checks — must all succeed without hitting loginLimiter
      for (let i = 0; i < 20; i++) {
        const res = await request(rlApp)
          .get("/api/admin/auth/session")
          .set("Cookie", cookie);
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(true);
      }

      // Login must still work (loginLimiter count should still be 1, not 21)
      sessions.clear(); // clear the old session so we can log in fresh
      const retryLogin = await request(rlApp)
        .post("/api/admin/auth/login")
        .send({ pin: "test-pin-12345" });
      expect(retryLogin.status).toBe(200);
      expect(retryLogin.body.success).toBe(true);
    });

    it("repeated session checks do NOT block a later valid login", async () => {
      const { cookie } = await loginAndGetCredentials(app);

      // 50 session checks (no rate limiter on the test app, but proves the
      // endpoint doesn't interfere with subsequent login)
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get("/api/admin/auth/session")
          .set("Cookie", cookie);
      }

      // Fresh login must still succeed
      sessions.clear();
      const loginRes = await request(app)
        .post("/api/admin/auth/login")
        .send({ pin: "test-pin-12345" });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });

    it("incorrect login attempts are still rate-limited", async () => {
      const { loginLimiter } = await import("../middleware/loginLimiter");

      const rlApp = express();
      rlApp.use(cookieParser());
      rlApp.use(express.json());
      rlApp.post("/api/admin/auth/login", loginLimiter);
      rlApp.use("/api/admin/auth", adminAuthRouter);

      for (let i = 0; i < 5; i++) {
        await request(rlApp)
          .post("/api/admin/auth/login")
          .send({ pin: "wrong" });
      }

      const blocked = await request(rlApp)
        .post("/api/admin/auth/login")
        .send({ pin: "wrong" });

      expect(blocked.status).toBe(429);
      expect(blocked.body.error).toBe("too_many_requests");
    });

    it("429 login response body says too_many_requests, not Invalid credentials", async () => {
      const { loginLimiter } = await import("../middleware/loginLimiter");

      const rlApp = express();
      rlApp.use(cookieParser());
      rlApp.use(express.json());
      rlApp.post("/api/admin/auth/login", loginLimiter);
      rlApp.use("/api/admin/auth", adminAuthRouter);

      // Exhaust the limiter
      for (let i = 0; i < 5; i++) {
        await request(rlApp)
          .post("/api/admin/auth/login")
          .send({ pin: "wrong" });
      }

      const res = await request(rlApp)
        .post("/api/admin/auth/login")
        .send({ pin: "test-pin-12345" }); // correct PIN, but rate-limited

      expect(res.status).toBe(429);
      expect(res.body.error).toBe("too_many_requests");
      // Must NOT contain "Invalid credentials"
      expect(JSON.stringify(res.body)).not.toContain("Invalid credentials");
    });
  });

  // ── No VITE_ADMIN_PIN in frontend ──────────────────────────────────────────

  describe("Frontend security", () => {
    it("has no VITE_ADMIN_PIN reference in frontend source files", async () => {
      const { execSync } = await import("child_process");
      const frontendSrcDir = path.resolve(__dirname, "../../../frontend/src");
      const result = execSync(
        `grep -rn "VITE_ADMIN_PIN" "${frontendSrcDir}" || echo "CLEAN"`,
        { encoding: "utf-8" },
      );
      expect(result.trim()).toBe("CLEAN");
    });
  });
});
