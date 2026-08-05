/**
 * Carousel display mode: activating a pin reveals the corresponding marker's
 * content in a slide area outside the map, with prev/next paging.
 */
import scrollToElement from '../../../helpers/scroll-to-element';
import { setupPins, markersToFeatures } from './create-map';

/**
 * Initialize carousel behavior for a map instance.
 *
 * @param {Object}         options          Options.
 * @param {Object}         options.map      Mapbox GL Map instance.
 * @param {Object}         options.mapboxgl Mapbox GL global.
 * @param {HTMLElement}    options.wrapper  Map block wrapper element.
 * @param {HTMLCollection} options.markers  Marker block elements.
 */
export default function initCarousel( { map, mapboxgl, wrapper, markers } ) {
	const backButton = wrapper.querySelector( '.carousel__button--back' );
	const forwardButton = wrapper.querySelector( '.carousel__button--forward' );
	let processingAnimation = false;

	const scrollToSection = ( elt ) => {
		const section = elt.closest( '.map.carousel' );

		if ( section ) {
			scrollToElement( section );
		}
	};

	/** Allow all JS changes to "settle," then update map size. */
	const resizeMap = () => setTimeout( () => map.resize(), 50 );

	const setMarker = ( id, shouldScrollToElement = true ) => {
		const nextMarkerInfoBox = markers[ id ];
		const mapMarkers = map
			.getContainer()
			.getElementsByClassName( 'marker' );
		const nextMapMarkers = Array.from( mapMarkers ).filter(
			( mapMarker ) => mapMarker.dataset.id === nextMarkerInfoBox.id
		);

		const currentSlide = wrapper.querySelector(
			'.wp-block-hm-map-marker[style*="visibility: visible"]'
		);
		let currentId = 0;
		if ( currentSlide ) {
			currentId = Array.from( markers ).findIndex(
				( markerInfoBox ) =>
					parseInt( currentSlide.id ) === parseInt( markerInfoBox.id )
			);
		}

		Array.from( mapMarkers ).forEach( ( mapMarker ) => {
			mapMarker.classList.remove( 'active' );
		} );

		nextMapMarkers.forEach( ( mapMarker ) => {
			mapMarker.classList.add( 'active' );

			const groupID =
				mapMarker.closest( '.wp-block-group[id]' )?.id || 'map';

			if ( shouldScrollToElement && mapMarker.dataset.id ) {
				window.location.hash = `${ groupID }-${ mapMarker.dataset.id }`;
				scrollToSection( mapMarker );
			}
		} );

		Array.from( markers ).forEach( ( markerInfoBox, index ) => {
			if ( processingAnimation ) {
				return;
			}

			if ( index === id ) {
				return;
			}

			// Handle animations.
			if ( index === currentId && currentId !== id ) {
				// Left to right animation.
				if ( id >= currentId ) {
					nextMarkerInfoBox.style.height = null;
					nextMarkerInfoBox.style.opacity = 0;

					markerInfoBox.style.opacity = 1;
					markerInfoBox.style.position = 'absolute';
					markerInfoBox.style.zIndex = 1;

					markerInfoBox.classList.add( 'animate' );

					setTimeout( () => {
						markerInfoBox.style.height =
							nextMarkerInfoBox.offsetHeight;
						markerInfoBox.style.opacity = 0;

						processingAnimation = true;
					}, 1 );

					setTimeout( () => {
						markerInfoBox.style.height = 0;
						markerInfoBox.style.opacity = null;
						markerInfoBox.style.position = null;
						markerInfoBox.style.visibility = 'hidden';
						markerInfoBox.style.zIndex = null;

						markerInfoBox.classList.remove( 'animate' );

						processingAnimation = false;
					}, 250 );

					nextMarkerInfoBox.style.height = null;
					nextMarkerInfoBox.style.opacity = null;
					nextMarkerInfoBox.style.visibility = 'visible';

					return;
				}

				// Right to left animation.
				if ( id < currentId ) {
					nextMarkerInfoBox.style.height = null;
					nextMarkerInfoBox.style.opacity = 0;
					nextMarkerInfoBox.style.position = 'absolute';
					nextMarkerInfoBox.style.visibility = 'visible';

					markerInfoBox.style.height = null;
					markerInfoBox.style.opacity = 1;
					markerInfoBox.style.visibility = 'visible';

					setTimeout( () => {
						nextMarkerInfoBox.classList.add( 'animate' );

						markerInfoBox.classList.add( 'animate' );
					}, 1 );

					setTimeout( () => {
						nextMarkerInfoBox.style.opacity = 1;

						markerInfoBox.style.height =
							nextMarkerInfoBox.offsetHeight + 'px';

						processingAnimation = true;
					}, 2 );

					setTimeout( () => {
						markerInfoBox.style.opacity = 0;
					}, 250 );

					setTimeout( () => {
						nextMarkerInfoBox.style.height = null;
						nextMarkerInfoBox.style.opacity = null;
						nextMarkerInfoBox.style.position = null;
						nextMarkerInfoBox.style.visibility = 'visible';

						nextMarkerInfoBox.classList.remove( 'animate' );

						markerInfoBox.style.height = 0;
						markerInfoBox.style.opacity = null;
						markerInfoBox.style.visibility = 'hidden';

						markerInfoBox.classList.remove( 'animate' );

						processingAnimation = false;
					}, 250 );
					return;
				}
				return;
			}

			markerInfoBox.style.height = 0;
			markerInfoBox.style.visibility = 'hidden';

			resizeMap();
		} );

		wrapper.dispatchEvent(
			new CustomEvent( 'hm-map:pin-activate', {
				detail: { index: id },
			} )
		);
	};

	const parentContainer =
		markers[ 0 ] && markers[ 0 ].closest( '.carousel--uninitialized' );
	if ( parentContainer ) {
		// Remove the wrapper class to unwind CLS-prevention CSS.
		parentContainer.classList.remove( 'carousel--uninitialized' );
	}

	if ( backButton ) {
		backButton.addEventListener( 'click', () => {
			const index = Array.from( markers ).findIndex(
				( marker ) => marker.style.visibility === 'visible'
			);

			const nextIndex = index - 1 < 0 ? markers.length - 1 : index - 1;
			setMarker( nextIndex, false );
		} );
	}

	if ( forwardButton ) {
		forwardButton.addEventListener( 'click', () => {
			let index = Array.from( markers ).findIndex(
				( marker ) => marker.style.visibility === 'visible'
			);

			if ( index < 0 ) {
				index = 0;
			}

			const nextIndex = index + 1 > markers.length - 1 ? 0 : index + 1;
			setMarker( nextIndex, false );
		} );
	}

	setupPins( {
		map,
		mapboxgl,
		features: markersToFeatures( markers ),
		onPinClick: ( index ) => {
			setMarker( index );
			const yOffset = -140;
			const element = map.getContainer();
			const y =
				element.getBoundingClientRect().top + window.scrollY + yOffset;
			window.scrollTo( { top: y, behavior: 'smooth' } );
		},
		isPinActive: ( index ) => {
			// Highlight the pin for the currently visible slide.
			const visibleIndex = Array.from( markers ).findIndex(
				( marker ) => marker.style.visibility === 'visible'
			);
			return index === Math.max( visibleIndex, 0 );
		},
		onLoad: () => {
			// Check for current slide on load, and advance to it if set.
			// Otherwise, just initialize the map with the first item.
			const slideID = window.location.hash.slice(
				window.location.hash.lastIndexOf( '-' ) + 1
			);
			const slide = document.getElementById( slideID );
			if ( slide && wrapper.contains( slide ) ) {
				const slideIndex = [
					...slide.parentElement.children,
				].findIndex( ( { id } ) => id === slideID );
				// Set the marker in a timeout, so the map can fully initialize first.
				setTimeout( () => setMarker( slideIndex ), 50 );
			} else {
				setMarker( 0, false );
			}
		},
	} );

	resizeMap();
}
