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
function bootstrap() : void {
	add_action( 'init', __NAMESPACE__ . '\\register_mapbox_assets' );
	add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\enqueue_mapbox_styles' );
	add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\localize_editor_config' );
	add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\localize_frontend_config', 20 );
}

/**
 * Get the Mapbox API key for use in block scripts.
 *
 * @return string API key, or empty string if unconfigured.
 */
function get_api_key() : string {
	/**
	 * Filter the Mapbox API key.
	 *
	 * Allows integrating sites to provide a key from code or environment
	 * configuration instead of the stored option.
	 *
	 * @param string $api_key Key as stored in the site option.
	 */
	return (string) apply_filters( 'hm/map/api_key', get_option( MAP_API_OPTION_KEY, '' ) );
}

/**
 * Register the Mapbox GL script and stylesheet from the Mapbox CDN.
 *
 * The frontend view script uses the mapbox-gl window global rather than
 * bundling the library, so the block.json viewScript lists this handle
 * as a dependency.
 */
function register_mapbox_assets() : void {
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
 * Enqueue the Mapbox stylesheet wherever the map renders (frontend + editor).
 */
function enqueue_mapbox_styles() : void {
	if ( is_admin() || has_block( 'hm/map' ) ) {
		wp_enqueue_style( 'mapbox-gl' );
	}
}

/**
 * Expose the API key to the map and marker editor scripts.
 */
function localize_editor_config() : void {
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

/**
 * Expose the API key to the frontend view script.
 */
function localize_frontend_config() : void {
	if ( ! has_block( 'hm/map' ) ) {
		return;
	}

	wp_localize_script(
		generate_block_asset_handle( 'hm/map', 'viewScript' ),
		'hmMap',
		[ 'apiKey' => get_api_key() ]
	);
}
