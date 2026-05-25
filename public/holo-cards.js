// Holographic card effect — drop this script anywhere in your app layout
// It handles both .home-event-card and .org-card automatically

(function () {
  const CARD_SEL = ".home-event-card, .org-card";
  const MAX_TILT = 12; // degrees

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function attachHolo(card) {
    if (card._holoAttached) return;
    card._holoAttached = true;

    let targetX = 50,
      targetY = 50;
    let currentX = 50,
      currentY = 50;
    let rafId = null;

    function tick() {
      currentX = lerp(currentX, targetX, 0.1);
      currentY = lerp(currentY, targetY, 0.1);

      const dx = (currentX - 50) / 50; // -1 to 1
      const dy = (currentY - 50) / 50;

      const rotY = dx * MAX_TILT;
      const rotX = -dy * MAX_TILT;

      // Rainbow angle shifts with mouse position
      const angle = Math.round(
        ((currentX / 100) * 240 + (currentY / 100) * 120) % 360,
      );

      // Gloss intensity highest near top-center
      const gloss = Math.max(
        0,
        0.22 - Math.abs(dx) * 0.1 - Math.abs(dy) * 0.06,
      );

      card.style.transform = `perspective(800px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-6px)`;
      card.style.setProperty("--holo-x", `${currentX.toFixed(1)}%`);
      card.style.setProperty("--holo-y", `${currentY.toFixed(1)}%`);
      card.style.setProperty("--holo-angle", `${angle}deg`);
      card.style.setProperty("--holo-gloss", gloss.toFixed(3));

      if (
        Math.abs(currentX - targetX) > 0.2 ||
        Math.abs(currentY - targetY) > 0.2
      ) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width) * 100;
      targetY = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--holo-opacity", "1");
      if (!rafId) rafId = requestAnimationFrame(tick);
    });

    card.addEventListener("mouseleave", () => {
      targetX = 50;
      targetY = 50;
      card.style.setProperty("--holo-opacity", "0");
      card.style.setProperty("--holo-gloss", "0");
      card.style.transform = "";
      if (!rafId) rafId = requestAnimationFrame(tick);
    });
  }

  function init() {
    document.querySelectorAll(CARD_SEL).forEach(attachHolo);
  }

  // Watch for new cards added dynamically (Next.js navigation)
  const observer = new MutationObserver(() => {
    document.querySelectorAll(CARD_SEL).forEach(attachHolo);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    init();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
