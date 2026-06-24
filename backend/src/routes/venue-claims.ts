import { Router, Request, Response } from "express";
import isEmail from "validator/lib/isEmail";
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

  if (typeof contact_name !== "string" || !contact_name.trim()) {
    res.status(400).json({ success: false, error: "missing_name" });
    return;
  }

  if (typeof contact_email !== "string" || !isEmail(contact_email)) {
    res.status(400).json({ success: false, error: "invalid_email" });
    return;
  }

  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ success: false, error: "missing_message" });
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
    language: typeof language === "string" ? language : "en",
  });

  if (error) {
    console.error("Venue claim insert error:", error.message);
    res.status(500).json({ success: false, error: "server_error" });
    return;
  }

  res.status(200).json({ success: true });
});

export default router;
