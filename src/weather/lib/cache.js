/**
 * Browser-side cache for National Weather Service responses.
 *
 * Every forecast this plugin shows is fetched by the visitor's own browser and
 * held in that visitor's own storage. Nothing is cached on the server, so a
 * page cache never holds a temperature and the plugin never accumulates state
 * of its own.
 *
 * Storage is best-effort throughout. Safari in private browsing and any browser
 * with site data blocked throws on access, so values fall back to memory for
 * the life of the page rather than failing the block.
 */

/**
 * Prefix for every key this plugin writes.
 *
 * The version segment lets a future release invalidate everything it cached
 * previously by bumping the number. It moved to v2 when point lookups began
 * storing the location's time zone, which earlier entries do not carry.
 *
 * @type {string}
 */
const CACHE_PREFIX = 'simpleWeatherBlock:v2:';

/**
 * Fallback store used when local storage is unavailable.
 *
 * @type {Map<string, {t: number, v: *}>}
 */
const memoryStore = new Map();

/**
 * Returns local storage if it is usable, otherwise null.
 *
 * Availability is probed by writing rather than by feature detection, because a
 * browser can expose the API and still throw on every call to it.
 *
 * @return {?Storage} Storage object or null.
 */
function getStorage() {
	try {
		const probe = `${ CACHE_PREFIX }probe`;

		window.localStorage.setItem( probe, '1' );
		window.localStorage.removeItem( probe );

		return window.localStorage;
	} catch {
		return null;
	}
}

/**
 * Reads a cached value that has not yet expired.
 *
 * Expiry is evaluated against the lifetime supplied by the caller rather than
 * one stored alongside the value, so shortening the setting takes effect
 * immediately instead of waiting for existing entries to age out.
 *
 * @param {string} key           Cache key, without the prefix.
 * @param {number} maxAgeMinutes Maximum age to accept. Zero misses every time.
 * @return {?*} The cached value, or null on a miss.
 */
export function readCache( key, maxAgeMinutes ) {
	if ( ! maxAgeMinutes || maxAgeMinutes <= 0 ) {
		return null;
	}

	const fullKey = CACHE_PREFIX + key;
	const storage = getStorage();
	let entry;

	if ( storage ) {
		try {
			const raw = storage.getItem( fullKey );

			entry = raw ? JSON.parse( raw ) : null;
		} catch {
			entry = null;
		}
	} else {
		entry = memoryStore.get( fullKey ) || null;
	}

	if ( ! entry || typeof entry.t !== 'number' ) {
		return null;
	}

	const age = Date.now() - entry.t;

	// A clock change can make an entry look like it came from the future.
	if ( age < 0 || age > maxAgeMinutes * 60 * 1000 ) {
		deleteCache( key );

		return null;
	}

	return entry.v;
}

/**
 * Stores a value with the current timestamp.
 *
 * @param {string} key   Cache key, without the prefix.
 * @param {*}      value Value to store. Must be JSON-serialisable.
 * @return {void}
 */
export function writeCache( key, value ) {
	const fullKey = CACHE_PREFIX + key;
	const entry = { t: Date.now(), v: value };
	const storage = getStorage();

	if ( ! storage ) {
		memoryStore.set( fullKey, entry );

		return;
	}

	try {
		storage.setItem( fullKey, JSON.stringify( entry ) );
	} catch {
		// Quota exceeded, most likely. Degrade to memory rather than fail.
		memoryStore.set( fullKey, entry );
	}
}

/**
 * Removes a cached value.
 *
 * @param {string} key Cache key, without the prefix.
 * @return {void}
 */
export function deleteCache( key ) {
	const fullKey = CACHE_PREFIX + key;
	const storage = getStorage();

	memoryStore.delete( fullKey );

	if ( storage ) {
		try {
			storage.removeItem( fullKey );
		} catch {
			// Nothing useful to do here.
		}
	}
}
