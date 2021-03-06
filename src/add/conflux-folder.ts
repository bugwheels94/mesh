import path from 'path';

import inquirer from 'inquirer';
import { uniq } from 'ramda';

import { config, writeJSONFile } from '../utils/util';

export const addFolder = async function () {
	const answers = await inquirer.prompt([
		{
			type: 'input',
			name: 'path',
			message: `Enter the Folder Path`,
		},
		{
			type: 'input',
			name: 'name',
			message: `Enter the Folder Name.`,
		},
		{
			type: 'checkbox',
			name: 'plugins',
			message: `Select the plugins to Enable`,
			choices: config.plugins.map((plugin) => plugin.alias),
		},
		{
			type: 'checkbox',
			name: 'groups',
			message: `Select the groups the folder will belong to`,
			choices: uniq(
				config.folders.reduce((acc, folder) => {
					return [...acc, ...folder.groups];
				}, [])
			),
		},
		{
			type: 'input',
			name: 'newGroups',
			message: `Create new group that this folder belongs to(Use comma to create multiple groups)`,
		},
	]);
	config.folders.push({
		url: '',
		name: answers.name,
		path: answers.path,
		groups: uniq([...answers.groups, ...(answers.newGroups ? answers.newGroups.split(',') : [])]),
		plugins: answers.plugins.reduce((acc, plugin) => {
			acc[plugin] = {};
			return acc;
		}, {}),
	});
	config.workspaces.push(answers.path);
	writeJSONFile(path.join(process.cwd(), 'package.json'), config);
	return null;
};
