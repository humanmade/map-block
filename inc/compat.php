<?php
/**
 * Backwards compatibility with the wmf-reports block names.
 *
 * The map and marker blocks originated in the Wikimedia annual report plugin
 * as wmf-reports/map and wmf-reports/marker. Content authored in that format
 * keeps rendering when this plugin replaces that one: the legacy names are
 * registered server-side against the same render templates. This is a
 * frontend-only bridge — in the editor the legacy blocks appear unavailable —
 * so migrate stored content with `wp hm-map migrate` (see inc/cli.php).
 */

declare( strict_types=1 );

namespace HM\MapBlock\Compat;

use WP_Block;

/**
 * Attach hooks.
 */
function bootstrap(): void {
	add_action( 'init', __NAMESPACE__ . '\\register_legacy_blocks', 20 );
}

/**
 * Render a block template file in the same manner as block.json render files.
 *
 * @param string   $template   Absolute path to the render template.
 * @param array    $attributes Block attributes.
 * @param string   $content    Block inner content.
 * @param WP_Block $block      Block instance.
 * @return string Rendered block markup.
 */
function render_template( string $template, array $attributes, string $content, WP_Block $block ): string {
	ob_start();
	require $template;
	return (string) ob_get_clean();
}

/**
 * Register the legacy wmf-reports block names against the current templates.
 *
 * Runs after the primary blocks register so we can copy their attribute
 * definitions (needed for the render callback to receive attribute values).
 */
function register_legacy_blocks(): void {
	$registry = \WP_Block_Type_Registry::get_instance();

	$legacy_map = [
		'wmf-reports/map'    => [ 'hm/map', 'map/render.php' ],
		'wmf-reports/marker' => [ 'hm/map-marker', 'marker/render.php' ],
	];

	foreach ( $legacy_map as $legacy_name => [ $current_name, $render_file ] ) {
		$current = $registry->get_registered( $current_name );
		if ( ! $current || $registry->is_registered( $legacy_name ) ) {
			continue;
		}

		$template = \HM\MapBlock\PLUGIN_PATH . '/build/blocks/' . $render_file;

		register_block_type( $legacy_name, [
			'attributes'      => $current->attributes,
			// Reuse the current blocks' frontend assets.
			'view_script_handles' => $current->view_script_handles,
			'style_handles'       => $current->style_handles,
			'render_callback' => function ( array $attributes, string $content, WP_Block $block ) use ( $template ): string {
				$html = render_template( $template, $attributes, $content, $block );

				// The generated wrapper class follows the legacy block name;
				// add the current classes so plugin styles and scripts match.
				// Lookbehinds keep this idempotent when the map block
				// re-processes marker markup already handled by the marker's
				// own callback. Marker first: the map class is a prefix of
				// the marker class.
				$html = preg_replace(
					'/(?<!wp-block-hm-map-marker )wp-block-wmf-reports-marker/',
					'wp-block-hm-map-marker wp-block-wmf-reports-marker',
					$html
				);
				return preg_replace(
					'/(?<!wp-block-hm-map )wp-block-wmf-reports-map(?!-)/',
					'wp-block-hm-map wp-block-wmf-reports-map',
					$html
				);
			},
		] );
	}
}
