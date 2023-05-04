import { ChildProcess, spawn, SpawnOptions } from 'child_process';

import throttle from 'lodash.throttle';

import { Config, globalConfig, writeIndentedText, writeLogicalText, writePermanentText } from './util';

const BATCH_TIME = 500;
type CommonOptions = {
	hideOutputAtEnd?: boolean;
	isRealTime?: boolean;
	shouldRunInCurrentFolder?: boolean;
	noLogs?: boolean;
};

export const asyncSpawn =
	(optionsByCommand: SpawnOptions & CommonOptions) =>
	({
		command,
		args,
		folder,
		noLogs,
		...opts
	}: {
		folder: Exclude<Config['folders'], null | undefined>[0] | null;
		command: string;
		args: string[];
	} & SpawnOptions &
		CommonOptions) => {
		const obj: {
			process?: ChildProcess;
			promise?: Promise<string | undefined>;
			folder?: Exclude<Config['folders'], null | undefined>[0] | null;
		} = {
			folder,
		};
		const finalOptions = {
			...opts,
			...optionsByCommand,
		};
		const folderPath = folder === null ? '' : folder.path;
		if (!finalOptions.shouldRunInCurrentFolder) finalOptions.cwd = folderPath;
		else finalOptions.cwd = process.cwd();

		obj.promise = new Promise(function (resolve, reject) {
			const dataChunks: Uint8Array[] = [];
			const errorChunks: Uint8Array[] = [];
			if (finalOptions.stdio === 'inherit') {
				!noLogs && writePermanentText(folderPath, 'Starting');
				process.stdout.write('\n');
			}
			obj.process = spawn(command, args, {
				...finalOptions,
				env: { ...process.env, ...(finalOptions.env ? finalOptions.env : {}) },
				shell: true,
			});
			!noLogs &&
				writePermanentText(
					folderPath,
					'Running: (' + command + ' ' + args.join(' ') + ') in the directory: ' + finalOptions.cwd
				);

			// const temp = (ch: Buffer) => {
			//   console.log('writing', ch);
			//   obj.process.stdin.write(ch);
			// };
			if (finalOptions.stdio === 'pipe') {
				// process.stdin.on('data', temp);
				if (process.stdin.isTTY) {
					process.stdin.setRawMode(true);
				}
				// process.stdin.resume();
				if (obj.process?.stdin) process.stdin.pipe(obj.process.stdin);
				let buffer: Buffer[] = [],
					errorBuffer: Buffer[] = [];
				const printStream = () => {
					if (globalConfig.disableStdout) return;
					if (buffer.length) {
						const s = Buffer.concat(buffer).toString();
						!noLogs && writeLogicalText(folderPath, s);
						process.stdout.write('\n');
						buffer = [];
					}
					if (errorBuffer.length) {
						const s = Buffer.concat(errorBuffer).toString();
						!noLogs && writeLogicalText(folderPath, s, { isError: true });
						process.stdout.write('\n');
						errorBuffer = [];
					}
				};
				obj.process.stdout?.on('data', function (data) {
					buffer.push(data);
					if (finalOptions.isRealTime) {
						printStream();
					} else {
						throttle(printStream, BATCH_TIME, { trailing: true })();
					}
					dataChunks.push(data);
				});
				obj.process.stderr?.on('data', function (data) {
					errorBuffer.push(data);
					if (finalOptions.isRealTime) {
						printStream();
					} else {
						throttle(printStream, BATCH_TIME, { trailing: true })();
					}
					errorChunks.push(data);
				});
			}
			obj.process.on('exit', (code) => {
				const finalChunks = dataChunks.length ? dataChunks : errorChunks; // sometimes stderr gets stdout
				if (finalOptions.stdio === 'pipe' && obj.process?.stdin) {
					process.stdin.unpipe(obj.process.stdin);
				}
				if (code === 0 || code === null) {
					const s = Buffer.concat(finalChunks).toString() || 'Successful';
					if (!finalOptions.hideOutputAtEnd || !finalChunks.length) {
						!noLogs && writeLogicalText(folderPath, s);
						process.stdout.write('\n');
					}
					resolve(s);
				} else {
					const s = Buffer.concat(finalChunks).toString() || `Failed with code ${code}`;
					if (!finalOptions.hideOutputAtEnd || !finalChunks.length) {
						!noLogs && writeLogicalText(folderPath, s);
						process.stdout.write('\n');
					}
					reject(s);
				}
			});
			obj.process.on('error', (error) => {
				writeIndentedText(folderPath, error.message, { isError: true });
				reject(error);
			});
		});

		return obj;
	};
