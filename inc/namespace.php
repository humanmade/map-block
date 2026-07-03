<?php
/**
 * Plugin bootstrap and block registration.
 */

namespace HM\MapBlock;

/**
 * Attach hooks and boot constituent modules.
 */
function bootstrap(): void {
	add_action( 'init', __NAMESPACE__ . '\\register_blocks' );

	Assets\bootstrap();
	Settings\bootstrap();
	Compat\bootstrap();
	CLI\bootstrap();
}

/**
 * Register every block built into build/blocks/.
 *
 * The wp-scripts build emits one directory per block, each with a compiled block.json
 * whose file: references resolve relative to the build output.
 */
function register_blocks(): void {
	foreach ( glob( PLUGIN_PATH . '/build/blocks/*/block.json' ) as $block_metadata_file ) {
		register_block_type_from_metadata( $block_metadata_file );
	}
}
