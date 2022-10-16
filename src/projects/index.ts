// import util from 'util';

import { addFolder } from '../projects/add-folder';
import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { ShellTypes } from '../utils/util';

// const execPromise = util.promisify(exec);
import './prettier';
import { listFolders } from './list-folders';
import { listProjects } from './list-projects';
class Plugin extends BasePluginClass {
	constructor(options: PluginArguments) {
		super(options);
		this.checkCommandExist('npm');
	}
	static doesRequireFolder({ subcommand }: Parameters<typeof BasePluginClass.doesRequireFolder>[0]) {
		if (['list', 'add-folder', 'list-folders'].includes(subcommand)) return false;
		return true;
	}
	async runOnAll() {
		if (this._options.subcommand === 'list') return listProjects();
		if (this._options.subcommand === 'add-folder') return addFolder();
		if (this._options.subcommand === 'list-folders') return listFolders(this);
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
			case 'commitizen':
				return {
					type: ShellTypes.ASYNC,
					method: asyncSpawn({ stdio: 'pipe' }),
				};
			case 'prettier':
				return {
					type: ShellTypes.ASYNC,
					method: asyncSpawn({ stdio: 'pipe' }),
				};
			case 'semantic-release':
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
