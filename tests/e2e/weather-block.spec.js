/**
 * The Weather block, end to end, on whichever WordPress wp-env is running.
 */

const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );
const { mockNws, ORLANDO } = require( './nws-mock' );

const BLOCK = 'simple-nws-weather-block/weather';
const CLASS = 'wp-block-simple-nws-weather-block-weather';

/**
 * Serialises a block comment for post content.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} Block markup.
 */
function blockMarkup( attributes ) {
	return `<!-- wp:${ BLOCK } ${ JSON.stringify( attributes ) } /-->`;
}

test.describe( 'Weather block', () => {
	/** @type {string[]} */
	let pageErrors;

	test.beforeEach( async ( { page, context } ) => {
		pageErrors = [];
		page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) );

		/*
		 * Record any attempt to ask for the visitor's position. The plugin no
		 * longer offers that, and a permission prompt on a public page would be
		 * a regression visitors notice immediately.
		 */
		await context.addInitScript( () => {
			window.__geolocationRequested = false;

			if ( navigator.geolocation ) {
				const flag = () => {
					window.__geolocationRequested = true;
				};

				navigator.geolocation.getCurrentPosition = flag;
				navigator.geolocation.watchPosition = flag;
			}
		} );
	} );

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
		expect( pageErrors, 'Uncaught JavaScript errors' ).toEqual( [] );
	} );

	test( 'inserts in the editor and previews live conditions', async ( {
		admin,
		editor,
		page,
		context,
	} ) => {
		await mockNws( context );
		await admin.createNewPost();
		await editor.insertBlock( { name: BLOCK, attributes: ORLANDO } );

		const block = editor.canvas.locator( `.${ CLASS }` );

		await expect( block ).toBeVisible();
		await expect( block.locator( `.${ CLASS }__temperature` ) ).toHaveText(
			'78°'
		);
		await expect( block.locator( `.${ CLASS }__icon` ) ).toHaveClass(
			/wi-day-/
		);

		// The location source offers only locations an editor chooses.
		await editor.openDocumentSettingsSidebar();
		await page
			.getByRole( 'button', { name: 'Location', exact: true } )
			.click();

		const source = page.getByRole( 'combobox', {
			name: 'Location source',
		} );

		await expect( source.locator( 'option' ) ).toHaveText( [
			'Site default',
			'Specific location',
		] );
	} );

	test( 'saves without block validation errors', async ( {
		admin,
		editor,
		page,
		context,
	} ) => {
		await mockNws( context );
		await admin.createNewPost();
		await editor.insertBlock( {
			name: BLOCK,
			attributes: { ...ORLANDO, layout: 'detailed', showHumidity: true },
		} );

		const postId = await editor.publishPost();

		await page.reload();

		await expect( editor.canvas.locator( `.${ CLASS }` ) ).toBeVisible();
		await expect(
			page.getByText(
				'This block contains unexpected or invalid content'
			)
		).toHaveCount( 0 );
		expect( postId ).toBeTruthy();
	} );

	test( 'fills in on the front end without asking for the visitor’s location', async ( {
		page,
		context,
		requestUtils,
	} ) => {
		const requested = await mockNws( context );
		const post = await requestUtils.createPost( {
			title: 'Current conditions',
			status: 'publish',
			content: blockMarkup( {
				...ORLANDO,
				showCondition: true,
				showLocation: true,
			} ),
		} );

		await page.goto( post.link );

		const block = page.locator( `.${ CLASS }` );

		await expect( block ).toHaveClass( /is-weather-loaded/ );
		await expect( block.locator( `.${ CLASS }__temperature` ) ).toHaveText(
			'78°'
		);
		await expect( block.locator( `.${ CLASS }__condition` ) ).toHaveText(
			'Partly Sunny'
		);
		await expect( block.locator( `.${ CLASS }__location` ) ).toHaveText(
			'Orlando'
		);
		await expect(
			block.locator( `.${ CLASS }__description` )
		).toContainText( 'Orlando' );

		expect(
			requested.some( ( url ) =>
				url.includes( '/points/28.6024,-81.2001' )
			)
		).toBe( true );
		expect(
			await page.evaluate( () => window.__geolocationRequested )
		).toBe( false );
	} );

	test( 'renders a daily forecast on the front end', async ( {
		page,
		context,
		requestUtils,
	} ) => {
		await mockNws( context );
		const post = await requestUtils.createPost( {
			title: 'Daily forecast',
			status: 'publish',
			content: blockMarkup( {
				...ORLANDO,
				layout: 'daily',
				periodCount: 3,
			} ),
		} );

		await page.goto( post.link );

		const block = page.locator( `.${ CLASS }` );

		await expect( block ).toHaveClass( /is-weather-loaded/ );
		await expect( block.locator( `.${ CLASS }__period` ) ).toHaveCount( 3 );
		await expect(
			block.locator( `.${ CLASS }__period-name` ).first()
		).toHaveText( 'Today' );
	} );

	test( 'hides itself for a location outside NWS coverage', async ( {
		page,
		context,
		requestUtils,
	} ) => {
		await mockNws( context, { outOfCoverage: true } );
		const post = await requestUtils.createPost( {
			title: 'Outside coverage',
			status: 'publish',
			content: blockMarkup( {
				locationSource: 'custom',
				latitude: '51.5072',
				longitude: '-0.1276',
			} ),
		} );

		await page.goto( post.link );

		const block = page.locator( `.${ CLASS }` );

		await expect( block ).toHaveClass( /is-weather-error/ );
		await expect( block ).toBeHidden();
	} );
} );

test.describe( 'Settings screen', () => {
	test( 'loads with the location search', async ( { admin, page } ) => {
		const errors = [];

		page.on( 'pageerror', ( error ) => errors.push( error.message ) );

		await admin.visitAdminPage(
			'options-general.php',
			'page=simple-nws-weather-block'
		);

		await expect(
			page.getByRole( 'heading', { name: 'Simple NWS Weather Block' } )
		).toBeVisible();
		await expect(
			page.locator( '#simple-nws-weather-block-location-search' )
		).not.toBeEmpty();
		await expect(
			page.getByText( /United States and its territories only/ )
		).toBeVisible();
		expect( errors ).toEqual( [] );
	} );
} );
