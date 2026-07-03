<?php
/**
 * Frontend render template for the map block.
 *
 * @see https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md#render
 */

$map_style           = $attributes['mapStyle'] ?? 'mapbox://styles/mapbox/light-v11';
$display_mode        = $attributes['displayMode'] ?? 'carousel';
$render_mode         = $attributes['renderMode'] ?? 'interactive';
$marker_active_color = $attributes['markerActiveColor'] ?? '';
$marker_color        = $attributes['markerColor'] ?? '';
$css_colors          = [];

if ( ! empty( $marker_active_color ) ) {
	$css_colors[] = "--hm-map-marker-active-color: var(--wp--preset--color--$marker_active_color);";
}
if ( ! empty( $marker_color ) ) {
	$css_colors[] = "--hm-map-pin-color: var(--wp--preset--color--$marker_color);";
}

// Static rendering only supports the in-map tooltip display mode.
if ( $render_mode === 'static' ) {
	$display_mode = 'tooltip';
}

if ( $display_mode === 'tooltip' ) {
	$classes = 'map map--tooltips';
	if ( $render_mode === 'static' ) {
		$classes .= ' map--static';
	}
	if ( ( $attributes['mobileBehavior'] ?? 'keep-pins' ) === 'list' ) {
		$classes .= ' map--mobile-list';
	}
} else {
	$classes = 'map map--carousel carousel carousel--uninitialized';
}

$wrapper_attributes = get_block_wrapper_attributes( [
	'class' => $classes,
	'style' => implode( ';', $css_colors ),
] );

$map_data_attributes = [
	'data-display-mode'  => $display_mode,
	'data-render-mode'   => $render_mode,
	'data-numbered-pins' => ( $attributes['numberedPins'] ?? true ) ? 'true' : 'false',
	'data-projection'    => $attributes['projection'] ?? '',
];

if ( $render_mode === 'static' ) {
	$map_data_attributes = array_merge( $map_data_attributes, [
		'data-bounds-west'  => (string) ( $attributes['boundsWest'] ?? -180 ),
		'data-bounds-east'  => (string) ( $attributes['boundsEast'] ?? 180 ),
		'data-bounds-north' => (string) ( $attributes['boundsNorth'] ?? 85 ),
		'data-bounds-south' => (string) ( $attributes['boundsSouth'] ?? -85 ),
	] );
} else {
	$map_data_attributes = array_merge( $map_data_attributes, [
		'data-map-style' => $map_style,
		'data-latitude'  => (string) ( $attributes['centerLat'] ?? 0 ),
		'data-longitude' => (string) ( $attributes['centerLon'] ?? 0 ),
		'data-zoom'      => (string) ( $attributes['zoom'] ?? 1 ),
	] );
}

$map_data_html = '';
foreach ( $map_data_attributes as $data_attribute => $data_value ) {
	$map_data_html .= sprintf( ' %s="%s"', $data_attribute, esc_attr( $data_value ) );
}

$static_image = $render_mode === 'static' ? ( $attributes['staticImageUrl'] ?? '' ) : '';
?>

<div <?php echo wp_kses_data( $wrapper_attributes ); ?>>
	<div id="map" style="min-height: 250px"<?php echo $map_data_html; // phpcs:ignore HM.Security.EscapeOutput.OutputNotEscaped -- Escaped during assembly above. ?>>
		<?php if ( ! empty( $static_image ) ) : ?>
		<img class="map__static-image" src="<?php echo esc_url( $static_image ); ?>" alt="" />
		<?php endif; ?>
	</div>
	<div class="<?php echo esc_attr( $display_mode === 'tooltip' ? 'map__marker-content' : 'carousel__carousel-wrapper' ); ?>">
		<?php echo $content; // phpcs:ignore HM.Security.EscapeOutput.OutputNotEscaped -- Inner block content is pre-rendered. ?>
	</div>
	<?php if ( $display_mode !== 'tooltip' && substr_count( $content, 'wp-block-hm-map-marker' ) > 1 ) : ?>
	<div class="carousel-buttons">
		<button id="map-back" class="carousel__button carousel__button--back"><span class="screen-reader-text"><?php esc_html_e( 'Previous Map Marker', 'hm-map-block' ); ?></span></button>
		<button id="map-forward" class="carousel__button carousel__button--forward"><span class="screen-reader-text"><?php esc_html_e( 'Next Map Marker', 'hm-map-block' ); ?></span></button>
	</div>
	<?php endif; ?>
</div>
