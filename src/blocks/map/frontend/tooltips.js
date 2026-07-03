/**
 * Tooltip display mode: activating a pin opens a popup card anchored to the
 * pin inside the map, populated with that marker's rendered inner content.
 */
import { setupPins, markersToFeatures } from './create-map';

/**
 * Initialize tooltip behavior for a map instance.
 *
 * @param {Object}         options              Options.
 * @param {Object}         options.map          Mapbox GL Map instance.
 * @param {Object}         options.mapboxgl     Mapbox GL global.
 * @param {HTMLElement}    options.wrapper      Map block wrapper element.
 * @param {HTMLCollection} options.markers      Marker block elements.
 * @param {boolean}        options.numberedPins Whether pins display their marker number.
 */
export default function initTooltips( {
	map,
	mapboxgl,
	wrapper,
	markers,
	numberedPins,
} ) {
	const popup = new mapboxgl.Popup( {
		className: 'hm-map-popup',
		closeButton: true,
		maxWidth: 'none',
	} );

	popup.on( 'close', () => {
		Array.from( document.getElementsByClassName( 'marker' ) ).forEach(
			( pin ) => pin.classList.remove( 'active' )
		);
	} );

	setupPins( {
		map,
		mapboxgl,
		features: markersToFeatures( markers ),
		getPinLabel: ( index ) => ( numberedPins ? `${ index + 1 }` : '' ),
		onPinClick: ( index, feature, pinEl ) => {
			const marker = markers[ index ];
			if ( ! marker ) {
				return;
			}

			Array.from( document.getElementsByClassName( 'marker' ) ).forEach(
				( pin ) => pin.classList.remove( 'active' )
			);
			pinEl.classList.add( 'active' );

			// Clone so the source content (used by the mobile list view, and
			// re-used on subsequent opens) is left in place.
			const content = document.createElement( 'div' );
			content.className = 'hm-map-popup__content';
			content.append(
				...Array.from( marker.children ).map( ( child ) =>
					child.cloneNode( true )
				)
			);

			popup
				.setLngLat( feature.geometry.coordinates )
				.setDOMContent( content )
				.addTo( map );

			wrapper.dispatchEvent(
				new CustomEvent( 'hm-map:pin-activate', {
					detail: { index },
				} )
			);
		},
	} );

	setTimeout( () => map.resize(), 50 );
}
