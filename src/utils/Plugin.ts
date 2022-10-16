import minimist from 'minimist';
import shell from 'shelljs';

import { asyncSpawn } from './asyncSpawn';
import { Config, ShellTypes } from './util';

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
	readonly folder?: Config['folders'][0];
	readonly folders: Config['folders'];

	readonly args: string[];
	readonly subcommand: string;
	readonly command: string;
	shouldCheckCommandExistence?: boolean;
};
export abstract class BasePluginClass {
	result: ReturnType<ReturnType<typeof asyncSpawn>> = null;
	promisedResult: Promise<string> = null;
	_options: PluginArguments = null;
	constructor(_options: PluginArguments) {
		this._options = _options;
		// super(options);
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	static doesRequireFolder(_param: { command: string; subcommand: string }): boolean {
		return true;
	}

	checkCommandExist(command: string) {
		if (!shell.which(command)) {
			shell.echo('Sorry, this script requires ' + command);
			shell.exit(1);
		}
	}
	run(): ReturnType<ReturnType<typeof asyncSpawn>> {
		return null;
	}
	async runOnAll(): Promise<string> {
		return null;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	chooseShellMethod(_subcommand: string): IProcessFunction {
		return {
			type: ShellTypes.SYNC,
			method: asyncSpawn.bind(null, { stdio: 'inherit' }),
		};
	}
}
