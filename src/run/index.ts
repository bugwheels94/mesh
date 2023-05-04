// import util from 'util';

import path from 'path';

import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { getConfig, readJSONFile, ShellTypes, writeJSONFile, writePermanentText } from '../utils/util';
import fs from 'fs';
// const execPromise = util.promisify(exec);

class Plugin extends BasePluginClass {
	constructor(options: PluginArguments) {
		super(options);
		this.checkCommandExist('npm');
	}
	chooseShellMethod(command: string) {
		switch (command) {
			default:
				return {
					type: ShellTypes.VIRTUAL_SYNC,
					method: asyncSpawn({ stdio: 'inherit' }),
				};
		}
	}
	static doesRequireFolder() {
		return false;
	}

	async runOnAll() {
		if (this._options.subcommand === 'rollup') {
			return this.runRollup();
		}
		if (this._options.subcommand === 'rollup:watch') {
			return this.runRollup(true);
		}
		return null;
	}
	private async runRollup(watch: boolean = false) {
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
		);
		setTimeout(() => {
			// fs.unlinkSync(path.join(process.cwd(), 'rollup.config.cjs'))
		}, 1000);
		// this.chooseShellMethod(this._options.subcommand).method({
		// 	args: [`rollup`, "-c", path.join(ff, 'rollup.config.cjs')],
		// 	command: 'npx',
		// 	folder: null,
		// 	shouldRunInCurrentFolder: true,
		// 	// env: {
		// 	// 	FOLDER_PATH: process.cwd()
		// 	// }
		// }).promise
		// const tsConfig = readJSONFile('tsconfig.json');
		// tsConfig.compilerOptions.rootDir = path.join(pr 'src');
		// tsConfig.compilerOptions.outDir = path.join(process.cwd(), 'dist');
		// writeJSONFile(path.join(process.cwd(), 'tsconfig.config.json'), tsConfig);

		await Promise.all([
			this.chooseShellMethod(this._options.subcommand).method({
				args: ['pkg', 'set', 'scripts.build:code="rollup -c"'],
				command: 'npm',
				noLogs: true,
				folder: null,
				shouldRunInCurrentFolder: true,
			}).promise,
			this.chooseShellMethod(this._options.subcommand).method({
				args: ['pkg', 'set', 'scripts.build:code:watch="rollup -c -w"'],
				command: 'npm',
				noLogs: true,

				folder: null,
				shouldRunInCurrentFolder: true,
			}).promise,
			this.chooseShellMethod(this._options.subcommand).method({
				args: ['pkg', 'set', 'scripts.build:types="tsc --project ./tsconfig.json"'],
				command: 'npm',
				noLogs: true,
				folder: null,
				shouldRunInCurrentFolder: true,
			}).promise,
			this.chooseShellMethod(this._options.subcommand).method({
				args: ['pkg', 'set', 'scripts.build:types:watch="tsc --watch --project ./tsconfig.json"'],
				command: 'npm',
				noLogs: true,
				folder: null,
				shouldRunInCurrentFolder: true,
			}).promise,
			this.chooseShellMethod(this._options.subcommand).method({
				args: ['pkg', 'set', 'scripts.build="run-p build:types build:code"'],
				command: 'npm',
				noLogs: true,
				folder: null,
				shouldRunInCurrentFolder: true,
			}).promise,
			this.chooseShellMethod(this._options.subcommand).method({
				args: ['pkg', 'set', 'scripts.build:watch="run-p build:code:watch build:types:watch"'],
				command: 'npm',
				noLogs: true,
				folder: null,
				shouldRunInCurrentFolder: true,
			}).promise,
		]);
		return this.chooseShellMethod(this._options.subcommand).method({
			args: ['run', watch ? 'build:watch' : 'build'],
			command: 'npm',
			folder: null,
			shouldRunInCurrentFolder: true,
		}).promise;
	}
}
export default Plugin;
