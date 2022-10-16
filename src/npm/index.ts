// import util from 'util';

import path from 'path';

import dargs from 'dargs';

import { Folder } from '../utils/Folder';
import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { readRCFile, ShellTypes, writePermanentText, writeRCFile } from '../utils/util';

import { zipNpmFiles } from './generateBundle';
// const execPromise = util.promisify(exec);
class Plugin extends BasePluginClass {
	constructor(options: PluginArguments) {
		super(options);
		this.checkCommandExist('npm');
	}
	static doesRequireFolder({ subcommand }: Parameters<typeof BasePluginClass.doesRequireFolder>[0]) {
		if (['install', 'i', 'version-all'].includes(subcommand)) return false;
		return true;
	}
	async runOnAll() {
		if (this._options.subcommand === 'install' || this._options.subcommand === 'i') {
			return this.install();
		} else if (this._options.subcommand === 'zip-npm-files') {
			return zipNpmFiles();
		}
		return null;
	}

	run() {
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
			case 'zip-npm-files':
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
			case 'version':
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
					method: asyncSpawn({ stdio: 'inherit' }),
				};
			case 'publish':
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
	private async install() {
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
	}
}
export default Plugin;
