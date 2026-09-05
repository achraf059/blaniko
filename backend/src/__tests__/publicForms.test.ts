import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";

process.env.NODE_ENV = "test";

// Controllable Supabase mock — each test decides what insert() resolves to.
const { insertMock } = vi.hoisted(() => ({
  insertMock: vi.fn<(table: string, row: Record<string, unknown>) => Promise<{ error: { code?: string; message: string } | null }>>(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => insertMock(table, row),
    }),
  },
}));

import waitlistRouter from "../routes/waitlist";
import venueClaimsRouter from "../routes/venue-claims";

/** Test app WITHOUT rate limiting so validation behavior is deterministic. */
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/waitlist", waitlistRouter);
  app.use("/api/venue-claims", venueClaimsRouter);
  return app;
}

const validClaim = {
  type: "claim",
  contact_name: "Test Person",
  contact_email: "owner@example.com",
  message: "I manage this venue and would like to claim the listing.",
};

describe("Public form endpoints", () => {
  let app: express.Express;

  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    app = createTestApp();
  });

  // ── Waitlist ───────────────────────────────────────────────────────────────

  describe("POST /api/waitlist", () => {
    it("accepts a valid email and inserts defaults for optional fields", async () => {
      const res = await request(app)
        .post("/api/waitlist")
        .send({ email: "user@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(insertMock).toHaveBeenCalledWith("waitlist_emails", {
        email: "user@example.com",
        source: "homepage_footer",
        language: "en",
        page: "/",
      });
    });

    it("normalizes the email to lowercase before storing", async () => {
      await request(app)
        .post("/api/waitlist")
        .send({ email: "User@Example.COM" });

      const [, row] = insertMock.mock.calls[0];
      expect(row.email).toBe("user@example.com");
    });

    it("rejects a malformed email with 400 and never touches the database", async () => {
      const res = await request(app)
        .post("/api/waitlist")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_email");
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("rejects a non-string email with 400", async () => {
      const res = await request(app)
        .post("/api/waitlist")
        .send({ email: { $ne: null } });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_email");
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("rejects an unknown source value with 400", async () => {
      const res = await request(app)
        .post("/api/waitlist")
        .send({ email: "user@example.com", source: "spam_bot" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_source");
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("rejects an unsupported language with 400", async () => {
      const res = await request(app)
        .post("/api/waitlist")
        .send({ email: "user@example.com", language: "de" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_language");
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("maps a Postgres unique violation (23505) to 409 already_subscribed", async () => {
      insertMock.mockResolvedValueOnce({
        error: { code: "23505", message: "duplicate key value" },
      });

      const res = await request(app)
        .post("/api/waitlist")
        .send({ email: "user@example.com" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("already_subscribed");
    });

    it("maps any other database error to a generic 500 without leaking details", async () => {
      insertMock.mockResolvedValueOnce({
        error: { code: "XX000", message: "internal supabase detail" },
      });

      const res = await request(app)
        .post("/api/waitlist")
        .send({ email: "user@example.com" });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("server_error");
      expect(JSON.stringify(res.body)).not.toContain("internal supabase detail");
    });
  });

  // ── Venue claims ───────────────────────────────────────────────────────────

  describe("POST /api/venue-claims", () => {
    it("accepts a valid claim and stores trimmed, normalized values", async () => {
      const res = await request(app)
        .post("/api/venue-claims")
        .send({
          ...validClaim,
          contact_name: "  Test Person  ",
          contact_email: "Owner@Example.COM",
          venue_slug: "test-venue",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const [table, row] = insertMock.mock.calls[0];
      expect(table).toBe("venue_claims");
      expect(row.contact_name).toBe("Test Person");
      expect(row.contact_email).toBe("owner@example.com");
      expect(row.venue_slug).toBe("test-venue");
    });

    it("stores absent optional fields as null, not empty strings", async () => {
      await request(app).post("/api/venue-claims").send(validClaim);

      const [, row] = insertMock.mock.calls[0];
      expect(row.venue_slug).toBeNull();
      expect(row.venue_name).toBeNull();
      expect(row.contact_whatsapp).toBeNull();
      expect(row.official_website).toBeNull();
      expect(row.instagram).toBeNull();
    });

    it("rejects an unknown type with 400", async () => {
      const res = await request(app)
        .post("/api/venue-claims")
        .send({ ...validClaim, type: "takeover" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_type");
      expect(insertMock).not.toHaveBeenCalled();
    });

    it("rejects a missing contact name with 400", async () => {
      const res = await request(app)
        .post("/api/venue-claims")
        .send({ ...validClaim, contact_name: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("missing_name");
    });

    it("rejects an invalid contact email with 400", async () => {
      const res = await request(app)
        .post("/api/venue-claims")
        .send({ ...validClaim, contact_email: "nope" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_email");
    });

    it("rejects a non-phone WhatsApp value with 400", async () => {
      const res = await request(app)
        .post("/api/venue-claims")
        .send({ ...validClaim, contact_whatsapp: "call me maybe" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_whatsapp");
    });

    it("rejects a missing message with 400", async () => {
      const res = await request(app)
        .post("/api/venue-claims")
        .send({ ...validClaim, message: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("missing_message");
    });

    it("rejects a message over 2000 characters with 400", async () => {
      const res = await request(app)
        .post("/api/venue-claims")
        .send({ ...validClaim, message: "x".repeat(2001) });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("message_too_long");
    });

    it("rejects a website URL without an http(s) protocol with 400", async () => {
      const res = await request(app)
        .post("/api/venue-claims")
        .send({ ...validClaim, official_website: "example.com" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_official_website");
    });

    it("maps a database error to a generic 500", async () => {
      insertMock.mockResolvedValueOnce({
        error: { message: "supabase down" },
      });

      const res = await request(app)
        .post("/api/venue-claims")
        .send(validClaim);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("server_error");
    });
  });

  // ── Rate limiting ──────────────────────────────────────────────────────────

  describe("public form rate limiting", () => {
    it("returns 429 too_many_requests after 20 requests in the window", async () => {
      const { publicFormLimiter } = await import("../middleware/publicFormLimiter");

      const rlApp = express();
      rlApp.use(express.json());
      rlApp.use("/api/waitlist", publicFormLimiter, waitlistRouter);

      // Invalid bodies so no insert happens; each request still counts.
      for (let i = 0; i < 20; i++) {
        const res = await request(rlApp).post("/api/waitlist").send({});
        expect(res.status).toBe(400);
      }

      const blocked = await request(rlApp).post("/api/waitlist").send({});
      expect(blocked.status).toBe(429);
      expect(blocked.body.error).toBe("too_many_requests");
    });
  });
});
