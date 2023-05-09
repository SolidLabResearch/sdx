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
import { ProjectBuilder } from './project-builder.js';
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
const projectBuilder = new ProjectBuilder();
const project = new ProjectService();
const search = new SearchService();
const parser = new ShaclParserService();
const printer = new SchemaPrinterService();
const typeGenerator = new TypeGeneratorService();

// Main program
program
  .version(LIB_VERSION)
  .description(chalk.hex(SOLID_PURPLE)('Solid Development eXperience toolkit'));

// init
program
  .command('init')
  .description('initialize a new SDX project')
  .option(
    '-f, --force',
    'Overwrite any package.json that might be present.',
    false
  )
  .action((options) => projectBuilder.initProject(options));

// search
program
  .command('search')
  .description('search for a type')
  .argument('<type>', 'type to search for')
  .action((type) => search.search(type));

// type
const typeCommand = program
  .command('type')
  .alias('types')
  .description('standard operations on types');
// type list
typeCommand
  .command('list')
  .description('list all installed types')
  .action(() => project.listTypes());
// type install
typeCommand
  .command('install')
  .argument(
    '<iriOrIdx>',
    'Full IRI of type or index number of previous list results.'
  )
  .description('install a type (exact name match required)')
  .action((iriOrIdx) => project.installType(iriOrIdx));
// type uninstall
typeCommand
  .command('uninstall')
  .argument(
    '<iriOrIdx>',
    'Full IRI of type or index number of previous list results.'
  )
  .description('uninstall a type (exact name match required)')
  .action((iriOrIdx) => project.unInstallType(iriOrIdx));

const demoCommand = program
  .command('demo')
  .description('bundles all actions for the demo');

demoCommand
  .command('install')
  .argument(
    '<schemaName>',
    'Name of the schema to install (adres, persoon, contact)'
  )
  .description('install a SHACL schema')
  .action(async (schemaName) => {
    // Install shacl schema
    await project.demoInstallSchema(schemaName);

    // Schemas were changed
    await fireSchemasChanged();
  });

demoCommand
  .command('uninstall')
  .argument(
    '<schemaName>',
    'Name of the schema to uninstall (adres, persoon, contact)'
  )
  .description('uninstall a SHACL schema')
  .action(async (schemaName) => {
    // Remove shacl schema
    await project.demoRemoveSchema(schemaName);

    // Schemas were changed
    await fireSchemasChanged();
  });

// program
//   .command('query')
//   .description('client test')
//   .action(async () => {
//     const client = new SdxClient();
//     const result = JSON.stringify(
//       await client.query(`#graphql
//         {
//             contactCollection {
//                 givenName
//                 familyName
//             }
//             contact(id: "http://example.org/cont/tdupont") {
//                 id
//                 givenName
//                 address {
//                     streetLine
//                     city
//                     }
//                 email
//                 worksFor {
//                     name
//                     address {
//                         streetLine
//                         city
//                     }
//                 }
//             }
//             addressCollection {
//                 streetLine
//                 city
//             }
//             organizationCollection {
//                 name
//                 address {
//                     streetLine
//                 }
//             }
//         }
//         `),
//       null,
//       2
//     );
//     console.log(result);
//   });

program
  .command('generate')
  .description('generate a graphql schema from the TTL')
  .action(async () => {
    const schema = await parser.parseSHACL(TEST_COMPLEX_SHACL_FILE_PATH);
    // Write schema to file
    ensureDir(dirname(TEST_GRAPHQL_FILE_PATH)).then(() =>
      writeFile(TEST_GRAPHQL_FILE_PATH, printer.printSchema(schema), {
        flag: 'w'
      })
    );
  });

program
  .command('typings')
  .description('generate types form the schema')
  .action(async () => {
    await typeGenerator.generateTypes(TEST_GRAPHQL_FILE_PATH);
  });

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
