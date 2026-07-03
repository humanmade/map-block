/**
 * Extends the default @wordpress/scripts ESLint config.
 *
 * `@wordpress/*` packages are externalized by wp-scripts and provided by
 * WordPress at runtime, so they are neither installed nor listed in
 * package.json. Relax the import rules that would otherwise flag them.
 */
const wpScriptsConfig = require( '@wordpress/scripts/config/eslint.config.cjs' );

module.exports = [
	{
		// reference/ holds large local-only checkouts (WordPress core, the
		// original annual report plugin) and must never be linted.
		ignores: [ 'reference/**', 'build/**', 'vendor/**' ],
	},
	...wpScriptsConfig,
	{
		settings: {
			// Do not flag externalized @wordpress/* packages.
			'import/internal-regex': '^@wordpress/',
		},
		rules: {
			'import/no-unresolved': [ 'error', { ignore: [ '^@wordpress/' ] } ],
		},
	},
];
