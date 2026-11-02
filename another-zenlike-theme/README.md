# another-zenlike-theme

A custom UI theme for degoog.

## Customising colours

All colours live in `style.css` as CSS custom properties on `:root`.
Override only what you need. Everything else falls back to the default theme.

The file contains blocks for `:root` (light), `[data-theme="dark"]`,
`[data-theme="light"]`, and a `@media (prefers-color-scheme: dark)` query.

## Overriding templates

Each template listed under the `templates` key in `theme.json` replaces one
UI section and leaves the rest alone. Only include the keys you want to change.

## The no-JS page

If the instance serves the script-free page at `/nojs`, your theme already
covers it. That page loads the same `html` shells and the same `templates`
entries listed above and fills them in on the server, so anything you restyle
here shows up there.

Only override a section that cannot work without scripts. Drop a
`nojs/<name>.html` file in your theme folder, no `theme.json` entry needed.
Each name resolves through your `nojs/` folder, then degoog's, then your own
template for that name, then degoog's.

```
nojs/
  logo.html    tabs.html    pagination.html
```

Those three are the ones degoog itself overrides: a monospace logo, a filter
form of real `<select>`s instead of JS dropdowns, and page links the client
otherwise builds in code. Everything else is inherited.

You do not need to strip your own scripts. degoog sanitises every template the
no-JS page renders. It removes `<script>` blocks, inline `on*=` handlers and
module preloads, and injects the CSS bot check link for you. Do check what a
template looks like with its behaviour taken away, because a section that only
fills in once a script runs will render empty.

## Static assets

Any file inside your theme folder is served at `/themes/<theme-id>/<path>`.
In HTML templates use `__THEME_PATH__` for absolute references:

```html
<img src="__THEME_PATH__/images/logo.png" />
```

See the [full theme docs](https://degoog.org/docs/themes.html) for all available
template keys, inner IDs, and placeholder tokens.
