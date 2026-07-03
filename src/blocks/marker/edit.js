/* global hmMap:false */
import { useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import { BaseControl, PanelBody, TextControl } from '@wordpress/components';

import { SearchBox } from '@mapbox/search-js-react';

/**
 * Default content template for a new marker.
 *
 * Deliberately minimal: sites integrating this plugin are expected to provide
 * their own patterns for richer slide layouts. The hm-map-slide class is the
 * hook the map's layout styles target.
 */
const TEMPLATE = [
	[
		'core/group',
		{
			className: 'hm-map-slide',
			layout: { type: 'constrained' },
		},
		[
			[
				'core/heading',
				{
					level: 3,
					placeholder: __( 'Location name', 'hm-map-block' ),
				},
			],
			[
				'core/paragraph',
				{
					placeholder: __(
						'Describe this location…',
						'hm-map-block'
					),
				},
			],
		],
	],
];

/**
 * Marker block edit component.
 *
 * The marker holds a coordinate pair plus arbitrary inner-block content which
 * the parent map block reveals when the corresponding pin is activated.
 *
 * @param {Object}   props               Block Props.
 * @param {Object}   props.attributes    Block Attributes.
 * @param {Function} props.setAttributes Set Block Attributes.
 *
 * @return {Element} Element to render.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { id, lat, long } = attributes;

	useEffect( () => {
		// Ensure every block has a unique[-enough] ID.
		if ( ! id ) {
			setAttributes( { id: Date.now() } );
		}
	}, [ id, setAttributes ] );

	return (
		<div { ...useBlockProps( { className: 'carousel__slide' } ) }>
			<InspectorControls>
				<PanelBody>
					<BaseControl
						help={ __(
							'Search for an address to update the longitude and latitude',
							'hm-map-block'
						) }
						id="hm-map-marker-search-box"
						label={ __( 'Search for address', 'hm-map-block' ) }
					>
						<SearchBox
							accessToken={ hmMap?.apiKey }
							value=""
							onRetrieve={ ( result ) => {
								const coordinates =
									result?.features?.[ 0 ]?.geometry
										?.coordinates;
								if ( ! coordinates ) {
									return;
								}
								setAttributes( {
									lat: coordinates[ 1 ],
									long: coordinates[ 0 ],
								} );
							} }
						/>
					</BaseControl>
					<TextControl
						help={ __(
							'Update the latitude, use the search, or drag the marker to pinpoint a location.',
							'hm-map-block'
						) }
						label={ __( 'Latitude', 'hm-map-block' ) }
						value={ lat }
						// eslint-disable-next-line no-shadow
						onChange={ ( lat ) => setAttributes( { lat } ) }
					/>
					<TextControl
						help={ __(
							'Update the longitude, use the search, or drag the marker to pinpoint a location.',
							'hm-map-block'
						) }
						label={ __( 'Longitude', 'hm-map-block' ) }
						value={ long }
						// eslint-disable-next-line no-shadow
						onChange={ ( long ) => setAttributes( { long } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<InnerBlocks template={ TEMPLATE } />
		</div>
	);
}
