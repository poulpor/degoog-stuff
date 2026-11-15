// Animated background — version simple : bang + script client.

import {
  readFile,
  writeFile,
  rename,
  mkdir,
  stat,
} from "node:fs/promises";
import { join } from "node:path";

const DATADIR = join(
  process.cwd(),
  "data",
  "animated-background",
);
const VIDEO_PATH = join(DATADIR, "animated_background.mp4");
const STATE_PATH = join(DATADIR, "state.json");

const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB

let apiBase = "";
let videoUrl = "";
let enableGradient = true;
let allowedLocalHost = "";

const readState = async () => {
  try {
    const raw = await readFile(STATE_PATH, "utf8");
    const state = JSON.parse(raw);

    return {
      sourceUrl:
        typeof state.sourceUrl === "string" ? state.sourceUrl : "",
      downloadedAt:
        typeof state.downloadedAt === "string"
          ? state.downloadedAt
          : null,
      version:
        typeof state.version === "string" ? state.version : "",
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

const normalizeHost = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");

const isPrivateLanHost = (hostname) =>
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname);

const isSafeRemoteUrl = (url, allowedLocalHost) => {
  try {
    const parsed = new URL(url);
    const hostname = normalizeHost(parsed.hostname);
    const allowedHost = normalizeHost(allowedLocalHost);

    const isHttp =
      parsed.protocol === "https:" || parsed.protocol === "http:";

    const isLoopback =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";

    const isCloudMetadata = hostname === "169.254.169.254";

    if (!isHttp || isLoopback || isCloudMetadata) {
      return false;
    }

    if (isPrivateLanHost(hostname)) {
      return (
        allowedHost.length > 0 && hostname === allowedHost
      );
    }

    return true;
  } catch {
    return false;
  }
};

let downloadPromise = null;

const ensureLocalVideo = async (sourceUrl, allowedLocalHost) => {
  if (!sourceUrl) {
    return false;
  }

  if (!isSafeRemoteUrl(sourceUrl, allowedLocalHost)) {
    throw new Error(
      "Invalid or unsupported video URL. For a local-network MP4, set the exact allowed local host in the plugin settings.",
    );
  }

  if (!sourceUrl.toLowerCase().endsWith(".mp4")) {
    throw new Error("Only direct MP4 video URLs are supported");
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
        // Fichier absent ou illisible : on le retélécharge.
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

    const videoBuffer = Buffer.from(await response.arrayBuffer());

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

    // Un MP4 valide commence par une boîte ftyp.
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

export default {
  isClientExposed: true,
  name: "Animated background",
  description:
    "Displays a configurable animated MP4 video background on the home page, with an optional bottom gradient.",
  trigger: "wallpaper",
  aliases: ["bg", "background"],

  settingsSchema: [
    {
      key: "videoUrl",
      label: "Background video URL",
      type: "url",
      description:
        "Direct URL to an MP4 video file. The video is downloaded once and cached locally. File size limit: 20 MB.",
      placeholder: "https://example.com/background.mp4",
      required: true,
    },
    {
      key: "enableGradient",
      label: "Enable bottom gradient",
      type: "toggle",
      description:
        "Adds a dark/light gradient, depending on the theme, from the bottom of the screen up to 50% of its height.",
      default: "true",
    },
    {
      key: "allowedLocalHost",
      label: "Allowed local video host",
      type: "text",
      description:
        "Optional. Allow one specific local video host, for example 192.168.1.50 or nas.home.arpa. Leave empty to block local-network URLs.",
      placeholder: "192.168.1.50",
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

    allowedLocalHost = String(
      settings.allowedLocalHost || "",
    ).trim();
  },

  async isConfigured() {
    return Boolean(videoUrl);
  },

  init(ctx) {
    console.log(
      "[animated-background] init() called; apiBase:",
      ctx.apiBase,
    );

    apiBase = ctx.apiBase;
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
      return new Response(
        JSON.stringify({
          videoUrl: videoUrl && apiBase
            ? `${apiBase}/video`
            : "",
          enableGradient,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
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
              error: "No background video configured",
            }),
            {
              status: 404,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        await ensureLocalVideo(videoUrl, allowedLocalHost);

        const videoBuffer = await readFile(VIDEO_PATH);

        return new Response(videoBuffer, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Length": String(videoBuffer.byteLength),
            "Cache-Control": "no-store",
            "Accept-Ranges": "bytes",
          },
        });
      } catch (error) {
        console.error("[animated-background] /video:", error);

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
];