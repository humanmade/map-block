/* global hmMap:false */
import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	useBlockProps,
	withColors,
} from '@wordpress/block-editor';
import {
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalNumberControl as NumberControl,
	BaseControl,
	Button,
	PanelBody,
	TextControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

import mapboxgl from 'mapbox-gl';
import './editor.scss';

import InnerBlocksDisplaySingle from '../../components/inner-block-slider/inner-block-single-display';
import Navigation from '../../components/inner-block-slider/navigation';
import PaletteColorPicker from '../../components/palette-color-picker';
import projectPoint, { unprojectPoint } from './project-point';

let map = null;
let mapItemIndex = 0;

const mapboxStyleOptions = [
	{ label: 'Standard', value: 'mapbox://styles/mapbox/standard' },
	{
		label: 'Standard Satellite',
		value: 'mapbox://styles/mapbox/standard-satellite',
	},
	{ label: 'Streets', value: 'mapbox://styles/mapbox/streets-v12' },
	{ label: 'Outdoors', value: 'mapbox://styles/mapbox/outdoors-v12' },
	{ label: 'Light', value: 'mapbox://styles/mapbox/light-v11' },
	{ label: 'Dark', value: 'mapbox://styles/mapbox/dark-v11' },
	{ label: 'Satellite', value: 'mapbox://styles/mapbox/satellite-v9' },
	{
		label: 'Satellite Streets',
		value: 'mapbox://styles/mapbox/satellite-streets-v12',
	},
	{
		label: 'Navigation Day',
		value: 'mapbox://styles/mapbox/navigation-day-v1',
	},
	{
		label: 'Navigation Night',
		value: 'mapbox://styles/mapbox/navigation-night-v1',
	},
	{ label: 'Custom', value: '' },
];

const aspectRatioOptions = [
	{ label: 'Default heights', value: '' },
	{ label: '21:9', value: '21/9' },
	{ label: '2:1', value: '2/1' },
	{ label: '16:9', value: '16/9' },
	{ label: '3:2', value: '3/2' },
	{ label: '4:3', value: '4/3' },
	{ label: '1:1', value: '1/1' },
];

/**
 * Render a container and initialize the map within it.
 *
 * @param {Object}   props               React component props.
 * @param {string}   props.mapStyle      mapbox:// style string URI.
 * @param {string}   props.projection    Which map projection to use.
 * @param {number}   props.latitude      Latitude of map centerpoint.
 * @param {number}   props.longitude     Longitude of map centerpoint.
 * @param {number}   props.zoom          Initial zoom level of map.
 * @param {number}   props.minZoom       Minimum permitted zoom level.
 * @param {number}   props.maxZoom       Maximum permitted zoom level.
 * @param {string}   props.aspectRatio   CSS aspect-ratio value, or empty for default heights.
 * @param {Object[]} props.slideBlocks   Block array, necessary for rerendering map.
 * @param {Function} props.updateMarkers Callback to update map pins.
 * @return {React.ReactNode} Container node for Map.
 */
const MapPreview = ( {
	mapStyle,
	projection = 'equirectangular',
	latitude = 0,
	longitude = 0,
	zoom = 1,
	minZoom = 0,
	maxZoom = 22,
	aspectRatio = '',
	slideBlocks = [],
	updateMarkers,
} ) => {
	const containerRef = useRef( null );

	// Parse the slideBlocks into a stable JSON string, which we can use
	// to rerender the map as needed without unnecessarily causing it to
	// reinit (with a distracting visual flash) every time text is changed
	// in nested blocks.
	const serializedFeatures = JSON.stringify(
		slideBlocks.map( ( { attributes, clientId } ) => ( {
			clientId,
			id: attributes.id,
			lat: attributes.lat,
			long: attributes.long,
		} ) )
	);

	/**
	 * Init the map.
	 */
	useEffect( () => {
		if ( ! hmMap?.apiKey || ! mapboxgl ) {
			// eslint-disable-next-line no-console
			console.error(
				'Unable to initialize mapbox. API key or mapbox global unavailable.'
			);
			return;
		}

		const fullScreenControl = new mapboxgl.NavigationControl();

		if ( map ) {
			map.removeControl( fullScreenControl );
			map.remove();
		}

		if ( ! containerRef.current ) {
			return;
		}
		// Clear out DIV to avoid "The map container element should be empty"
		// warnings when re-rendering.
		containerRef.current.innerHTML = '';

		// The block canvas renders in an iframe, but this script (and its
		// bundled mapbox-gl) runs in the parent window. Elements created by
		// React inside the iframe belong to the iframe's realm and fail
		// mapbox's `instanceof HTMLElement` check, and string IDs resolve
		// against the parent document. Create the container in this realm and
		// let DOM adoption move it into the iframe: the JS wrapper keeps its
		// realm, so mapbox accepts it, while the node renders in the canvas.
		const mapContainer = document.createElement( 'div' );
		mapContainer.style.minHeight = '250px';
		containerRef.current.appendChild( mapContainer );

		mapboxgl.accessToken = hmMap.apiKey;
		map = new mapboxgl.Map( {
			container: mapContainer,
			center: [ longitude || 0, latitude || 0 ],
			// Fast repeat clicks while selecting or placing pins should not
			// zoom the canvas; zoom via the nav control instead.
			doubleClickZoom: false,
			minZoom: 0,
			projection,
			renderWorldCopies: false,
			scrollZoom: false,
			style: mapStyle || 'mapbox://styles/mapbox/light-v11',
			zoom: zoom || 1,
		} );

		map.addControl( fullScreenControl );

		const slideMarkers = JSON.parse( serializedFeatures );

		map.on( 'load', () => {
			// For clustering we need to add a data source.
			map.addSource( 'markers', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features:
						slideMarkers.map(
							( { id, lat, long, clientId }, index ) => {
								return {
									geometry: {
										type: 'Point',
										coordinates: [ long, lat ],
									},
									type: 'Feature',
									properties: {
										clientId,
										id,
										index,
									},
								};
							}
						) || [],
				},
				cluster: true,
				clusterRadius: 10,
				clusterProperties: {
					sum: [
						'get',
						'count',
						[ 'get', 'value', [ 'properties' ] ],
					],
				},
			} );

			// For clustering we need to add a layer for markers.
			// We will replace these with HTML markers.
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

			// For clustering we need to add a layer for clusters.
			// We will replace these with HTML markers.
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

			// Rendering happen as the map moves, update the pins on the map
			// based on the above data source.
			map.on( 'render', () => {
				if ( ! map.isSourceLoaded( 'markers' ) ) {
					return;
				}
				updateMarkers();
			} );
		} );
		// We do not want a change to map attributes to trigger a re-render, that
		// is handled separately below.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ mapStyle, serializedFeatures, updateMarkers ] );

	useEffect( () => {
		if ( map ) {
			// Keep the map up to date as attributes change. Zoom stays
			// unlocked in the editor so authors can navigate while placing
			// markers; the allowZoom lock is applied on the frontend.
			map.setProjection( projection );
			map.setCenter( [ longitude || 0, latitude || 0 ] );
			map.setMinZoom( minZoom );
			map.setMaxZoom( maxZoom );
			map.setZoom( zoom || 1 );
		}
	}, [ projection, latitude, longitude, zoom, minZoom, maxZoom ] );

	useEffect( () => {
		if ( map ) {
			// Let the container adopt its new dimensions, then remeasure.
			setTimeout( () => map.resize(), 50 );
		}
	}, [ aspectRatio ] );

	return (
		<div
			className={
				aspectRatio
					? 'map__canvas map__canvas--fixed-aspect'
					: 'map__canvas'
			}
			style={ aspectRatio ? { aspectRatio } : { minHeight: '250px' } }
			ref={ containerRef }
		></div>
	);
};

/**
 * Editor preview for the static render mode: artwork plus projected pins.
 *
 * @param {Object}   props              React component props.
 * @param {string}   props.imageUrl     Background artwork URL.
 * @param {Object}   props.bounds       Geographic bounds of the artwork.
 * @param {string}   props.projection   equirectangular or mercator.
 * @param {Object[]} props.slideBlocks  Marker block array.
 * @param {boolean}  props.numberedPins Whether pins display their number.
 * @param {Function} props.onPinClick   Called with the clicked marker's index.
 * @param {Function} props.onPinMove    Called with (clientId, { lat, long }) after a pin drag.
 * @return {Element} Static preview element.
 */
const StaticMapPreview = ( {
	imageUrl,
	bounds,
	projection,
	slideBlocks,
	numberedPins,
	onPinClick,
	onPinMove,
} ) => {
	/**
	 * Drag a pin over the artwork, committing new coordinates on release.
	 *
	 * Move/up listeners bind to the pin's ownerDocument so they fire in the
	 * editor canvas iframe. During the drag the pin is positioned directly;
	 * the attribute update on release re-renders it at the same spot.
	 *
	 * @param {PointerEvent} downEvent Pointer down on the pin.
	 * @param {Object}       block     The pin's marker block.
	 */
	const startPinDrag = ( downEvent, block ) => {
		downEvent.preventDefault();
		downEvent.stopPropagation();

		const pin = downEvent.currentTarget;
		const container = pin.parentElement;
		const doc = pin.ownerDocument;
		const startX = downEvent.clientX;
		const startY = downEvent.clientY;
		let dragging = false;

		const onPointerMove = ( moveEvent ) => {
			// Ignore sub-3px jitter so a click stays a click.
			if (
				! dragging &&
				Math.hypot(
					moveEvent.clientX - startX,
					moveEvent.clientY - startY
				) < 3
			) {
				return;
			}
			dragging = true;

			const rect = container.getBoundingClientRect();
			const x = Math.min(
				Math.max(
					( ( moveEvent.clientX - rect.left ) / rect.width ) * 100,
					0
				),
				100
			);
			const y = Math.min(
				Math.max(
					( ( moveEvent.clientY - rect.top ) / rect.height ) * 100,
					0
				),
				100
			);
			pin.style.left = `${ x }%`;
			pin.style.top = `${ y }%`;
		};

		const onPointerUp = () => {
			doc.removeEventListener( 'pointermove', onPointerMove );
			doc.removeEventListener( 'pointerup', onPointerUp );

			if ( ! dragging ) {
				return;
			}

			// The click that ends the drag should not switch slides.
			pin.dataset.justDragged = 'true';
			onPinMove(
				block.clientId,
				unprojectPoint(
					{
						x: parseFloat( pin.style.left ),
						y: parseFloat( pin.style.top ),
					},
					{ bounds, projection }
				)
			);
		};

		doc.addEventListener( 'pointermove', onPointerMove );
		doc.addEventListener( 'pointerup', onPointerUp );
	};

	return (
		<div className="hm-map-static-preview">
			{ imageUrl ? (
				<img className="map__static-image" src={ imageUrl } alt="" />
			) : (
				<div className="hm-map-static-preview__placeholder">
					{ __(
						'Select a background image to position markers against.',
						'hm-map-block'
					) }
				</div>
			) }
			{ slideBlocks.map( ( block, index ) => {
				const point = projectPoint(
					{
						lat: block.attributes.lat,
						long: block.attributes.long,
					},
					{ bounds, projection }
				);
				if ( ! point ) {
					return null;
				}
				return (
					<button
						key={ block.clientId }
						className="marker"
						style={ {
							left: `${ point.x }%`,
							top: `${ point.y }%`,
						} }
						onPointerDown={ ( event ) =>
							startPinDrag( event, block )
						}
						onClick={ ( event ) => {
							if ( event.currentTarget.dataset.justDragged ) {
								delete event.currentTarget.dataset.justDragged;
								return;
							}
							onPinClick( index, block.clientId );
						} }
					>
						{ numberedPins ? index + 1 : '' }
					</button>
				);
			} ) }
		</div>
	);
};

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @param {Object}   props                      Block Props.
 * @param {Object}   props.attributes           Block Attributes.
 * @param {number}   props.clientId             Client ID.
 * @param {Function} props.setAttributes        Set Block Attributes.
 * @param {Object}   props.markerActiveColor    Color object for the active marker.
 * @param {Function} props.setMarkerActiveColor Function to update the active marker color.
 * @param {Object}   props.markerColor          Color object for inactive map pins.
 * @param {Function} props.setMarkerColor       Function to update the pin color.
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
const Edit = ( {
	attributes,
	clientId,
	setAttributes,
	markerActiveColor,
	setMarkerActiveColor,
	markerColor,
	setMarkerColor,
} ) => {
	const {
		allowZoom,
		aspectRatio,
		boundsEast,
		boundsNorth,
		boundsSouth,
		boundsWest,
		displayMode,
		mapStyle,
		maxZoom,
		minZoom,
		mobileBehavior,
		numberedPins,
		renderMode,
		staticImageUrl,
	} = attributes;
	const isTooltipMode = displayMode === 'tooltip';
	const isStatic = isTooltipMode && renderMode === 'static';
	const showPinNumbers = isTooltipMode && numberedPins;

	// Get the innerBlocks (slideBlocks).
	const slideBlocks = useSelect(
		( select ) =>
			select( 'core/block-editor' ).getBlock( clientId ).innerBlocks
	);

	const { insertBlock, selectBlock, updateBlockAttributes } =
		useDispatch( 'core/block-editor' );

	// Track state in a ref, to allow us to determine if slides are added or removed.
	const slideCount = useRef( slideBlocks.length );

	// Keep track of the selected Slide.
	const [ currentItemIndex, setCurrentItemIndex ] = useState( 0 );

	// Track the active sidebar so we can adjust map rendering if necessary.
	const activeSidebar = useSelect( ( select ) =>
		select( 'core/edit-post' ).getActiveGeneralSidebarName()
	);

	useEffect( () => {
		if ( ! map ) {
			return;
		}
		setTimeout( () => map.resize(), 250 );
	}, [ currentItemIndex, slideCount, activeSidebar ] );

	useEffect( () => {
		// Resolve ID conflicts when a block is duplicated using the editor UI.
		const idsInUse = {};
		for ( const markerBlock of slideBlocks ) {
			if ( idsInUse[ markerBlock.attributes.id ] ) {
				updateBlockAttributes(
					markerBlock.clientId,
					// IDs are from Date.now(), so 1ms is usually enough to deconflict.
					{ id: markerBlock.attributes.id + 1 }
				);
			} else {
				idsInUse[ markerBlock.attributes.id ] = true;
			}
		}
	}, [ slideBlocks, updateBlockAttributes ] );

	/**
	 * Add Slide Function.
	 */
	const addSlide = () => {
		// In static mode there is no map instance; start at the bounds center.
		const center = isStatic
			? {
					lat: ( boundsNorth + boundsSouth ) / 2,
					lng: ( boundsWest + boundsEast ) / 2,
			  }
			: map?.getCenter();
		if ( ! center ) {
			return;
		}

		const created = createBlock( 'hm/map-marker', {
			id: Date.now(),
			title: `Marker ${ slideCount.current + 1 }`,
			lat: center.lat,
			long: center.lng,
		} );
		insertBlock( created, undefined, clientId );
	};

	/**
	 * Update Markers Function.
	 *
	 * As we move around the map, clusters will show and hide. We need to update
	 * the markers on the map dynamically to handle this.
	 */
	const updateMarkers = useCallback( () => {
		if ( ! map ) {
			return;
		}

		const features = map.querySourceFeatures( 'markers' );
		const mapMarkers = map
			.getContainer()
			.getElementsByClassName( 'marker' );
		const clusterMarkers = map
			.getContainer()
			.getElementsByClassName( 'cluster' );
		const newMarkers = [];
		const newClusters = [];

		// For every cluster on the screen, create an HTML marker for it
		// (if it does not already exist).
		for ( const feature of features ) {
			const coords = feature.geometry.coordinates;
			const {
				clientId: blockId,
				cluster,
				cluster_id: clusterId,
				id,
				index,
			} = feature.properties;

			// Existing Marker.
			const marker =
				Array.from( mapMarkers ).filter(
					( mapMarker ) => parseInt( mapMarker?.dataset?.id ) === id
				)?.[ 0 ] || null;

			// Existing Cluster.
			const clusterMarker =
				Array.from( clusterMarkers ).filter(
					( mapMarker ) =>
						parseInt( mapMarker?.dataset?.clusterId ) === clusterId
				)?.[ 0 ] || null;

			// Marker is a cluster, if it does not exist, create it.
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

					// On click select zoom into the cluster.
					markerDiv.addEventListener( 'click', () => {
						const selectedClusters = features.filter(
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

				// Push it to our list of existing clusters.
				if ( ! newClusters.includes( clusterId ) ) {
					newClusters.push( clusterId );
				}
			}

			// Marker is a marker, if it does not exist, create it.
			if ( ! cluster ) {
				if ( ! marker ) {
					const markerDiv = document.createElement( 'div' );
					markerDiv.className = 'marker';
					markerDiv.dataset.id = id;
					markerDiv.innerHTML = showPinNumbers
						? `${ index + 1 }`
						: '';

					// Mapbox's built-in marker drag cannot be used here: it
					// listens on its own realm's window, but the editor canvas
					// is an iframe, so pointer events during a drag never reach
					// it. Drag manually via the pin's ownerDocument instead.
					const pin = new mapboxgl.Marker( markerDiv )
						.setDraggable( false )
						.setLngLat( coords )
						.addTo( map );

					// If the item being added is the active item.
					if ( index === mapItemIndex ) {
						markerDiv.classList.add( 'active' );
					}

					let didJustDrag = false;

					markerDiv.addEventListener(
						'pointerdown',
						( downEvent ) => {
							// Keep the map's own pan handler from grabbing the
							// gesture, and keep focus behavior stable.
							downEvent.preventDefault();
							downEvent.stopPropagation();

							const doc = markerDiv.ownerDocument;
							const canvas = map.getCanvasContainer();
							const startX = downEvent.clientX;
							const startY = downEvent.clientY;
							let dragging = false;

							const onPointerMove = ( moveEvent ) => {
								// Ignore sub-3px jitter so a click stays a click.
								if (
									! dragging &&
									Math.hypot(
										moveEvent.clientX - startX,
										moveEvent.clientY - startY
									) < 3
								) {
									return;
								}
								dragging = true;

								const rect = canvas.getBoundingClientRect();
								pin.setLngLat(
									map.unproject( [
										moveEvent.clientX - rect.left,
										moveEvent.clientY - rect.top,
									] )
								);
							};

							const onPointerUp = () => {
								doc.removeEventListener(
									'pointermove',
									onPointerMove
								);
								doc.removeEventListener(
									'pointerup',
									onPointerUp
								);

								if ( ! dragging ) {
									return;
								}

								didJustDrag = true;
								const lngLat = pin.getLngLat();
								updateBlockAttributes( blockId, {
									lat: lngLat.lat,
									long: lngLat.lng,
								} );
							};

							doc.addEventListener(
								'pointermove',
								onPointerMove
							);
							doc.addEventListener( 'pointerup', onPointerUp );
						}
					);

					// On click select the related slide and highlight the marker.
					markerDiv.addEventListener( 'click', ( event ) => {
						event.stopPropagation();

						// The click that ends a drag should not change the
						// selected slide.
						if ( didJustDrag ) {
							didJustDrag = false;
							return;
						}

						Array.from( mapMarkers ).forEach( ( div ) =>
							div.classList.remove( 'active' )
						);

						markerDiv.classList.add( 'active' );

						mapItemIndex = index;
						setCurrentItemIndex( index );
						selectBlock( blockId );
					} );
				}

				// Push it to our list of existing markers.
				if ( ! newMarkers.includes( id ) ) {
					newMarkers.push( id );
				}
			}
		}

		// If there are markers which are on the map, but shouldn't be, remove them.
		Array.from( mapMarkers ).forEach( ( mapMarker ) => {
			if ( ! newMarkers.includes( parseInt( mapMarker?.dataset?.id ) ) ) {
				mapMarker.remove();
			}
		} );

		// If there are clusters which are on the map, but shouldn't be, remove them.
		Array.from( clusterMarkers ).forEach( ( clusterMarker ) => {
			if (
				! newClusters.includes(
					parseInt( clusterMarker?.dataset?.clusterId )
				)
			) {
				clusterMarker.remove();
			}
		} );
	}, [ selectBlock, showPinNumbers, updateBlockAttributes ] );

	/**
	 * If a slide is added, switch to the new slide. If one is deleted, make sure we don't
	 * show a non-existent slide.
	 */
	useEffect( () => {
		if ( slideBlocks.length > slideCount.current ) {
			// Slide added
			setCurrentItemIndex( slideBlocks.length - 1 );
		} else if ( slideBlocks.length < slideCount.current ) {
			// Slide deleted
			if ( currentItemIndex + 1 > slideBlocks.length ) {
				setCurrentItemIndex( slideBlocks.length - 1 );
			}
		}

		// Update ref with new value..
		slideCount.current = slideBlocks.length;
	}, [ slideBlocks.length, currentItemIndex, slideCount, slideBlocks ] );

	const blockProps = useBlockProps( {
		className: isTooltipMode
			? `map map--tooltips${ isStatic ? ' map--static' : '' }`
			: 'map map--carousel carousel',
	} );

	// Static mode needs no Mapbox API key.
	if ( ! hmMap.apiKey && ! isStatic ) {
		return (
			<div className="components-placeholder is-large">
				<div className="components-placeholder__fieldset">
					{ __(
						'Map not available, please ensure you have entered the map API key.',
						'hm-map-block'
					) }
				</div>
			</div>
		);
	}

	const customStyleSelected =
		mapStyle === '' ||
		! mapboxStyleOptions.find( ( { value } ) => value === mapStyle );

	return (
		<div
			{ ...blockProps }
			style={ {
				'--hm-map-marker-active-color':
					markerActiveColor?.color || attributes.markerActiveColor,
				'--hm-map-pin-color':
					markerColor?.color || attributes.markerColor,
			} }
		>
			<PaletteColorPicker
				label={ __( 'Map Pin', 'hm-map-block' ) }
				color={ markerColor?.color || attributes.markerColor }
				onColorChange={ setMarkerColor }
				clientId={ clientId }
			/>
			<PaletteColorPicker
				label={ __( 'Active Map Pin', 'hm-map-block' ) }
				color={
					markerActiveColor?.color || attributes.markerActiveColor
				}
				onColorChange={ setMarkerActiveColor }
				clientId={ clientId }
			/>
			<InspectorControls>
				<PanelBody>
					<SelectControl
						label={ __( 'Display mode', 'hm-map-block' ) }
						help={
							isTooltipMode
								? __(
										'Activating a pin opens a popup card within the map.',
										'hm-map-block'
								  )
								: __(
										'Activating a pin reveals slide content alongside or below the map.',
										'hm-map-block'
								  )
						}
						options={ [
							{
								label: __( 'Carousel', 'hm-map-block' ),
								value: 'carousel',
							},
							{
								label: __( 'In-map tooltips', 'hm-map-block' ),
								value: 'tooltip',
							},
						] }
						value={ displayMode }
						onChange={ ( mode ) =>
							setAttributes( { displayMode: mode } )
						}
					/>
					{ isTooltipMode && (
						<>
							<SelectControl
								label={ __( 'Map rendering', 'hm-map-block' ) }
								help={ __(
									'Static image mode positions pins over fixed artwork with known geographic bounds, without using Mapbox at all.',
									'hm-map-block'
								) }
								options={ [
									{
										label: __(
											'Interactive (Mapbox)',
											'hm-map-block'
										),
										value: 'interactive',
									},
									{
										label: __(
											'Static image',
											'hm-map-block'
										),
										value: 'static',
									},
								] }
								value={ renderMode }
								onChange={ ( value ) =>
									setAttributes( { renderMode: value } )
								}
							/>
							<ToggleControl
								label={ __( 'Numbered pins', 'hm-map-block' ) }
								help={ __(
									'Label each pin with its marker number.',
									'hm-map-block'
								) }
								checked={ numberedPins }
								onChange={ ( value ) =>
									setAttributes( { numberedPins: value } )
								}
							/>
							<SelectControl
								label={ __(
									'Small screen behavior',
									'hm-map-block'
								) }
								help={ __(
									'"List markers below map" hides the pins on small screens and lists each marker’s content under the map instead.',
									'hm-map-block'
								) }
								options={ [
									{
										label: __(
											'Keep pins on the map',
											'hm-map-block'
										),
										value: 'keep-pins',
									},
									{
										label: __(
											'List markers below map',
											'hm-map-block'
										),
										value: 'list',
									},
								] }
								value={ mobileBehavior }
								onChange={ ( value ) =>
									setAttributes( {
										mobileBehavior: value,
									} )
								}
							/>
						</>
					) }
					{ ! isStatic && (
						<>
							<SelectControl
								label={ __(
									'Select Mapbox style',
									'hm-map-block'
								) }
								help={ __(
									'Change the style associated with the map',
									'hm-map-block'
								) }
								options={ mapboxStyleOptions }
								// eslint-disable-next-line no-shadow
								onChange={ ( mapStyle ) =>
									setAttributes( { mapStyle } )
								}
								value={ customStyleSelected ? '' : mapStyle }
							/>
							{ customStyleSelected ? (
								<TextControl
									label={ __(
										'Custom style',
										'hm-map-block'
									) }
									value={ mapStyle }
									// eslint-disable-next-line no-shadow
									onChange={ ( mapStyle ) => {
										setAttributes( { mapStyle } );
									} }
								/>
							) : null }
						</>
					) }
					<SelectControl
						label={ __( 'Choose projection', 'hm-map-block' ) }
						options={ [
							{
								value: 'equirectangular',
								label: 'Equirectangular',
							},
							{ value: 'mercator', label: 'Mercator' },
						] }
						value={ attributes.projection }
						onChange={ ( projection ) =>
							setAttributes( { projection } )
						}
					/>
					{ ! isStatic && (
						<>
							<NumberControl
								label={ __(
									'Center point latitude',
									'hm-map-block'
								) }
								value={ attributes.centerLat }
								onChange={ ( centerLat ) =>
									setAttributes( {
										centerLat: parseFloat( centerLat ),
									} )
								}
							/>
							<NumberControl
								label={ __(
									'Center point longitude',
									'hm-map-block'
								) }
								value={ attributes.centerLon }
								onChange={ ( centerLon ) =>
									setAttributes( {
										centerLon: parseFloat( centerLon ),
									} )
								}
							/>
							<NumberControl
								label={ __(
									'Initial zoom level',
									'hm-map-block'
								) }
								value={ attributes.zoom }
								onChange={ ( zoom ) =>
									setAttributes( {
										zoom: parseFloat( zoom ),
									} )
								}
							/>
							<ToggleControl
								label={ __( 'Allow zooming', 'hm-map-block' ) }
								help={ __(
									'When disabled, visitors cannot change the zoom level and the zoom buttons are hidden. Zoom stays available within the editor.',
									'hm-map-block'
								) }
								checked={ allowZoom }
								onChange={ ( value ) =>
									setAttributes( { allowZoom: value } )
								}
							/>
							{ allowZoom && (
								<>
									<NumberControl
										label={ __(
											'Minimum zoom level',
											'hm-map-block'
										) }
										min={ 0 }
										max={ 22 }
										value={ minZoom }
										onChange={ ( value ) =>
											setAttributes( {
												minZoom: parseFloat( value ),
											} )
										}
									/>
									<NumberControl
										label={ __(
											'Maximum zoom level',
											'hm-map-block'
										) }
										min={ 0 }
										max={ 22 }
										value={ maxZoom }
										onChange={ ( value ) =>
											setAttributes( {
												maxZoom: parseFloat( value ),
											} )
										}
									/>
								</>
							) }
							<SelectControl
								label={ __( 'Aspect ratio', 'hm-map-block' ) }
								help={ __(
									'Lock the map canvas to a fixed aspect ratio instead of the default per-layout heights.',
									'hm-map-block'
								) }
								options={ aspectRatioOptions }
								value={ aspectRatio }
								onChange={ ( value ) =>
									setAttributes( { aspectRatio: value } )
								}
							/>
						</>
					) }
				</PanelBody>
				{ isStatic && (
					<PanelBody
						title={ __( 'Static map image', 'hm-map-block' ) }
					>
						<MediaUploadCheck>
							<BaseControl
								id="hm-map-static-image"
								label={ __(
									'Background image',
									'hm-map-block'
								) }
								help={ __(
									'Any map artwork with known geographic bounds, e.g. an export from the Mapbox Static Images API or a stylized world map.',
									'hm-map-block'
								) }
							>
								<MediaUpload
									allowedTypes={ [ 'image' ] }
									value={ attributes.staticImageId }
									onSelect={ ( media ) =>
										setAttributes( {
											staticImageId: media.id,
											staticImageUrl: media.url,
										} )
									}
									render={ ( { open } ) => (
										<Button
											variant="secondary"
											onClick={ open }
										>
											{ staticImageUrl
												? __(
														'Replace image',
														'hm-map-block'
												  )
												: __(
														'Select image',
														'hm-map-block'
												  ) }
										</Button>
									) }
								/>
							</BaseControl>
						</MediaUploadCheck>
						<NumberControl
							label={ __(
								'West bound (longitude)',
								'hm-map-block'
							) }
							value={ boundsWest }
							onChange={ ( value ) =>
								setAttributes( {
									boundsWest: parseFloat( value ),
								} )
							}
						/>
						<NumberControl
							label={ __(
								'East bound (longitude)',
								'hm-map-block'
							) }
							value={ boundsEast }
							onChange={ ( value ) =>
								setAttributes( {
									boundsEast: parseFloat( value ),
								} )
							}
						/>
						<NumberControl
							label={ __(
								'North bound (latitude)',
								'hm-map-block'
							) }
							value={ boundsNorth }
							onChange={ ( value ) =>
								setAttributes( {
									boundsNorth: parseFloat( value ),
								} )
							}
						/>
						<NumberControl
							label={ __(
								'South bound (latitude)',
								'hm-map-block'
							) }
							value={ boundsSouth }
							onChange={ ( value ) =>
								setAttributes( {
									boundsSouth: parseFloat( value ),
								} )
							}
						/>
					</PanelBody>
				) }
			</InspectorControls>
			{ isStatic ? (
				<StaticMapPreview
					imageUrl={ staticImageUrl }
					bounds={ {
						west: boundsWest,
						east: boundsEast,
						north: boundsNorth,
						south: boundsSouth,
					} }
					projection={ attributes.projection }
					slideBlocks={ slideBlocks }
					numberedPins={ numberedPins }
					onPinClick={ ( index, blockClientId ) => {
						setCurrentItemIndex( index );
						selectBlock( blockClientId );
					} }
					onPinMove={ ( blockClientId, latLong ) =>
						updateBlockAttributes( blockClientId, {
							lat: latLong.lat,
							long: latLong.long,
						} )
					}
				/>
			) : (
				<MapPreview
					{ ...{ mapStyle, slideBlocks, updateMarkers } }
					projection={ attributes.projection }
					latitude={ attributes.centerLat }
					longitude={ attributes.centerLon }
					zoom={ attributes.zoom }
					minZoom={ minZoom }
					maxZoom={ maxZoom }
					aspectRatio={ aspectRatio }
				/>
			) }
			<div className="inner-block-slider">
				<InnerBlocksDisplaySingle
					allowedBlocks={ [ 'hm/map-marker' ] }
					className="slides"
					currentItemIndex={ currentItemIndex }
					parentBlockId={ clientId }
					template={ [ [ 'hm/map-marker' ] ] }
				/>
				<p className="help">
					{ __(
						'Click on the + below to add a marker. Position the marker by dragging or enter its coordinates',
						'hm-map-block'
					) }
				</p>
				<Navigation
					addSlide={ addSlide }
					addSlideEnabled={ true }
					currentPage={ currentItemIndex + 1 }
					nextEnabled={ currentItemIndex + 1 < slideBlocks.length }
					prevEnabled={ currentItemIndex + 1 > 1 }
					setCurrentPage={ ( page ) => {
						setCurrentItemIndex( page - 1 );
					} }
					totalPages={ slideBlocks.length }
				/>
			</div>
		</div>
	);
};

export default withColors( {
	markerActiveColor: 'active-marker-color',
	markerColor: 'marker-color',
} )( Edit );
