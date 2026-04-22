// Blaniko — Icons
const Icon = ({ name, size = 16 }) => {
  const paths = {
    heart: <><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></>,
    heartFill: <><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" fill="currentColor"/></>,
    check: <><path d="m5 12 5 5L20 7"/></>,
    map: <><path d="m9 4 6 2 5-2v15l-5 2-6-2-5 2V6z"/><path d="M9 4v16M15 6v16"/></>,
    scale: <><path d="M12 3v18M5 8h14M7 8l-3 7h6zM17 8l-3 7h6z"/></>,
    bolt: <><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></>,
    heart2: <><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></>,
    coin: <><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5a3 3 0 0 0-3-1.5c-1.5 0-3 1-3 2.5s1.5 2 3 2 3 .5 3 2-1.5 2.5-3 2.5a3 3 0 0 1-3-1.5"/></>,
    users: <><circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0M17 11a3 3 0 1 0-2-5"/><path d="M21 19a5 5 0 0 0-4-5"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    pin: <><path d="M12 22s-8-7.5-8-13a8 8 0 1 1 16 0c0 5.5-8 13-8 13z"/><circle cx="12" cy="9" r="3"/></>,
    arrow: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    arrowUpRight: <><path d="M7 17 17 7M8 7h9v9"/></>,
    mountain: <><path d="m3 19 6-10 4 6 3-4 5 8H3z"/></>,
    wave: <><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></>,
    column: <><path d="M4 4h16M5 4v16M19 4v16M4 20h16M9 8v8M15 8v8"/></>,
    moon: <><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></>,
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></>,
    pen: <><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></>,
    leaf: <><path d="M11 20A7 7 0 0 1 4 13V6a2 2 0 0 1 2-2h7a7 7 0 0 1 7 7 9 9 0 0 1-9 9zM6 6l11 11"/></>,
    kite: <><path d="M12 2 2 12l10 10 10-10zM12 2v20M2 12h20"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

Object.assign(window, { Icon });
