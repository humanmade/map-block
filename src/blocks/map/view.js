/* global hmMap:false */
import { createMap } from './frontend/create-map';
import initCarousel from './frontend/carousel';
import initTooltips from './frontend/tooltips';
import initStaticMap from './frontend/static-map';

window.hmMap = { ...window.hmMap, mapInitialized: false };
document.addEventListener( 'DOMContentLoaded', () => {
	// Avoid double-rendering in DevServer mode. Testing requires a full page reload.
	if ( window.hmMap.mapInitialized ) {
		return;
	}
	window.hmMap.mapInitialized = true;

	const mapDiv = document.getElementById( 'map' );
	if ( ! mapDiv ) {
		return;
	}

	const wrapper = mapDiv.closest( '.wp-block-hm-map' );
	const markers = document.getElementsByClassName( 'wp-block-hm-map-marker' );
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
} );

if ( module.hot ) {
	module.hot.decline();
}
