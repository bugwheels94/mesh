import path from 'path';

import { writeJSONFile } from '../utils/util';

import Plugin from '.';

export const addCommitizen = async function (plugin: Plugin) {
	const { folder, subcommand } = plugin._options;

	await plugin.chooseShellMethod(subcommand).method({
		args: ['install', 'husky', '--save-dev', '-w', folder.path],
		command: 'npm',
		folder,
		shouldRunInCurrentFolder: true,
	}).promise;
	await plugin.chooseShellMethod(subcommand).method({
		args: ['husky', 'install'],
		command: 'npx',
		folder,
	}).promise;
	await plugin.chooseShellMethod(subcommand).method({
		args: ['set-script', 'prepare', `"husky install"`],
		command: 'npm',
		folder,
	}).promise;
	await plugin.chooseShellMethod(subcommand).method({
		args: ['husky', 'add', '.husky/prepare-commit-msg', `"exec < /dev/tty && node_modules/.bin/cz --hook || true"`],
		command: 'npx',
		folder,
	}).promise;
	// Generate the config manually because package.json config path is incorrect in case of npm workspaces
	writeJSONFile(path.join(process.cwd(), folder.path, '.czrc'), {
		path: 'cz-conventional-changelog',
	});
	return plugin.chooseShellMethod(subcommand).method({
		args: ['commitizen', 'init', 'cz-conventional-changelog', '--save-dev', '--save-exact'],
		command: 'npx',
		folder,
	}).promise;
};
