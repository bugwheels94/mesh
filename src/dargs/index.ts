// @ts-nocheck

const match = (array: any[], value: string) =>
	array.some((element: { test: (arg0: any) => any }) =>
		element instanceof RegExp ? element.test(value) : element === value
	);

export default function dargs(
	object: { [s: string]: unknown } | ArrayLike<unknown>,
	options: {
		shortFlag?: any;
		allowCamelCase?: any;
		useEquals?: any;
		excludes?: any;
		includes?: any;
		aliases?: any;
		ignoreTrue?: any;
		ignoreFalse?: any;
	}
) {
	const arguments_ = [];
	let extraArguments = [];
	let separatedArguments = [];

	options = {
		useEquals: true,
		shortFlag: true,
		...options,
	};

	const makeArguments = (key: string, value: any) => {
		const prefix = options.shortFlag && key.length === 1 ? '-' : '--';
		const theKey = options.allowCamelCase ? key : key.replace(/[A-Z]/g, '-$&').toLowerCase();
		key = prefix + theKey;
		const finalValue = /\s/g.test(value) ? `"${value}"` : value;
		if (options.useEquals) {
			arguments_.push(key + (value ? `=${finalValue}` : ''));
		} else {
			arguments_.push(key);

			if (value) {
				arguments_.push(finalValue);
			}
		}
	};

	const makeAliasArg = (key: any, value: any) => {
		arguments_.push(`-${key}`);

		if (value) {
			arguments_.push(value);
		}
	};

	for (let [key, value] of Object.entries(object)) {
		let pushArguments = makeArguments;

		if (Array.isArray(options.excludes) && match(options.excludes, key)) {
			continue;
		}

		if (Array.isArray(options.includes) && !match(options.includes, key)) {
			continue;
		}

		if (typeof options.aliases === 'object' && options.aliases[key]) {
			key = options.aliases[key];
			pushArguments = makeAliasArg;
		}

		if (key === '--') {
			if (!Array.isArray(value)) {
				throw new TypeError(`Expected key \`--\` to be Array, got ${typeof value}`);
			}

			separatedArguments = value;
			continue;
		}

		if (key === '_') {
			if (!Array.isArray(value)) {
				throw new TypeError(`Expected key \`_\` to be Array, got ${typeof value}`);
			}

			extraArguments = value;
			continue;
		}

		if (value === true && !options.ignoreTrue) {
			pushArguments(key, '');
		}

		if (value === false && !options.ignoreFalse) {
			pushArguments(`no-${key}`);
		}

		if (typeof value === 'string') {
			pushArguments(key, value);
		}

		if (typeof value === 'number' && !Number.isNaN(value)) {
			pushArguments(key, String(value));
		}

		if (Array.isArray(value)) {
			for (const arrayValue of value) {
				pushArguments(key, arrayValue);
			}
		}
	}

	for (let i = extraArguments.length; i--; ) {
		arguments_.unshift(String(extraArguments[i]));
	}

	if (separatedArguments.length > 0) {
		arguments_.push('--');
	}

	for (const argument of separatedArguments) {
		arguments_.push(String(argument));
	}

	return arguments_;
}
