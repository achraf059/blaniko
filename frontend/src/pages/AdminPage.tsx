import { useEffect, useMemo, useState } from "react";
import { HomeHeader } from "../components/home/HomeHeader";
import { useAdminApi, adminLogin, adminLogout, adminCheckSession, type AdminVenueRow, type AdminVenuePatch, type LoginResult } from "../hooks/useAdminApi";
import { usePageMeta } from "../hooks/usePageMeta";
import { useI18n } from "../i18n/useI18n";
import "./AdminPage.css";

// ─── Form state ───────────────────────────────────────────────────────────────

type AdminFormState = {
  // Identity (read-only in edit mode)
  externalId: string;
  slug: string;
  // Core fields
  name: string;
  category: string;
  subcategory: string;
  neighborhood: string;
  area: string;       // display only — derived from neighborhood/region
  priceLevel: string;
  isActive: boolean;
  // Descriptions
  shortDescription: string;
  overview: string;
  vibe: string;
  audience: string;
  // Contact / location
  address: string;
  googleMapsLink: string;
  phone: string;
  website: string;
  instagram: string;
  // Media
  imageUrl: string;
  // Coordinates
  latitude: string;
  longitude: string;
};

function emptyForm(): AdminFormState {
  return {
    externalId: "",
    slug: "",
    name: "",
    category: "",
    subcategory: "",
    neighborhood: "",
    area: "",
    priceLevel: "$$",
    isActive: true,
    shortDescription: "",
    overview: "",
    vibe: "",
    audience: "",
    address: "",
    googleMapsLink: "",
    phone: "",
    website: "",
    instagram: "",
    imageUrl: "",
    latitude: "",
    longitude: "",
  };
}

function rowToForm(row: AdminVenueRow): AdminFormState {
  return {
    externalId: row.external_id ?? "",
    slug: row.slug ?? "",
    name: row.name ?? "",
    category: row.category ?? "",
    subcategory: row.subcategory ?? "",
    neighborhood: row.neighborhood ?? "",
    area: row.neighborhood ?? row.region ?? "",
    priceLevel: row.price_level ?? "$$",
    isActive: row.is_active ?? true,
    shortDescription: row.short_description ?? "",
    overview: row.overview ?? "",
    vibe: row.vibe ?? "",
    audience: row.audience ?? "",
    address: row.address ?? "",
    googleMapsLink: row.google_maps_link ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    instagram: row.instagram ?? "",
    imageUrl: row.image_url ?? "",
    latitude: row.lat != null ? String(row.lat) : "",
    longitude: row.lng != null ? String(row.lng) : "",
  };
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { dictionary } = useI18n();
  usePageMeta("Admin | Blaniko");
  const { rows, isLoading, loadError, fetchVenues, patchVenue } = useAdminApi();

  // ── Auth gate ────────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [loginError, setLoginError] = useState<LoginResult | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // On mount, check if a valid session cookie already exists
  useEffect(() => {
    void adminCheckSession().then((result) => {
      if (result === "authenticated") {
        setIsAuthenticated(true);
      }
      // "error" (429, network) → keep isAuthenticated as-is (don't force logout)
      // "unauthenticated" → leave isAuthenticated false (initial state)
      if (result === "error" && !isCheckingSession) {
        setSessionError(true);
      }
      setIsCheckingSession(false);
    });
  }, []);

  // ── List state ───────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("active");

  // ── Edit state ───────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null); // externalId
  const [form, setForm] = useState<AdminFormState>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    | { type: "idle" }
    | { type: "success"; message: string }
    | { type: "error"; message: string }
  >({ type: "idle" });

  // Load venues after auth. On 401 the hook returns "auth_failed"; return to login.
  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchVenues().then((result) => {
      if (result === "auth_failed") {
        setIsAuthenticated(false);
        setPinInput("");
      }
    });
  }, [isAuthenticated, fetchVenues]);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filterActive === "active" && !row.is_active) return false;
      if (filterActive === "inactive" && row.is_active) return false;
      if (!searchTerm.trim()) return true;
      const hay = `${row.name} ${row.category} ${row.subcategory ?? ""} ${row.neighborhood ?? ""}`.toLowerCase();
      return hay.includes(searchTerm.trim().toLowerCase());
    });
  }, [rows, searchTerm, filterActive]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSessionError(false);
    setIsLoggingIn(true);
    const result = await adminLogin(pinInput);
    setIsLoggingIn(false);
    setPinInput("");
    if (result === "success") {
      setIsAuthenticated(true);
    } else {
      setLoginError(result);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setIsAuthenticated(false);
    setEditingId(null);
    setForm(emptyForm());
    setSaveStatus({ type: "idle" });
  };

  const startEdit = (row: AdminVenueRow) => {
    setEditingId(row.external_id);
    setForm(rowToForm(row));
    setSaveStatus({ type: "idle" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSaveStatus({ type: "idle" });
  };

  const handleChange = (field: keyof AdminFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveStatus({ type: "idle" });
  };

  const handleSave = async () => {
    if (!editingId) return;

    // Basic validation
    if (!form.name.trim()) {
      setSaveStatus({ type: "error", message: "Name is required." });
      return;
    }
    if (!form.shortDescription.trim()) {
      setSaveStatus({ type: "error", message: "Short description is required." });
      return;
    }
    if (form.priceLevel && !["$", "$$", "$$$"].includes(form.priceLevel)) {
      setSaveStatus({ type: "error", message: 'Price level must be $, $$, or $$$.' });
      return;
    }

    // Coordinate validation
    const hasLat = form.latitude.trim() !== "";
    const hasLng = form.longitude.trim() !== "";
    if (hasLat !== hasLng) {
      setSaveStatus({ type: "error", message: "Enter both latitude and longitude, or leave both empty." });
      return;
    }
    let lat: number | null = null;
    let lng: number | null = null;
    if (hasLat && hasLng) {
      lat = parseFloat(form.latitude);
      lng = parseFloat(form.longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        setSaveStatus({ type: "error", message: "Latitude must be between -90 and 90." });
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        setSaveStatus({ type: "error", message: "Longitude must be between -180 and 180." });
        return;
      }
    }

    setIsSaving(true);
    setSaveStatus({ type: "idle" });

    const patch: AdminVenuePatch = {
      name:             form.name.trim() || undefined,
      category:         form.category.trim() || undefined,
      subcategory:      form.subcategory.trim() || null,
      neighborhood:     form.neighborhood.trim() || null,
      address:          form.address.trim() || null,
      googleMapsLink:   form.googleMapsLink.trim() || null,
      phone:            form.phone.trim() || null,
      shortDescription: form.shortDescription.trim() || null,
      imageUrl:         form.imageUrl.trim() || null,
      priceLevel:       form.priceLevel || null,
      lat,
      lng,
      isActive:         form.isActive,
      website:          form.website.trim() || null,
      instagram:        form.instagram.trim() || null,
      overview:         form.overview.trim() || null,
      vibe:             form.vibe.trim() || null,
      audience:         form.audience.trim() || null,
    };

    const result = await patchVenue(editingId, patch);
    setIsSaving(false);

    if (result.ok) {
      // Refresh form from the updated row returned by the server
      setForm(rowToForm(result.row));
      setSaveStatus({ type: "success", message: `Saved to Supabase (${editingId})` });
    } else {
      // If the session expired, return to the lock screen.
      if (result.message.includes("Session expired")) {
        setIsAuthenticated(false);
        setPinInput("");
        return;
      }
      setSaveStatus({ type: "error", message: result.message });
    }
  };

  // ── Loading state while checking session ──────────────────────────────────────

  if (isCheckingSession) {
    return (
      <div className="bl-admin-page">
        <HomeHeader labels={dictionary.header} />
        <main className="bl-admin-gate-main">
          <div className="bl-admin-gate-form">
            <p className="bl-admin-gate-eyebrow">Admin</p>
            <h1 className="bl-admin-gate-title">Checking session...</h1>
          </div>
        </main>
      </div>
    );
  }

  // ── Auth gate render ──────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="bl-admin-page">
        <HomeHeader labels={dictionary.header} />
        <main className="bl-admin-gate-main">
          <form
            className="bl-admin-gate-form"
            onSubmit={handleLogin}
          >
            <p className="bl-admin-gate-eyebrow">Admin</p>
            <h1 className="bl-admin-gate-title">Restricted area</h1>
            <p className="bl-admin-gate-desc">Enter the admin PIN to continue.</p>
            {sessionError ? (
              <p className="bl-admin-gate-error">
                Could not reach the server. Please try again.
              </p>
            ) : null}
            <input
              type="password"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setLoginError(null); }}
              placeholder="PIN"
              className={`bl-admin-gate-input${loginError ? " is-error" : ""}`}
              autoFocus
              autoComplete="current-password"
              disabled={isLoggingIn}
            />
            {loginError === "invalid" ? (
              <p className="bl-admin-gate-error">Invalid credentials</p>
            ) : loginError === "rate_limited" ? (
              <p className="bl-admin-gate-error">
                Too many attempts. Please wait and try again.
              </p>
            ) : loginError === "error" ? (
              <p className="bl-admin-gate-error">
                Could not reach the server. Please try again.
              </p>
            ) : null}
            <button type="submit" className="bl-admin-gate-btn" disabled={isLoggingIn}>
              {isLoggingIn ? "Verifying..." : "Continue \u2192"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  // ── Main admin render ─────────────────────────────────────────────────────────

  return (
    <div className="bl-admin-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-admin-main">
        <section className="bl-admin-hero">
          <p className="bl-admin-eyebrow">{dictionary.adminPage.eyebrow}</p>
          <h1 className="bl-admin-title">{dictionary.adminPage.title}</h1>
          <p className="bl-admin-subtitle">
            {dictionary.adminPage.subtitle}
          </p>
          <button
            type="button"
            className="bl-admin-secondary-btn"
            onClick={handleLogout}
            style={{ marginTop: "0.5rem" }}
          >
            Log out
          </button>
          {loadError ? (
            <p className="bl-admin-api-error">
              API error: {loadError}
            </p>
          ) : null}
        </section>

        <section className="bl-admin-layout">
          {/* ── Venue list ── */}
          <div className="bl-admin-list-card">
            <div className="bl-admin-list-head">
              <h2>
                {isLoading ? "Loading\u2026" : `${rows.length} venues`}
              </h2>
              <button
                type="button"
                className="bl-admin-secondary-btn"
                onClick={() => fetchVenues()}
                disabled={isLoading}
              >
                Refresh
              </button>
            </div>

            <div className="bl-admin-filters">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, category, neighborhood\u2026"
                className="bl-admin-input"
              />
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
                className="bl-admin-select"
              >
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
                <option value="all">All venues</option>
              </select>
            </div>

            <div className="bl-admin-list-grid">
              {filteredRows.map((row) => {
                const isEditing = editingId === row.external_id;
                return (
                  <article
                    key={row.external_id}
                    className={`bl-admin-list-item${isEditing ? " is-active" : ""}${!row.is_active ? " is-inactive" : ""}`}
                  >
                    <div>
                      <p className="bl-admin-list-name">
                        {row.name}
                        {!row.is_active ? (
                          <span className="bl-admin-inactive-badge">inactive</span>
                        ) : null}
                      </p>
                      <p className="bl-admin-list-meta">
                        {row.external_id} · {row.subcategory ?? row.category} · {row.neighborhood ?? "\u2014"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="bl-admin-secondary-btn"
                      onClick={() => startEdit(row)}
                    >
                      {dictionary.adminPage.editAction}
                    </button>
                  </article>
                );
              })}
              {!isLoading && filteredRows.length === 0 && !loadError ? (
                <p className="bl-admin-empty">No venues match your filters.</p>
              ) : null}
            </div>
          </div>

          {/* ── Edit form ── */}
          <div className="bl-admin-form-card">
            {editingId ? (
              <>
                <div className="bl-admin-form-head">
                  <h2>{dictionary.adminPage.formEditTitle}</h2>
                  <span className="bl-admin-form-badge">{editingId}</span>
                </div>

                {/* Save status banner */}
                {saveStatus.type !== "idle" ? (
                  <p className={`bl-admin-feedback${saveStatus.type === "error" ? " is-error" : ""}`}>
                    {saveStatus.message}
                  </p>
                ) : null}

                <div className="bl-admin-form-grid">

                  {/* ── Core identity ── */}
                  <p className="bl-admin-form-section-label">Identity</p>

                  <label className="bl-admin-field">
                    <span>{dictionary.adminPage.fieldName}</span>
                    <input
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="bl-admin-input"
                    />
                  </label>

                  <label className="bl-admin-field">
                    <span>Category</span>
                    <input
                      value={form.category}
                      onChange={(e) => handleChange("category", e.target.value)}
                      className="bl-admin-input"
                    />
                  </label>

                  <label className="bl-admin-field">
                    <span>Subcategory</span>
                    <input
                      value={form.subcategory}
                      onChange={(e) => handleChange("subcategory", e.target.value)}
                      className="bl-admin-input"
                      placeholder="e.g. Billiards, Padel, Escape Room"
                    />
                  </label>

                  <label className="bl-admin-field">
                    <span>Neighborhood</span>
                    <input
                      value={form.neighborhood}
                      onChange={(e) => handleChange("neighborhood", e.target.value)}
                      className="bl-admin-input"
                      placeholder="e.g. Maarif, Ain Diab"
                    />
                  </label>

                  <label className="bl-admin-field">
                    <span>{dictionary.adminPage.fieldBudget}</span>
                    <select
                      value={form.priceLevel}
                      onChange={(e) => handleChange("priceLevel", e.target.value)}
                      className="bl-admin-select"
                    >
                      <option value="$">$</option>
                      <option value="$$">$$</option>
                      <option value="$$$">$$$</option>
                    </select>
                  </label>

                  <label className="bl-admin-field">
                    <span>Status</span>
                    <select
                      value={form.isActive ? "active" : "inactive"}
                      onChange={(e) => handleChange("isActive", e.target.value === "active")}
                      className="bl-admin-select"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>

                  {/* ── Description ── */}
                  <p className="bl-admin-form-section-label">Description</p>

                  <label className="bl-admin-field bl-admin-field-full">
                    <span>{dictionary.adminPage.fieldShortDescription}</span>
                    <textarea
                      value={form.shortDescription}
                      onChange={(e) => handleChange("shortDescription", e.target.value)}
                      className="bl-admin-textarea"
                      rows={2}
                    />
                  </label>

                  <label className="bl-admin-field bl-admin-field-full">
                    <span>{dictionary.adminPage.fieldOverview}</span>
                    <textarea
                      value={form.overview}
                      onChange={(e) => handleChange("overview", e.target.value)}
                      className="bl-admin-textarea"
                      rows={3}
                    />
                  </label>

                  <label className="bl-admin-field">
                    <span>{dictionary.adminPage.fieldVibe}</span>
                    <input
                      value={form.vibe}
                      onChange={(e) => handleChange("vibe", e.target.value)}
                      className="bl-admin-input"
                      placeholder="e.g. Lively, Chill, Competitive"
                    />
                  </label>

                  <label className="bl-admin-field">
                    <span>{dictionary.adminPage.fieldAudience}</span>
                    <input
                      value={form.audience}
                      onChange={(e) => handleChange("audience", e.target.value)}
                      className="bl-admin-input"
                      placeholder="e.g. Groups of friends, Families"
                    />
                  </label>

                  {/* ── Contact / Location ── */}
                  <p className="bl-admin-form-section-label">Contact & Location</p>

                  <label className="bl-admin-field bl-admin-field-full">
                    <span>Address</span>
                    <input
                      value={form.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      className="bl-admin-input"
                    />
                  </label>

                  <label className="bl-admin-field bl-admin-field-full">
                    <span>Google Maps link</span>
                    <input
                      value={form.googleMapsLink}
                      onChange={(e) => handleChange("googleMapsLink", e.target.value)}
                      className="bl-admin-input"
                      placeholder="https://maps.google.com/..."
                    />
                  </label>

                  <label className="bl-admin-field">
                    <span>Phone</span>
                    <input
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="bl-admin-input"
                      placeholder="+212..."
                    />
                  </label>

                  <label className="bl-admin-field">
                    <span>Website</span>
                    <input
                      value={form.website}
                      onChange={(e) => handleChange("website", e.target.value)}
                      className="bl-admin-input"
                      placeholder="https://..."
                    />
                  </label>

                  <label className="bl-admin-field">
                    <span>Instagram</span>
                    <input
                      value={form.instagram}
                      onChange={(e) => handleChange("instagram", e.target.value)}
                      className="bl-admin-input"
                      placeholder="https://instagram.com/..."
                    />
                  </label>

                  {/* ── Media ── */}
                  <p className="bl-admin-form-section-label">Media</p>

                  <label className="bl-admin-field bl-admin-field-full">
                    <span>Image URL (Supabase Storage or CDN)</span>
                    <input
                      value={form.imageUrl}
                      onChange={(e) => handleChange("imageUrl", e.target.value)}
                      className="bl-admin-input"
                      placeholder="https://..."
                    />
                  </label>

                  {/* ── Coordinates ── */}
                  <p className="bl-admin-form-section-label">Coordinates</p>

                  <label className="bl-admin-field">
                    <span>{dictionary.adminPage.fieldLatitude}</span>
                    <input
                      value={form.latitude}
                      onChange={(e) => handleChange("latitude", e.target.value)}
                      className="bl-admin-input"
                      placeholder="33.57"
                    />
                  </label>

                  <label className="bl-admin-field">
                    <span>{dictionary.adminPage.fieldLongitude}</span>
                    <input
                      value={form.longitude}
                      onChange={(e) => handleChange("longitude", e.target.value)}
                      className="bl-admin-input"
                      placeholder="-7.59"
                    />
                  </label>

                  {/* ── Slug (read-only) ── */}
                  <label className="bl-admin-field bl-admin-field-full">
                    <span>Slug (read-only)</span>
                    <input
                      value={form.slug}
                      readOnly
                      className="bl-admin-input"
                      style={{ opacity: 0.5, cursor: "default" }}
                    />
                  </label>
                </div>

                <div className="bl-admin-form-actions">
                  <button
                    type="button"
                    className="bl-admin-secondary-btn"
                    onClick={cancelEdit}
                    disabled={isSaving}
                  >
                    {dictionary.adminPage.cancelAction}
                  </button>
                  <button
                    type="button"
                    className="bl-admin-primary-btn"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving\u2026" : "Save to Supabase"}
                  </button>
                </div>
              </>
            ) : (
              <div className="bl-admin-form-empty">
                <p>Select a venue from the list to edit it.</p>
                <p className="bl-admin-form-empty-sub">
                  Changes are written directly to Supabase. There is no undo — verify field values before saving.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
