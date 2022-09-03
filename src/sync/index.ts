// import util from 'util';

import fs from 'fs';
import path from 'path';

import { BasePluginClass, PluginArguments } from '../utils/Plugin';
import { asyncSpawn } from '../utils/asyncSpawn';
import { config, ConfluxRC, readJSONFile, ShellTypes, writeJSONFile } from '../utils/util';
// const execPromise = util.promisify(exec);
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
		const branch = process.env.GITHUB_REF
			? process.env.GITHUB_REF.split('/').slice(2).join('/')
			: process.env.BRANCH_NAME
			? process.env.BRANCH_NAME
			: 'master';
		const packageJson = readJSONFile('package.json');
		const workspaceDependencies: ConfluxRC = packageJson.syncWorkspaceDependencies || {};
		const isBranchInProgress = ['next', 'next-major', 'alpha', 'beta', 'master'].includes(branch);
		if (!isBranchInProgress) return null;
		const confluxDeps = Object.keys(workspaceDependencies) || [];
		const syncingDepsNames: string[] = [];
		const packageJsonDependencies: Record<string, string> = packageJson.dependencies || {};
		const packageJsonDevDependencies: Record<string, string> = packageJson.devDependencies || {};

		// All of the deps will be removed from package.json bcoz it is assumed that conflux dependencies will be exhausted while
		// while building the project
		// if they are not being used in npm build then maybe dont sync in which case it wont be removed
		const syncingDeps = confluxDeps
			.map((dependency) => {
				if (!packageJsonDependencies[dependency]) return null;
				syncingDepsNames.push(dependency);
				return `${dependency}${branch === 'master' ? '' : '@' + branch}`;
			})
			.filter((t) => t);
		const syncingDevDeps = confluxDeps
			.map((dependency) => {
				if (!packageJsonDevDependencies[dependency]) return null;
				syncingDepsNames.push(dependency);
				return `${dependency}${branch === 'master' ? '' : '@' + branch}`;
			})
			.filter((t) => t);
		const dependencies: Record<string, string> = {};
		for (const dep in packageJsonDependencies) {
			if (!syncingDepsNames.includes(dep)) {
				dependencies[dep] = packageJson.dependencies[dep];
			}
		}
		const devDependencies: Record<string, string> = {};
		for (const developerDependency in packageJsonDevDependencies) {
			if (!syncingDepsNames.includes(developerDependency)) {
				devDependencies[developerDependency] = packageJson.devDependencies[developerDependency];
			}
		}
		writeJSONFile('package.json', {
			...packageJson,
			dependencies,
			devDependencies,
		});
		if (syncingDeps.length)
			await this.chooseShellMethod(this._options.subcommand).method({
				args: ['install', '--legacy-peer-deps', ...syncingDeps],
				command: 'npm',
				folder: null,
				shouldRunInCurrentFolder: true,
			}).promise;
		if (syncingDevDeps.length)
			await this.chooseShellMethod(this._options.subcommand).method({
				args: ['install', '--legacy-peer-deps', '--save-dev', ...syncingDevDeps],
				command: 'npm',
				folder: null,
				shouldRunInCurrentFolder: true,
			}).promise;
		// move to the end otherwise node_modules end up removing
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
