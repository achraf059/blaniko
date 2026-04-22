import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { HomeHeader } from "../components/home/HomeHeader";
import { VenueCard } from "../components/home/VenueCard";
import { useCollections } from "../hooks/useCollections";
import { useFavorites } from "../hooks/useFavorites";
import { useVenues } from "../hooks/useVenues";
import { useI18n } from "../i18n/useI18n";
import "./HomePage.css";
import "./CollectionsPage.css";

export default function CollectionsPage() {
  const { dictionary } = useI18n();
  const { venuesBySlug } = useVenues();
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
          <p className="bl-collections-eyebrow">Collections</p>
          <h1 className="bl-collections-title">Saved lists</h1>
          <p className="bl-collections-subtitle">
            Organize venues into reusable lists for plans, moods, or
            neighborhoods.
          </p>

          <form
            className="bl-collections-create"
            onSubmit={handleCreateCollection}
          >
            <input
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              placeholder="Create a new list"
              aria-label="New collection name"
            />
            <button type="submit">Create collection</button>
          </form>
        </section>

        {sortedCollections.length === 0 ? (
          <section className="bl-collections-empty">
            <h2>No collections yet.</h2>
            <p>
              Start by creating a list, then add venues from search, favorites,
              or details.
            </p>
            <div className="bl-collections-empty-links">
              <Link to="/search">Browse search</Link>
              <Link to="/favorites">Open favorites</Link>
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
                          aria-label="Rename collection"
                        />
                        <button type="submit">Save</button>
                      </form>
                    ) : (
                      <>
                        <h2>{collection.name}</h2>
                        <p>
                          {collection.venueSlugs.length} saved •{" "}
                          {existingVenues.length} available
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
                          Rename
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCollectionId(null);
                            setEditingName("");
                          }}
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteCollection(collection.id)}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCollectionId((previous) =>
                            previous === collection.id ? null : collection.id,
                          )
                        }
                      >
                        {isExpanded ? "Hide" : "Open"}
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="bl-collections-card-body">
                      {existingVenues.length > 0 ? (
                        <div className="bl-home-venues-grid">
                          {existingVenues.map((venue) => (
                            <div key={`${collection.id}-${venue.slug}`}>
                              <VenueCard
                                slug={venue.slug}
                                category={venue.category}
                                name={venue.name}
                                area={venue.area}
                                description={venue.description}
                                personality={{
                                  bestForTags: venue.bestForTags,
                                  timeOfDay: venue.timeOfDay,
                                  energyLevel: venue.energyLevel,
                                  socialLevel: venue.socialLevel,
                                  spaceType: venue.spaceType,
                                }}
                                href={`/venues/${venue.slug}?from=collections`}
                                labels={dictionary.venueCard}
                                isFavorite={isFavorite(venue.slug)}
                                onToggleFavorite={toggleFavorite}
                                showCollectionPicker
                                showCompareToggle
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
                                Remove from this list
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="bl-collections-empty-note">
                          No available venues in this list yet.
                        </p>
                      )}

                      {missingSlugs.length > 0 ? (
                        <div className="bl-collections-missing">
                          <h3>Unavailable venues</h3>
                          <p>
                            Some saved venues are no longer available in shared
                            data. You can remove them safely.
                          </p>
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
                                  Remove
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
