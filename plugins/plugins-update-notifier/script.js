// --- Plugin update indicator + repository refreshing ---
(function () {
  "use strict";

  const BADGE_ID = "degoog-plugin-update-indicator";
  const ITEMS_URL = "/api/store/items";
  const REFRESH_URL = "/api/store/repos/refresh";
  const STORE_URL = "/settings/store";

  const CHECK_INTERVAL_MS = 10 * 60 * 1000;        // check state every : 10 min
  const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // refresh every : 24 h
  const REFRESH_KEY = "degoogLastStoreRefresh";

  let updateCount = 0;

  function removeBadge() {
    document.getElementById(BADGE_ID)?.remove();
  }

  function renderBadge() {
    if (updateCount <= 0) {
      removeBadge();
      return;
    }

    const settingsLink = document.getElementById("nav-settings-top");
    if (!settingsLink || !settingsLink.parentElement) return;

    let badge = document.getElementById(BADGE_ID);

    if (!badge) {
      badge = document.createElement("a");
      badge.id = BADGE_ID;
      badge.className = "header-link degoog-update-link";
      badge.href = STORE_URL;
      badge.innerHTML =
        '<i class="fa-solid fa-circle-arrow-up fa-xl" aria-hidden="true"></i>';
    }

    const label =
      updateCount === 1
        ? "1 plugin update available"
        : `${updateCount} plugin updates available`;

    badge.dataset.count = String(updateCount);
    badge.title = label;
    badge.setAttribute("aria-label", label);

    if (badge.nextSibling !== settingsLink) {
      settingsLink.parentElement.insertBefore(badge, settingsLink);
    }
  }

  async function refreshReposIfDue() {
    const last = Number(localStorage.getItem(REFRESH_KEY) || 0);
    if (Date.now() - last < REFRESH_INTERVAL_MS) return;

    // The time is recorded before the call to avoid duplicates between tabs.
    localStorage.setItem(REFRESH_KEY, String(Date.now()));

    try {
      const response = await fetch(REFRESH_URL, {
        method: "POST",
        credentials: "same-origin"
      });

      if (!response.ok) {
        // In case of failure (e.g., session expired), we will retry on the next load.
        localStorage.setItem(REFRESH_KEY, String(last));
        console.warn("[UpdateIndicator] refresh refused :", response.status);
      }
    } catch (err) {
      localStorage.setItem(REFRESH_KEY, String(last));
      console.warn("[UpdateIndicator] refresh failed :", err);
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
      console.warn("[UpdateIndicator] check failed :", err);
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

    // Replace the icon if the header is recreated.
    new MutationObserver(() => {
      if (updateCount > 0 && !document.getElementById(BADGE_ID)) renderBadge();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
