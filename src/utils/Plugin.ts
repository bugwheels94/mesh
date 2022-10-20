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
	readonly folder: Exclude<Config['folders'], null | undefined>[0];
	readonly folders: Config['folders'];

	readonly args: string[];
	readonly subcommand: string;
	readonly command: string;
	shouldCheckCommandExistence?: boolean;
};
export abstract class BasePluginClass {
	result: ReturnType<ReturnType<typeof asyncSpawn>>;
	promisedResult: Promise<string | null>;
	_options: PluginArguments;
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
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	//@ts-ignore
	run(): ReturnType<ReturnType<typeof asyncSpawn>> {}
	async runOnAll(): Promise<string | null | undefined> {
		return '';
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	chooseShellMethod(_subcommand: string): IProcessFunction {
		return {
			type: ShellTypes.SYNC,
			method: asyncSpawn.bind(null, { stdio: 'inherit' })(),
		};
	}
}
