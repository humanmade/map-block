import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { MapPreview } from './edit';

// The editor externalises @wordpress/* packages, so they are not installed
// under Jest; only withColors is called when edit.js loads.
jest.mock( '@wordpress/blocks', () => ( {} ), { virtual: true } );
jest.mock( '@wordpress/components', () => ( {} ), { virtual: true } );
jest.mock( '@wordpress/data', () => ( {} ), { virtual: true } );
jest.mock(
	'@wordpress/block-editor',
	() => ( { withColors: () => ( component ) => component } ),
	{ virtual: true }
);

const mockLog = [];
const mockMaps = [];

jest.mock( 'mapbox-gl', () => {
	const calls = ( name ) =>
		function ( ...args ) {
			this.calls[ name ].push( args );
			mockLog.push( name );
		};
	const methods = [
		'setZoom',
		'setCenter',
		'setProjection',
		'setMinZoom',
		'setMaxZoom',
		'resize',
		'jumpTo',
		'addControl',
		'removeControl',
		'remove',
		'addSource',
		'addLayer',
		'isSourceLoaded',
		'panBy',
	];
	class Map {
		constructor( options ) {
			this.options = options;
			this.handlers = {};
			this.calls = Object.fromEntries(
				methods.map( ( m ) => [ m, [] ] )
			);
			this.canvasContainer = global.document.body.appendChild(
				global.document.createElement( 'div' )
			);
			mockMaps.push( this );
		}

		getCanvasContainer() {
			return this.canvasContainer;
		}

		on( event, handler ) {
			this.handlers[ event ] = handler;
		}
	}
	methods.forEach( ( name ) => {
		Map.prototype[ name ] = calls( name );
	} );
	return { __esModule: true, default: { Map, NavigationControl: class {} } };
} );

global.IS_REACT_ACT_ENVIRONMENT = true;
global.hmMap = { apiKey: 'test' };

describe( 'MapPreview', () => {
	it( 'keeps a zoom of 0 and resizes before jumping to the saved view on load', () => {
		const container = document.createElement( 'div' );
		const root = createRoot( container );

		act( () => {
			root.render(
				<MapPreview
					zoom={ 0 }
					latitude={ 10 }
					longitude={ 20 }
					slideBlocks={ [] }
					updateMarkers={ jest.fn() }
					mapStyle=""
				/>
			);
		} );

		const map = mockMaps[ mockMaps.length - 1 ];
		expect( map.options.zoom ).toBe( 0 );
		expect( map.calls.setZoom.at( -1 ) ).toEqual( [ 0 ] );

		mockLog.length = 0;
		act( () => {
			map.handlers.load();
		} );

		expect( map.calls.resize ).toHaveLength( 1 );
		expect( map.calls.jumpTo ).toEqual( [
			[ { center: [ 20, 10 ], zoom: 0 } ],
		] );
		expect( mockLog.indexOf( 'resize' ) ).toBeLessThan(
			mockLog.indexOf( 'jumpTo' )
		);

		act( () => root.unmount() );
	} );

	it( 'pans the map from same-document pointer deltas instead of mapbox dragPan', () => {
		const container = document.createElement( 'div' );
		const root = createRoot( container );

		act( () => {
			root.render(
				<MapPreview
					zoom={ 1 }
					latitude={ 10 }
					longitude={ 20 }
					slideBlocks={ [] }
					updateMarkers={ jest.fn() }
					mapStyle=""
				/>
			);
		} );

		const map = mockMaps[ mockMaps.length - 1 ];
		expect( map.options.dragPan ).toBe( false );

		const fire = ( target, type, x, y, button = 0 ) =>
			target.dispatchEvent(
				new window.MouseEvent( type, {
					bubbles: true,
					button,
					clientX: x,
					clientY: y,
				} )
			);

		fire( map.canvasContainer, 'pointerdown', 100, 100, 2 );
		fire( document, 'pointermove', 150, 150 );
		expect( map.calls.panBy ).toHaveLength( 0 );

		fire( map.canvasContainer, 'pointerdown', 100, 100 );
		fire( document, 'pointermove', 300, 100 );
		fire( document, 'pointermove', 300, 150 );
		fire( document, 'pointerup', 300, 150 );
		fire( document, 'pointermove', 400, 400 );

		expect( map.calls.panBy ).toEqual( [
			[ [ -200, 0 ], { animate: false } ],
			[ [ 0, -50 ], { animate: false } ],
		] );

		act( () => root.unmount() );
	} );
} );
