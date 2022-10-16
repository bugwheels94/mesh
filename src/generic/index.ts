// import util from 'util';

import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { ShellTypes } from '../utils/util';
// const execPromise = util.promisify(exec);

class Plugin extends BasePluginClass {
	constructor(options: PluginArguments) {
		super(options);
		this.checkCommandExist(this._options.command);
	}
	run() {
		const { folder, args, subcommand } = this._options;

		return this.chooseShellMethod(subcommand).method({
			args,
			command: this._options.command,
			folder,
		});
	}
	chooseShellMethod(subcommand: string) {
		switch (subcommand) {
			default:
				return {
					type: ShellTypes.VIRTUAL_SYNC,
					method: asyncSpawn({ stdio: 'inherit' }),
				};
		}
	}
}
export default Plugin;
