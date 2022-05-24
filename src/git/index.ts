// import util from 'util';
import shell, { exec } from 'shelljs';

import dargs from '../dargs';
import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { cdToFolder, ShellTypes, writeLogicalText } from '../utils/util';
// const execPromise = util.promisify(exec);

class Plugin extends BasePluginClass {
	constructor(options: PluginArguments) {
		super(options);
		this.checkCommandExist('git');
	}
	async run() {
		const { folder, args, subcommand, argv } = this._options;
		let rawArgs = args;
		if (subcommand === 'commit') {
			const temp = cdToFolder(folder.path);
			const { stdout } = exec('git status --porcelain');
			shell.cd(temp);
			if (!stdout) {
				writeLogicalText(folder.path, 'Nothing to Commit');
				process.stdout.write('\n');
				return null;
			}
		}
		if (subcommand === 'checkout') {
			const temp = cdToFolder(folder.path);
			const branchName = argv['b'] || argv['_'][1];
			const { stdout } = exec(`git show-ref refs/heads/${branchName}`);
			shell.cd(temp);
			if (stdout) {
				// Branch exists
				if (argv['b']) {
					writeLogicalText(folder.path, `Branch "${argv['b']}" already exists, switching to "${argv['b']}"`);
					process.stdout.write('\n');

					argv['_'].push(argv['b']);
					delete argv['b'];
				}
			} else {
				// Branch Does not exist
				if (!argv['b']) {
					writeLogicalText(folder.path, `Branch "${argv['_'][1]}" does not exist, creating "${argv['_'][1]}"`);

					process.stdout.write('\n');
					argv.b = argv['_'][1];
					argv['_'].pop();
				}
			}
			rawArgs = dargs(argv, { useEquals: false, allowCamelCase: true });
		}
		return this.chooseShellMethod(subcommand).method({
			args: rawArgs,
			command: 'git',
			folder,
		});
	}
	chooseShellMethod(subcommand: string) {
		switch (subcommand) {
			case 'clone':
				return {
					type: ShellTypes.ASYNC,
					method: asyncSpawn({ stdio: 'pipe' }),
				};
			case 'commit':
				return {
					type: ShellTypes.VIRTUAL_SYNC,
					method: asyncSpawn({ stdio: 'inherit' }),
				};

			default:
				return {
					type: ShellTypes.VIRTUAL_SYNC,
					method: asyncSpawn({ stdio: 'pipe', hideOutputAtEnd: true }),
				};
		}
	}
}
export default Plugin;
