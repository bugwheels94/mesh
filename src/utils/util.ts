import { ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

import chalk from 'chalk';
import minimist from 'minimist';
import fetch from 'node-fetch';
import shell from 'shelljs';

export type Config = {
	parameters?: minimist.ParsedArgs;
	folders?: {
		plugins: Record<
			string,
			{
				blacklist?: string[];
				whitelist?: string[];
			}
		>;
		name: string;
		path: string;
		groups: string[];
		url: string;
	}[];
	plugins?: {
		name: string;
		alias: string;
	}[];
	workspaces?: string[];
};
export type ConfluxRC = {
	dependencies?: Record<
		string,
		{
			type: 'github-release' | 'npm' | 'github';
			target: string;
		}
	>;
};
export type Await<T> = T extends PromiseLike<infer U> ? U : T;
export const download = function (url: string, dest: string) {
	return new Promise(function (resolve, reject) {
		fetch(url).then(function (res) {
			const fileStream = fs.createWriteStream(dest);
			res.body.on('error', reject);
			fileStream.on('finish', resolve);
			res.body.pipe(fileStream);
		});
	});
};

export const readRCFile = (fileName: string) => {
	try {
		return fs.readFileSync(path.join(process.cwd(), fileName), 'utf8');
	} catch (e) {
		return '';
	}
};
export const readJSONFile = (fileName: string) => {
	try {
		console.log('final', path.join(process.cwd(), fileName));
		return JSON.parse(fs.readFileSync(path.join(process.cwd(), fileName), 'utf8'));
	} catch (e) {
		return null;
	}
};
export const writeJSONFile = (address: string, object: Record<string, unknown>) => {
	fs.writeFileSync(address, JSON.stringify(object, null, '\t'));
};
export const writeRCFile = (address: string, data: string) => {
	fs.writeFileSync(address, data);
};
export const config: Config = readJSONFile('package.json') || {};
export const getRepos = (folders: Config['folders']) => {
	return folders.filter((folder) => folder.plugins.git).map((folder) => folder.path);
};

export const cdToFolder = (folder: string): string => {
	const pwd = shell.pwd();
	const cd = shell.cd(folder);
	if (cd.code) console.log(chalk.red.bold(`${folder}: Missing`));
	return pwd;
};

const countRegexMatches = (str, regex) => {
	return ((String(str) || '').match(regex) || []).length;
};
export function writeLogicalText(folder: string, s: string, options?: TextOptions) {
	if (countRegexMatches(s, /\r|\n/g) > 1) writeIndentedText(folder, s, options);
	// Multiline
	else writePermanentText(folder, s, options);
}
export function isErrorMessage<T>(obj: T): obj is T & { message: string } {
	return obj && 'message' in obj;
}
export function isProcess<T>(obj: T): obj is T & { process: ChildProcess } {
	return obj && 'process' in obj;
}
export const sanitizeText = (str: string) => {
	return str.toString().replace(/^\s+|\s+$/g, '');
};
export const writeIndentedText = (heading: string, text: string, options?: TextOptions) => {
	clearCurrentLine();
	console.info(chalk.bold.blue(`${heading}:`));
	console.group();
	if (options?.isError) {
		console.error(chalk.red(text));
	} else console.log(sanitizeText(text));
	console.groupEnd();
};

type TextOptions = {
	isError?: boolean;
};
export function writePermanentText(heading: string, text: string, options?: TextOptions) {
	clearCurrentLine();
	process.stdout.write(
		`${chalk.bold.blue(`${heading}:`)} ${options?.isError ? chalk.red(sanitizeText(text)) : sanitizeText(text)}`
	);
}

export function writeTemporaryText(heading: string, text: string) {
	clearCurrentLine();
	const m = text.toString();
	process.stdout.write(`${chalk.bold.blue(`${heading}:`)} ${m.split('\n').pop()}`);
}
export enum ShellTypes {
	VIRTUAL_SYNC = 'virtual',
	SYNC = 'sync',
	ASYNC = 'async',
}
export function clearCurrentProcess() {
	// Does not work in Ubuntu?
	if (process.stdout?.cursorTo) process.stdout.cursorTo(0, 1);
	if (process.stdout?.cursorTo) process.stdout.clearLine(0);
}
export function clearCurrentLine() {
	if (process.stdout?.cursorTo) process.stdout.cursorTo(0);
	// process.stdout.clearScreenDown(0);
}
export interface Constructable<T> {
	new (...args: any): T;
}
export const globalConfig = {
	disableStdout: false,
};
