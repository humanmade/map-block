<?php
/**
 * @see https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md#render
 */

// Cast to string: get_block_wrapper_attributes() drops non-string values.
$lat  = (string) ( $attributes['lat'] ?? '0' );
$long = (string) ( $attributes['long'] ?? '0' );
$id   = (string) ( $attributes['id'] ?? '0' );
?>

<div <?php echo get_block_wrapper_attributes( [ 'data-lat' => $lat, 'data-long' => $long, 'id' => $id ] ); ?>>
	<?php echo $content; ?>
</div>
