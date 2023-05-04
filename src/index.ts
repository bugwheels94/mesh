import path from 'path';

import minimist from 'minimist';
import { intersection } from 'ramda';
import kill from 'tree-kill';

import { Folder } from './utils/Folder';
import { BasePluginClass } from './utils/Plugin';
import { localConfig } from './utils/config';
import { Await, Config, getConfig, globalConfig, writeLogicalText, writePermanentText } from './utils/util';
const segregateConfluxArgs = (properArgv: string[]) => {
	const mainCommandStartIndex = properArgv.indexOf('-c') + 1 || 1;

	const meshCommandOptions = properArgv.slice(0, mainCommandStartIndex);
	const mainCommandWithOptions = properArgv.slice(mainCommandStartIndex);
	return {
		remaining: minimist(mainCommandWithOptions.slice(1)),
		mainCommandOptions: mainCommandWithOptions.slice(1),
		mainCommand: mainCommandWithOptions[0],
		meshCommandOptions,
		cfx: minimist(meshCommandOptions),
	};
};
const filterByConfluxGroups = (confluxArgs: minimist.ParsedArgs) => {
	const config = getConfig();

	const confluxGroups = confluxArgs['group'] || confluxArgs['g'] || config.parameters?.group;
	writePermanentText('Current Project', confluxGroups);
	process.stdout.write('\n');
	return (folder: Exclude<Config['folders'], null | undefined>[0]) => {
		const groups = folder.groups;
		const finalGroups = Array.isArray(groups) ? groups : [groups];

		if (!confluxGroups) return true;
		const finalConfluxGroups = Array.isArray(confluxGroups) ? confluxGroups : [confluxGroups];
		return intersection(finalGroups, finalConfluxGroups).length > 0;
	};
};
(async () => {
	const config = getConfig();
	if (config === null) return;
	const folders = config.folders;
	const segregated = segregateConfluxArgs(process.argv.slice(2));
	type T = string | null;
	const command: T = segregated.mainCommand;
	const subcommand: T = segregated.remaining._.length ? segregated.remaining._[0] : null;
	if (subcommand === null) return;

	segregated.remaining._ = segregated.remaining._.slice(0);
	const args = segregated.mainCommandOptions;
	const globalPluginConfig = [...localConfig.plugins, ...(config.plugins || [])].find(
		({ alias }) => alias === command
	) || {
		name: './generic',
		alias: segregated.mainCommand,
	};
	console.log('Using plugin stored at:', path.join(globalPluginConfig.name, 'index.js'));

	const Plugin = (await import('./' + path.join(globalPluginConfig.name, 'index.js'))).default;

	const filteredFolders = (folders || []).filter(filterByConfluxGroups(segregated.cfx)).filter((folder) => {
		if (folder.plugins?.[globalPluginConfig.alias] === undefined) {
			return true;
		} // if no plugins means no local config then means enable
		if (folder.plugins?.[globalPluginConfig.alias] === false) {
			return false;
		} // if explicit false then disable whole plugin
		const localPluginConfig = folder.plugins[globalPluginConfig.alias];
		const blacklists = typeof localPluginConfig === 'object' ? localPluginConfig.blacklist || [] : [];
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
		let instances: Await<ReturnType<Folder['runOnSelectedFolders']>>;
		try {
			instances = await folder.runOnSelectedFolders(
				Plugin,
				// .y means -y true which is for no prompt
				segregated.cfx.y ? filteredFolders : await folder.chooseFolders()
			);
		} catch (e) {}
		process.on('uncaughtException', function (err) {
			if (err.stack) writeLogicalText('EXITING', err.stack);

			process.stdout.write('\nEND');
			process.stdout.write('\nEND');
			instances.forEach((instance) => instance.plugin.result.process?.kill('SIGINT'));
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
					console.error(e);
				}

				globalConfig.disableStdout = false;
			}
			if (args.toString() === '\u0003') {
				instances.forEach((instance) => instance.plugin.result.process?.kill('SIGINT'));
				process.exit();
			}
			if (!globalConfig.disableStdout) process.stdout.write(args);
		});
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
		}
	} else {
		const r: BasePluginClass = new Plugin(pluginArguments);
		r.runOnAll();
	}
})();

export {};
