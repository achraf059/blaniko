import React from "react";

// Blaniko — shared product state (favorites + compare) with localStorage
export const useBlanikoState = () => {
  const [favorites, setFavorites] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("blaniko.fav") || "[]"); } catch { return []; }
  });
  const [compare, setCompare] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("blaniko.cmp") || "[]"); } catch { return []; }
  });

  React.useEffect(() => {
    localStorage.setItem("blaniko.fav", JSON.stringify(favorites));
  }, [favorites]);
  React.useEffect(() => {
    localStorage.setItem("blaniko.cmp", JSON.stringify(compare));
  }, [compare]);

  const toggleFav = (id) => setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  const toggleCmp = (id) => setCompare(c => {
    if (c.includes(id)) return c.filter(x => x !== id);
    if (c.length >= 3) return [c[1], c[2], id]; // cap at 3
    return [...c, id];
  });
  const clearCmp = () => setCompare([]);

  return { favorites, toggleFav, compare, toggleCmp, clearCmp };
};

Object.assign(window, { BlanikoState: useBlanikoState });
