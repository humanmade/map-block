import classNames from 'classnames';
import PropTypes from 'prop-types';

import { Button } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { chevronLeft, chevronRight, plus } from '@wordpress/icons';

/**
 * Inner Block Slider Navigation component.
 *
 * Icons are bundled SVGs from @wordpress/icons rather than dashicon names:
 * the dashicons font is not loaded within the iframed block editor canvas,
 * where named icons render as empty boxes.
 *
 * @param {Object}   props                 Props
 * @param {number}   props.totalPages      Total pages.
 * @param {number}   props.currentPage     Current pages.
 * @param {Function} props.setCurrentPage  Set current page.
 * @param {boolean}  props.prevEnabled     Is previous page enabled.
 * @param {boolean}  props.nextEnabled     Is Next button enabled.
 * @param {Function} props.addSlide        Add slide callback.
 * @param {boolean}  props.addSlideEnabled Is add slide button enabled.
 * @return {Element} Component.
 */
function Navigation( {
	totalPages,
	currentPage,
	setCurrentPage,
	prevEnabled,
	nextEnabled,
	addSlide = () => {},
	addSlideEnabled = false,
} ) {
	return (
		<div className="inner-block-slider__navigation">
			<Button
				disabled={ ! prevEnabled }
				icon={ chevronLeft }
				label={ __( 'Previous marker', 'hm-map-block' ) }
				showTooltip
				variant="secondary"
				onClick={ () => {
					if ( prevEnabled ) {
						setCurrentPage( currentPage - 1 );
					}
				} }
			/>
			{ [ ...Array( totalPages ).keys() ].map( ( i ) => (
				<Button
					key={ i + 1 }
					aria-label={ sprintf(
						/* translators: %d: marker number. */
						__( 'Marker %d', 'hm-map-block' ),
						i + 1
					) }
					className={ classNames( 'components-button', {
						'is-primary': currentPage === i + 1,
						'is-secondary': currentPage !== i + 1,
					} ) }
					type="button"
					onClick={ () => {
						setCurrentPage( i + 1 );
					} }
				>
					{ i + 1 }
				</Button>
			) ) }
			<Button
				disabled={ ! nextEnabled }
				icon={ chevronRight }
				label={ __( 'Next marker', 'hm-map-block' ) }
				showTooltip
				variant="secondary"
				onClick={ () => {
					if ( nextEnabled ) {
						setCurrentPage( currentPage + 1 );
					}
				} }
			/>
			<Button
				disabled={ ! addSlideEnabled }
				icon={ plus }
				label={ __( 'Add a marker', 'hm-map-block' ) }
				showTooltip
				variant="secondary"
				onClick={ () => addSlide() }
			/>
		</div>
	);
}

Navigation.propTypes = {
	totalPages: PropTypes.number.isRequired,
	currentPage: PropTypes.number.isRequired,
	setCurrentPage: PropTypes.func.isRequired,
	prevEnabled: PropTypes.bool.isRequired,
	nextEnabled: PropTypes.bool.isRequired,
	addSlide: PropTypes.func,
	addSlideEnabled: PropTypes.bool,
};

export default Navigation;
