<?php
/**
 * Script and style registration for the map blocks.
 *
 * Block assets themselves are registered from block.json metadata; this file
 * handles the external Mapbox GL dependencies and exposes the API key to the
 * block scripts.
 */

namespace HM\MapBlock\Assets;

use const HM\MapBlock\Settings\MAP_API_OPTION_KEY;

const MAPBOX_GL_VERSION = '3.2.0';

/**
 * Attach hooks.
 */
function bootstrap(): void {
	add_action( 'init', __NAMESPACE__ . '\\register_mapbox_assets' );
	add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\enqueue_editor_mapbox_styles' );
	add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\localize_editor_config' );
	// Enqueue frontend assets when a map actually renders: has_block() based
	// checks miss archive and home views which render many posts.
	add_filter( 'render_block_hm/map', __NAMESPACE__ . '\\enqueue_frontend_assets', 10, 2 );
	add_filter( 'render_block_wmf-reports/map', __NAMESPACE__ . '\\enqueue_frontend_assets', 10, 2 );
}

/**
 * Get the Mapbox API key for use in block scripts.
 *
 * @return string API key, or empty string if unconfigured.
 */
function get_api_key(): string {
	/**
	 * Filter the Mapbox API key.
	 *
	 * Allows integrating sites to provide a key from code or environment
	 * configuration instead of the stored option.
	 *
	 * @param string $api_key Key as stored in the site option.
	 */
	// phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores -- Slashed hook names are HM convention.
	return (string) apply_filters( 'hm/map/api_key', get_option( MAP_API_OPTION_KEY, '' ) );
}

/**
 * Register the Mapbox GL script and stylesheet from the Mapbox CDN.
 *
 * The frontend view script uses the mapbox-gl window global rather than
 * bundling the library, so the block.json viewScript lists this handle
 * as a dependency.
 */
function register_mapbox_assets(): void {
	wp_register_script(
		'mapbox-gl',
		sprintf( 'https://api.mapbox.com/mapbox-gl-js/v%s/mapbox-gl.js', MAPBOX_GL_VERSION ),
		[],
		MAPBOX_GL_VERSION,
		true
	);

	wp_register_style(
		'mapbox-gl',
		sprintf( 'https://api.mapbox.com/mapbox-gl-js/v%s/mapbox-gl.css', MAPBOX_GL_VERSION ),
		[],
		MAPBOX_GL_VERSION
	);
}

/**
 * Enqueue the Mapbox stylesheet in the editor, where the preview may render.
 */
function enqueue_editor_mapbox_styles(): void {
	if ( is_admin() ) {
		wp_enqueue_style( 'mapbox-gl' );
	}
}

/**
 * Enqueue Mapbox styles and localize the API key when a map block renders.
 *
 * Runs on the render_block filter for both current and legacy block names,
 * which fires before footer scripts print regardless of the query type.
 *
 * @param string $block_content Rendered block markup.
 * @param array  $block         Parsed block, including attributes.
 * @return string Unmodified block markup.
 */
function enqueue_frontend_assets( string $block_content, array $block ): string {
	// Static render mode uses neither the Mapbox library nor the API key.
	if ( ( $block['attrs']['renderMode'] ?? 'interactive' ) === 'static' ) {
		return $block_content;
	}

	wp_enqueue_style( 'mapbox-gl' );

	static $localized = false;
	if ( ! $localized ) {
		$localized = true;
		wp_localize_script(
			generate_block_asset_handle( 'hm/map', 'viewScript' ),
			'hmMap',
			[ 'apiKey' => get_api_key() ]
		);
	}

	return $block_content;
}

/**
 * Expose the API key to the map and marker editor scripts.
 */
function localize_editor_config(): void {
	$config = [
		'apiKey' => get_api_key(),
		'theme'  => get_option( 'stylesheet' ),
	];

	foreach ( [ 'hm/map', 'hm/map-marker' ] as $block_name ) {
		wp_localize_script(
			generate_block_asset_handle( $block_name, 'editorScript' ),
			'hmMap',
			$config
		);
	}
}
