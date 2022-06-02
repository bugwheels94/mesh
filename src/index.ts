#!/usr/bin/env node

// import keypress from 'keypress';
import minimist from 'minimist';
import { intersection } from 'ramda';
import kill from 'tree-kill';

import dargs from './dargs/index';
import { Folder } from './utils/Folder';
import { BasePluginClass } from './utils/Plugin';
import { localConfig } from './utils/config';
import { Await, config, Config, globalConfig, kebabToCamel, writeLogicalText } from './utils/util';
const argv = minimist(process.argv.slice(2));
const command = argv._.shift();
const globalPluginConfig = [...localConfig.plugins, ...(config.plugins || [])].find(({ alias }) => alias === command);

if (!globalPluginConfig) {
	console.log('Global Config missing');
	process.exit();
}

if (!command) {
	process.exit();
}
const segregateConfluxArgs = (argv: minimist.ParsedArgs) => {
	return Object.keys(argv).reduce(
		(acc, current) => {
			if (current.startsWith('cfx-')) {
				acc.cfx[kebabToCamel(current.slice(4))] = argv[current];
			} else {
				acc.remaining[current] = argv[current];
			}
			return acc;
		},
		{
			cfx: {} as minimist.ParsedArgs,
			remaining: {} as minimist.ParsedArgs,
		}
	);
};
const filterByConfluxGroups = (confluxArgs: minimist.ParsedArgs) => (folder: Config['folders'][0]) => {
	const groups = folder.groups;
	const finalGroups = Array.isArray(groups) ? groups : [groups];
	const confluxGroups =
		confluxArgs['group'] || confluxArgs['groups'] || config.parameters?.group || config.parameters?.groups;
	if (!confluxGroups) return true;
	const finalConfluxGroups = Array.isArray(confluxGroups) ? confluxGroups : [confluxGroups];
	return intersection(finalGroups, finalConfluxGroups).length > 0;
};
(async () => {
	const Plugin = (await import(globalPluginConfig.name)).default;
	const folders = config.folders || [];
	const segregated = segregateConfluxArgs(argv);
	const args = dargs(segregated.remaining, {
		useEquals: false,
		allowCamelCase: true,
	});
	type T = string | null;
	const subcommand: T = argv._.length ? argv._[0] : null;
	const filteredFolders = folders.filter(filterByConfluxGroups(segregated.cfx)).filter((folder) => {
		if (folder.plugins?.[globalPluginConfig.alias] === undefined) {
			return true;
		} // if no plugins means no local config then means enable
		const localPluginConfig = folder.plugins[globalPluginConfig.alias];
		const blacklists = localPluginConfig.blacklist || [];
		return !blacklists.includes(subcommand);
	});
	const pluginArguments = {
		argv: segregated.remaining,
		folders: filteredFolders,
		subcommand,
		args,
		command,
	};
	// process.stdin.resume();

	const doesRequireFolders = Plugin.doesRequireFolder(pluginArguments);
	const folder = new Folder(pluginArguments);
	if (doesRequireFolders) {
		let instances: Await<ReturnType<Folder['runOnSelectedFolders']>>, folders;
		try {
			folders = segregated.cfx.noPrompt ? filteredFolders : await folder.chooseFolders();
			instances = await folder.runOnSelectedFolders(Plugin, folders);
		} catch (e) {}
		process.on('uncaughtException', function (err) {
			writeLogicalText('EXITING', err.stack);

			process.stdout.write('\nEND');
			process.stdout.write('\nEND');
			instances.forEach((instance) => instance.plugin.result.process.kill('SIGINT'));
			process.exit();
		});
		process.stdin.on('data', async function (args) {
			if (args.toString() === '\u001b') {
				// Escape Key
				globalConfig.disableStdout = true;
				const filteredFolders = await folder.chooseFolders(folders);
				const remainingInstances = instances.filter((instance) => {
					const t = filteredFolders.filter((folder) => {
						if (instance.folder.path === folder.path) {
							// Any other way is not able to work all of the processes
							if (instance.plugin.result?.process?.pid) kill(instance.plugin.result?.process?.pid);
							return true;
						}
						return false;
					});
					return t.length !== 1; // means folder was not selected to be restarted found and hence not touched
				});
				try {
					setTimeout(async () => {
						const newInstances = await folder.runOnSelectedFolders(Plugin, filteredFolders);
						instances = [...newInstances, ...remainingInstances];
					}, 2000);
				} catch (e) {
					console.log(e);
				}

				globalConfig.disableStdout = false;
			}
			if (args.toString() === '\u0003') {
				instances.forEach((instance) => instance.plugin.result.process.kill('SIGINT'));
				process.exit();
			}
			if (!globalConfig.disableStdout) process.stdout.write(args);
		});
		process.stdin.setRawMode(true);
	} else {
		const r: BasePluginClass = new Plugin(pluginArguments);
		r.runOnAll();
	}
})();

export {};
