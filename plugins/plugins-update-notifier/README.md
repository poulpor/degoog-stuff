# Plugins Update Notifier

This vibecoded plugin adds a notification icon to the main page to indicate when one or more updates are available for your installed plugins from the repositories. Click the icon to navigate to the `/settings/store` page.

**⚠️ WARNING: INTERNAL USE ONLY**
This plugin is not intended for public instances. While setting `DEGOOG_SETTINGS_PASSWORDS` should prevent unauthorized users from reaching the `/settings` pages, this feature is specifically designed for internal administration.

## Usage

Simply install the plugin. The initial check will occur shortly after installation. Subsequent **repositories** checks will run after 24 hours, triggered when you visit any degoog webpage. Outside of this 24-hour repository check, the plugin performs a local check every 10 minutes, which is useful if you proceed with a manual repository update.

## Configuration

None required.
