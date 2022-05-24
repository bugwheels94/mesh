// import util from 'util';

import path from 'path';

import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { config, ShellTypes, writeJSONFile, writePermanentText } from '../utils/util';
// const execPromise = util.promisify(exec);

class Plugin extends BasePluginClass {
	constructor(options: PluginArguments) {
		super(options);
		this.checkCommandExist('npm');
		this.promisedResult = this.setVars(options);
	}
	async setVars(options: PluginArguments) {
		config.parameters = { ...(config.parameters || {}), ...options.argv };
		delete config.parameters._;
		writeJSONFile(path.join(process.cwd(), 'package.json'), config);
		writePermanentText('', 'Parameters Set Successfully');
		return null;
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
}
export default Plugin;
