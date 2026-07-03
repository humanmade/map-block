<?php
/**
 * @see https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md#render
 */

$map_style           = $attributes['mapStyle'] ?? 'mapbox://styles/mapbox/light-v11';
$display_mode        = $attributes['displayMode'] ?? 'carousel';
$marker_active_color = $attributes['markerActiveColor'] ?? '';
$marker_color        = $attributes['markerColor'] ?? '';
$css_colors          = [];

if ( ! empty( $marker_active_color ) ) {
	$css_colors[] = "--hm-map-marker-active-color: var(--wp--preset--color--$marker_active_color);";
}
if ( ! empty( $marker_color ) ) {
	$css_colors[] = "--hm-map-pin-color: var(--wp--preset--color--$marker_color);";
}

if ( $display_mode === 'tooltip' ) {
	$classes = 'map map--tooltips';
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
?>

<div <?php echo wp_kses_data( $wrapper_attributes ); ?>>
	<div id="map" style="min-height: 250px"
		data-map-style="<?php echo esc_attr( $map_style ); ?>"
		data-display-mode="<?php echo esc_attr( $display_mode ); ?>"
		data-numbered-pins="<?php echo esc_attr( ( $attributes['numberedPins'] ?? true ) ? 'true' : 'false' ); ?>"
		data-latitude="<?php echo esc_attr( $attributes['centerLat'] ?? 0 ); ?>"
		data-longitude="<?php echo esc_attr( $attributes['centerLon'] ?? 0 ); ?>"
		data-projection="<?php echo esc_attr( $attributes['projection'] ?? '' ); ?>"
		data-zoom="<?php echo esc_attr( $attributes['zoom'] ?? 1 ); ?>"
	></div>
	<div class="<?php echo esc_attr( $display_mode === 'tooltip' ? 'map__marker-content' : 'carousel__carousel-wrapper' ); ?>">
		<?php echo $content; ?>
	</div>
	<?php if ( $display_mode !== 'tooltip' && substr_count( $content, 'wp-block-hm-map-marker' ) > 1 ) : ?>
	<div class="carousel-buttons">
		<button id="map-back" class="carousel__button carousel__button--back"><span class="screen-reader-text"><?php esc_html_e( 'Previous Map Marker', 'hm-map-block' ); ?></span></button>
		<button id="map-forward" class="carousel__button carousel__button--forward"><span class="screen-reader-text"><?php esc_html_e( 'Next Map Marker', 'hm-map-block' ); ?></span></button>
	</div>
	<?php endif; ?>
</div>
