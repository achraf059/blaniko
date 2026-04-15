import { categories, venues } from "../data/mockData";

export default function HomePage() {
  return (
    <main>
      <h1>Blaniko Home</h1>

      <p>Categories: {categories.length}</p>
      <p>Venues: {venues.length}</p>

      <section>
        <h2>First categories</h2>
        <ul>
          {categories.slice(0, 3).map((category) => (
            <li key={category.slug}>
              {category.name} ({category.slug})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>First venues</h2>
        <ul>
          {venues.slice(0, 3).map((venue) => (
            <li key={venue.slug}>
              {venue.name} - {venue.area}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
