import path from 'path';

import { writeJSONFile } from '../utils/util';

import Plugin from '.';

export const addCommitizen = async function (plugin: Plugin) {
	const { folder, subcommand } = plugin._options;

	console.log('NPM is Installing Husky');
	// Npm will automatically detect that it is part of workspace and run the command at top level
	await plugin.chooseShellMethod(subcommand).method({
		args: ['install', 'husky', '--lagacy-peer-deps', '--save-dev'],
		command: 'npm',
		folder,
		// shouldRunInCurrentFolder: true,
	}).promise;
	console.log("Husky is installing it's things");
	await plugin.chooseShellMethod(subcommand).method({
		args: ['husky', 'install'],
		command: 'npx',
		folder,
	}).promise;
	await plugin.chooseShellMethod(subcommand).method({
		args: ['set-script', 'prepare', 'husky install'],
		command: 'npm',
		folder,
	}).promise;
	await plugin.chooseShellMethod(subcommand).method({
		args: ['husky', 'add', '.husky/prepare-commit-msg', `exec < /dev/tty && npx cz --hook || true`],
		command: 'npx',
		folder,
	}).promise;
	// Generate the config manually because package.json config path is incorrect in case of npm workspaces
	writeJSONFile(path.join(process.cwd(), folder.path, '.czrc'), {
		path: 'cz-conventional-changelog',
	});
	return plugin.chooseShellMethod(subcommand).method({
		args: ['commitizen', 'init', 'cz-conventional-changelog', '--save-dev', '--save-exact', '--force'],
		command: 'npx',
		folder,
	}).promise;
};
