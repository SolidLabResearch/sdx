#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { Command } from "commander";


const program = new Command();

clear();
console.log(chalk.hex('#7C4DFF')(figlet.textSync('sdx - Solid Development eXperience', { horizontalLayout: 'full' })));

program
    .version('0.0.0')
    .description('Solid Development Experience toolkit')
    .command('init', 'Initialize a new SDX project')
    .parse(process.argv);
