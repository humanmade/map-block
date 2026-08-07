/**
 * Static render mode: no Mapbox. Pins are positioned over background artwork
 * by projecting marker coordinates against the image's geographic bounds, and
 * activating a pin opens a plain-DOM popup card (tooltip display mode only).
 */
import projectPoint from '../project-point';

/**
 * Elements inside a popup that can take focus.
 */
const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join( ',' );

/**
 * Distinguishes popups across every map block on the page, so a pin's
 * aria-controls always points at its own popup.
 */
let popupCount = 0;

/**
 * Build the accessible name for a pin.
 *
 * The pin's visible text is at most its number, which tells a screen reader
 * user nothing about where it points. Prefer the marker's heading, and keep
 * the number in front of it so the accessible name still contains the visible
 * label (WCAG 2.5.3).
 *
 * @param {HTMLElement} marker       Marker block element.
 * @param {number}      index        Zero-based marker index.
 * @param {boolean}     numberedPins Whether pins display their marker number.
 * @return {string} Accessible name, empty if the marker has no usable text.
 */
function getPinLabel( marker, index, numberedPins ) {
	const title =
		marker.querySelector( 'h1, h2, h3, h4, h5, h6' )?.textContent?.trim() ||
		marker.querySelector( 'a' )?.textContent?.trim() ||
		'';

	if ( ! numberedPins ) {
		return title;
	}

	return title ? `${ index + 1 }. ${ title }` : `${ index + 1 }`;
}

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
	let activePin = null;

	/**
	 * Close the open popup, if any.
	 *
	 * @param {Object}  [options]              Options.
	 * @param {boolean} [options.restoreFocus] Return focus to the pin that opened it.
	 */
	const closePopup = ( { restoreFocus = false } = {} ) => {
		const pin = activePin;

		if ( popup ) {
			popup.remove();
		}
		popup = null;
		activePin = null;

		Array.from( mapDiv.querySelectorAll( '.marker' ) ).forEach(
			( pinEl ) => {
				pinEl.classList.remove( 'active' );
				pinEl.setAttribute( 'aria-expanded', 'false' );
				pinEl.removeAttribute( 'aria-controls' );
			}
		);

		if ( restoreFocus && pin ) {
			pin.focus();
		}
	};

	/**
	 * Open the popup for a marker.
	 *
	 * @param {HTMLElement} marker      Marker block element.
	 * @param {HTMLElement} pinEl       Pin button for that marker.
	 * @param {number}      index       Zero-based marker index.
	 * @param {boolean}     viaKeyboard Whether the pin was activated from the keyboard.
	 */
	const openPopup = ( marker, pinEl, index, viaKeyboard ) => {
		closePopup();

		const content = document.createElement( 'div' );
		content.className = 'hm-map-popup__content';
		content.append(
			...Array.from( marker.children ).map( ( child ) =>
				child.cloneNode( true )
			)
		);

		popupCount += 1;

		const popupEl = document.createElement( 'div' );
		popupEl.className = 'hm-map-popup hm-map-popup--static';
		popupEl.id = `hm-map-popup-${ popupCount }`;
		popupEl.style.left = pinEl.style.left;
		popupEl.style.top = pinEl.style.top;

		const closeButton = document.createElement( 'button' );
		closeButton.className = 'hm-map-popup__close';
		closeButton.innerHTML = '&times;';
		closeButton.setAttribute( 'aria-label', 'Close popup' );
		closeButton.addEventListener( 'click', () =>
			closePopup( { restoreFocus: true } )
		);

		// Escape dismisses the popup and hands focus back to its pin.
		popupEl.addEventListener( 'keydown', ( event ) => {
			if ( event.key === 'Escape' ) {
				event.stopPropagation();
				closePopup( { restoreFocus: true } );
			}
		} );

		// Moving focus out of the popup dismisses it. Focus has already landed
		// on its new target by this point, so leave it there rather than
		// restoring: because the popup sits directly after its pin in the DOM,
		// Tab lands on the next pin and Shift+Tab on the pin that opened it.
		// A null relatedTarget means focus was dropped rather than moved (a
		// click on the card's own non-interactive text, say), which should not
		// close anything.
		popupEl.addEventListener( 'focusout', ( event ) => {
			if (
				! event.relatedTarget ||
				popupEl.contains( event.relatedTarget )
			) {
				return;
			}
			closePopup();
		} );

		popupEl.append( closeButton, content );

		// Insert after the pin, not at the end of the canvas, so the tab order
		// runs pin -> popup -> next pin. The popup's own z-index keeps it above
		// the pins that now follow it.
		pinEl.after( popupEl );

		popup = popupEl;
		activePin = pinEl;

		pinEl.classList.add( 'active' );
		pinEl.setAttribute( 'aria-expanded', 'true' );
		pinEl.setAttribute( 'aria-controls', popupEl.id );

		if ( viaKeyboard ) {
			popupEl.querySelector( FOCUSABLE_SELECTOR )?.focus();
		}

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
		pin.setAttribute( 'type', 'button' );
		pin.setAttribute( 'aria-expanded', 'false' );

		const label = getPinLabel( marker, index, numberedPins );
		if ( label ) {
			pin.setAttribute( 'aria-label', label );
		}

		// A keyboard-triggered click carries no click count, which is how the
		// popup knows whether to pull focus in or leave it on the pin.
		pin.addEventListener( 'click', ( event ) =>
			openPopup( marker, pin, index, event.detail === 0 )
		);

		mapDiv.append( pin );
	} );
}
