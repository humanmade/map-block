<?php
/**
 * WP-CLI command migrating wmf-reports map content to the hm block names.
 */

declare( strict_types=1 );

namespace HM\MapBlock\CLI;

use WP_CLI;
use WP_Query;

const LEGACY_OPTION_KEY = 'wmf-map-api-key';

/**
 * Attach hooks.
 */
function bootstrap(): void {
	if ( defined( 'WP_CLI' ) && WP_CLI ) {
		WP_CLI::add_command( 'hm-map migrate', __NAMESPACE__ . '\\migrate' );
	}
}

/**
 * Migrate wmf-reports map blocks to the hm-map-block format.
 *
 * Rewrites block names (wmf-reports/map, wmf-reports/marker) and the carousel
 * slide pattern class names in post content, and copies the legacy API key
 * option if the new one is unset.
 *
 * ## OPTIONS
 *
 * [--dry-run]
 * : Report what would change without updating anything.
 *
 * ## EXAMPLES
 *
 *     wp hm-map migrate --dry-run
 *     wp hm-map migrate
 *
 * @param array $args       Positional arguments (unused).
 * @param array $assoc_args Named arguments.
 */
function migrate( array $args, array $assoc_args ): void {
	$dry_run = ! empty( $assoc_args['dry-run'] );

	$replacements = [
		// Block comment delimiters. "map" is not a prefix of "marker", so
		// these replacements cannot corrupt each other.
		'<!-- wp:wmf-reports/map '      => '<!-- wp:hm/map ',
		'<!-- wp:wmf-reports/map -->'   => '<!-- wp:hm/map -->',
		'<!-- /wp:wmf-reports/map -->'  => '<!-- /wp:hm/map -->',
		'<!-- wp:wmf-reports/marker '   => '<!-- wp:hm/map-marker ',
		'<!-- wp:wmf-reports/marker -->' => '<!-- wp:hm/map-marker -->',
		'<!-- /wp:wmf-reports/marker -->' => '<!-- /wp:hm/map-marker -->',
		// Pattern-era class names referenced by the plugin styles.
		'wmf-pattern-reports-carousel-slide' => 'hm-map-slide',
	];

	$query = new WP_Query( [
		'post_type'      => 'any',
		'post_status'    => 'any',
		'posts_per_page' => -1,
		'fields'         => 'ids',
		's'              => 'wp:wmf-reports/map',
	] );

	$updated = 0;
	foreach ( $query->posts as $post_id ) {
		$content  = get_post_field( 'post_content', $post_id );
		$migrated = str_replace(
			array_keys( $replacements ),
			array_values( $replacements ),
			$content
		);

		if ( $migrated === $content ) {
			continue;
		}

		++$updated;
		if ( $dry_run ) {
			WP_CLI::log( sprintf( 'Would migrate post %d (%s).', $post_id, get_the_title( $post_id ) ) );
			continue;
		}

		wp_update_post( [
			'ID'           => $post_id,
			'post_content' => wp_slash( $migrated ),
		] );
		WP_CLI::log( sprintf( 'Migrated post %d (%s).', $post_id, get_the_title( $post_id ) ) );
	}

	// Copy the legacy API key option unless a new key is already stored.
	$legacy_key = get_option( LEGACY_OPTION_KEY, '' );
	if ( ! empty( $legacy_key ) && empty( get_option( \HM\MapBlock\Settings\MAP_API_OPTION_KEY, '' ) ) ) {
		if ( $dry_run ) {
			WP_CLI::log( 'Would copy the legacy API key option to ' . \HM\MapBlock\Settings\MAP_API_OPTION_KEY . '.' );
		} else {
			update_option( \HM\MapBlock\Settings\MAP_API_OPTION_KEY, $legacy_key );
			WP_CLI::log( 'Copied the legacy API key option to ' . \HM\MapBlock\Settings\MAP_API_OPTION_KEY . '.' );
		}
	}

	WP_CLI::success(
		$dry_run
			? sprintf( '%d posts would be migrated.', $updated )
			: sprintf( '%d posts migrated.', $updated )
	);
}
