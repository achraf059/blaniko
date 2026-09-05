import { Router, Request, Response } from "express";
import isEmail from "validator/lib/isEmail";
import { supabase } from "../lib/supabase";

const router = Router();

interface WaitlistBody {
  email?: unknown;
  source?: unknown;
  language?: unknown;
  page?: unknown;
}

router.post("/", async (req: Request<object, object, WaitlistBody>, res: Response) => {
  const { email, source, language, page } = req.body;

  if (typeof email !== "string" || !isEmail(email)) {
    res.status(400).json({ success: false, error: "invalid_email" });
    return;
  }

  if (email.length > 254) {
    res.status(400).json({ success: false, error: "email_too_long" });
    return;
  }

  const rawSource = typeof source === "string" ? source : "homepage_footer";
  if (rawSource !== "homepage_footer") {
    res.status(400).json({ success: false, error: "invalid_source" });
    return;
  }
  if (rawSource.length > 50) {
    res.status(400).json({ success: false, error: "source_too_long" });
    return;
  }

  const rawLanguage = typeof language === "string" ? language : "en";
  if (rawLanguage !== "en" && rawLanguage !== "fr") {
    res.status(400).json({ success: false, error: "invalid_language" });
    return;
  }
  if (rawLanguage.length > 10) {
    res.status(400).json({ success: false, error: "language_too_long" });
    return;
  }

  const rawPage = typeof page === "string" ? page : "/";
  if (rawPage.length > 200) {
    res.status(400).json({ success: false, error: "page_too_long" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const safeSource = rawSource;
  const safeLanguage = rawLanguage;
  const safePage = rawPage;

  const { error } = await supabase.from("waitlist_emails").insert({
    email: normalizedEmail,
    source: safeSource,
    language: safeLanguage,
    page: safePage,
  });

  if (error) {
    // Postgres unique violation code
    if (error.code === "23505") {
      res.status(409).json({ success: false, error: "already_subscribed" });
      return;
    }
    console.error("Waitlist insert error:", error.message);
    res.status(500).json({ success: false, error: "server_error" });
    return;
  }

  res.status(200).json({ success: true });
});

export default router;
