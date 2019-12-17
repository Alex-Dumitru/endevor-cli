import yargs from "yargs";
import { EdoCache } from "../api/EdoCache";
import { isNullOrUndefined } from "util";
import { IEdoIndex } from "../api/doc/IEdoIndex";
import { FileUtils } from "../api/utils/FileUtils";
import { HashUtils } from "../api/utils/HashUtils";
import { CsvUtils } from "../api/utils/CsvUtils";

/**
 * Endevor fetch remote stage to local
 */
export class EdoShow {
	private static readonly edoShowFullLog : yargs.Options = {
		describe: `Show full log details of specified file in remote stage, or show content of specified change.
Full log means that edo will try to concatenate all the logs which are in the map to provide comprehensive log for specified file.
If log is not fetched or doesn't exist in some stages in map, it will be skipped. It's good to run 'edo fetch -l -a' first before using this.
Syntax is similar to logs.`,
		boolean: true,
		demand: false,
		alias: 'fl'
	};

	private static readonly edoShowLogs : yargs.Options = {
		describe: `Show log details of specified file in remote stage, or show content of specified change.
To show log details, specify object with stage only (remote/STAGE:typeName/eleName).
To show content of log, specify object with stage and back reference (remote/STAGE~0102:typeName/eleName)`,
		boolean: true,
		demand: false,
		alias: 'l'
	};

	private static readonly edoShowBlame : yargs.Options = {
		describe: `Show blame for specified file in remote stage. Similar syntax to logs.`,
		boolean: true,
		demand: false,
		alias: 'b'
	};

	private static readonly edoShowObject : yargs.PositionalOptions = {
		describe: 'sha1 or reference to object in edo database e.g.: STAGE~1:typeName/eleName, DEV-1-ESCM180-DXKL~5:typeName/eleName',
		type: "string"
	};

	public static edoShowOptions(argv: typeof yargs) {
		return argv
			.options('logs', EdoShow.edoShowLogs)
			.options('blame', EdoShow.edoShowBlame)
			.options('fullLogs', EdoShow.edoShowFullLog)
			.positional('object', EdoShow.edoShowObject);
	}


	/**
	 *
	 * @param argv
	 */
	public static async process(argv: any) {
		const object: string = argv.object;
		if (isNullOrUndefined(object)) {
			console.error("No object specified!");
			return 1;
		}

		const logs: boolean = !isNullOrUndefined(argv.logs) ? argv.logs : false;
		const blame: boolean = !isNullOrUndefined(argv.blame) ? argv.blame : false;
		const fullLogs: boolean = !isNullOrUndefined(argv.fullLogs) ? argv.fullLogs : false;
		let hasfile: boolean = true;

		// STAGE~1:typeName/eleName
		let refs = object.match(/^([^\:~]+)(~([^\:]+))*(:(.+))*$/);
		if (isNullOrUndefined(refs)) {
			console.error(`Invalid object name ${object}`);
			process.exit(1);
			return;
		}
		if (isNullOrUndefined(refs[2])) {
			refs[3] = "0";
		}
		if (isNullOrUndefined(refs[4])) {
			hasfile = false;
		}

		// check if stage matches remote/env-1-sys-sub
		if (!refs[1].match(/^(remote\/)*STAGE/) && !refs[1].match(/^(remote\/)*[^\/]+-.+-.+-.+$/)) {
			console.error(`Invalid stage name ${refs[1]}`);
			process.exit(1);
		}
		let stage: string = refs[1];
		let backref: number = parseInt(refs[3]);
		// let file: string = refs[4];
		let file: string = refs[5];
		if (refs[1] == 'remote/STAGE') {
			stage = 'remote/' + (await FileUtils.readStage(true));
		}
		if (refs[1] == 'STAGE' || refs[1] == 'HEAD') {
			stage = await FileUtils.readStage(true);
		}

		try {
			// handle logs, fulllogs and blame
			if (logs || blame || fullLogs) {
				// need file
				if (!hasfile) {
					throw new Error('Specify file for displaying logs');
				}

				// check for binary type (no logs for bin)
				const index = await EdoCache.readIndex(stage);
				if (HashUtils.isSha1(index.type)) {
					const types = await EdoCache.readTypes(index.type);
					const type = file.split(FileUtils.separator)[0];
					if (!types[type] || types[type][0] != 'T') {
						throw new Error(`File ${file} is of binary type. 'edo show [ --blame | --logs ]' does not work for binary type!`);
					}
				}

				// for fulllogs (or fulllogs with blame)
				if (fullLogs) {
					let map = (await CsvUtils.getMapArray(index.stgn)).reverse();
					let logsOut: string[][] = [];
					for (const stage of map) {
						try {
							const stageLogs = await EdoCache.getLogs(`remote/${stage}`, file);
							if (logsOut.length > 0 && Object.keys(stageLogs).length > 0) {
								logsOut.pop();
							}
							for (const line of Object.values(stageLogs)) {
								logsOut.push([stage, line.join(' ')]);
							}
						} catch (err) {
							// doesn't exist, don't care
						}
					}

					// if version specified get full file content of that version (only for logs)
					if (refs[3].length >= 3) {
						const vvll = refs[3].length == 3 ? "0" + refs[3] : refs[3].substr(0, 4);
						let realStage = stage;
						for (const log of logsOut) {
							if (log[1].substr(0, 4) == vvll) {
								realStage = `remote/${log[0]}`;
								break;
							}
						}
						const logs = await EdoCache.getLogsContent(realStage, file, vvll);
						process.stdout.write(logs);
						process.exit(0);

					// if no version, do logs or blame
					} else {

						// if no blame (so only fulllogs without version)
						if (!blame) {
							for (const log of logsOut) {
								console.log(log[1]);
							}
							return;
						}
					}

				// for logs only or blame without fulllogs
				} else {
					// if version specified get full file content of that version (only for logs)
					if (refs[3].length >= 3) {
						const vvll = refs[3].length == 3 ? "0" + refs[3] : refs[3].substr(0, 4);
						const logs = await EdoCache.getLogsContent(stage, file, vvll);
						process.stdout.write(logs);
						process.exit(0);

					// if no version, do logs or blame
					} else {
						const logsOut = await EdoCache.getLogs(stage, file);

						// for logs print output
						if (logs) {
							for (const line of Object.values(logsOut)) {
								console.log(line.join(' '));
							}

						// for blame
						} else {
							const vvll = Object.keys(logsOut).pop();
							if (vvll) {
								const out = (await EdoCache.getLogsContent(stage, file, vvll, true)).toString().split('\n');
								for (const line of out) {
									const lineV = line.substr(0, 4);
									const pref = logsOut[lineV];
									let prefix = '';
									if (pref) {
										// [ vvll, user, date, ccid, comment ];
										prefix = pref.join(' ');
									}
									console.log(`(${prefix}) ${line.substr(5)}`);
								}
							}
						}
					}
				}

			// handle generic objects (index, files)
			} else {
				const index: IEdoIndex = await EdoCache.getIndex(stage, backref);
				// for files
				if (hasfile) {
					if (isNullOrUndefined(index.elem[file])) {
						console.error(`File '${file}' doesn't exist in ${refs[1]}${refs[2]}!`);
						process.exit(1);
					}
						let fileSha1 = index.elem[file][0];
					if (index.prev == 'base') {
						fileSha1 = index.elem[file][1];
					}
					const out: Buffer = await EdoCache.getSha1Object(fileSha1, EdoCache.OBJ_BLOB);
					process.stdout.write(out);

				// no file, so display index
				} else {
					console.log(`stage ${index.stgn}`);
					for (const item of Object.values(index.elem)) {
						console.log(item.join(' '));
					}
				}
			}

		} catch (err) {
			console.error("Error while running show!");
			console.error(err.message);
			process.exit(1);
		}
	}
}
