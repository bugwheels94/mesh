import path from 'path';

import { readJSONFile, writeJSONFile, writeLogicalText } from '../utils/util';

import Plugin from '.';

export const addPrettier = async function (plugin: Plugin) {
	const { folder, subcommand } = plugin._options;

	const packageJson = readJSONFile(path.join(folder.path, 'package.json'));
	const prettierJson = readJSONFile(path.join(folder.path, '.prettierrc.json'));
	const prettierRC = readJSONFile(path.join(folder.path, '.prettierrc'));
	if (prettierJson || prettierRC || 'prettier' in packageJson) {
		writeLogicalText(folder.path, 'Prettier Already Existing', {
			isError: true,
		});
		throw new Error('Already Installed');
	}
	await plugin.chooseShellMethod(subcommand).method({
		args: ['install', 'prettier', '--save-dev', '--save-exact', '-w', folder.path],
		command: 'npm',
		folder,
		shouldRunInCurrentFolder: true,
	}).promise;

	// Detect existing prettier

	await plugin.chooseShellMethod(subcommand).method({
		args: ['install', 'husky', 'lint-staged', '--save-dev', '-w', folder.path],
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
		args: ['husky', 'add', '.husky/pre-commit', `"npx lint-staged"`],
		command: 'npx',
		folder,
	}).promise;

	writeJSONFile(path.join(folder.path, 'package.json'), {
		...packageJson,
		prettier: {
			singleQuote: true,
			printWidth: 120,
			useTabs: true,
		},
		'lint-staged': {
			'**/*': 'prettier --write --ignore-unknown',
		},
	});

	// Generate the config manually because package.json config path is incorrect in case of npm workspaces
	return 'Done';
	// do whatever...
};
