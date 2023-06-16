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
  .description('Search for a type package via the SolidLab Catalog API.')
  .argument('<query>', 'query to search for')
  .action((query) => search.search(query));

// install
const installCommand = program
  .command('install')
  .description('Install an object like a type package.');

// install package
installCommand
  .command('package')
  .description(
    'Install a type package using an IRI or an index (from search results).'
  )
  .argument(
    '<IRI|index>',
    'Full IRI of type package or index (from search results)'
  )
  .action((iriOrIndex) => project.installTypePackage(iriOrIndex));

// uninstall
const uninstallCommand = program
  .command('uninstall')
  .description('Uninstall an object like a type package.');

// uninstall package
uninstallCommand
  .command('package')
  .description(
    'Uninstall a type package using an IRI or an index (from list results).'
  )
  .argument(
    '<IRI|index>',
    'Full IRI of type package or index  (from list results)'
  )
  .action((iriOrIndex) => project.unInstallTypePackage(iriOrIndex));

// type
const typePackageCommand = program
  .command('package')
  .alias('packages')
  .description('Execute standard operations on type packages.');

// type list
typePackageCommand
  .command('list')
  .description('List all installed type packages.')
  .action(() => project.listTypePackages());

// type install
typePackageCommand
  .command('install')
  .argument(
    '<IRI|index>',
    'Full IRI of type package or index (from search results)'
  )
  .description(
    'Install a type package using an IRI or an index (from search results).'
  )
  .action((iriOrIndex) => project.installTypePackage(iriOrIndex));

// type uninstall
typePackageCommand
  .command('uninstall')
  .description(
    'Uninstall a type package using an IRI or an index (from list results).'
  )
  .argument(
    '<IRI|index>',
    'Full IRI of type package or index  (from list results)'
  )
  .action((iriOrIndex) => project.unInstallTypePackage(iriOrIndex));

// list
const listCommand = program.command('list').description('list objects');

// list packages
listCommand
  .command('packages')
  .alias('package')
  .description('List all installed type packages.')
  .action(() => project.listTypePackages());

// generate
const generateCommand = program
  .command('generate')
  .alias('g')
  .description('Generate code from the installed type packages.');

// generate schema
generateCommand
  .command('schema')
  .description(
    'Generate or update a GraphQL schema from the installed type packages.'
  )
  .action(async () => await generator.generateGraphqlSchema());

// generate types
generateCommand
  .command('types')
  .alias('typings')
  .description('Generate or update typings for the installed type packages.')
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
