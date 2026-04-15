import { useParams } from "react-router";
import { venues } from "../data/mockData";

export default function VenuePage() {
  const { slug } = useParams();

  const venue = venues.find((item) => item.slug === slug);

  if (!venue) {
    return <h1>Venue not found</h1>;
  }

  return (
    <main>
      <h1>{venue.name}</h1>
      <p>Category: {venue.category}</p>
      <p>Area: {venue.area}</p>
      <p>{venue.shortDescription}</p>
      <p>{venue.overview}</p>
    </main>
  );
}
