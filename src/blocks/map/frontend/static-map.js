/**
 * Static render mode: no Mapbox. Pins are positioned over background artwork
 * by projecting marker coordinates against the image's geographic bounds, and
 * activating a pin opens a plain-DOM popup card (tooltip display mode only).
 */
import projectPoint from '../project-point';

/**
 * Initialize a static map instance.
 *
 * @param {Object}         options              Options.
 * @param {HTMLElement}    options.mapDiv       Map container element with data-* config.
 * @param {HTMLElement}    options.wrapper      Map block wrapper element.
 * @param {HTMLCollection} options.markers      Marker block elements.
 * @param {boolean}        options.numberedPins Whether pins display their marker number.
 */
export default function initStaticMap( {
	mapDiv,
	wrapper,
	markers,
	numberedPins,
} ) {
	const bounds = {
		west: parseFloat( mapDiv.dataset.boundsWest || -180 ),
		east: parseFloat( mapDiv.dataset.boundsEast || 180 ),
		north: parseFloat( mapDiv.dataset.boundsNorth || 85 ),
		south: parseFloat( mapDiv.dataset.boundsSouth || -85 ),
	};
	const projection = mapDiv.dataset.projection || 'equirectangular';

	let popup = null;

	const closePopup = () => {
		if ( popup ) {
			popup.remove();
			popup = null;
		}
		Array.from( mapDiv.querySelectorAll( '.marker' ) ).forEach( ( pin ) =>
			pin.classList.remove( 'active' )
		);
	};

	const openPopup = ( marker, pinEl, index ) => {
		closePopup();

		const content = document.createElement( 'div' );
		content.className = 'hm-map-popup__content';
		content.append(
			...Array.from( marker.children ).map( ( child ) =>
				child.cloneNode( true )
			)
		);

		popup = document.createElement( 'div' );
		popup.className = 'hm-map-popup hm-map-popup--static';
		popup.style.left = pinEl.style.left;
		popup.style.top = pinEl.style.top;

		const closeButton = document.createElement( 'button' );
		closeButton.className = 'hm-map-popup__close';
		closeButton.innerHTML = '&times;';
		closeButton.setAttribute( 'aria-label', 'Close popup' );
		closeButton.addEventListener( 'click', closePopup );

		popup.append( closeButton, content );
		mapDiv.append( popup );
		pinEl.classList.add( 'active' );

		wrapper.dispatchEvent(
			new CustomEvent( 'hm-map:pin-activate', { detail: { index } } )
		);
	};

	Array.from( markers ).forEach( ( marker, index ) => {
		const point = projectPoint(
			{
				lat: parseFloat( marker.dataset.lat || 0 ),
				long: parseFloat( marker.dataset.long || 0 ),
			},
			{ bounds, projection }
		);

		if ( ! point ) {
			return;
		}

		const pin = document.createElement( 'button' );
		pin.className = 'marker';
		pin.dataset.id = marker.id;
		pin.style.left = `${ point.x }%`;
		pin.style.top = `${ point.y }%`;
		pin.innerHTML = numberedPins ? `${ index + 1 }` : '';
		pin.addEventListener( 'click', () => openPopup( marker, pin, index ) );

		mapDiv.append( pin );
	} );
}
