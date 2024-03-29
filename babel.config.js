const { NODE_ENV, BABEL_ENV } = process.env;
const cjs = NODE_ENV === 'test' || BABEL_ENV === 'commonjs';
const loose = true;

module.exports = {
	assumptions: { setPublicClassFields: true },
	presets: [
		[
			'@babel/preset-env',
			{
				loose,
				targets: {
					chrome: 80,
				},
				modules: false,
				exclude: ['@babel/plugin-transform-regenerator'],
			},
		],
		'@babel/preset-typescript',
	],
	plugins: [
		[
			'const-enum',
			{
				transform: 'constObject',
			},
		],
		cjs && ['@babel/transform-modules-commonjs', { loose }],
		[
			'@babel/transform-runtime',
			{
				// useESModules: !cjs,
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				version: require('./package.json').dependencies['@babel/runtime'].replace(/^[^0-9]*/, ''),
			},
		],
	].filter(Boolean),
};
