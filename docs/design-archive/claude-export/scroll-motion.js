// Blaniko — Scroll-linked card motion + reveal observers
(function () {
  let cards = [];
  let slots = new Map();
  let heroEl = null;
  let contEl = null;
  let initialRects = new Map();
  let ticking = false;
  let ready = false;

  function measure() {
    cards = Array.from(document.querySelectorAll(".float-card"));
    slots = new Map();
    document.querySelectorAll(".slot[data-slot-for]").forEach(s => {
      slots.set(s.getAttribute("data-slot-for"), s);
    });
    heroEl = document.querySelector(".hero");
    contEl = document.querySelector(".continuation");
    initialRects = new Map();

    cards.forEach(card => {
      const prev = card.style.transform;
      card.style.transform = "";
      const rect = card.getBoundingClientRect();
      initialRects.set(card.getAttribute("data-card-id"), {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
      card.style.transform = prev;
    });
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function update() {
    if (!ready || !heroEl || !contEl || cards.length === 0) return;

    const heroRect = heroEl.getBoundingClientRect();
    const heroBottom = heroRect.bottom + window.scrollY;
    const contRect = contEl.getBoundingClientRect();
    const contTop = contRect.top + window.scrollY;

    // Progress window: from hero nearly scrolled out → collage reaching view
    const startY = heroBottom - window.innerHeight * 0.9;
    const endY = contTop + contRect.height * 0.25;
    const span = Math.max(1, endY - startY);
    const raw = (window.scrollY - startY) / span;
    const p = Math.max(0, Math.min(1, raw));
    const eased = easeInOut(p);

    cards.forEach(card => {
      const id = card.getAttribute("data-card-id");
      const slot = slots.get(id);
      if (!slot) return;
      const initial = initialRects.get(id);
      if (!initial) return;

      const slotRect = slot.getBoundingClientRect();
      const slotAbsTop = slotRect.top + window.scrollY;
      const slotAbsLeft = slotRect.left + window.scrollX;

      const dx = slotAbsLeft - initial.left;
      const dy = slotAbsTop - initial.top;
      const sx = slotRect.width / initial.width;
      const sy = slotRect.height / initial.height;

      const tx = dx * eased;
      const ty = dy * eased;
      const s = 1 + (Math.min(sx, sy) - 1) * eased;

      card.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
      card.style.zIndex = eased > 0.01 ? 5 : 4;
      slot.setAttribute("data-filled", eased > 0.85 ? "true" : "false");
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  function onResize() {
    cards.forEach(c => { c.style.transform = ""; });
    measure();
    update();
  }

  function initReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(
      ".continuation-head, .section-head, .moods-head, .mood, .cat, .cur-card, .how-item, .footer-cta, .map-card, .ed-card"
    ).forEach(el => {
      if (!el.classList.contains("reveal")) {
        el.classList.add("reveal");
        io.observe(el);
      }
    });
  }

  function init() {
    measure();
    ready = true;
    update();
    // Attach BOTH window and document scroll listeners for iframe compatibility
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // Also run on a light rAF heartbeat during active scrolling (safety net)
    let lastY = window.scrollY;
    function heartbeat() {
      if (window.scrollY !== lastY) {
        lastY = window.scrollY;
        update();
      }
      requestAnimationFrame(heartbeat);
    }
    requestAnimationFrame(heartbeat);
    initReveal();
  }

  function waitForCards(attempts = 0) {
    const found = document.querySelectorAll(".float-card").length;
    const slotsFound = document.querySelectorAll(".slot[data-slot-for]").length;
    if (found >= 1 && slotsFound >= 1) {
      init();
      return;
    }
    if (attempts > 180) return;
    requestAnimationFrame(() => waitForCards(attempts + 1));
  }

  if (document.readyState === "complete") {
    waitForCards();
  } else {
    window.addEventListener("load", () => waitForCards());
  }

  window.__blanikoScroll = { measure, update, init };
})();
