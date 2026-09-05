import { Router, Request, Response } from "express";
import isEmail from "validator/lib/isEmail";
import isURL from "validator/lib/isURL";
import { supabase } from "../lib/supabase";

const router = Router();

interface VenueClaimBody {
  type?: unknown;
  venue_slug?: unknown;
  venue_name?: unknown;
  contact_name?: unknown;
  contact_email?: unknown;
  contact_whatsapp?: unknown;
  role_at_venue?: unknown;
  message?: unknown;
  official_website?: unknown;
  instagram?: unknown;
  language?: unknown;
}

router.post("/", async (req: Request<object, object, VenueClaimBody>, res: Response) => {
  const {
    type,
    venue_slug,
    venue_name,
    contact_name,
    contact_email,
    contact_whatsapp,
    role_at_venue,
    message,
    official_website,
    instagram,
    language,
  } = req.body;

  if (type !== "claim" && type !== "listing") {
    res.status(400).json({ success: false, error: "invalid_type" });
    return;
  }

  if (typeof venue_slug === "string" && venue_slug.length > 100) {
    res.status(400).json({ success: false, error: "venue_slug_too_long" });
    return;
  }

  if (typeof venue_name === "string" && venue_name.length > 150) {
    res.status(400).json({ success: false, error: "venue_name_too_long" });
    return;
  }

  if (typeof contact_name !== "string" || !contact_name.trim()) {
    res.status(400).json({ success: false, error: "missing_name" });
    return;
  }

  if (contact_name.length > 100) {
    res.status(400).json({ success: false, error: "contact_name_too_long" });
    return;
  }

  if (typeof contact_email !== "string" || !isEmail(contact_email)) {
    res.status(400).json({ success: false, error: "invalid_email" });
    return;
  }

  if (contact_email.length > 254) {
    res.status(400).json({ success: false, error: "contact_email_too_long" });
    return;
  }

  if (typeof contact_whatsapp === "string" && contact_whatsapp.trim()) {
    if (contact_whatsapp.length > 30) {
      res.status(400).json({ success: false, error: "contact_whatsapp_too_long" });
      return;
    }
    if (!/^\+?\d[\d\s\-().]{6,}$/.test(contact_whatsapp.trim())) {
      res.status(400).json({ success: false, error: "invalid_whatsapp" });
      return;
    }
  }

  if (typeof role_at_venue === "string" && role_at_venue.length > 100) {
    res.status(400).json({ success: false, error: "role_at_venue_too_long" });
    return;
  }

  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ success: false, error: "missing_message" });
    return;
  }

  if (message.length > 2000) {
    res.status(400).json({ success: false, error: "message_too_long" });
    return;
  }

  if (typeof official_website === "string" && official_website.trim()) {
    if (official_website.length > 500) {
      res.status(400).json({ success: false, error: "official_website_too_long" });
      return;
    }
    if (!isURL(official_website.trim(), { require_protocol: true, protocols: ["http", "https"] })) {
      res.status(400).json({ success: false, error: "invalid_official_website" });
      return;
    }
  }

  if (typeof instagram === "string" && instagram.length > 100) {
    res.status(400).json({ success: false, error: "instagram_too_long" });
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

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const { error } = await supabase.from("venue_claims").insert({
    type,
    venue_slug: str(venue_slug),
    venue_name: str(venue_name),
    contact_name: contact_name.trim(),
    contact_email: contact_email.toLowerCase().trim(),
    contact_whatsapp: str(contact_whatsapp),
    role_at_venue: str(role_at_venue),
    message: message.trim(),
    official_website: str(official_website),
    instagram: str(instagram),
    language: rawLanguage,
  });

  if (error) {
    console.error("Venue claim insert error:", error.message);
    res.status(500).json({ success: false, error: "server_error" });
    return;
  }

  res.status(200).json({ success: true });
});

export default router;
