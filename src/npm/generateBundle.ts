import fs from 'fs';

import archiver from 'archiver';

import { readJSONFile } from '../utils/util';

export const zipNpmFiles = async function () {
	const packageJson = readJSONFile('package.json');

	const files = (packageJson.files as string[]) || [];
	if (!files.includes('package.json')) files.push('package.json');
	// create a file to stream archive data to.
	const output = fs.createWriteStream('dist.zip');
	const archive = archiver('zip', {
		zlib: { level: 9 }, // Sets the compression level.
	});

	// listen for all archive data to be written
	// 'close' event is fired only when a file descriptor is involved
	const promise = new Promise<string>((resolve, reject) => {
		output.on('close', function () {
			console.log(archive.pointer() + ' total bytes');
			console.log('archiver has been finalized and the output file descriptor has closed.');
			resolve(archive.pointer() + '');
		});
		archive.on('error', function (err) {
			reject(err);
		});
	});

	// This event is fired when the data source is drained no matter what was the data source.
	// It is not part of this library but rather from the NodeJS Stream API.
	// @see: https://nodejs.org/api/stream.html#stream_event_end
	output.on('end', function () {
		console.log('Data has been drained');
	});

	// good practice to catch warnings (ie stat failures and other non-blocking errors)
	archive.on('warning', function (err) {
		if (err.code === 'ENOENT') {
			// log warning
		} else {
			// throw error
			throw err;
		}
	});

	// good practice to catch this error explicitly

	// pipe archive data to the file
	archive.pipe(output);
	files.forEach((file) => {
		if (!fs.existsSync(file)) return;
		if (fs.lstatSync(file).isDirectory()) archive.directory(file, file);
		else archive.file(file, { name: file });
	});

	// finalize the archive (ie we are done appending files but streams have to finish yet)
	// 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
	archive.finalize();
	return promise;
};
