function isHomePage() {
  if (document.body.classList.contains("has-results")) {
    return false;
  }

  const resultsPage = document.getElementById("results-page");

  return (
    !resultsPage ||
    getComputedStyle(resultsPage).display === "none"
  );
}

function removeBackground() {
  document.getElementById("background-video")?.remove();

  document
    .getElementById("app")
    ?.classList.remove("has-background-video");

  document
    .getElementById("app")
    ?.classList.remove("has-background-gradient");
}

function setBackgroundVideo(url, enableGradient) {
  const appNode = document.getElementById("app");

  if (!appNode || !isHomePage() || !url) {
    removeBackground();
    return;
  }

  removeBackground();

  const videoNode = document.createElement("video");

  videoNode.id = "background-video";
  videoNode.className = "background-video";
  videoNode.src = url;
  videoNode.autoplay = true;
  videoNode.loop = true;
  videoNode.muted = true;
  videoNode.defaultMuted = true;
  videoNode.playsInline = true;
  videoNode.preload = "auto";

  videoNode.setAttribute("aria-hidden", "true");
  videoNode.disablePictureInPicture = true;
  videoNode.disableRemotePlayback = true;

  videoNode.addEventListener("error", () => {
    console.warn(
      "[animated-background] Video failed to load:",
      url,
    );

    removeBackground();
  });

  appNode.classList.add("has-background-video");

  appNode.classList.toggle(
    "has-background-gradient",
    enableGradient === true || enableGradient === "true",
  );

  appNode.prepend(videoNode);

  videoNode.play().catch(() => {});
}

async function init() {
  if (!isHomePage()) {
    return;
  }

  try {
    const response = await fetch(
      `/api/plugin/${__PLUGIN_ID__}/config`,
    );

    if (!response.ok) {
      throw new Error(
        `Config request failed: ${response.status}`,
      );
    }

    const config = await response.json();

    setBackgroundVideo(
      String(config.videoUrl || ""),
      config.enableGradient,
    );
  } catch (error) {
    console.warn(
      "[animated-background] Configuration unavailable:",
      error,
    );

    removeBackground();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => init());
} else {
  init();
}