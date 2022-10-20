// import util from 'util';
import shell from 'shelljs';

import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { cdToFolder, ShellTypes, writeLogicalText } from '../utils/util';
// const execPromise = util.promisify(exec);
const { exec } = shell;
class Plugin extends BasePluginClass {
	constructor(options: PluginArguments) {
		super(options);
		this.checkCommandExist('git');
	}
	run() {
		const { folder, args, subcommand, argv } = this._options;
		let rawArgs = args;
		if (subcommand === 'commit') {
			const temp = cdToFolder(folder.path);
			const { stdout } = exec('git status --porcelain');
			shell.cd(temp);
			if (!stdout) {
				writeLogicalText(folder.path, 'Nothing to Commit');
				process.stdout.write('\n');
				return {};
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
					rawArgs = args.slice(args.indexOf('-b'), 1);
				}
			} else {
				// Branch Does not exist
				if (!argv['b']) {
					writeLogicalText(folder.path, `Branch "${argv['_'][1]}" does not exist, creating "${argv['_'][1]}"`);

					process.stdout.write('\n');
					rawArgs.unshift('-b');
				}
			}
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
