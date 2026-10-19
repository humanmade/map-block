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
	];
	class Map {
		constructor( options ) {
			this.options = options;
			this.handlers = {};
			this.calls = Object.fromEntries(
				methods.map( ( m ) => [ m, [] ] )
			);
			mockMaps.push( this );
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
} );
