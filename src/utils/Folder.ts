import inquirer from 'inquirer';
import minimist from 'minimist';
import shell from 'shelljs';

import { BasePluginClass } from './Plugin';
import { asyncSpawn } from './asyncSpawn';
import { Config, Constructable, ShellTypes } from './util';

export interface IProcessFunction {
	type: ShellTypes;
	method: ReturnType<typeof asyncSpawn>;
}

// export interface PluginInterface {
//   result?: ReturnType<ReturnType<typeof asyncSpawn>>[];
//   run: (
//     _options: Omit<PluginArguments, 'folders' | 'command'> & { folder: string }
//   ) => ReturnType<ReturnType<typeof asyncSpawn>>;
//   chooseShellMethod: (subcommand: string) => IProcessFunction;
// }

export type PluginArguments = {
	readonly argv: minimist.ParsedArgs;
	readonly folders: Config['folders'];
	readonly args: string[];
	readonly subcommand: string;
	readonly command: string;
};
export class Folder {
	result: ReturnType<ReturnType<typeof asyncSpawn>>[] = [];
	promisedResult: Promise<string | string[]> = null;
	_options: PluginArguments = null;
	constructor(_options: PluginArguments) {
		// super(options);
		this._options = _options;
	}
	async chooseFolders(folders?: Config['folders']) {
		const choices = (folders || this._options.folders).map((f) => f.path);
		const answer = await inquirer.prompt([
			{
				type: 'checkbox',
				choices,
				default: choices,
				name: 'folders',
				message: 'Select folders',
			},
		]);
		if (answer.folders.length === 0) throw new Error('Please select at least 1 folder');
		return this._options.folders.filter((folder) => answer.folders.includes(folder.path));
	}

	async runOnSelectedFolders(Plugin: Constructable<BasePluginClass>, folders: Config['folders']) {
		const { subcommand } = this._options;
		const plugins: {
			plugin: BasePluginClass;
			folder: Config['folders'][0];
		}[] = [];
		for (let i = 0; i < folders.length; i++) {
			shell.config.silent = true;
			const folder = folders[i];
			const plugin = new Plugin({
				...this._options,
				args: [...this._options.args],
				folder,
			});
			plugins.push({
				folder,
				plugin,
			});
			const shellObject = plugin.chooseShellMethod(subcommand);

			let temp = await plugin.run();

			plugin.result = temp;

			if (shellObject.type === ShellTypes.SYNC || shellObject.type === ShellTypes.VIRTUAL_SYNC) {
				try {
					await temp.promise;
				} catch (e) {
					temp = null;
				}
			}
		}
		return plugins;
	}
}
