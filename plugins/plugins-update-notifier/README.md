# Plugins Update Notifier

This plugin adds a notification icon next to the settings gear to indicate when one or more updates are available for your installed plugins from the repositories. Click the icon to go to the `/settings/store` page.

> [!NOTE]
> **Visible to admins only.** The plugin reads the store data from degoog's store API, which requires an authenticated settings session. When `DEGOOG_SETTINGS_PASSWORDS` is set, the icon only appears for visitors who have entered the settings password during the current session. Other visitors never see it, so the plugin is safe to use on a public instance.
>
> If `DEGOOG_SETTINGS_PASSWORDS` is **not** set, the settings pages are open to everyone, and so is this icon. Set the variable if your instance is reachable by other people.

## Usage

Install the plugin. The initial check runs shortly after installation, once you are logged in to the settings.

- **Repository refresh:** at most once every 6 hours, the plugin refreshes your repositories. It is triggered when an authenticated session loads any degoog page, so it will not run if nobody is logged in.
- **Local check:** every 10 minutes, and whenever you return to the tab, the plugin re-reads the list of installed plugins and updates the icon. This is useful if you refresh the repositories manually from the store.

The plugin only refreshes the repositories. It never installs updates itself.
