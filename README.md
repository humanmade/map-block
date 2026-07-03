# HM Map Block

A Mapbox-backed WordPress map block. Markers are child blocks holding a coordinate pair plus arbitrary content, revealed either as a carousel of slides beside/below the map or as popup cards inside it.

Extracted and generalized from the map functionality we built for the Wikimedia Foundation's digital-first annual reports.

## Features

- **Map block** (`hm/map`) rendering a Mapbox GL map with clustered, clickable pins
- **Marker block** (`hm/map-marker`): address search (Mapbox geocoding), manual coordinates, or drag-to-place; content is free-form inner blocks
- **Two display modes**:
  - *Carousel*: activating a pin reveals that marker's content as a slide, with prev/next paging. Block styles for stacked (default) and side-by-side layouts.
  - *In-map tooltips*: numbered pins open a popup card anchored to the pin, with an optional small-screen behavior that hides pins and lists marker content below the map.
- Projection, center, zoom, and Mapbox style (built-in list or any custom `mapbox://` style URI) controls
- Pin and active-pin colors from the theme palette

## Installation

Install via Composer (`humanmade/map-block`, tracking the built `release` branch or a tagged version), or:

1. Copy this plugin folder to `wp-content/plugins/`
2. `npm install && npm run build` in the plugin directory
3. Activate the plugin in WordPress admin

Then supply a Mapbox access token (see below).

## The API key

The map requires a [Mapbox access token](https://docs.mapbox.com/help/getting-started/access-tokens/). Provide it one of two ways:

- **Settings → Map Settings**: stored in the `hm_map_api_key` option (exposed to REST for `manage_options` users).
- **In code**: filter `hm/map/api_key` — useful to inject a key from environment configuration and to vary tokens per environment.

## Integration guide

The blocks work out of the box, but visual design is intentionally left to the integrating site:

- **Colors and popup styling** are exposed as CSS custom properties on the block wrapper, themeable via `theme.json` or any stylesheet: `--hm-map-pin-color`, `--hm-map-pin-text-color`, `--hm-map-marker-active-color`, `--hm-map-popup-background`, `--hm-map-popup-color`, `--hm-map-popup-radius`, `--hm-map-popup-max-width`, `--hm-map-list-divider-color`.
- **Slide/card layouts**: the marker's default template is a minimal heading + paragraph. Register block patterns in your site for richer layouts (the carousel styles target an `hm-map-slide` wrapper class).
- **Custom basemaps**: select "Custom" in the map style control and provide any `mapbox://` style URI (e.g. a brand-styled basemap built in Mapbox Studio).
- **JS events**: the block wrapper dispatches `hm-map:ready` (detail: `{ map }`) and `hm-map:pin-activate` (detail: `{ index }`) CustomEvents for site code to hook into.
- **Content Security Policy**: if your site sends a CSP, allow `https://api.mapbox.com` in `script-src`/`style-src`, `https://api.mapbox.com https://events.mapbox.com` in `connect-src`, and `blob:` in `worker-src` (Mapbox GL uses web workers).

## Migrating from the annual report plugin

Content authored with `wmf-reports/map` and `wmf-reports/marker` keeps rendering on the frontend: the legacy block names are registered against the current render templates (editor support is not provided for the legacy names).

To migrate stored content to the new format, run:

```
wp hm-map migrate --dry-run   # report what would change
wp hm-map migrate             # rewrite block names, slide classes, and copy the API key option
```

The command rewrites the block delimiters, renames the `wmf-pattern-reports-carousel-slide` class to `hm-map-slide`, and copies the `wmf-map-api-key` option to `hm_map_api_key` if unset. `wmf-reports/overlay` blocks (a separate feature of the source plugin) are left untouched. Note the default map style is now Mapbox Light rather than Wikimedia's custom style; set a Custom style URI on migrated maps if the old look is required.

## Development

### Build commands

- `npm run start` — development watch build
- `npm run build` — production build
- `npm run lint:js` / `npm run lint:css` — lint source
- `composer phpcs` — PHP coding standards (HM standard)
- `npm run format` — format code using WordPress standards

## Local Environment

This project uses [wp-env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/) to run a lightweight, containerized WordPress instance at [localhost:6277](http://localhost:6277) for testing purposes. The default username for the localhost environment is `admin`, with the password `password`.

These commands can be used to interact with the environment:

Command | Purpose
---- | ----
`npm run env:start` | Start the local environment at http://localhost:6277
`npm run env:stop` | Turn off the local environment
`npm run env:cli -- wp ...` | Run WP-CLI commands within the environment
`npm run env:logs` | Open (and tail) the error logs for the application<sup>&ddagger;</sup>
`npm run env:db` | Open the database in the mysql command line
`npm run env:destroy` | Fully destroy the local environment (deletes container database)

<sup>&ddagger;</sup> This command deliberately filters out GET/OPTIONS/HEAD/POST/PUT access log entries

## Release Process

Merges to `main` automatically [build](https://github.com/humanmade/map-block/actions/workflows/build-release-branch.yml) to the `release` branch. A project may track the `release` branch using [Composer](https://getcomposer.org/) to pull in the latest built beta version.

Commits on the `release` branch may be tagged for installation via [Packagist](https://packagist.org/packages/humanmade/map-block) and marked as releases in GitHub for manual download, using a manually-dispatched ["Tag and Release" GH Actions workflow](https://github.com/humanmade/map-block/actions/workflows/tag-and-release.yml).

To tag a new release:

1. Choose the target version number using [semantic versioning](https://semver.org/).
2. Check out a `prepare-v#.#.#` branch and bump the `Version` in the [plugin.php](./plugin.php) PHPDoc header (and the `PLUGIN_VERSION` constant).
3. Open a pull request titled "Prepare release v#.#.#".
4. Review and merge the "Prepare release" pull request.
5. Wait for the `release` branch to [update](https://github.com/humanmade/map-block/actions/workflows/build-release-branch.yml) with the build that includes the new version number.
6. On the ["Tag and Release" GH Action page](https://github.com/humanmade/map-block/actions/workflows/tag-and-release.yml):
   - Click "Run workflow" in the `workflow_dispatch` banner.
   - Fill out the "Version tag" field with your target version number. This must match the `Version` in `plugin.php`. Use the format `v#.#.#`.
   - Click "Run workflow" to apply the specified tag to the `release` branch.

Once the workflow completes, the new version is [tagged](https://github.com/humanmade/map-block/tags) and listed in [releases](https://github.com/humanmade/map-block/releases). Edit the release notes as needed to clarify changes.

## License

GPL-2.0-or-later
