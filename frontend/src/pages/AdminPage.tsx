import { useMemo, useState } from "react";
import { HomeHeader } from "../components/home/HomeHeader";
import { categories, type Venue } from "../data/mockData";
import { useAdminVenues } from "../hooks/useAdminVenues";
import { useI18n } from "../i18n/useI18n";
import type { Dictionary } from "../i18n/dictionaries";
import "./HomePage.css";
import "./AdminPage.css";

type AdminFormState = {
  slug: string;
  name: string;
  categorySlug: string;
  area: string;
  priceLevel: string;
  shortDescription: string;
  overview: string;
  vibe: string;
  audience: string;
  latitude: string;
  longitude: string;
};

type AdminFormErrors = Partial<Record<keyof AdminFormState, string>>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function createInitialFormState(): AdminFormState {
  return {
    slug: "",
    name: "",
    categorySlug: "cafes",
    area: "",
    priceLevel: "$$",
    shortDescription: "",
    overview: "",
    vibe: "",
    audience: "",
    latitude: "",
    longitude: "",
  };
}

function toFormState(venue: Venue): AdminFormState {
  return {
    slug: venue.slug,
    name: venue.name,
    categorySlug: venue.categorySlug,
    area: venue.area,
    priceLevel: venue.priceLevel ?? "$$",
    shortDescription: venue.shortDescription ?? venue.description,
    overview: venue.overview ?? "",
    vibe: venue.vibe ?? "",
    audience: venue.audience ?? "",
    latitude:
      typeof venue.coordinates?.lat === "number" ? String(venue.coordinates.lat) : "",
    longitude:
      typeof venue.coordinates?.lng === "number" ? String(venue.coordinates.lng) : "",
  };
}

function validateForm(
  state: AdminFormState,
  e: Pick<
    Dictionary["adminPage"],
    | "errNameRequired"
    | "errCategoryRequired"
    | "errAreaRequired"
    | "errBudgetFormat"
    | "errShortDescriptionRequired"
    | "errCoordsBothRequired"
    | "errLatitudeRange"
    | "errLongitudeRange"
  >,
): AdminFormErrors {
  const errors: AdminFormErrors = {};

  if (!state.name.trim()) {
    errors.name = e.errNameRequired;
  }

  if (!state.categorySlug.trim()) {
    errors.categorySlug = e.errCategoryRequired;
  }

  if (!state.area.trim()) {
    errors.area = e.errAreaRequired;
  }

  if (!["$", "$$", "$$$"].includes(state.priceLevel)) {
    errors.priceLevel = e.errBudgetFormat;
  }

  if (!state.shortDescription.trim()) {
    errors.shortDescription = e.errShortDescriptionRequired;
  }

  const hasLatitude = state.latitude.trim().length > 0;
  const hasLongitude = state.longitude.trim().length > 0;

  if (hasLatitude !== hasLongitude) {
    errors.latitude = e.errCoordsBothRequired;
    errors.longitude = e.errCoordsBothRequired;
  }

  if (hasLatitude && hasLongitude) {
    const lat = Number.parseFloat(state.latitude);
    const lng = Number.parseFloat(state.longitude);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = e.errLatitudeRange;
    }

    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = e.errLongitudeRange;
    }
  }

  return errors;
}

export default function AdminPage() {
  const { dictionary } = useI18n();
  const { managedVenues, upsertVenue, removeVenue, resetVenues } = useAdminVenues();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<AdminFormState>(createInitialFormState());
  const [formErrors, setFormErrors] = useState<AdminFormErrors>({});
  const [feedback, setFeedback] = useState<string>("");

  const filteredVenues = useMemo(() => {
    return managedVenues.filter((venue) => {
      const inCategory = selectedCategory === "all" || venue.categorySlug === selectedCategory;

      if (!inCategory) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const haystack = `${venue.name} ${venue.category} ${venue.area} ${venue.description}`.toLowerCase();
      return haystack.includes(searchTerm.trim().toLowerCase());
    });
  }, [managedVenues, searchTerm, selectedCategory]);

  const startCreate = () => {
    setMode("create");
    setEditingSlug(null);
    setFormState(createInitialFormState());
    setFormErrors({});
    setFeedback("");
  };

  const startEdit = (venue: Venue) => {
    setMode("edit");
    setEditingSlug(venue.slug);
    setFormState(toFormState(venue));
    setFormErrors({});
    setFeedback("");
  };

  const cancelForm = () => {
    if (mode === "edit" && editingSlug) {
      const venue = managedVenues.find((item) => item.slug === editingSlug);
      if (venue) {
        setFormState(toFormState(venue));
        setFormErrors({});
        setFeedback("");
        return;
      }
    }

    startCreate();
  };

  const handleChange = <T extends keyof AdminFormState>(field: T, value: string) => {
    setFormState((previous) => ({ ...previous, [field]: value }));
  };

  const handleSave = () => {
    const errors = validateForm(formState, dictionary.adminPage);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFeedback("");
      return;
    }

    const matchedCategory = categories.find((category) => category.slug === formState.categorySlug);

    if (!matchedCategory) {
      setFormErrors({ categorySlug: "Please select a valid category." });
      return;
    }

    const baseSlug = slugify(formState.slug || formState.name) || "venue";
    let nextSlug = baseSlug;

    if (mode === "create") {
      let index = 1;
      while (managedVenues.some((venue) => venue.slug === nextSlug)) {
        nextSlug = `${baseSlug}-${index}`;
        index += 1;
      }
    } else if (editingSlug) {
      nextSlug = editingSlug;
    }

    const latitude = formState.latitude.trim();
    const longitude = formState.longitude.trim();

    const nextVenue: Venue = {
      slug: nextSlug,
      name: formState.name.trim(),
      category: matchedCategory.name,
      categorySlug: matchedCategory.slug,
      area: formState.area.trim(),
      description: formState.shortDescription.trim(),
      shortDescription: formState.shortDescription.trim(),
      overview: formState.overview.trim() || undefined,
      vibe: formState.vibe.trim() || undefined,
      audience: formState.audience.trim() || undefined,
      priceLevel: formState.priceLevel,
      coordinates:
        latitude && longitude
          ? {
              lat: Number.parseFloat(latitude),
              lng: Number.parseFloat(longitude),
            }
          : undefined,
    };

    upsertVenue(nextVenue);
    setMode("edit");
    setEditingSlug(nextVenue.slug);
    setFormState(toFormState(nextVenue));
    setFormErrors({});
    setFeedback(dictionary.adminPage.savedFeedback);
  };

  const handleDelete = () => {
    if (!editingSlug) {
      return;
    }

    const confirmed = window.confirm(dictionary.adminPage.deleteConfirm);

    if (!confirmed) {
      return;
    }

    removeVenue(editingSlug);
    startCreate();
    setFeedback(dictionary.adminPage.deletedFeedback);
  };

  return (
    <div className="bl-admin-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-admin-main">
        <section className="bl-admin-hero">
          <p className="bl-admin-eyebrow">{dictionary.adminPage.eyebrow}</p>
          <h1 className="bl-admin-title">{dictionary.adminPage.title}</h1>
          <p className="bl-admin-subtitle">{dictionary.adminPage.subtitle}</p>
          <p className="bl-admin-helper">{dictionary.adminPage.helper}</p>
        </section>

        <section className="bl-admin-layout">
          <div className="bl-admin-list-card">
            <div className="bl-admin-list-head">
              <h2>{dictionary.adminPage.listTitle}</h2>
              <button type="button" className="bl-admin-primary-btn" onClick={startCreate}>
                {dictionary.adminPage.createAction}
              </button>
            </div>

            <div className="bl-admin-filters">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={dictionary.adminPage.searchPlaceholder}
                className="bl-admin-input"
              />

              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="bl-admin-select"
              >
                <option value="all">{dictionary.adminPage.categoryAll}</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bl-admin-list-grid">
              {filteredVenues.map((venue) => {
                const isActive = editingSlug === venue.slug && mode === "edit";
                return (
                  <article
                    key={venue.slug}
                    className={`bl-admin-list-item${isActive ? " is-active" : ""}`}
                  >
                    <div>
                      <p className="bl-admin-list-name">{venue.name}</p>
                      <p className="bl-admin-list-meta">
                        {venue.category} · {venue.area} · {venue.priceLevel ?? "$$"}
                      </p>
                      <p className="bl-admin-list-ready">
                        {venue.coordinates
                          ? dictionary.adminPage.coordsReady
                          : dictionary.adminPage.coordsMissing}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="bl-admin-secondary-btn"
                      onClick={() => startEdit(venue)}
                    >
                      {dictionary.adminPage.editAction}
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="bl-admin-list-footer">
              <button type="button" className="bl-admin-secondary-btn" onClick={resetVenues}>
                {dictionary.adminPage.resetAction}
              </button>
            </div>
          </div>

          <div className="bl-admin-form-card">
            <div className="bl-admin-form-head">
              <h2>
                {mode === "create"
                  ? dictionary.adminPage.formCreateTitle
                  : dictionary.adminPage.formEditTitle}
              </h2>
              {mode === "edit" && editingSlug ? (
                <span className="bl-admin-form-badge">{editingSlug}</span>
              ) : null}
            </div>

            {feedback ? <p className="bl-admin-feedback">{feedback}</p> : null}

            <div className="bl-admin-form-grid">
              <label className="bl-admin-field">
                <span>{dictionary.adminPage.fieldName}</span>
                <input
                  value={formState.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  className="bl-admin-input"
                />
                {formErrors.name ? <small>{formErrors.name}</small> : null}
              </label>

              <label className="bl-admin-field">
                <span>{dictionary.adminPage.fieldCategory}</span>
                <select
                  value={formState.categorySlug}
                  onChange={(event) => handleChange("categorySlug", event.target.value)}
                  className="bl-admin-select"
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {formErrors.categorySlug ? <small>{formErrors.categorySlug}</small> : null}
              </label>

              <label className="bl-admin-field">
                <span>{dictionary.adminPage.fieldArea}</span>
                <input
                  value={formState.area}
                  onChange={(event) => handleChange("area", event.target.value)}
                  className="bl-admin-input"
                />
                {formErrors.area ? <small>{formErrors.area}</small> : null}
              </label>

              <label className="bl-admin-field">
                <span>{dictionary.adminPage.fieldBudget}</span>
                <select
                  value={formState.priceLevel}
                  onChange={(event) => handleChange("priceLevel", event.target.value)}
                  className="bl-admin-select"
                >
                  <option value="$">$</option>
                  <option value="$$">$$</option>
                  <option value="$$$">$$$</option>
                </select>
                {formErrors.priceLevel ? <small>{formErrors.priceLevel}</small> : null}
              </label>

              <label className="bl-admin-field bl-admin-field-full">
                <span>{dictionary.adminPage.fieldShortDescription}</span>
                <textarea
                  value={formState.shortDescription}
                  onChange={(event) => handleChange("shortDescription", event.target.value)}
                  className="bl-admin-textarea"
                  rows={2}
                />
                {formErrors.shortDescription ? <small>{formErrors.shortDescription}</small> : null}
              </label>

              <label className="bl-admin-field bl-admin-field-full">
                <span>{dictionary.adminPage.fieldOverview}</span>
                <textarea
                  value={formState.overview}
                  onChange={(event) => handleChange("overview", event.target.value)}
                  className="bl-admin-textarea"
                  rows={4}
                />
              </label>

              <label className="bl-admin-field">
                <span>{dictionary.adminPage.fieldVibe}</span>
                <input
                  value={formState.vibe}
                  onChange={(event) => handleChange("vibe", event.target.value)}
                  className="bl-admin-input"
                />
              </label>

              <label className="bl-admin-field">
                <span>{dictionary.adminPage.fieldAudience}</span>
                <input
                  value={formState.audience}
                  onChange={(event) => handleChange("audience", event.target.value)}
                  className="bl-admin-input"
                />
              </label>

              <label className="bl-admin-field">
                <span>{dictionary.adminPage.fieldLatitude}</span>
                <input
                  value={formState.latitude}
                  onChange={(event) => handleChange("latitude", event.target.value)}
                  className="bl-admin-input"
                />
                {formErrors.latitude ? <small>{formErrors.latitude}</small> : null}
              </label>

              <label className="bl-admin-field">
                <span>{dictionary.adminPage.fieldLongitude}</span>
                <input
                  value={formState.longitude}
                  onChange={(event) => handleChange("longitude", event.target.value)}
                  className="bl-admin-input"
                />
                {formErrors.longitude ? <small>{formErrors.longitude}</small> : null}
              </label>
            </div>

            <div className="bl-admin-form-actions">
              <button type="button" className="bl-admin-secondary-btn" onClick={cancelForm}>
                {dictionary.adminPage.cancelAction}
              </button>
              {mode === "edit" ? (
                <button type="button" className="bl-admin-delete-btn" onClick={handleDelete}>
                  {dictionary.adminPage.deleteAction}
                </button>
              ) : null}
              <button type="button" className="bl-admin-primary-btn" onClick={handleSave}>
                {dictionary.adminPage.saveAction}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
