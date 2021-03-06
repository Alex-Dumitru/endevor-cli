#!/usr/bin/env node

import yargs from 'yargs';
import { EdoInit } from './cli/EdoInit';
import { EdoCheckout } from './cli/EdoCheckout';
import { EdoDiscard } from './cli/EdoDiscard';
import { EdoFetch } from './cli/EdoFetch';
import { EdoMerge } from './cli/EdoMerge';
import { EdoPull } from './cli/EdoPull';
import { EdoDiff } from './cli/EdoDiff';
import { EdoStatus } from './cli/EdoStatus';
import { EdoCatFile } from './cli/EdoCatFile';
import { EdoCommit } from './cli/EdoCommit';
import { EdoPush } from './cli/EdoPush';
import { EdoShow } from './cli/EdoShow';
import { EdoReset } from './cli/EdoReset';
import { EdoDifftool } from './cli/EdoDifftool';

yargs.usage('Usage: $0 <command> [options]')
	.scriptName('edo')
	.command('init <url> [options]', 'Initialize local repo from remote url',
		EdoInit.edoInitOptions, EdoInit.process)
	.command('checkout <stage>', 'Checkout stage from local repo', EdoCheckout.edoCheckoutOptions, EdoCheckout.process)
	.command('fetch [files..]', 'Fetch elements from remote repo to remote stage', EdoFetch.edoFetchOptions, EdoFetch.process)
	.command('merge [stage] [files..]', 'Merge files from remote to local stage', EdoMerge.edoMergeOptions, EdoMerge.process)
	.command('pull [stage] [files..]', 'Fetch elements and merge them to local stage', EdoPull.edoPullOptions, EdoPull.process)
	.command('push [files..]', 'Push elements from local stage to remote stage', EdoPush.edoPushOptions, EdoPush.process)
	.command('status [options]', 'Show the working tree status', EdoStatus.edoStatusOptions, EdoStatus.process)
	.command('commit [files..]', 'Commit working directory to local stage', EdoCommit.edoCommitOptions, EdoCommit.process)
	.command('restore [files..]', 'Discard changes in working directory', EdoDiscard.edoDiscardOptions, EdoDiscard.process)
	.command('discard [files..]', 'Discard changes in working directory (because I always type discard instead of restore :)', EdoDiscard.edoDiscardOptions, EdoDiscard.process)
	.command('diff [stage-new] [stage-old] [files..]', 'Diff working directory against local stage, or remote, etc.', EdoDiff.edoDiffOptions, EdoDiff.process)
	.command('difftool [stage-new] [stage-old] [files..]', 'Use difftool to diff files in working directory against local stage, or remote, or between stages, etc.', EdoDifftool.edoDifftoolOptions, EdoDifftool.process)
	.command('cat-file <file>', 'cat database file specified by sha1 identifier', EdoCatFile.edoCatOptions, EdoCatFile.process)
	.command('show <object>', 'show object from edo database', EdoShow.edoShowOptions, EdoShow.process)
	.command('reset [files..]', 'edo reset commited files to remote stage version', EdoReset.edoResetOptions, EdoReset.process)
	.help()
	.showHelpOnFail(true)
	.demandCommand(1, '').argv;
