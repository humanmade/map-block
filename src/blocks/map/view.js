/* global hmMap:false */
import { createMap } from './frontend/create-map';
import initCarousel from './frontend/carousel';
import initTooltips from './frontend/tooltips';
import initStaticMap from './frontend/static-map';

/**
 * Initialize a single map block instance.
 *
 * @param {HTMLElement} wrapper Map block wrapper element.
 */
const initMapBlock = ( wrapper ) => {
	// Avoid double-initialization (e.g. DevServer hot updates).
	if ( wrapper.dataset.hmMapInitialized ) {
		return;
	}
	wrapper.dataset.hmMapInitialized = 'true';

	const mapDiv = wrapper.querySelector( '.map__canvas' );
	if ( ! mapDiv ) {
		return;
	}

	const markers = wrapper.getElementsByClassName( 'wp-block-hm-map-marker' );
	const numberedPins = mapDiv.dataset.numberedPins === 'true';

	// Static render mode positions pins over background artwork and needs
	// neither the Mapbox library nor an API key.
	if ( mapDiv.dataset.renderMode === 'static' ) {
		initStaticMap( { mapDiv, wrapper, markers, numberedPins } );
		wrapper.dispatchEvent(
			new CustomEvent( 'hm-map:ready', { detail: { map: null } } )
		);
		return;
	}

	// Use mapbox off of CDN-loaded window global on frontend.
	const mapboxgl = window.mapboxgl;

	if ( ! hmMap?.apiKey || ! mapboxgl ) {
		// eslint-disable-next-line no-console
		console.error(
			'Unable to initialize mapbox. API key or mapbox global unavailable.'
		);
		return;
	}

	mapboxgl.accessToken = hmMap.apiKey;

	const map = createMap( mapboxgl, mapDiv );
	const initDisplayMode =
		mapDiv.dataset.displayMode === 'tooltip' ? initTooltips : initCarousel;

	initDisplayMode( {
		map,
		mapboxgl,
		wrapper,
		markers,
		numberedPins,
	} );

	wrapper.dispatchEvent(
		new CustomEvent( 'hm-map:ready', { detail: { map } } )
	);
};

document.addEventListener( 'DOMContentLoaded', () => {
	document.querySelectorAll( '.wp-block-hm-map' ).forEach( initMapBlock );
} );

if ( module.hot ) {
	module.hot.decline();
}
