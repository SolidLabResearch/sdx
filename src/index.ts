#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { Initializer } from "./Initializer.js";
import { Local } from "./local.js";
import { Npm } from "./npm.js";

// Remove warnings
process.removeAllListeners('warning');

const program = new Command();
const init = new Initializer();
const local = new Local();
const npm = new Npm();

// Main program
program
    .version('0.0.0')
    .description(chalk.hex('#7C4DFF')('Solid Development eXperience toolkit'))
    .option('-t, --test', 'use @solidlab-types scope instead of @solid-types', false)

// init
program.command('init')
    .description('initialize a new SDX project')
    .action((type, options) => init.initProject(options));

// search
program.command('search')
    .description('search for a type')
    .argument('<type>', 'type to search for')
    .action((type, options) => npm.search(type, mergeOpts(options)));

// type
const typeCommand = program.command('type').alias('types')
    .description('standard operations on types');
// type list
typeCommand.command('list')
    .description('list all installed types')
    .action((type, options) => local.listTypes(mergeOpts(options)))
// type install
typeCommand.command('install')
    .description('install a type (exact name match required)')
    .action((type, options) => npm.installType(type))
// type uninstall
typeCommand.command('uninstall')
    .description('uninstall a type (exact name match required)')
    .action((type, options) => npm.unInstallType(type))
// type upgrade
typeCommand.command('upgrade')
    .description('upgrade a type (within semantic version range)')
    .option('-f, --force', 'ignore semantic range and upgrade to latest available')
    .action((type, options) => npm.upgradeType(type, options))


program.parse(process.argv);


function mergeOpts(options: any) {
    return { ...program.opts(), ...options };
}
