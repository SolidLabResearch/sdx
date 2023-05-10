import { PathLike } from 'fs';
import { autoInjectable, singleton } from 'tsyringe';

import { generate } from '@graphql-codegen/cli';
import { codegen } from '@graphql-codegen/core';
import { appendFile, readFile, readdir, stat, writeFile } from 'fs/promises';
import { GraphQLSchema, parse } from 'graphql';
import {
  PATH_SDX_GENERATE_GRAPHQL_SCHEMA,
  PATH_SDX_GENERATE_SDK,
  PATH_SDX_TYPES_FOLDER,
  PATH_SRC_GRAPHQL_QUERIES,
  TEST_COMPLEX_SHACL_FILE_PATH
} from '../constants.js';
import { ShaclParserService } from './shacl-parser.service.js';

import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as typescriptGenericSdkPlugin from '@graphql-codegen/typescript-generic-sdk';
import * as typescriptOperationsPlugin from '@graphql-codegen/typescript-operations';
import chalk from 'chalk';

@singleton()
@autoInjectable()
export class TypeGeneratorService {
  private parser = new ShaclParserService();

  async generateTypesAndMore(
    schemaPath: PathLike = PATH_SDX_GENERATE_GRAPHQL_SCHEMA
  ): Promise<void> {
    const gen = async (documents: string[]) => {
      if (documents.length === 0) {
        // Warn no queries
        console.log(
          chalk.hex('#FFAC1C')(
            "Warning: No GraphQL queries found! (create *.graphql files inside the 'src/graphql/' folder to generate an SDK)"
          )
        );
      }
      const configuration =
        documents.length > 0
          ? {
              plugins: [
                'typescript',
                'typescript-operations',
                'typescript-generic-sdk'
              ],
              config: {
                // noExport: true,
                rawRequest: true
              }
            }
          : {
              plugins: ['typescript', 'typescript-operations'],
              config: {
                noExport: true
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
      if (documents.length > 0) {
        // Rename getSdk
        await appendFile(
          PATH_SDX_GENERATE_SDK,
          `\nexport const getSolidClient = <C, E>(requester: Requester<C, E>): Sdk => getSdk<C, E>(requester);`
        );
      }
    };

    // Check for queries directory
    let statQuery = null;
    try {
      statQuery = await stat(PATH_SRC_GRAPHQL_QUERIES);
    } catch {
      // do nothing
    }
    const documents =
      (statQuery &&
        statQuery.isDirectory() &&
        (await readdir(PATH_SRC_GRAPHQL_QUERIES)).map(
          (fileName) => `${PATH_SRC_GRAPHQL_QUERIES}/${fileName}`
        )) ||
      [];
    console.log('docs: ', documents);
    await gen(documents);
  }

  async generateTypes(schemaPath: PathLike): Promise<void> {
    const schema = parse((await readFile(schemaPath)).toString());
    const query = parse(
      (await readFile(`src/graphql/query.graphql`)).toString()
    );

    const config = {
      documents: [{ document: query }],
      config: {},
      filename: `${PATH_SDX_TYPES_FOLDER}/index.d.ts`,
      schema,
      plugins: [
        {
          typescript: {
            noExport: true
          }
        },
        {
          typescriptOperations: {
            noExport: true
          }
        },
        {
          typescriptGenericSdk: {
            noExport: true
          }
        }
      ],
      pluginMap: {
        typescript: typescriptPlugin,
        typescriptOperations: typescriptOperationsPlugin,
        typescriptGenericSdk: typescriptGenericSdkPlugin
      }
    };
    try {
      const output = await codegen(config as any);
      return writeFile(`${PATH_SDX_TYPES_FOLDER}/index.d.ts`, output, 'utf8');
    } catch (err: any) {
      console.log(err);
    }
  }
}
