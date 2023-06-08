#!/usr/bin/env node

// Polyfills
import './polyfills.js';

import chalk from 'chalk';
import { Command } from 'commander';
import { rm, writeFile } from 'fs/promises';
import { dirname } from 'path';
import {
  ERROR,
  PATH_SDX_GENERATE_GRAPHQL_SCHEMA,
  PATH_SDX_GENERATE_SHACL_FOLDER,
  TEST_COMPLEX_SHACL_FILE_PATH,
  TEST_GRAPHQL_FILE_PATH
} from './constants.js';
import { ProjectService } from './services/project.service.js';
import { SchemaPrinterService } from './services/schema-printer.service.js';
import { SearchService } from './services/search.service.js';
import { ShaclParserService } from './services/shacl-parser.service.js';
import { TypeGeneratorService } from './services/type-generator.service.js';
import { SOLID_PURPLE, ensureDir } from './util.js';
import { LIB_VERSION } from './version.js';

// Remove warnings
// process.removeAllListeners("warning");

const program = new Command();
const project = new ProjectService();
const search = new SearchService();
const parser = new ShaclParserService();
const printer = new SchemaPrinterService();
const typeGenerator = new TypeGeneratorService();

const TODO = () => console.log('TODO: Implement this command');

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
    '-f, --force',
    'Overwrite any package.json that might be present.',
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
  .action(TODO);

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
  .action(TODO);

// type
const typeCommand = program
  .command('package')
  .alias('packages')
  .description('Execute standard operations on type packages.');

// type list
typeCommand
  .command('list')
  .description('List all installed type packages.')
  .action(TODO);

// type install
typeCommand
  .command('install')
  .argument(
    '<IRI|index>',
    'Full IRI of type package or index (from search results)'
  )
  .description(
    'Install a type package using an IRI or an index (from search results).'
  )
  .action(TODO);

// type uninstall
typeCommand
  .command('uninstall')
  .description(
    'Uninstall a type package using an IRI or an index (from list results).'
  )
  .argument(
    '<IRI|index>',
    'Full IRI of type package or index  (from list results)'
  )
  .action(TODO);

// list
const listCommand = program.command('list').description('list objects');

// list packages
listCommand
  .command('packages')
  .alias('package')
  .description('List all installed type packages.')
  .action(TODO);

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
  .action(TODO);

// generate types
generateCommand
  .command('types')
  .alias('typings')
  .description('Generate or update typings for the installed type packages.')
  .action(TODO);

// generate sdk
generateCommand
  .command('sdk')
  .aliases(['client', 'solidclient'])
  .description(
    'Generate or update an SDK from the installed type packages and GraphQL queries.'
  )
  .action(TODO);

// const demoCommand = program
//   .command('demo')
//   .description('bundles all actions for the demo');

// demoCommand
//   .command('install')
//   .argument(
//     '<schemaName>',
//     'Name of the schema to install (adres, persoon, contact)'
//   )
//   .description('install a SHACL schema')
//   .action(async (schemaName) => {
//     // Install shacl schema
//     await project.demoInstallSchema(schemaName);

//     // Schemas were changed
//     await fireSchemasChanged();
//   });

// demoCommand
//   .command('uninstall')
//   .argument(
//     '<schemaName>',
//     'Name of the schema to uninstall (adres, persoon, contact)'
//   )
//   .description('uninstall a SHACL schema')
//   .action(async (schemaName) => {
//     // Remove shacl schema
//     await project.demoRemoveSchema(schemaName);

//     // Schemas were changed
//     await fireSchemasChanged();
//   });

// program
//   .command('generate')
//   .description('generate a graphql schema from the TTL')
//   .action(async () => {
//     const schema = await parser.parseSHACL(TEST_COMPLEX_SHACL_FILE_PATH);
//     // Write schema to file
//     ensureDir(dirname(TEST_GRAPHQL_FILE_PATH)).then(() =>
//       writeFile(TEST_GRAPHQL_FILE_PATH, printer.printSchema(schema), {
//         flag: 'w'
//       })
//     );
//   });

// program
//   .command('typings')
//   .description('generate types form the schema')
//   .action(async () => {
//     await typeGenerator.generateTypes(TEST_GRAPHQL_FILE_PATH);
//   });

program.parse(process.argv);

async function fireSchemasChanged(): Promise<void> {
  try {
    // Generate graphql schema
    const schema = await parser.parseSHACL(PATH_SDX_GENERATE_SHACL_FOLDER, [
      'index.json'
    ]);
    await ensureDir(dirname(PATH_SDX_GENERATE_GRAPHQL_SCHEMA));
    await writeFile(
      PATH_SDX_GENERATE_GRAPHQL_SCHEMA,
      printer.printSchema(schema),
      { flag: 'w' }
    );

    // Generate types
    // await typeGenerator.generateTypes(PATH_SDX_GRAPHQL_SCHEMA);
    await typeGenerator.generateTypesAndMore(PATH_SDX_GENERATE_GRAPHQL_SCHEMA);
  } catch (err: any) {
    if (err === ERROR.NO_SHACL_SCHEMAS) {
      // Remove schema
      await rm(PATH_SDX_GENERATE_GRAPHQL_SCHEMA);
    }
    console.log(err);
  }
}
