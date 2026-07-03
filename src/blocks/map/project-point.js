/**
 * Project geographic coordinates into percentage offsets within an image of
 * known geographic bounds. Shared between the static render mode's frontend
 * and its editor preview.
 */

/**
 * Mercator Y value for a latitude, in radians.
 *
 * @param {number} lat Latitude in degrees.
 * @return {number} Unscaled Mercator Y.
 */
const mercatorY = ( lat ) =>
	Math.log( Math.tan( Math.PI / 4 + ( lat * Math.PI ) / 180 / 2 ) );

/**
 * Project a lat/long pair to x/y percentages within bounded map artwork.
 *
 * @param {Object} point              Coordinates.
 * @param {number} point.lat          Latitude in degrees.
 * @param {number} point.long         Longitude in degrees.
 * @param {Object} options            Projection context.
 * @param {Object} options.bounds     Geographic bounds { west, east, north, south }.
 * @param {string} options.projection equirectangular (default) or mercator.
 * @return {?Object} { x, y } as 0–100 percentages, or null if out of bounds.
 */
export default function projectPoint(
	{ lat, long },
	{ bounds, projection = 'equirectangular' }
) {
	const { west, east, north, south } = bounds;

	const x = ( ( long - west ) / ( east - west ) ) * 100;

	let y;
	if ( projection === 'mercator' ) {
		y =
			( ( mercatorY( north ) - mercatorY( lat ) ) /
				( mercatorY( north ) - mercatorY( south ) ) ) *
			100;
	} else {
		y = ( ( north - lat ) / ( north - south ) ) * 100;
	}

	if ( x < 0 || x > 100 || y < 0 || y > 100 ) {
		return null;
	}

	return { x, y };
}
