/* global hmMap:false */
import { createMap } from './frontend/create-map';
import initCarousel from './frontend/carousel';
import initTooltips from './frontend/tooltips';

window.hmMap = { ...window.hmMap, mapInitialized: false };
document.addEventListener( 'DOMContentLoaded', () => {
	// Avoid double-rendering in DevServer mode. Testing requires a full page reload.
	if ( window.hmMap.mapInitialized ) {
		return;
	}
	window.hmMap.mapInitialized = true;

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

	const mapDiv = document.getElementById( 'map' );
	if ( ! mapDiv ) {
		return;
	}

	const wrapper = mapDiv.closest( '.wp-block-hm-map' );
	const markers = document.getElementsByClassName( 'wp-block-hm-map-marker' );

	const map = createMap( mapboxgl, mapDiv );
	const initDisplayMode =
		mapDiv.dataset.displayMode === 'tooltip' ? initTooltips : initCarousel;

	initDisplayMode( {
		map,
		mapboxgl,
		wrapper,
		markers,
		numberedPins: mapDiv.dataset.numberedPins === 'true',
	} );

	wrapper.dispatchEvent(
		new CustomEvent( 'hm-map:ready', { detail: { map } } )
	);
} );

if ( module.hot ) {
	module.hot.decline();
}
