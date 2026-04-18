import { useMemo } from "react";
import { type Venue } from "../data/mockData";
import { useAdminVenues } from "./useAdminVenues";

export function useVenues() {
  const { managedVenues } = useAdminVenues();

  const venuesBySlug = useMemo(() => {
    return managedVenues.reduce<Record<string, Venue>>((accumulator, venue) => {
      accumulator[venue.slug] = venue;
      return accumulator;
    }, {});
  }, [managedVenues]);

  const getVenueBySlug = (slug: string): Venue | undefined => {
    return venuesBySlug[slug];
  };

  return {
    venues: managedVenues,
    venuesBySlug,
    getVenueBySlug,
  };
}
