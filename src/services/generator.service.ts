import { PathLike, readFileSync } from 'fs';
import { autoInjectable, singleton } from 'tsyringe';

import { generate } from '@graphql-codegen/cli';
import {
  appendFile,
  lstat,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from 'fs/promises';
import {
  ERROR,
  PATH_SDX_GENERATE_GRAPHQL_SCHEMA,
  PATH_SDX_GENERATE_SDK,
  PATH_SDX_GENERATE_SHACL_FOLDER,
  PATH_GRAPHQL_QUERIES_FOLDER
} from '../constants.js';
import { ShaclParserService } from './shacl-parser.service.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as typescriptPlugin from '@graphql-codegen/typescript';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as typescriptGenericSdkPlugin from '@graphql-codegen/typescript-generic-sdk';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as typescriptOperationsPlugin from '@graphql-codegen/typescript-operations';
import chalk from 'chalk';
import { SOLID_WARN, ensureDir } from '../util.js';
import { dirname } from 'path';
import { SchemaPrinterService } from './schema-printer.service.js';
import { ConfigService } from './config.service.js';

@singleton()
@autoInjectable()
export class GeneratorService {
  constructor(
    private parser?: ShaclParserService,
    private printer?: SchemaPrinterService,
    private config?: ConfigService
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
      // Trigger auto-generate
      this.notify({ schemaChanged: true });
    } catch (err: any) {
      if (err === ERROR.NO_SHACL_SCHEMAS) {
        // Remove schema
        try {
          await rm(PATH_SDX_GENERATE_GRAPHQL_SCHEMA);
          this.notify({ schemaChanged: true });
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

    // Append schema variable
    await this.appendSchemaVariable();
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
      await this.removeGeneratedSdk();
      return;
    }
    // Check for queries directory
    let statQuery;
    try {
      statQuery = await stat(PATH_GRAPHQL_QUERIES_FOLDER);
    } catch (err: any) {
      statQuery = null;
    }
    const documents =
      (statQuery &&
        statQuery.isDirectory() &&
        (await readdir(PATH_GRAPHQL_QUERIES_FOLDER))
          .map((fileName) => `${PATH_GRAPHQL_QUERIES_FOLDER}/${fileName}`)
          .filter((path) => this.fileIsNotEmpty(path))) ||
      [];

    if (documents.length === 0) {
      // Warn no queries
      console.log(
        chalk.hex(SOLID_WARN)(
          `Warning: No GraphQL queries found! (create *.graphql files inside the '${PATH_GRAPHQL_QUERIES_FOLDER}' folder to also generate an SDK Client)`
        )
      );
      // Generate only typings
      await this.generateTypings();
    } else {
      await this.generateSdk(schemaPath, documents);
    }
  }

  private fileIsNotEmpty = (fileName: string): boolean => {
    const file = readFileSync(fileName);
    return file.toString().trim().length > 0;
  };

  async generateSdk(
    schemaPath: PathLike = PATH_SDX_GENERATE_GRAPHQL_SCHEMA,
    documents: string[]
  ): Promise<void> {
    const sdxConfig = await this.config!.getSdxConfig();
    const configuration = {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-generic-sdk'
      ],
      config: {
        rawRequest: sdxConfig.options.resultEnvelope
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

    // Append schema variable
    await this.appendSchemaVariable();
  }

  async notify(event: ChangeEvent): Promise<void> {
    const sdxConfig = await this.config!.getSdxConfig();
    if (sdxConfig.options.autoGenerate) {
      if (event.shaclChanged) {
        await this.generateGraphqlSchema();
      }

      if (event.schemaChanged || event.queriesChanged) {
        await this.generateTypingsOrSdk();
      }
    }
  }

  /**
   * Try to remove the generated SDK.
   */
  private async removeGeneratedSdk(): Promise<void> {
    try {
      const path = await lstat(PATH_SDX_GENERATE_SDK);
      if (path.isFile()) {
        await rm(PATH_SDX_GENERATE_SDK);
      }
    } catch {
      /* Ignore */
    }
  }

  /**
   * Append the schema variable to the generated SDK.
   */
  private async appendSchemaVariable(): Promise<void> {
    const schema = await readFile(PATH_SDX_GENERATE_GRAPHQL_SCHEMA);
    await appendFile(
      PATH_SDX_GENERATE_SDK,
      `\nexport const GRAPHQL_SCHEMA = \`${schema.toString()}\`;`
    );
  }
}

export interface ChangeEvent {
  shaclChanged?: boolean;
  schemaChanged?: boolean;
  queriesChanged?: boolean;
}
