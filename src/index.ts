#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { Initializer } from "./Initializer.js";
import { Npm } from "./npm.js";

// Remove warnings
process.removeAllListeners('warning');

const program = new Command();
const npm = new Npm();
const init = new Initializer();

program
    .version('0.0.0')
    .description(chalk.hex('#7C4DFF')('Solid Development eXperience toolkit'))

program.command('init')
    .description('initialize a new SDX project')
    .action((type, options) => init.initProject());

program.command('search')
    .description('search for a type')
    .argument('<type>', 'type to search for')
    .action((type, options) => npm.search(type));

program.parse();
