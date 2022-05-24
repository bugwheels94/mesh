// import util from 'util';

import path from 'path';

import dargs from '../dargs';
import SyncPlugin from '../sync';
import { Folder } from '../utils/Folder';
import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { readRCFile, ShellTypes, writePermanentText, writeRCFile } from '../utils/util';

import { generateBundle } from './generateBundle';
// const execPromise = util.promisify(exec);
class Plugin extends BasePluginClass {
	constructor(options: PluginArguments) {
		super(options);
		this.checkCommandExist('npm');
	}
	static doesRequireFolder({ subcommand }: Parameters<typeof BasePluginClass.doesRequireFolder>[0]) {
		console.log(subcommand);
		if (subcommand === 'install' || subcommand === 'generate-bundle') return false;
		return true;
	}
	async runOnAll() {
		if (this._options.subcommand === 'install' || this._options.subcommand === 'i') {
			return this.install();
		} else if (this._options.subcommand === 'generate-bundle') {
			return generateBundle();
		}
		return null;
	}
	async install() {
		const { argv, subcommand, args } = this._options;
		const npmrc = this._options.folders
			.map((folder) => {
				return readRCFile(path.join(folder.path, '.npmrc'));
			})
			.join('\n');
		writeRCFile('.npmrc', npmrc);
		if (argv._.length === 1) {
			await this.chooseShellMethod(subcommand).method({
				args: args,
				command: 'npm',
				folder: null,
				shouldRunInCurrentFolder: true,
			}).promise;
		} else {
			const folder = new Folder(this._options);
			const selectedFolders = await folder.chooseFolders();
			argv['w'] = selectedFolders.map((folder) => folder.path);
			if (!selectedFolders.length) {
				writePermanentText('npm', 'Please Select at least 1 folder', {
					isError: true,
				});
				return null;
			}
			await this.chooseShellMethod(subcommand).method({
				args: dargs(argv, { useEquals: false }),
				command: 'npm',
				folder: null,
				shouldRunInCurrentFolder: true,
			}).promise;
		}
		const syncPlugin = new SyncPlugin(this._options);
		return syncPlugin.syncSymlinksAndTypes().then((_) => 'Done');
	}
	async run() {
		const { folder, args, subcommand } = this._options;

		return this.chooseShellMethod(subcommand).method({
			args: args,
			command: 'npm',
			folder,
		});
	}
	chooseShellMethod(command: string) {
		switch (command) {
			case 'install':
			case 'i':
				return {
					type: ShellTypes.ASYNC,
					method: asyncSpawn({
						stdio: 'inherit',
						shouldRunInCurrentFolder: true,
					}),
				};
			case 'generate-bundle':
				return {
					type: ShellTypes.ASYNC,
					method: asyncSpawn({
						stdio: 'inherit',
						shouldRunInCurrentFolder: true,
					}),
				};
			case 'test':
			case 'build':
				return {
					type: ShellTypes.ASYNC,
					method: asyncSpawn({ stdio: 'pipe' }),
				};
			case 'run':
			case 'start':
				return {
					type: ShellTypes.ASYNC,
					method: asyncSpawn({
						stdio: 'pipe',
						hideOutputAtEnd: true,
					}),
				};

			case 'init':
				return {
					type: ShellTypes.VIRTUAL_SYNC,
					method: asyncSpawn({ stdio: 'pipe' }),
				};
			default:
				return {
					type: ShellTypes.VIRTUAL_SYNC,
					method: asyncSpawn({ stdio: 'inherit' }),
				};
		}
	}
}
export default Plugin;
