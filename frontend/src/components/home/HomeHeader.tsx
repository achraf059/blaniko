import { GlobalNav } from "./GlobalNav";

export type HomeHeaderProps = {
  labels: {
    home: string;
    categories: string;
    venues: string;
    favorites: string;
    map: string;
    admin: string;
    about: string;
    languageEn: string;
    languageFr: string;
  };
};

export function HomeHeader({ labels }: HomeHeaderProps) {
  return <GlobalNav labels={labels} />;
}
