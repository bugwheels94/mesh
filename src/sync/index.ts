// import util from 'util';

import fs from 'fs';
import path from 'path';

import extract from 'extract-zip';
import fse from 'fs-extra';
import fetch from 'node-fetch';

import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { config, ConfluxRC, download, readJSONFile, ShellTypes, writeJSONFile } from '../utils/util';
// const execPromise = util.promisify(exec);
type GithubRelease = {
	target_commitish: string;
	assets: {
		name: string;
		browser_download_url: string;
	}[];
};
class Plugin extends BasePluginClass {
	constructor(options: PluginArguments) {
		super(options);
		this.checkCommandExist('npm');
	}
	static doesRequireFolder() {
		return false;
	}

	async runOnAll() {
		if (this._options.subcommand === 'dependencies') {
			return this.syncDependencies();
		}
		return null;
	}
	async syncDependencies() {
		const branch = process.env.GITHUB_REF ? process.env.GITHUB_REF.split('/').slice(2).join('/') : 'master';
		const packageJson = readJSONFile('package.json');
		const workspaceDependencies: ConfluxRC = packageJson.syncWorkspaceDependencies || {};
		const isBranchInProgress = ['next', 'next-major', 'alpha', 'beta', 'master'].includes(branch);
		if (!isBranchInProgress) return null;
		const confluxDeps = Object.keys(workspaceDependencies) || [];
		const trim: string[] = [];
		// All of the deps will be removed from package.json bcoz it is assumed that conflux dependencies will be exhausted while
		// while building the project
		// if they are not being used in npm build then maybe dont sync in which case it wont be removed
		const correctDeps = confluxDeps
			.map((dependency) => {
				const version = workspaceDependencies?.[dependency];
				if (!version) return null;
				const target = version.target || '';
				if (!target.startsWith('git')) {
					trim.push(dependency);
					return `${dependency}${branch === 'master' ? '' : '@' + branch}`;
				}
				if (version.type !== 'github-release') {
					trim.push(dependency);
					return `${version}#${branch}`;
				}
				return null;
			})
			.filter((t) => t);
		const githubReleaseDeps = confluxDeps
			.map((dependency) => {
				const version = workspaceDependencies?.[dependency];
				const target = version.target || '';

				if (!version || !target.startsWith('git') || version.type !== 'github-release') return null;
				trim.push(dependency);
				return version.target;
			})
			.filter((t) => t);
		const packageJsonDependencies: Record<string, string> = packageJson.dependencies || {};
		const dependencies: Record<string, string> = {};
		for (const dep in packageJsonDependencies) {
			if (!trim.includes(dep)) {
				dependencies[dep] = packageJson.dependencies[dep];
			}
		}
		const packageJsonDevDependencies: Record<string, string> = packageJson.devDependencies || {};
		const devDependencies: Record<string, string> = {};
		for (const dep in packageJsonDevDependencies) {
			if (!trim.includes(dep)) {
				devDependencies[dep] = packageJson.devDependencies[dep];
			}
		}
		writeJSONFile('package.json', {
			...packageJson,
			dependencies,
			devDependencies,
		});
		if (!correctDeps.length) return null;
		await this.chooseShellMethod(this._options.subcommand).method({
			args: ['install', '--legacy-peer-deps', ...correctDeps],
			command: 'npm',
			folder: null,
			shouldRunInCurrentFolder: true,
		}).promise;
		// move to the end otherwise node_modules end up removing
		await Promise.all(
			githubReleaseDeps.map(async (deps) => {
				const [_, userName, repoName] = deps.match(/([^/:]+)\/([^/]+)\.git$/);
				const response = await fetch(`https://api.github.com/repos/${userName}/${repoName}/releases`);
				const releases = (await response.json()) as GithubRelease[];
				console.log(userName, repoName);
				const release = releases.find((release) => release.target_commitish === branch);
				if (!release) throw new Error('Release with tag' + branch + 'not found!');
				const asset = release.assets.find((asset) => asset.name === 'dist.zip');
				if (!asset) throw new Error('Release Found! File not found!');
				const zip = path.join(process.cwd(), userName + repoName + '.zip');
				console.log('Download url', asset.browser_download_url);
				await download(asset.browser_download_url, zip);
				const targetPath = path.join(process.cwd(), 'node_modules', 'mesh' + userName + repoName);
				try {
					console.log('Extracting ', zip, ' to ', targetPath);
					await extract(zip, {
						dir: targetPath,
					});
				} catch (e) {
					console.log(e);
					throw e;
				}
				const packageJson2 = readJSONFile(path.join('node_modules', 'mesh' + userName + repoName, 'package.json'));
				if (!packageJson2) return;
				console.log(targetPath, packageJson2.name, path.join(process.cwd(), 'node_modules', packageJson2.name));
				fse.moveSync(targetPath, path.join(process.cwd(), 'node_modules', packageJson2.name), { overwrite: true });
				return;
			})
		);
	}
	async syncDirs(directory: string) {
		const dir = path.join(process.cwd(), 'node_modules', directory);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		const binaries = fs.readdirSync(dir, { withFileTypes: true });
		const folders = config.folders.map((folder) => folder.path);
		binaries.forEach((file) => {
			folders.forEach((folder) => {
				const localNodeModules = path.join(process.cwd(), folder, 'node_modules', directory);
				if (!fs.existsSync(localNodeModules)) {
					fs.mkdirSync(localNodeModules, { recursive: true });
				}
				if (!fs.existsSync(path.join(localNodeModules, file.name)) && !folders.includes(file.name)) {
					// file and folder same means already a symlink
					try {
						fs.symlinkSync(path.join(dir, file.name), path.join(localNodeModules, file.name));
					} catch (e) {}
				}
			});
		});
		return null;
	}
	chooseShellMethod(command: string) {
		switch (command) {
			default:
				return {
					type: ShellTypes.ASYNC,
					method: asyncSpawn({
						stdio: 'inherit',
						shouldRunInCurrentFolder: true,
					}),
				};
		}
	}
}
export default Plugin;
