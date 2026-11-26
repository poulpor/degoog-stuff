// If this file also exports other hooks (slot, interceptor, tab, etc.) and
// you want a single settings card for all of them, add a top-level plugin identity:
//
// export const plugin = {
//   id: "plugins-update-notifier",
//   name: "plugins-update-notifier",
//   description: "...",
//   settingsSchema: [ /* shared fields */ ],
// };
//
// Every hook in this file then shares that id and shows as one card in settings.

export default {
  name: "Plugins Update Notifier",
  description: "Check the [Readme](https://github.com/poulpor/degoog-stuff/blob/main/plugins/plugins-update-notifier/README.md) first! Adds a notification icon to the main and results page (next to upper-right gear icon), to indicate when one or more updates are available for your installed plugins from the repositories. Click the icon to navigate to the /settings/store page.",
  trigger: "plugins-update-notifier",

  /**
   * Set to true if your execute() returns HTML that causes the browser
   * to fetch external URLs (images, scripts, etc.).
   * Set to false if all network access goes through context.fetch / signProxyUrl.
   * Leave it unset and the degoog settings page shows an ambiguous badge.
   */
  isClientExposed: false,
  settingsSchema: [],

  execute() {
    return { title: "Plugins Update Notifier" };
  },
};
  // aliases: ["plugins-update-notifier2"],
  // naturalLanguagePhrases: ["do something with"],

  // settingsSchema: [
  //   { key: "apiKey", label: "API Key", type: "password", required: true },
  //   // Field types: text, password, url, number, toggle, textarea, select,
  //   // multiselect, hex, range, file, urllist, list, info.
  //   { key: "accent", label: "Accent colour", type: "hex" },
  //   { key: "weight", label: "Weight", type: "range", min: "0", max: "10", step: "1" },
  //   // Uploaded files land in your plugin's uploads/ folder; the value is the
  //   // served path (/plugins/<folderName>/uploads/<file>).
  //   { key: "logo", label: "Logo", type: "file", accept: "image/*", maxSizeKb: "512" },
  //   // Give fields the same "fieldset" to group them under one titled section.
  //   { key: "host", label: "Host", type: "text", fieldset: "Connection" },
  //   { key: "port", label: "Port", type: "number", fieldset: "Connection" },
  //   // A "list" field lets users manage a repeatable list of structured rows
  //   // that can be reordered by drag and drop (the stored order is the position).
  //   // The value arrives in configure() as a JSON array string; JSON.parse it.
  //   // {
  //   //   key: "bangs", label: "Custom bangs", type: "list", addLabel: "+ Add bang",
  //   //   itemSchema: [
  //   //     { key: "shortcut", label: "Shortcut", type: "text" },
  //   //     // URL templates can use {{{s}}} or %s where the query goes.
  //   //     { key: "url", label: "URL template", type: "text" },
  //   //     { key: "openBase", label: "Open base path", type: "toggle" },
  //   //   ],
  //   // },
  // ],
  //
  // configure(settings) {},
  // needsAppRestart: true, // set true if this command needs a server restart to work (e.g. registers a WebSocket route)
  //
  // async init(ctx) {
  //   ctx.template // template.html contents
  //   ctx.pluginId // installed plugin folder ID assigned by degoog (alias: ctx.id)
  //   ctx.apiBase  // /api/plugin/<ctx.pluginId>, the base for your own routes
  //   ctx.routeUrl // (path) => /api/plugin/<ctx.pluginId>/<path>
  //   ctx.dir      // absolute path to plugin folder (do NOT derive route IDs from it)
  //   ctx.readFile // async file reader
  //   ctx.signProxyUrl   // (url) => signed /api/proxy/image URL for an external image
  //   ctx.signFaviconUrl // (url) => signed /api/proxy/favicon URL for the url's host, "" when no favicon provider is enabled
  // },

