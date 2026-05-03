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

  const normalizedEmail = email.toLowerCase().trim();
  const safeSource = typeof source === "string" ? source : "homepage_footer";
  const safeLanguage = typeof language === "string" ? language : "en";
  const safePage = typeof page === "string" ? page : "/";

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
