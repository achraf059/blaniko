import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard, VenueCardSkeleton } from "../components/home/VenueCard";
import { getVenueDisplay } from "../data/mockData";
import { useCollections } from "../hooks/useCollections";
import { useFavorites } from "../hooks/useFavorites";
import { usePageMeta } from "../hooks/usePageMeta";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import { getFlowTexts } from "../i18n/flowTexts";
import "./CollectionsPage.css";

export default function CollectionsPage() {
  const { dictionary, language } = useI18n();
  const text = getFlowTexts(language);
  usePageMeta(
    language === "fr" ? "Mes collections | Blaniko" : "My Collections | Blaniko",
    language === "fr"
      ? "Consultez et gérez vos collections de lieux enregistrés à Casablanca."
      : "View and manage your saved venue collections in Casablanca.",
  );
  const { venuesBySlug, isLoading } = useVenues();
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    collections,
    createCollection,
    renameCollection,
    deleteCollection,
    removeVenueFromCollection,
  } = useCollections();

  const [newCollectionName, setNewCollectionName] = useState("");
  const [expandedCollectionId, setExpandedCollectionId] = useState<
    string | null
  >(null);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(
    null,
  );
  const [editingName, setEditingName] = useState("");

  const sortedCollections = useMemo(() => {
    return [...collections].sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );
  }, [collections]);

  const handleCreateCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = createCollection(newCollectionName);
    if (!created) {
      return;
    }

    setExpandedCollectionId(created.id);
    setNewCollectionName("");
  };

  return (
    <div className="bl-collections-page">
      <HomeHeader labels={dictionary.header} />

      <main className="bl-collections-main">
        <section className="bl-collections-hero">
          <p className="bl-collections-eyebrow">{text.collectionsPage.eyebrow}</p>
          <h1 className="bl-collections-title">{text.collectionsPage.title}</h1>
          <p className="bl-collections-subtitle">
            {text.collectionsPage.subtitle}
          </p>

          <form
            className="bl-collections-create"
            onSubmit={handleCreateCollection}
          >
            <input
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              placeholder={text.collectionsPage.createPlaceholder}
              aria-label={text.collectionsPage.createAria}
            />
            <button type="submit">{text.collectionsPage.createButton}</button>
          </form>
        </section>

        {sortedCollections.length === 0 ? (
          <section className="bl-collections-empty">
            <h2>{text.collectionsPage.emptyTitle}</h2>
            <p>{text.collectionsPage.emptyDescription}</p>
            <div className="bl-collections-empty-links">
              <Link to="/search">{text.collectionsPage.browseSearch}</Link>
              <Link to="/favorites">{text.collectionsPage.openFavorites}</Link>
            </div>
          </section>
        ) : (
          <section className="bl-collections-list">
            {sortedCollections.map((collection) => {
              const existingVenues = collection.venueSlugs
                .map((slug) => venuesBySlug[slug])
                .filter((venue): venue is NonNullable<typeof venue> =>
                  Boolean(venue),
                );
              const missingSlugs = collection.venueSlugs.filter(
                (slug) => !venuesBySlug[slug],
              );
              const isExpanded = expandedCollectionId === collection.id;
              const isEditing = editingCollectionId === collection.id;

              return (
                <article key={collection.id} className="bl-collections-card">
                  <div className="bl-collections-card-head">
                    {isEditing ? (
                      <form
                        className="bl-collections-rename"
                        onSubmit={(event) => {
                          event.preventDefault();
                          renameCollection(collection.id, editingName);
                          setEditingCollectionId(null);
                          setEditingName("");
                        }}
                      >
                        <input
                          value={editingName}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                          aria-label={text.collectionsPage.renameAria}
                        />
                        <button type="submit">{text.collectionsPage.save}</button>
                      </form>
                    ) : (
                      <>
                        <h2>{collection.name}</h2>
                        <p>
                          {text.collectionsPage.savedAndAvailable
                            .replace("{saved}", String(collection.venueSlugs.length))
                            .replace("{available}", String(existingVenues.length))}
                        </p>
                      </>
                    )}

                    <div className="bl-collections-card-actions">
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCollectionId(collection.id);
                            setEditingName(collection.name);
                          }}
                        >
                          {text.collectionsPage.rename}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCollectionId(null);
                            setEditingName("");
                          }}
                        >
                          {text.collectionsPage.cancel}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteCollection(collection.id)}
                      >
                        {text.collectionsPage.delete}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCollectionId((previous) =>
                            previous === collection.id ? null : collection.id,
                          )
                        }
                      >
                        {isExpanded ? text.collectionsPage.hide : text.collectionsPage.open}
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="bl-collections-card-body">
                      {isLoading && collection.venueSlugs.length > 0 ? (
                        <div className="bl-home-venues-grid">
                          {Array.from(
                            { length: Math.min(collection.venueSlugs.length, 4) },
                            (_, i) => <VenueCardSkeleton key={i} />,
                          )}
                        </div>
                      ) : existingVenues.length > 0 ? (
                        <div className="bl-home-venues-grid">
                          {existingVenues.map((venue) => {
                            const vd = getVenueDisplay(venue, language);
                            return (
                            <div key={`${collection.id}-${venue.slug}`}>
                              <VenueCard
                                slug={venue.slug}
                                category={dictionary.categoryNames[venue.categorySlug] ?? venue.category}
                                name={venue.name}
                                area={venue.area}
                                description={vd.description}
                                personality={{
                                  bestForTags: venue.bestForTags,
                                  timeOfDay: venue.timeOfDay,
                                  energyLevel: venue.energyLevel,
                                  socialLevel: venue.socialLevel,
                                  spaceType: venue.spaceType,
                                }}
                                href={`/venues/${venue.slug}?from=collections`}
                                language={language}
                                labels={dictionary.venueCard}
                                isFavorite={isFavorite(venue.slug)}
                                onToggleFavorite={toggleFavorite}
                              />

                              <button
                                type="button"
                                className="bl-collections-remove-venue"
                                onClick={() =>
                                  removeVenueFromCollection(
                                    collection.id,
                                    venue.slug,
                                  )
                                }
                              >
                                {text.collectionsPage.removeFromList}
                              </button>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="bl-collections-empty-note">
                          {text.collectionsPage.emptyList}
                        </p>
                      )}

                      {missingSlugs.length > 0 ? (
                        <div className="bl-collections-missing">
                          <h3>{text.collectionsPage.missingTitle}</h3>
                          <p>{text.collectionsPage.missingDescription}</p>
                          <ul>
                            {missingSlugs.map((slug) => (
                              <li key={`${collection.id}-${slug}`}>
                                <span>{slug}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeVenueFromCollection(
                                      collection.id,
                                      slug,
                                    )
                                  }
                                >
                                  {text.common.remove}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
