import { writeIndentedText } from '../utils/util';

import Plugin from '.';
export const listFolders = async function (plugin: Plugin) {
	writeIndentedText('Folder', (plugin._options.folders || []).map((folder) => folder.name).join('\n'));
	return null;
};
