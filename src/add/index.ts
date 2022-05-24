// import util from 'util';

import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { ShellTypes } from '../utils/util';

// const execPromise = util.promisify(exec);
import './prettier';
import { addCommitizen } from './commitizen';
import { addFolder } from './conflux-folder';
import { addPrettier } from './prettier';
import { addSemantic } from './semantic';
class Plugin extends BasePluginClass {
	constructor(options: PluginArguments) {
		super(options);
		this.checkCommandExist('npm');
	}
	static doesRequireFolder({ subcommand }: Parameters<typeof BasePluginClass.doesRequireFolder>[0]) {
		if (subcommand === 'folder') return false;
		return true;
	}
	async runOnAll() {
		if (this._options.subcommand === 'folder') return addFolder();
	}
	async run() {
		const { folder, args, subcommand } = this._options;
		if (subcommand === 'commitizen') {
			return { promise: addCommitizen(this), folder };
		}
		if (subcommand === 'prettier') {
			return { promise: addPrettier(this), folder };
		}
		if (subcommand === 'semantic-release') {
			return { promise: addSemantic(this), folder };
		}
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
