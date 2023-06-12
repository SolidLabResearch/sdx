import { PathLike } from 'fs';
import { autoInjectable, singleton } from 'tsyringe';

import { generate } from '@graphql-codegen/cli';
import { codegen } from '@graphql-codegen/core';
import {
  appendFile,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from 'fs/promises';
import { GraphQLSchema, parse } from 'graphql';
import {
  ERROR,
  PATH_SDX_GENERATE_GRAPHQL_SCHEMA,
  PATH_SDX_GENERATE_SDK,
  PATH_SDX_GENERATE_SHACL_FOLDER,
  PATH_SDX_TYPES_FOLDER,
  PATH_SRC_GRAPHQL_QUERIES,
  TEST_COMPLEX_SHACL_FILE_PATH
} from '../constants.js';
import { ShaclParserService } from './shacl-parser.service.js';

import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as typescriptGenericSdkPlugin from '@graphql-codegen/typescript-generic-sdk';
import * as typescriptOperationsPlugin from '@graphql-codegen/typescript-operations';
import chalk from 'chalk';
import { SOLID_WARN, ensureDir } from '../util.js';
import { dirname } from 'path';
import { SchemaPrinterService } from './schema-printer.service.js';

@singleton()
@autoInjectable()
export class GeneratorService {
  constructor(
    private parser?: ShaclParserService,
    private printer?: SchemaPrinterService
  ) {}

  /**
   * Generate the graphql schema from the SHACL files
   */
  async generateGraphqlSchema(): Promise<void> {
    try {
      // Generate graphql schema
      const schema = await this.parser!.parseSHACL(
        PATH_SDX_GENERATE_SHACL_FOLDER,
        ['index.json']
      );
      await ensureDir(dirname(PATH_SDX_GENERATE_GRAPHQL_SCHEMA));
      await writeFile(
        PATH_SDX_GENERATE_GRAPHQL_SCHEMA,
        this.printer!.printSchema(schema),
        { flag: 'w' }
      );
    } catch (err: any) {
      if (err === ERROR.NO_SHACL_SCHEMAS) {
        // Remove schema
        try {
          await rm(PATH_SDX_GENERATE_GRAPHQL_SCHEMA);
        } catch {
          /* Ignore */
        }
      }
    }
  }

  /**
   * Generates only typings.
   * @param schemaPath
   */
  async generateTypings(
    schemaPath: PathLike = PATH_SDX_GENERATE_GRAPHQL_SCHEMA
  ): Promise<void> {
    const configuration = {
      plugins: ['typescript'],
      config: {
        noExport: false
      }
    };
    const generates = { [PATH_SDX_GENERATE_SDK]: configuration };
    await generate(
      {
        schema: schemaPath.toString(),
        generates
      },
      true
    );
  }

  /**
   * Try generating an SDK, if no queries are found, only typings are generated.
   * @param schemaPath The path to the graphql schema
   */
  async generateTypingsOrSdk(
    schemaPath: PathLike = PATH_SDX_GENERATE_GRAPHQL_SCHEMA
  ): Promise<void> {
    // Abort if no schema
    try {
      await stat(schemaPath);
    } catch (err: any) {
      console.log(
        chalk.hex(SOLID_WARN)(
          `Warning: No GraphQL Schema found (try installing a type package first)`
        )
      );
      return;
    }
    // Check for queries directory
    let statQuery;
    try {
      statQuery = await stat(PATH_SRC_GRAPHQL_QUERIES);
    } catch (err: any) {
      statQuery = null;
    }
    const documents =
      (statQuery &&
        statQuery.isDirectory() &&
        (await readdir(PATH_SRC_GRAPHQL_QUERIES)).map(
          (fileName) => `${PATH_SRC_GRAPHQL_QUERIES}/${fileName}`
        )) ||
      [];
    if (documents.length === 0) {
      // Warn no queries
      console.log(
        chalk.hex(SOLID_WARN)(
          `Warning: No GraphQL queries found! (create *.graphql files inside the '${PATH_SRC_GRAPHQL_QUERIES}' folder to also generate an SDK Client)`
        )
      );
      // Generate only typings
      await this.generateTypings();
    } else {
      await this.generateSdk(schemaPath, documents);
    }
  }

  async generateSdk(
    schemaPath: PathLike = PATH_SDX_GENERATE_GRAPHQL_SCHEMA,
    documents: string[]
  ): Promise<void> {
    const configuration = {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-generic-sdk'
      ],
      config: {
        //TODO: Get rawRequest settings from config
        rawRequest: false
      }
    };

    const generates = { [PATH_SDX_GENERATE_SDK]: configuration };

    // Generates
    await generate(
      {
        schema: schemaPath.toString(),
        documents,
        generates
      },
      true
    );

    // Rename getSdk
    await appendFile(
      PATH_SDX_GENERATE_SDK,
      `\nexport const getSolidClient = <C, E>(requester: Requester<C, E>): Sdk => getSdk<C, E>(requester);`
    );
  }

  // async generateTypes(schemaPath: PathLike): Promise<void> {
  //   const schema = parse((await readFile(schemaPath)).toString());
  //   const query = parse(
  //     (await readFile(`src/graphql/query.graphql`)).toString()
  //   );

  //   const config = {
  //     documents: [{ document: query }],
  //     config: {},
  //     filename: `${PATH_SDX_TYPES_FOLDER}/index.d.ts`,
  //     schema,
  //     plugins: [
  //       {
  //         typescript: {
  //           noExport: true
  //         }
  //       },
  //       {
  //         typescriptOperations: {
  //           noExport: true
  //         }
  //       },
  //       {
  //         typescriptGenericSdk: {
  //           noExport: true
  //         }
  //       }
  //     ],
  //     pluginMap: {
  //       typescript: typescriptPlugin,
  //       typescriptOperations: typescriptOperationsPlugin,
  //       typescriptGenericSdk: typescriptGenericSdkPlugin
  //     }
  //   };
  //   try {
  //     const output = await codegen(config as any);
  //     return writeFile(`${PATH_SDX_TYPES_FOLDER}/index.d.ts`, output, 'utf8');
  //   } catch (err: any) {
  //     console.log(err);
  //   }
  // }
}
