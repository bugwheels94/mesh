import { flatten, uniq } from 'ramda';

import { getConfig, writeIndentedText } from '../utils/util';

export const listProjects = async function () {
	const config = getConfig();
	writeIndentedText('Projects', uniq(flatten(config.folders.map((folder) => folder.groups))).join('\n'));
	return null;
};
