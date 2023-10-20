#!/usr/bin/env node

// Polyfills
import './polyfills.js';

import chalk from 'chalk';
import { Command } from 'commander';
import { ProjectService } from './services/project.service.js';
import { SearchService } from './services/search.service.js';
import { GeneratorService } from './services/generator.service.js';
import { SOLID_PURPLE } from './util.js';
import { LIB_VERSION } from './version.js';

// Remove warnings
// process.removeAllListeners("warning");

const program = new Command();
const project = new ProjectService();
const search = new SearchService();
const generator = new GeneratorService();

// Main program
program
  .version(LIB_VERSION)
  .description(chalk.hex(SOLID_PURPLE)('Solid Development eXperience toolkit'));

// init
program
  .command('init')
  .description('Initialize a new SDX project, setting up all necessary files.')
  .argument(
    '[projectName]',
    'Name of the project (creates folder with that name in current directory)'
  )
  .option(
    '-f, --force [boolean]',
    'Overwrite any package.json that might be present.',
    false
  )
  .option(
    '--noLibs',
    'Do not install the sdx libraries (@solidlab/sdx and @solidlab/sdx-sdk)',
    false
  )
  .action((name, options) => project.initProject(name, options));

// search
program
  .command('search')
  .description('Search for a shape package via the SolidLab Catalog API.')
  .argument('<query>', 'query to search for')
  .action((query) => search.search(query));

// install
const installCommand = program
  .command('install')
  .description('Install an object like a shape package.');

// install package
installCommand
  .command('package')
  .description(
    'Install a shape package using an IRI or an index (from search results).'
  )
  .argument(
    '<IRI|index>',
    'Full IRI of shape package or index (from search results)'
  )
  .action((iriOrIndex) => project.installShapePackage(iriOrIndex));

// uninstall
const uninstallCommand = program
  .command('uninstall')
  .description('Uninstall an object like a shape package.');

// uninstall package
uninstallCommand
  .command('package')
  .description(
    'Uninstall a shape package using an IRI or an index (from list results).'
  )
  .argument(
    '<IRI|index>',
    'Full IRI of shape package or index  (from list results)'
  )
  .action((iriOrIndex) => project.unInstallShapePackage(iriOrIndex));

// shape
const shapePackageCommand = program
  .command('package')
  .alias('packages')
  .description('Execute standard operations on shape packages.');

// shape list
shapePackageCommand
  .command('list')
  .description('List all installed shape packages.')
  .action(() => project.listShapePackages());

// shape install
shapePackageCommand
  .command('install')
  .argument(
    '<IRI|index>',
    'Full IRI of shape package or index (from search results)'
  )
  .description(
    'Install a shape package using an IRI or an index (from search results).'
  )
  .action((iriOrIndex) => project.installShapePackage(iriOrIndex));

// shape uninstall
shapePackageCommand
  .command('uninstall')
  .description(
    'Uninstall a shape package using an IRI or an index (from list results).'
  )
  .argument(
    '<IRI|index>',
    'Full IRI of shape package or index  (from list results)'
  )
  .action((iriOrIndex) => project.unInstallShapePackage(iriOrIndex));

// list
const listCommand = program.command('list').description('list objects');

// list packages
listCommand
  .command('packages')
  .alias('package')
  .description('List all installed shape packages.')
  .action(() => project.listShapePackages());

// generate
const generateCommand = program
  .command('generate')
  .alias('g')
  .description('Generate code from the installed shape packages.');

// generate schema
generateCommand
  .command('schema')
  .description(
    'Generate or update a GraphQL schema from the installed shape packages.'
  )
  .action(async () => await generator.generateGraphqlSchema());

// generate shapes
generateCommand
  .command('shapes')
  .alias('typings')
  .description('Generate or update typings for the installed shape packages.')
  .action(async () => await generator.generateTypings());

// generate sdk
generateCommand
  .command('sdk')
  .aliases(['client', 'solidclient'])
  .description(
    'Generate or update an SDK from the installed type packages and GraphQL queries.'
  )
  .action(async () => await generator.generateTypingsOrSdk());

program.parse(process.argv);
