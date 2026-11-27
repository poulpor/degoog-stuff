// --- Indicateur de mises à jour de plugins + rafraîchissement des dépôts ---
(function () {
  "use strict";

  const BADGE_CLASS = "degoog-update-link";
  const GEAR_IDS = ["nav-settings-top", "nav-settings-results"];

  const ITEMS_URL = "/api/store/items";
  const REFRESH_URL = "/api/store/repos/refresh";
  const STORE_URL = "/settings/store";

  const CHECK_INTERVAL_MS = 10 * 60 * 1000;        // relecture de l'état : 10 min
  const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // rafraîchissement : 6 h
  const REFRESH_KEY = "degoogLastStoreRefresh";

  let updateCount = 0;

  function removeBadge() {
    document.querySelectorAll("." + BADGE_CLASS).forEach(el => el.remove());
  }

  function renderBadge() {
    if (updateCount <= 0) {
      removeBadge();
      return;
    }

    const label =
      updateCount === 1
        ? "1 mise à jour de plugin disponible"
        : `${updateCount} mises à jour de plugins disponibles`;

    GEAR_IDS.forEach(gearId => {
      const gear = document.getElementById(gearId);
      if (!gear || !gear.parentElement) return;

      let badge = gear.previousElementSibling;
      if (!badge || !badge.classList.contains(BADGE_CLASS)) {
        badge = document.createElement("a");
        badge.href = STORE_URL;
        badge.className = "header-link " + BADGE_CLASS;
        badge.innerHTML =
          '<i class="fa-solid fa-circle-arrow-up fa-xl" aria-hidden="true"></i>';
        gear.parentElement.insertBefore(badge, gear);
      }

      badge.dataset.count = String(updateCount);
      badge.title = label;
      badge.setAttribute("aria-label", label);
    });
  }

  async function refreshReposIfDue() {
    const last = Number(localStorage.getItem(REFRESH_KEY) || 0);
    if (Date.now() - last < REFRESH_INTERVAL_MS) return;

    // L'heure est enregistrée avant l'appel pour éviter les doublons entre onglets.
    localStorage.setItem(REFRESH_KEY, String(Date.now()));

    try {
      const response = await fetch(REFRESH_URL, {
        method: "POST",
        credentials: "same-origin"
      });

      if (!response.ok) {
        // Échec (ex. session absente) : on retentera au prochain chargement.
        localStorage.setItem(REFRESH_KEY, String(last));
        console.warn("[UpdateIndicator] refresh refusé :", response.status);
      }
    } catch (err) {
      localStorage.setItem(REFRESH_KEY, String(last));
      console.warn("[UpdateIndicator] refresh impossible :", err);
    }
  }

  async function checkForUpdates() {
    try {
      const response = await fetch(ITEMS_URL, {
        credentials: "same-origin",
        cache: "no-store"
      });
      if (!response.ok) return;

      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      updateCount = items.filter(i => i.installed && i.updateAvailable).length;
      renderBadge();
    } catch (err) {
      console.warn("[UpdateIndicator] vérification impossible :", err);
    }
  }

  async function run() {
    await refreshReposIfDue();
    await checkForUpdates();
  }

  function start() {
    run();
    setInterval(run, CHECK_INTERVAL_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") run();
    });

    // Replace les icônes si l'en-tête est recréé ou si un second engrenage apparaît.
    new MutationObserver(() => {
      if (updateCount > 0) renderBadge();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
