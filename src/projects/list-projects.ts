import { flatten, uniq } from 'ramda';

import { config, writeIndentedText } from '../utils/util';

export const listProjects = async function () {
	writeIndentedText('Projects', uniq(flatten(config.folders.map((folder) => folder.groups))).join('\n'));
	return null;
};
