import React from "react";
const { Icon } = window;

// Blaniko — Section 2: Collage continuation
const Continuation = () => {
  return (
    <section className="continuation shell" id="explore">
      <div className="continuation-head">
        <div className="left">
          <div style={{ marginBottom: 12 }}>02 — Continuation</div>
          <h2>A closer <em>look</em> — hand-picked from this week in the city.</h2>
        </div>
        <div className="right">
          Weekly edits, drawn from the people, places, and small rituals that make
          a Saturday in Casablanca worth planning.
        </div>
      </div>

      <div className="collage">
        <div className="slot slot-1" data-slot-for="c1" data-label="Slot 01"/>
        <div className="slot slot-2" data-slot-for="c2" data-label="Slot 02"/>
        <div className="slot slot-3" data-slot-for="c3" data-label="Slot 03"/>
        <div className="slot slot-4" data-slot-for="c4" data-label="Slot 04"/>

        <div className="slot-copy">
          <div className="small">This week's edit</div>
          <h3>Four ways to spend the weekend — each chosen for a different mood.</h3>
          <p>
            Morning swell. Afternoon clay. Evening reel. Late film. Move between
            them at your own pace, or take one at a time.
          </p>
          <a href="#curated" className="link">
            See the full edit
            <Icon name="arrow" size={14} />
          </a>
        </div>
      </div>
    </section>
  );
};

Object.assign(window, { Continuation });
