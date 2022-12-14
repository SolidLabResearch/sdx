#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { ProjectBuilder } from "./project-builder.js";
import { Project } from "./project.js";
import { Searcher } from "./search.js";
import { SOLID_PURPLE } from "./util.js";
import { LIB_VERSION } from './version.js';

// Remove warnings
process.removeAllListeners('warning');

const program = new Command();
const projectBuilder = new ProjectBuilder();
const project = new Project();
const searcher = new Searcher();

// Main program
program
    .version(LIB_VERSION)
    .description(chalk.hex(SOLID_PURPLE)('Solid Development eXperience toolkit'));


// init
program.command('init')
    .description('initialize a new SDX project')
    .option('-f, --force', 'Overwrite any package.json that might be present.', false)
    .action((options) => projectBuilder.initProject(options));

// search
program.command('search')
    .description('search for a type')
    .argument('<type>', 'type to search for')
    .action((type) => searcher.search(type));

// type
const typeCommand = program.command('type').alias('types')
    .description('standard operations on types');
// type list
typeCommand.command('list')
    .description('list all installed types')
    .action((type, options) => project.listTypes(mergeOpts(options)))
// type install
typeCommand.command('install')
    .description('install a type (exact name match required)')
    .action((type, options) => { })
// type uninstall
typeCommand.command('uninstall')
    .description('uninstall a type (exact name match required)')
    .action((type, options) => { })
// // type upgrade
// typeCommand.command('upgrade')
//     .description('upgrade a type (within semantic version range)')
//     .action((type, options) => { })


program.parse(process.argv);


function mergeOpts(options: any) {
    return { ...program.opts(), ...options };
}
