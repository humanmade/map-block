/**
 * Shared frontend map setup: Mapbox GL instance creation plus the pin/cluster
 * data source and the HTML marker sync loop, parametrized so each display mode
 * can control pin content and click behavior.
 */

/**
 * Create a Mapbox GL map from a map container element's data attributes.
 *
 * @param {Object}      mapboxgl Mapbox GL global.
 * @param {HTMLElement} mapDiv   Map container element with data-* config.
 * @return {Object} Mapbox GL Map instance.
 */
export function createMap( mapboxgl, mapDiv ) {
	const map = new mapboxgl.Map( {
		attributionControl: false,
		container: mapDiv,
		center: [
			// Order is long-lat for GeoJSON parity.
			parseFloat( mapDiv.dataset.longitude || 0 ),
			parseFloat( mapDiv.dataset.latitude || 0 ),
		],
		projection: mapDiv.dataset.projection || 'equirectangular',
		renderWorldCopies: false,
		scrollZoom: false,
		style: mapDiv.dataset.mapStyle || 'mapbox://styles/mapbox/light-v11',
		zoom: parseFloat( mapDiv.dataset.zoom || 1 ),
	} );

	map.addControl( new mapboxgl.NavigationControl() );

	return map;
}

/**
 * Build GeoJSON features from rendered marker block elements.
 *
 * @param {HTMLElement[]} markers Marker block elements.
 * @return {Object[]} GeoJSON feature array.
 */
export function markersToFeatures( markers ) {
	return Array.from( markers ).map( ( marker, index ) => ( {
		geometry: {
			type: 'Point',
			coordinates: [ marker.dataset.long || 0, marker.dataset.lat || 0 ],
		},
		type: 'Feature',
		properties: {
			id: marker.id,
			index,
		},
	} ) );
}

/**
 * Register the marker source/layers on a map and keep HTML pins in sync.
 *
 * As the map moves, clusters form and split; this creates and removes the
 * corresponding HTML marker elements. Display modes customize the pins via
 * the callbacks.
 *
 * @param {Object}   options               Options.
 * @param {Object}   options.map           Mapbox GL Map instance.
 * @param {Object}   options.mapboxgl      Mapbox GL global.
 * @param {Object[]} options.features      GeoJSON features for each marker.
 * @param {Function} options.onPinClick    Called with (index, feature properties, pin element).
 * @param {Function} [options.getPinLabel] Return HTML label for a pin (e.g. its number).
 * @param {Function} [options.isPinActive] Whether the pin at index should start active.
 * @param {Function} [options.onLoad]      Called once the source and layers are ready.
 */
export function setupPins( {
	map,
	mapboxgl,
	features,
	onPinClick,
	getPinLabel = () => '',
	isPinActive = () => false,
	onLoad = () => {},
} ) {
	/**
	 * Sync HTML pin and cluster elements to the currently rendered features.
	 */
	const updateMarkers = () => {
		const renderedFeatures = map.querySourceFeatures( 'markers' );
		const mapMarkers = document.getElementsByClassName( 'marker' );
		const clusterMarkers = document.getElementsByClassName( 'cluster' );
		const newMarkers = [];
		const newClusters = [];

		for ( const feature of renderedFeatures ) {
			const coords = feature.geometry.coordinates;
			const {
				cluster,
				cluster_id: clusterId,
				id,
				index,
			} = feature.properties;

			// Existing marker/cluster elements for this feature, if any.
			const marker =
				Array.from( mapMarkers ).filter(
					( mapMarker ) => mapMarker?.dataset?.id === id
				)?.[ 0 ] || null;
			const clusterMarker =
				Array.from( clusterMarkers ).filter(
					( mapMarker ) =>
						parseInt( mapMarker?.dataset?.clusterId ) === clusterId
				)?.[ 0 ] || null;

			if ( cluster ) {
				if ( ! clusterMarker ) {
					const markerDiv = document.createElement( 'div' );
					markerDiv.className = 'cluster';
					markerDiv.dataset.clusterId = clusterId;
					markerDiv.innerHTML =
						feature.properties.point_count_abbreviated;

					new mapboxgl.Marker( markerDiv )
						.setDraggable( false )
						.setLngLat( coords )
						.addTo( map );

					// On click, zoom into the cluster.
					markerDiv.addEventListener( 'click', () => {
						const selectedClusters = renderedFeatures.filter(
							( c ) => c.id === clusterId
						);

						map.getSource( 'markers' ).getClusterExpansionZoom(
							clusterId,
							( err, zoom ) => {
								if ( err ) {
									return;
								}

								map.easeTo( {
									center: selectedClusters[ 0 ].geometry
										.coordinates,
									zoom: zoom + 1,
								} );
							}
						);
					} );
				}

				if ( ! newClusters.includes( clusterId ) ) {
					newClusters.push( clusterId );
				}
			} else {
				if ( ! marker ) {
					const markerDiv = document.createElement( 'div' );
					markerDiv.className = 'marker';
					markerDiv.dataset.id = id;
					markerDiv.innerHTML = getPinLabel( index );

					new mapboxgl.Marker( markerDiv )
						.setDraggable( false )
						.setLngLat( coords )
						.addTo( map );

					if ( isPinActive( index ) ) {
						markerDiv.classList.add( 'active' );
					}

					markerDiv.addEventListener( 'click', ( event ) => {
						// Don't let the click reach the map canvas, where it
						// would immediately close a just-opened popup.
						event.stopPropagation();
						onPinClick( index, feature, markerDiv );
					} );
				}

				if ( ! newMarkers.includes( id ) ) {
					newMarkers.push( id );
				}
			}
		}

		// Remove pins and clusters which no longer correspond to a feature.
		Array.from( mapMarkers ).forEach( ( mapMarker ) => {
			if ( ! newMarkers.includes( mapMarker?.dataset?.id ) ) {
				mapMarker.remove();
			}
		} );
		Array.from( clusterMarkers ).forEach( ( clusterMarker ) => {
			if (
				! newClusters.includes(
					parseInt( clusterMarker?.dataset?.clusterId )
				)
			) {
				clusterMarker.remove();
			}
		} );
	};

	map.on( 'load', () => {
		map.addSource( 'markers', {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features,
			},
			cluster: true,
			clusterRadius: 10,
			clusterProperties: {
				sum: [ 'get', 'count', [ 'get', 'value', [ 'properties' ] ] ],
			},
		} );

		// Minimal circle/symbol layers; the render loop above replaces these
		// with the HTML pins that actually get styled.
		map.addLayer( {
			id: 'marker_circle',
			type: 'circle',
			source: 'markers',
			filter: [ '!=', 'cluster', true ],
			paint: {
				'circle-color': '#000',
				'circle-radius': 1,
			},
		} );
		map.addLayer( {
			id: 'marker_label',
			type: 'symbol',
			source: 'markers',
			filter: [ '!=', 'cluster', true ],
			layout: {
				'text-field': '{point_count_abbreviated}',
				'text-size': 10,
			},
			paint: {
				'icon-color': '#000',
				'text-color': 'white',
			},
		} );

		map.on( 'render', () => {
			if ( ! map.isSourceLoaded( 'markers' ) ) {
				return;
			}
			updateMarkers();
		} );

		onLoad();
	} );
}
