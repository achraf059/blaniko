# Blaniko Homepage Strategy

## 1. MVP Homepage Goals

The homepage is the first moment of trust. For an activities discovery MVP in Casablanca, it must do four jobs — no more:

1. **Instantly communicate what Blaniko is** — a curated way to discover fun things to do in Casablanca. No scroll required to understand it.
2. **Invite exploration, not decision** — the goal isn't to book on the homepage. It's to make users *want* to browse. Search + categories + curated picks, in that order of weight.
3. **Establish premium brand perception** — type, spacing, and motion must feel more like a design magazine than a directory. This is what separates Blaniko from generic "things to do" sites.
4. **Set up the product's core interaction loop** — category filter → activity card → activity detail. The homepage previews this loop so users trust where clicks will take them.

Explicitly *not* goals for MVP homepage:
- Booking / checkout
- User reviews at depth
- Hotels / restaurants (intentionally scoped out)
- Map view (reserved for a later /explore page)

## 2. Recommended Section Structure

A tight 6-block flow, optimized for a single scroll.

| # | Section | Purpose | Weight |
|---|---|---|---|
| 1 | **Top nav** | Wordmark, explore/categories/about, language switch, subtle sign-in | minimal |
| 2 | **Hero** | Editorial statement + floating activity cards + compact search | dominant |
| 3 | **Collage continuation** | Smaller visual echo of hero — the "landing zone" for hero cards when they animate down on scroll | medium |
| 4 | **Browse by category** | Clear discovery grid — outdoors, culture, nightlife, kids, water, wellness, etc. | medium |
| 5 | **Curated this week** | Editor's pick — 3-4 activities with richer visual treatment | medium |
| 6 | **How Blaniko works** | 3 short beats of trust (curated, local, updated) — no jargon | light |
| 7 | **Footer CTA** | Simple: "Find your weekend." + email capture or app teaser | light |

The user journey: *"What is this?" → "Oh, these look nice" → "What else?" → "This is well chosen" → "I trust these people" → action.*

## 3. Three Design Directions

### Direction A — *Editorial Atelier*
**Concept:** Blaniko as a design magazine for weekend plans.
**Mood:** Calm, cultured, aspirational. Think Kinfolk meets Cereal Magazine.
**Hierarchy:** Oversized serif headline, generous whitespace, restrained color. Cards float with subtle shadows and fine borders.
**Flow:** Hero with 3-4 floating cards at staggered depths → collage of softer rounded placeholders below → categories as elegant typographic chips → curated activities shown magazine-spread style → quiet trust bar → minimal footer.
**Imagery:** Photo-led activity cards with muted film-grade tones. Minimal overlay text. Category icons are thin 1px line marks.
**Why it fits:** Makes Blaniko feel like a tastemaker, not a database. Matches "soft purple, premium, elegant" brief most directly. Reads well across EN/FR/AR because the type system carries the weight, not the decoration. ← **RECOMMENDED**

### Direction B — *Coastal Promenade*
**Concept:** Blaniko as the stylish guide to Casablanca's rhythm — coastline, light, leisure.
**Mood:** Urban but breezy. Hints of the Corniche without clichés.
**Hierarchy:** Medium-size serif headline paired with horizontal "ticker" of floating cards. Warmer accent (soft apricot) on CTAs.
**Flow:** Hero has cards drifting on a subtle horizontal plane → collage below uses wider, flatter placeholders (coastline rhythm) → categories laid out as a horizontal rail → curated "this weekend in Casablanca" with location markers.
**Imagery:** Warmer photography. A thin coastline graphic element recurring at section breaks.
**Why it fits:** Strongest "sense of place." Risk: harder to translate, warmer accent competes with purple palette.

### Direction C — *Product-First Grid*
**Concept:** Blaniko as a beautifully engineered product. Less editorial, more Linear/Arc.
**Mood:** Precise, calm, confident. Product over poetry.
**Hierarchy:** Compact headline, prominent search, structured card grid. Motion does more work than type.
**Flow:** Hero is tighter — search is the co-star. Cards float in a precise 3-column rhythm → collage below is a strict grid with varied aspect ratios → categories as a dense icon grid → curated section with filter chips.
**Imagery:** Uniform card treatment, consistent aspect ratios, tight metadata. Less atmosphere, more information density.
**Why it fits:** Fastest to build. Risk: reads like a SaaS app, not a discovery platform. Less memorable.

## 4. Recommendation: **Direction A — Editorial Atelier**

It's the only direction that *earns* the word "premium." B leans on place-imagery which needs real photography to land. C is safe but forgettable. A lets the type system and motion do the premium work, which is achievable for an MVP without expensive photography, and it scales elegantly when real images arrive.

Crucially, A's visual rhythm is what makes the scroll-linked card animation feel purposeful rather than gimmicky: the hero cards are the magazine's "hero spread," and the collage below is the "contents page" — so cards migrating downward is a narrative, not a trick.

## 5. Built Concept

See `Blaniko.html` — a fully interactive homepage prototype with scroll-linked card motion, hover states, a working search input, and Tweaks for palette/accent/Casablanca cue intensity.
