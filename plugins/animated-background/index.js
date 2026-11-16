// Animated background — bang + script client.
// Remote MP4 URL has priority. Otherwise, videos from
// data/animated-background/my_live_wallpapers are used.
// Local videos change every N minutes.

import {
  readFile,
  writeFile,
  rename,
  mkdir,
  stat,
  readdir,
} from "node:fs/promises";
import { join, extname } from "node:path";
import crypto from "node:crypto";

const DATADIR = join(
  process.cwd(),
  "data",
  "animated-background",
);

const VIDEO_PATH = join(DATADIR, "animated_background.mp4");
const STATE_PATH = join(DATADIR, "state.json");

const LOCAL_VIDEOS_DIR = join(
  DATADIR,
  "my_live_wallpapers",
);

const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB

const LOCAL_VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm",
]);

const LOCAL_VIDEO_MIME_TYPES = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

let apiBase = "";
let videoUrl = "";
let enableGradient = false;
let localVideoIntervalMinutes = 30;

const readState = async () => {
  try {
    const raw = await readFile(STATE_PATH, "utf8");
    const state = JSON.parse(raw);

    return {
      sourceUrl:
        typeof state.sourceUrl === "string"
          ? state.sourceUrl
          : "",
      downloadedAt:
        typeof state.downloadedAt === "string"
          ? state.downloadedAt
          : null,
      version:
        typeof state.version === "string"
          ? state.version
          : "",
    };
  } catch {
    return {
      sourceUrl: "",
      downloadedAt: null,
      version: "",
    };
  }
};

const writeState = async (state) => {
  await mkdir(DATADIR, { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state), "utf8");
};

const isSafeRemoteUrl = (url) => {
  try {
    const parsed = new URL(url);

    const hostname = parsed.hostname
      .trim()
      .toLowerCase()
      .replace(/^\[|\]$/g, "");

    const isHttp =
      parsed.protocol === "https:" ||
      parsed.protocol === "http:";

    const isLoopback =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";

    const isPrivateLanHost =
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(
        hostname,
      ) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname);

    const isCloudMetadata =
      hostname === "169.254.169.254";

    return (
      isHttp &&
      !isLoopback &&
      !isPrivateLanHost &&
      !isCloudMetadata
    );
  } catch {
    return false;
  }
};

let downloadPromise = null;

const ensureRemoteVideo = async (sourceUrl) => {
  if (!sourceUrl) {
    return false;
  }

  if (!isSafeRemoteUrl(sourceUrl)) {
    throw new Error(
      "Only public HTTP or HTTPS MP4 URLs are supported. Local and private-network URLs are not allowed.",
    );
  }

  if (!sourceUrl.toLowerCase().endsWith(".mp4")) {
    throw new Error(
      "Only direct MP4 video URLs are supported",
    );
  }

  if (downloadPromise) {
    return downloadPromise;
  }

  downloadPromise = (async () => {
    const state = await readState();

    if (state.sourceUrl === sourceUrl) {
      try {
        const fileInfo = await stat(VIDEO_PATH);

        if (fileInfo.isFile() && fileInfo.size > 0) {
          return true;
        }
      } catch {
        // File missing or unreadable: download it again.
      }
    }

    const response = await fetch(sourceUrl, {
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(
        `Video download failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = (
      response.headers.get("content-type") || ""
    ).toLowerCase();

    const contentLength = Number(
      response.headers.get("content-length") || 0,
    );

    if (
      !contentType.startsWith("video/mp4") &&
      !sourceUrl.toLowerCase().endsWith(".mp4")
    ) {
      throw new Error(
        "The remote URL does not appear to be an MP4 video",
      );
    }

    if (contentLength > MAX_VIDEO_BYTES) {
      throw new Error(
        `Video is too large (${Math.round(
          contentLength / 1024 / 1024,
        )} MB). Maximum is 20 MB.`,
      );
    }

    const videoBuffer = Buffer.from(
      await response.arrayBuffer(),
    );

    if (videoBuffer.byteLength === 0) {
      throw new Error("Downloaded video is empty");
    }

    if (videoBuffer.byteLength > MAX_VIDEO_BYTES) {
      throw new Error(
        `Video is too large (${Math.round(
          videoBuffer.byteLength / 1024 / 1024,
        )} MB). Maximum is 20 MB.`,
      );
    }

    // A valid MP4 starts with an ftyp box.
    const isMp4 =
      videoBuffer.byteLength > 11 &&
      videoBuffer.toString("latin1", 4, 8) === "ftyp";

    if (!isMp4) {
      throw new Error(
        "The downloaded file is not a valid MP4 video. The remote URL may return an HTML page, a redirect, or a corrupted file.",
      );
    }

    await mkdir(DATADIR, { recursive: true });

    const temporaryPath = `${VIDEO_PATH}.tmp`;

    await writeFile(temporaryPath, videoBuffer);
    await rename(temporaryPath, VIDEO_PATH);

    await writeState({
      sourceUrl,
      downloadedAt: new Date().toISOString(),
      version: Date.now().toString(36),
    });

    return true;
  })().finally(() => {
    downloadPromise = null;
  });

  return downloadPromise;
};

const ensureLocalVideosDirectory = async () => {
  await mkdir(LOCAL_VIDEOS_DIR, { recursive: true });
};

const listLocalVideos = async () => {
  try {
    await ensureLocalVideosDirectory();

    const entries = await readdir(LOCAL_VIDEOS_DIR, {
      withFileTypes: true,
    });

    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          LOCAL_VIDEO_EXTENSIONS.has(
            extname(entry.name).toLowerCase(),
          ),
      )
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    console.error(
      "[animated-background] Unable to list local videos:",
      error,
    );

    return [];
  }
};

const selectLocalVideo = (videos) => {
  if (videos.length === 0) {
    return null;
  }

  if (videos.length === 1) {
    return videos[0];
  }

  const intervalMs =
    Math.max(1, localVideoIntervalMinutes) * 60 * 1000;

  const bucket = Math.floor(Date.now() / intervalMs);

  const hash = crypto
    .createHash("sha256")
    .update(String(bucket))
    .digest("hex");

  const index =
    Number.parseInt(hash.slice(0, 8), 16) % videos.length;

  return videos[index];
};

export default {
  isClientExposed: true,
  name: "Animated background",
  description:
    "Displays a configurable animated MP4 or WebM video background on the home page. A public remote MP4 URL has priority; otherwise, videos placed in the local my_live_wallpapers folder are used and change every N minutes.",

  trigger: "wallpaper",
  aliases: ["bg", "background"],

  settingsSchema: [
    {
      key: "transparency",
      type: "info",
      fieldset: "Remote video...",
      description: "Optional direct public HTTP or HTTPS URL to an MP4 video file. **If set, this remote video has priority over local videos**. The video is downloaded once and cached locally. Maximum size: 20 MB.",
    },
    {
      key: "videoUrl",
      label: "Video URL",
      fieldset: "Remote video...",
      type: "url",
      placeholder: "https://example.com/background.mp4",
    },
    {
      key: "transparency",
      label: "How it works",
      type: "info",
      fieldset: "...Or local video(s)",
      description: "Place one or more videos in degoog’s /data/animated_background/my_live_wallpapers folder. With multiple videos, you can shuffle between them randomly after a timed delay. **To switch to this local option, you must clear the remote video field above.**",
    },
    {
      key: "localVideoIntervalMinutes",
      label: "Local video interval (minutes)",
      fieldset: "...Or local video(s)",
      type: "text",
      description:
        "How often to choose another local video, in minutes. Applies only when no remote video URL is configured and the my_live_wallpapers folder contains more than one video.",
      placeholder: "30",
      default: "30",
    },
    {
      key: "enableGradient",
      label: "Enable bottom gradient",
      type: "toggle",
      fieldset: "Tweaks",
      description:
        "Adds a theme-aware dark or light gradient from the bottom of the screen, extending up to 50% of its height. Useful when using the FreshRSS plugin.",
      default: "true",
    },
  ],

  configure(settings) {
    console.log(
      "[animated-background] configure() called with:",
      settings,
    );

    videoUrl = String(settings.videoUrl || "").trim();

    enableGradient =
      settings.enableGradient === undefined
        ? true
        : settings.enableGradient === true ||
          settings.enableGradient === "true";

    const interval = Number(
      settings.localVideoIntervalMinutes,
    );

    localVideoIntervalMinutes =
      Number.isFinite(interval) && interval >= 1
        ? Math.min(Math.floor(interval), 1440)
        : 30;
  },

  async isConfigured() {
    const localVideos = await listLocalVideos();

    return Boolean(videoUrl) || localVideos.length > 0;
  },

  init(ctx) {
    console.log(
      "[animated-background] init() called; apiBase:",
      ctx.apiBase,
    );

    apiBase = ctx.apiBase;

    ensureLocalVideosDirectory().catch((error) => {
      console.error(
        "[animated-background] Unable to create local videos directory:",
        error,
      );
    });
  },

  async execute() {
    return {
      title: "Animated background",
      html: "",
    };
  },
};

export const routes = [
  {
    method: "get",
    path: "/config",
    handler: async () => {
      try {
        const localVideos = await listLocalVideos();

        const hasLocalVideos = localVideos.length > 0;

        const backgroundVideoUrl = videoUrl
          ? `${apiBase}/video`
          : hasLocalVideos
            ? `${apiBase}/local-video`
            : "";

        return new Response(
          JSON.stringify({
            videoUrl: backgroundVideoUrl,
            enableGradient,
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        );
      } catch (error) {
        console.error(
          "[animated-background] /config:",
          error,
        );

        return new Response(
          JSON.stringify({
            videoUrl: "",
            enableGradient,
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        );
      }
    },
  },

  {
    method: "get",
    path: "/video",
    handler: async () => {
      try {
        if (!videoUrl) {
          return new Response(
            JSON.stringify({
              error:
                "No remote background video configured",
            }),
            {
              status: 404,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        await ensureRemoteVideo(videoUrl);

        const videoBuffer = await readFile(VIDEO_PATH);

        return new Response(videoBuffer, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Length": String(
              videoBuffer.byteLength,
            ),
            "Cache-Control": "no-store",
            "Accept-Ranges": "bytes",
          },
        });
      } catch (error) {
        console.error(
          "[animated-background] /video:",
          error,
        );

        return new Response(
          JSON.stringify({
            error: "Background video unavailable",
            details: String(error?.message || error),
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }
    },
  },

  {
    method: "get",
    path: "/local-video",
    handler: async () => {
      try {
        const videos = await listLocalVideos();

        if (videos.length === 0) {
          return new Response(
            JSON.stringify({
              error:
                "No local videos found in my_live_wallpapers",
            }),
            {
              status: 404,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        const selectedVideo = selectLocalVideo(videos);

        const extension = extname(
          selectedVideo,
        ).toLowerCase();

        const contentType =
          LOCAL_VIDEO_MIME_TYPES[extension] ||
          "application/octet-stream";

        const videoBuffer = await readFile(
          join(LOCAL_VIDEOS_DIR, selectedVideo),
        );

        return new Response(videoBuffer, {
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(
              videoBuffer.byteLength,
            ),
            "Cache-Control": "no-store",
            "Accept-Ranges": "bytes",
          },
        });
      } catch (error) {
        console.error(
          "[animated-background] /local-video:",
          error,
        );

        return new Response(
          JSON.stringify({
            error: "Local background video unavailable",
            details: String(error?.message || error),
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }
    },
  },
];
