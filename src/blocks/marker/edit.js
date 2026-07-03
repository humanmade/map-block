import { useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	Button,
	BaseControl,
	PanelBody,
	TextControl,
	SelectControl,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';

import { SearchBox } from '@mapbox/search-js-react';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @param {Object}   props               Block Props.
 * @param {Object}   props.attributes    Block Attributes.
 * @param {number}   props.clientId      Block ClientId.
 * @param {Function} props.setAttributes Set Block Attributes.
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit( { attributes, clientId, setAttributes } ) {
	const { PostSelectButton } = window?.hm?.components || {
		PostSelectButton: () => {},
	};
	const { id, lat, long, postId, postType } = attributes;
	// eslint-disable-next-line no-undef
	const isWend = hmMap.theme === 'wikimedia-endow';

	useEffect( () => {
		// Ensure every block has a unique[-enough] ID.
		if ( ! id ) {
			setAttributes( { id: Date.now() } );
		}
	}, [ id, setAttributes ] );

	const childBlocks = useSelect( ( select ) => {
		const blocks =
			select( 'core/block-editor' ).getBlocksByClientId( clientId );
		return blocks && blocks[ 0 ] ? blocks[ 0 ]?.innerBlocks || [] : [];
	} );

	const { media, post } = useSelect( ( select ) => {
		// eslint-disable-next-line no-shadow
		const post = select( 'core' ).getEntityRecord(
			'postType',
			postType,
			postId
		);

		// eslint-disable-next-line no-shadow
		const media = post?.featured_media
			? select( 'core' ).getMedia( post?.featured_media )
			: null;

		return {
			media,
			post,
		};
	} );

	const { insertBlocks, removeBlocks } = useDispatch( 'core/block-editor' );

	const onPostSelect = ( posts ) => {
		// eslint-disable-next-line no-shadow
		const postId = posts?.[ 0 ]?.id || 0;

		if ( postId === 0 ) {
			return;
		}

		setAttributes( { postId } );
	};

	const updateSlide = () => {
		if ( ! postId || postId === 0 || ! post ) {
			return;
		}

		const clientIds = childBlocks.map( ( block ) => block.clientId );
		const heading = post.title.raw || '';
		const imageId = post?.featured_media || 0;
		const imageUrl = media?.link || '';
		const link = post?.link || '#';
		const excerpt = ( post.excerpt.rendered || '' ).replace(
			/<\/?[^>]+(>|$)/g,
			''
		);
		const content = post?.content?.raw || '';

		const innerBlocks = wp.blocks.rawHandler( {
			HTML: content,
		} );

		removeBlocks( clientIds );

		const newBlocks = [
			createBlock(
				'core/group',
				{
					align: 'full',
					backgroundColor: isWend
						? 'light-blue'
						: 'wmf-report-bright-yellow',
					className: 'hm-map-slide',
					layout: { type: 'constrained' },
				},
				[
					createBlock( 'core/columns', { align: 'wide' }, [
						createBlock(
							'core/column',
							{ width: isWend ? '50%' : '66.66%' },
							[
								createBlock( 'core/image', {
									aspectRatio: isWend ? '1/1' : '4/3',
									className:
										'is-style-default hm-map-slide__image',
									id: imageId || 74197,
									lightbox: {
										aspectRatio: isWend ? '1/1' : '4/3',
										className:
											'is-style-default hm-map-slide__image',
										enabled: false,
										id: imageId || 74197,
										linkDestination: 'none',
										scale: 'cover',
										sizeSlug: 'full',
										url:
											imageUrl ||
											'/wp-content/uploads/2024/01/Wikimedia_Foundation_AI_Blog_Series_Header.png',
									},
									linkDestination: 'none',
									scale: 'cover',
									sizeSlug: 'full',
									url:
										imageUrl ||
										'/wp-content/uploads/2024/01/Wikimedia_Foundation_AI_Blog_Series_Header.png',
								} ),
							]
						),
						createBlock( 'core/column', { width: '33.33%' }, [
							createBlock( 'core/paragraph', {
								className:
									'hm-map-slide__category is-style-sans-p',
								content: 'Lorem ipsum / Sit amet',
								style: {
									elements: {
										link: {
											color: {
												text: 'var:preset|color|orange',
											},
										},
									},
								},
								textColor: 'orange',
							} ),
							createBlock( 'core/heading', {
								className:
									'hm-map-slide__heading is-style-h2',
								content: `<strong>${
									heading ||
									'Lorem ipsum dolor sit amet vulputate.'
								}</strong>`,
								level: 3,
							} ),
							createBlock( 'core/paragraph', {
								className:
									'hm-map-slide__location is-style-sans-p',
								content: '<em>Line for location</em>',
							} ),
							createBlock( 'core/paragraph', {
								className: 'is-style-sans-p',
								content:
									excerpt ||
									'Lorem ipsum dolor sit amet ullamcorper convallis condimentum suspendisse cras blandit congue tincidunt turpis vulputate. Imperdiet quisque libero in porta venenatis vitae netus condimentum.',
							} ),
							createBlock( 'core/buttons', {}, [
								createBlock( 'core/button', {
									backgroundColor: isWend
										? 'white'
										: 'base100',
									className:
										'is-style-tertiary hm-map-slide__button overlay__trigger',
									text: 'Read More',
									style: {
										elements: {
											link: {
												color: {
													text: 'var:preset|color|base0',
												},
											},
										},
									},
									textColor: 'base10',
									url: link || '#',
								} ),
							] ),
						] ),
					] ),
				]
			),
			createBlock(
				'wmf-reports/overlay',
				{
					postId,
					postType,
				},
				[
					createBlock(
						'core/group',
						{
							className: 'hm-map-overlay',
						},
						[
							createBlock(
								'core/group',
								{
									layout: {
										type: 'flex',
										orientation: 'vertical',
									},
								},
								[
									createBlock( 'core/paragraph', {
										className:
											'hm-map-overlay__category is-style-sans-p',
										content:
											'<strong>Lorem ipsum / Sit amet</strong>',
										style: {
											elements: {
												link: {
													color: {
														text: 'var:preset|color|orange',
													},
												},
											},
										},
										textColor: 'orange',
									} ),
									createBlock( 'core/heading', {
										className:
											'hm-map-overlay__heading is-style-h2',
										content: `<strong>${
											heading ||
											'Lorem ipsum dolor sit amet imperdiet</strong>'
										}</strong>`,
										level: 4,
									} ),
									createBlock( 'core/paragraph', {
										className:
											'hm-map-overlay__location is-style-sans-p',
										content:
											'<em>Optional line for location</em>',
									} ),
									createBlock( 'core/image', {
										aspectRatio: '4/3',
										className:
											'is-style-default hm-map-overlay__image',
										id: imageId || 74197,
										lightbox: {
											aspectRatio: '4/3',
											className:
												'is-style-default hm-map-overlay__image',
											enabled: false,
											id: imageId || 74197,
											linkDestination: 'none',
											scale: 'cover',
											sizeSlug: 'full',
											url:
												imageUrl ||
												'/wp-content/uploads/2024/01/Wikimedia_Foundation_AI_Blog_Series_Header.png',
										},
										linkDestination: 'none',
										scale: 'cover',
										sizeSlug: 'full',
										url:
											imageUrl ||
											'/wp-content/uploads/2024/01/Wikimedia_Foundation_AI_Blog_Series_Header.png',
									} ),
								]
							),
							...innerBlocks,
						]
					),
				]
			),
		];

		insertBlocks( newBlocks, null, clientId );
	};

	return (
		<div
			{ ...useBlockProps( {
				className: 'carousel__slide',
			} ) }
		>
			<InspectorControls>
				<PanelBody>
					<BaseControl
						help={ __(
							'Search for the address to update the longitude and latitude',
							'hm-map-block'
						) }
						id="search-box"
						label={ __( 'Search for address', 'hm-map-block' ) }
					>
						<SearchBox
							// eslint-disable-next-line no-undef
							accessToken={ hmMap?.apiKey }
							value=""
							onRetrieve={ ( object ) => {
								const { coordinates } = object?.features?.[ 0 ]
									?.geometry || [
									-13.326915886961197, 25.093160453432485,
								];
								setAttributes( {
									lat: coordinates[ 1 ],
									long: coordinates[ 0 ],
								} );
							} }
						/>
					</BaseControl>
					<TextControl
						help={ __(
							'Update the latitude, use the search, or drag the marker to pin point a location.',
							'hm-map-block'
						) }
						label={ __( 'Latitude', 'hm-map-block' ) }
						value={ lat }
						// eslint-disable-next-line no-shadow
						onChange={ ( lat ) => {
							setAttributes( { lat } );
						} }
					/>
					<TextControl
						help={ __(
							'Update the longitude, use the search, or drag the marker to pin point a location.',
							'hm-map-block'
						) }
						label={ __( 'Longitude', 'hm-map-block' ) }
						value={ long }
						// eslint-disable-next-line no-shadow
						onChange={ ( long ) => {
							setAttributes( { long } );
						} }
					/>
				</PanelBody>
				{ ! isWend && (
					<PanelBody>
						<SelectControl
							label={ __( 'Choose Post Type', 'hm-map-block' ) }
							help={ __(
								'Altering the post type will allow you to choose posts from that post type using the select post button below.',
								'hm-map-block'
							) }
							options={ [
								{
									label: 'Post',
									value: 'post',
								},
								{
									label: 'Page',
									value: 'page',
								},
								{
									label: 'Profile',
									value: 'profile',
								},
								{
									label: 'Report',
									value: 'wmf-report',
								},
								{
									label: 'Story (Default)',
									value: 'story',
								},
							] }
							value={ postType }
							// eslint-disable-next-line no-shadow
							onChange={ ( postType ) => {
								setAttributes( { postType } );
							} }
						/>
						<BaseControl
							className="story-base-control"
							help={ __(
								'Associate this post with a slide. Once you have chosen a post use the button below to refresh the slide content.',
								'hm-map-block'
							) }
							id={ __( 'Associated Post', 'hm-map-block' ) }
							label={ __( 'Associated Post', 'hm-map-block' ) }
						>
							<PostSelectButton
								maxPosts={ 1 }
								postType={ postType }
								value={ [ postId ] }
								onSelect={ onPostSelect }
							>
								<span className="components-button is-secondary">
									{ __( 'Select post', 'hm-map-block' ) }
								</span>
							</PostSelectButton>
						</BaseControl>
						{ postId !== 0 && (
							<BaseControl
								className="story-base-control"
								help={ __(
									'Pull the slide content from the associated post.',
									'hm-map-block'
								) }
								id={ __(
									'Refresh Slide Content',
									'hm-map-block'
								) }
								label={ __(
									'Refresh Slide Content',
									'hm-map-block'
								) }
							>
								<Button
									variant="secondary"
									onClick={ updateSlide }
								>
									{ __( 'Refresh Slide', 'hm-map-block' ) }
								</Button>
							</BaseControl>
						) }
					</PanelBody>
				) }
			</InspectorControls>
			<InnerBlocks
				template={ [
					[
						'core/group',
						{
							align: 'full',
							backgroundColor: isWend
								? 'light-blue'
								: 'wmf-report-bright-yellow',
							className: 'hm-map-slide',
							layout: { type: 'constrained' },
						},
						[
							[
								'core/columns',
								{ align: 'wide' },
								[
									[
										'core/column',
										{ width: isWend ? '50%' : '66.66%' },
										[
											[
												'core/image',
												{
													aspectRatio: isWend
														? '1/1'
														: '4/3',
													className:
														'is-style-default hm-map-slide__image',
													id: 74197,
													lightbox: {
														aspectRatio: isWend
															? '1/1'
															: '4/3',
														className:
															'is-style-default hm-map-slide__image',
														enabled: false,
														id: 74197,
														linkDestination: 'none',
														scale: 'cover',
														sizeSlug: 'full',
														url: '/wp-content/uploads/2024/01/Wikimedia_Foundation_AI_Blog_Series_Header.png',
													},
													linkDestination: 'none',
													scale: 'cover',
													sizeSlug: 'full',
													url: '/wp-content/uploads/2024/01/Wikimedia_Foundation_AI_Blog_Series_Header.png',
												},
											],
										],
									],
									[
										'core/column',
										{ width: '33.33%' },
										[
											[
												'core/paragraph',
												{
													className:
														'hm-map-slide__category is-style-sans-p',
													content:
														'Lorem ipsum / Sit amet',
													style: {
														elements: {
															link: {
																color: {
																	text: 'var:preset|color|orange',
																},
															},
														},
													},
													textColor: 'orange',
												},
											],
											[
												'core/heading',
												{
													className:
														'hm-map-slide__heading is-style-h2',
													content:
														'<strong>Lorem ipsum dolor sit amet vulputate.</strong>',
													level: 3,
												},
											],
											[
												'core/paragraph',
												{
													className:
														'hm-map-slide__location is-style-sans-p',
													content:
														'<em>Line for location</em>',
												},
											],
											[
												'core/paragraph',
												{
													className:
														'is-style-sans-p',
													content:
														'Lorem ipsum dolor sit amet ullamcorper convallis condimentum suspendisse cras blandit congue tincidunt turpis vulputate. Imperdiet quisque libero in porta venenatis vitae netus condimentum.',
												},
											],
											[
												'core/buttons',
												{},
												[
													[
														'core/button',
														{
															backgroundColor:
																isWend
																	? 'white'
																	: 'base100',
															className:
																'is-style-tertiary hm-map-slide__button overlay__trigger',
															text: 'Read More',
															style: {
																elements: {
																	link: {
																		color: {
																			text: 'var:preset|color|base0',
																		},
																	},
																},
															},
															textColor: 'base10',
															url: '#',
														},
													],
												],
											],
										],
									],
								],
							],
						],
					],
					[
						'wmf-reports/overlay',
						{},
						[
							[
								'core/group',
								{
									className: 'hm-map-overlay',
								},
								[
									[
										'core/group',
										{
											layout: {
												type: 'flex',
												orientation: 'vertical',
											},
										},
										[
											[
												'core/paragraph',
												{
													className:
														'hm-map-overlay__category is-style-sans-p',
													content:
														'<strong>Lorem ipsum / Sit amet</strong>',
													style: {
														elements: {
															link: {
																color: {
																	text: 'var:preset|color|orange',
																},
															},
														},
													},
													textColor: 'orange',
												},
											],
											[
												'core/heading',
												{
													className:
														'hm-map-overlay__heading is-style-h2',
													content:
														'<strong>Lorem ipsum dolor sit amet imperdiet</strong>',
													level: 4,
												},
											],
											[
												'core/paragraph',
												{
													className:
														'hm-map-overlay__location is-style-sans-p',
													content:
														'<em>Optional line for location</em>',
												},
											],
											[
												'core/image',
												{
													aspectRatio: '4/3',
													className:
														'is-style-default hm-map-overlay__image',
													id: 74197,
													lightbox: {
														aspectRatio: '4/3',
														className:
															'is-style-default hm-map-overlay__image',
														enabled: false,
														id: 74197,
														linkDestination: 'none',
														scale: 'cover',
														sizeSlug: 'full',
														url: '/wp-content/uploads/2024/01/Wikimedia_Foundation_AI_Blog_Series_Header.png',
													},
													linkDestination: 'none',
													scale: 'cover',
													sizeSlug: 'full',
													url: '/wp-content/uploads/2024/01/Wikimedia_Foundation_AI_Blog_Series_Header.png',
												},
											],
										],
									],
									[
										'core/paragraph',
										{
											content:
												'Lorem ipsum dolor sit amet magna curabitur pretium. Nisi vel augue egestas sapien blandit eros maecenas netus dapibus. Sagittis mattis orci condimentum ornare maecenas iaculis sapien erat diam praesent egestas fermentum. Etiam et sollicitudin odio nisl consequat porttitor condimentum sapien feugiat libero dapibus dui risus. Sapien do a phasellus risus pretium tristique euismod tempor.',
										},
									],
									[
										'core/image',
										{
											className: 'is-style-report-image',
											caption:
												'Lorem ipsum dolor sit amet at cras ac massa erat hac mattis dolore.<br><mark style="background-color:rgba(0, 0, 0, 0)" class="has-inline-color has-base-50-color">File provided by Wikimedia Commons</mark>',
											id: 74197,
											linkDestination: 'none',
											sizeSlug: 'large',
											url: '/wp-content/uploads/2024/01/Wikimedia_Foundation_AI_Blog_Series_Header.png',
										},
									],
									[
										'core/paragraph',
										{
											content:
												'Turpis nulla eiusmod congue orci arcu elit nisi. Magna maecenas id proin lacus tempor vestibulum tincidunt nisi. Venenatis nunc vel mollis risus mi urna egestas ullamcorper aliquet vulputate. Ullamcorper dictumst vestibulum erat luctus urna adipiscing quisque ornare pharetra justo pellentesque quam. Labore velit tempus dolore eu imperdiet porttitor sodales orci.',
										},
									],
									[
										'core/quote',
										{
											className: 'is-style-default',
											style: {
												elements: {
													link: {
														color: {
															text: 'var:preset|color|wmf-report-blue',
														},
													},
												},
											},
											textColor: 'wmf-report-blue',
										},
										[
											[
												'core/paragraph',
												{
													className: 'is-style-h2',
													content:
														'<strong>Lorem ipsum dolor sit amet id cras tortor malesuada.</strong>',
												},
											],
										],
									],
									[
										'core/paragraph',
										{
											content:
												'Lorem ipsum dolor sit amet tristique lacus arcu justo curabitur ut mollis habitasse mollis orci. Maecenas lectus tellus suspendisse porttitor senectus lobortis cras netus sollicitudin hac magna. Id lacus turpis posuere donec proin tempor maecenas porttitor eu sollicitudin orci fringilla. Ac orci proin quisque leo vestibulum magna mollis sollicitudin pretium sed arcu lacus nullam adipiscing. Nunc nec aliquam netus consectetur id egestas eget volutpat ultrices do tristique dui iaculis vulputate.',
										},
									],
									[
										'core/quote',
										{
											className: 'is-style-pullquote',
										},
										[
											[
												'core/paragraph',
												{
													className: 'is-style-h2',
													content:
														'<strong>Lorem ipsum dolor sit amet id cras tortor malesuada.</strong>',
												},
											],
										],
									],
									[
										'core/paragraph',
										{
											content:
												'Feugiat posuere convallis senectus faucibus sollicitudin ultricies curabitur sodales lectus eros volutpat nisi. Feugiat est pretium orci nunc sapien auctor enim mattis habitasse scelerisque diam ultricies tristique ut. Nisi nibh gravida cras aenean aliqua mollis at justo tellus lacinia dui. Congue tellus viverra adipiscing suspendisse dapibus sapien pharetra auctor laoreet morbi dictum phasellus leo quisque. Cras elementum ultricies fermentum nisi velit platea lacus suspendisse at tempus tincidunt erat.',
										},
									],
								],
							],
						],
					],
				] }
			/>
		</div>
	);
}
