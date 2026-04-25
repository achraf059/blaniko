import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useCollections } from "../../hooks/useCollections";
import { getFlowTexts } from "../../i18n/flowTexts";
import { useI18n } from "../../i18n/useI18n";
import "./CollectionPicker.css";

type CollectionPickerProps = {
  venueSlug: string;
  compact?: boolean;
};

export function CollectionPicker({
  venueSlug,
  compact = false,
}: CollectionPickerProps) {
  const {
    collections,
    createCollection,
    addVenueToCollection,
    removeVenueFromCollection,
    isVenueInCollection,
  } = useCollections();
  const { language } = useI18n();
  const text = getFlowTexts(language);
  const [newName, setNewName] = useState("");
  const [feedback, setFeedback] = useState<string>("");

  const count = useMemo(() => {
    return collections.filter((collection) =>
      collection.venueSlugs.includes(venueSlug),
    ).length;
  }, [collections, venueSlug]);

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const created = createCollection(newName, venueSlug);
    if (!created) {
      return;
    }

    setFeedback(
      language === "fr" ? `Enregistré dans ${created.name}` : `Saved to ${created.name}`,
    );
    setNewName("");
    window.setTimeout(() => setFeedback(""), 1800);
  };

  return (
    <details className={`bl-collection-picker${compact ? " is-compact" : ""}`}>
      <summary className="bl-collection-picker-summary">
        <span aria-hidden="true">🗂</span>
        <span>
          {count > 0
            ? language === "fr"
              ? `Dans ${count} liste${count > 1 ? "s" : ""}`
              : `In ${count} list${count > 1 ? "s" : ""}`
            : language === "fr"
              ? "Ajouter à la liste"
              : "Add to list"}
        </span>
      </summary>

      <div className="bl-collection-picker-panel">
        {collections.length > 0 ? (
          <div className="bl-collection-picker-list">
            {collections.map((collection) => {
              const isSelected = isVenueInCollection(collection.id, venueSlug);

              return (
                <label
                  key={collection.id}
                  className="bl-collection-picker-item"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (isSelected) {
                        removeVenueFromCollection(collection.id, venueSlug);
                        return;
                      }

                      addVenueToCollection(collection.id, venueSlug);
                    }}
                  />
                  <span>{collection.name}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="bl-collection-picker-empty">
            {language === "fr"
              ? "Aucune liste pour le moment. Créez la première."
              : "No lists yet. Create your first one."}
          </p>
        )}

        <form className="bl-collection-picker-create" onSubmit={handleCreate}>
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={text.collectionsPage.createPlaceholder}
            aria-label={text.collectionsPage.createAria}
          />
          <button type="submit">
            {language === "fr" ? "Créer + ajouter" : "Create + add"}
          </button>
        </form>

        {feedback ? (
          <p className="bl-collection-picker-feedback">{feedback}</p>
        ) : null}
      </div>
    </details>
  );
}
