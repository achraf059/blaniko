import { useParams } from "react-router";
import { categories, venues } from "../data/mockData";

export default function CategoryPage() {
  const { slug } = useParams();

  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    return <h1>Category not found</h1>;
  }

  const matchingVenues = venues.filter(
    (venue) => venue.category.toLowerCase() === category.name.toLowerCase()
  );

  return (
    <main>
      <h1>{category.name}</h1>
      <p>{category.description}</p>
      <p>Venues in this category: {matchingVenues.length}</p>

      <ul>
        {matchingVenues.map((venue) => (
          <li key={venue.slug}>
            {venue.name} - {venue.area}
          </li>
        ))}
      </ul>
    </main>
  );
}
