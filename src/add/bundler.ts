import path from 'path';
import Plugin from '.';
import { readJSONFile } from '../utils/util';
import fs from 'fs';
export const addBundler = async function (plugin: Plugin) {
	const config = readJSONFile('rollup.mesh.json');
	const ff = process.cwd();
	fs.writeFileSync(
		path.join(ff, 'rollup.config.cjs'),
		fs
			.readFileSync(path.join(__dirname, 'rollup.js'), 'utf-8')
			.replace('BUNDLE_NPM_WORKSPACE_PACKAGES', '' + JSON.stringify(config.bundleNpmWorkspacePackages))
			.replace('BUNDLE_PACKAGES', '' + JSON.stringify(config.bundleDependencies))
			.replace('NEVER_BUNDLE_PACKAGES', '' + JSON.stringify(config.neverBundleDependencies))
			.replace('BUNDLE_LOCAL_FILES_TOGETHER', '' + config.bundleLocalFiles)
			.replace('BUNDLE_NODE_MODULES', '' + config.bundleNodeModules)
			.replace('INPUTS', JSON.stringify(config.inputs))
			.replace('FORMATS', JSON.stringify(config.formats))
			.replace('BABEL_HELPERS', config.babelHelpers || 'runtime')
			.replace('CJS_FILE_EXTENSION', config.cjsFileExtension || 'js')
			.replace('DECORATORS', config.decorators || false)
	);
	const packages = [
		'@rollup/plugin-babel',
		'@rollup/plugin-node-resolve',
		'rollup-plugin-peer-deps-external',
		'@rollup/plugin-babel',
		'@rollup/plugin-json',
		'@rollup/plugin-commonjs',
		'@rollup/plugin-replace',
		'fast-glob',
		'rollup',
		'@rollup/plugin-terser',
	];
	await plugin.chooseShellMethod(plugin._options.subcommand).method({
		args: ['install', '-D', ...packages],
		command: 'npm',
		folder: null,
		shouldRunInCurrentFolder: true,
	}).promise;
	await Promise.all([
		plugin.chooseShellMethod(plugin._options.subcommand).method({
			args: ['pkg', 'set', 'scripts.build:code="rollup -c"'],
			command: 'npm',
			noLogs: true,
			folder: null,
			shouldRunInCurrentFolder: true,
		}).promise,
		plugin.chooseShellMethod(plugin._options.subcommand).method({
			args: ['pkg', 'set', 'scripts.build:code:watch="rollup -c -w"'],
			command: 'npm',
			noLogs: true,

			folder: null,
			shouldRunInCurrentFolder: true,
		}).promise,
		plugin.chooseShellMethod(plugin._options.subcommand).method({
			args: ['pkg', 'set', 'scripts.build:types="tsc --project ./tsconfig.json"'],
			command: 'npm',
			noLogs: true,
			folder: null,
			shouldRunInCurrentFolder: true,
		}).promise,
		plugin.chooseShellMethod(plugin._options.subcommand).method({
			args: ['pkg', 'set', 'scripts.build:types:watch="tsc --watch --project ./tsconfig.json"'],
			command: 'npm',
			noLogs: true,
			folder: null,
			shouldRunInCurrentFolder: true,
		}).promise,
		plugin.chooseShellMethod(plugin._options.subcommand).method({
			args: ['pkg', 'set', 'scripts.build="run-p build:types build:code"'],
			command: 'npm',
			noLogs: true,
			folder: null,
			shouldRunInCurrentFolder: true,
		}).promise,
		plugin.chooseShellMethod(plugin._options.subcommand).method({
			args: ['pkg', 'set', 'scripts.build:watch="run-p build:code:watch build:types:watch"'],
			command: 'npm',
			noLogs: true,
			folder: null,
			shouldRunInCurrentFolder: true,
		}).promise,
	]);
	return 'done';

	/*
	1. Should ask if the bundle is library or not
		Solution: Add export fields or umd export
	2. Should ask if the bundle is for browser or node or both
		Solution: Will help in deciding the folder structure
			dist/
				browser/
					es
					umd(prefer) or cjs
				node/
					es
					umd(prefer) or cjs
				es/ in case if external deps are not bundled #6
				umd/ in case if external deps are not bundled

	3. DEFER to cfx add typescript
	Should ask if TS support is needed
		Solution: Create a dist/types script in package.json which will do the typechecking too
			Also add a field for types in package.json in case the repo is library
	4. Should ask if es exports are required and if local imports needs to be bundled(in case of es export)
		Solution: add to rollup if local bundles are required and if not then add babel script to compile src folder to other folders
	5. Should ask if cjs exports are required
	6. Should ask if bundle external deps, node_modules in all 3 forms of export
	7. Should ask if raw files can be exported es/raw   
	Solutions: 
	1. Should create default TS config if needed
	2. Should add scripts 
		npm run cfx::start-rollup:dev  // typical rollup/webpack
		npm run cfx::start-ts:dev
		npm run cfx::start:dev// for the most full experience and use run-p
		npm run cfx::build
	*/

	// const answers = await inquirer.prompt([
	// 	{
	// 		type: 'checkbox',
	// 		name: 'targetPlatform',
	// 		message: `Please choose the target platforms that will need to be supported`,
	// 		choices: ['NodeJS', 'Browser'],
	// 	},
	// 	{
	// 		type: 'checkbox',
	// 		name: 'exportType',
	// 		message: `Please choose the type of exports required for plugin library?`,
	// 		choices: ['ESM', 'CJS'], // CJS can use umd type
	// 		// if ESM and Browser is selected then esm setting should be used for browser
	// 	},
	// 	{
	// 		type: 'confirm',
	// 		name: 'shouldBundleNodeModules',
	// 		message: `Should bundle node_modules folder in the output?`,
	// 	},
	// 	{
	// 		type: 'confirm',
	// 		name: 'shouldBundleLocalFiles',
	// 		message: `Should bundle local files or keep each file intact?`,
	// 	},
	// 	{
	// 		type: 'input',
	// 		name: 'newGroups',
	// 		message: `Create new group that plugin folder belongs to(Use comma to create multiple groups)`,
	// 	},
	// ]);
};
