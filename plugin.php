<?php
/**
 * Plugin Name:       HM Map Block
 * Description:       A Mapbox-backed map block with markers, carousel and tooltip display modes.
 * Version:           0.1.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            Human Made
 * License:           GPL-2.0-or-later
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       hm-map-block
 *
 * @package hm-map-block
 */

namespace HM\MapBlock;

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	die;
}

const PLUGIN_VERSION = '0.1.0';
const PLUGIN_PATH    = __DIR__;

require_once __DIR__ . '/inc/namespace.php';
require_once __DIR__ . '/inc/assets.php';
require_once __DIR__ . '/inc/settings.php';

bootstrap();
