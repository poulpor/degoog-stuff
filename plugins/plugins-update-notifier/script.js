// --- Plugin update indicator + repository refresh ---
(function () {
  "use strict";

  const BADGE_CLASS = "degoog-update-link";
  const GEAR_IDS = ["nav-settings-top", "nav-settings-results"];

  const ITEMS_URL = "/api/store/items";
  const REFRESH_URL = "/api/store/repos/refresh";
  const STORE_URL = "/settings/store";

  const CHECK_INTERVAL_MS = 10 * 60 * 1000;        // Re-check status: 10 min
  const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // Refresh: 6 h
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
        ? "1 plugin update available"
        : `${updateCount} plugin updates available`;

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

    // The timestamp is saved before the request to prevent duplicates across tabs.
    localStorage.setItem(REFRESH_KEY, String(Date.now()));

    try {
      const response = await fetch(REFRESH_URL, {
        method: "POST",
        credentials: "same-origin"
      });

      if (!response.ok) {
        // Failure (e.g. missing session): retry on the next page load.
        localStorage.setItem(REFRESH_KEY, String(last));
        console.warn("[UpdateIndicator] refresh rejected:", response.status);
      }
    } catch (err) {
      localStorage.setItem(REFRESH_KEY, String(last));
      console.warn("[UpdateIndicator] refresh failed:", err);
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
      console.warn("[UpdateIndicator] check failed:", err);
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

    // Re-position the icons if the header is recreated or a second gear icon appears.
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
