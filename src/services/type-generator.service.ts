import { PathLike } from "fs";
import { autoInjectable, singleton } from "tsyringe";

import { generate } from '@graphql-codegen/cli';
import { codegen } from '@graphql-codegen/core';
import { readFile, writeFile } from "fs/promises";
import { GraphQLSchema, parse } from 'graphql';
import { PATH_SDX_GRAPHQL_SCHEMA, PATH_SDX_TYPES_FOLDER, TEST_COMPLEX_SHACL_FILE_PATH } from "../constants.js";
import { ShaclParserService } from "./shacl-parser.service.js";

import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as typescriptOperationsPlugin from '@graphql-codegen/typescript-operations';
import * as typescriptGenericSdkPlugin from '@graphql-codegen/typescript-generic-sdk';

const TYPES_OUTPUT_PATH = './src/types/generated_types.d.ts';

@singleton()
@autoInjectable()
export class TypeGeneratorService {
    private parser = new ShaclParserService();

    constructor() {

    }

    async generateTypesAndMore(schemaPath: PathLike): Promise<void> {
        const schema = parse((await readFile(schemaPath)).toString());
        const query = parse((await readFile(`src/graphql/query.graphql`)).toString());

        await generate({
            schema: PATH_SDX_GRAPHQL_SCHEMA,
            documents: ['src/graphql/query.graphql'],
            generates: {
                [`${PATH_SDX_TYPES_FOLDER}/index.d.ts`]: {
                    plugins: ['typescript', 'typescript-operations'],
                    config: {
                        noExport: true
                    }
                },
                [`src/sdk.generated.ts`]: {
                    plugins: ['typescript-generic-sdk'],
                    config: {

                    }
                }
            }
        }, true);
    }


    async generateTypes(schemaPath: PathLike): Promise<void> {
        const schema = parse((await readFile(schemaPath)).toString());
        const query = parse((await readFile(`src/graphql/query.graphql`)).toString());

        const config = {
            documents: [{ document: query }],
            config: {},
            filename: `${PATH_SDX_TYPES_FOLDER}/index.d.ts`,
            schema,
            plugins: [
                {
                    typescript: {
                        noExport: true
                    },
                },
                {
                    typescriptOperations: {
                        noExport: true,
                    }
                },
                {
                    typescriptGenericSdk: {
                    }
                }
            ],
            pluginMap: {
                typescript: typescriptPlugin,
                typescriptOperations: typescriptOperationsPlugin,
                typescriptGenericSdk: typescriptGenericSdkPlugin
            }
        }
        try {
            const output = await codegen(config as any);
            return writeFile(`${PATH_SDX_TYPES_FOLDER}/index.d.ts`, output, 'utf8');
        } catch (err: any) {
            console.log(err);
        }
    }

    private async getSchema(): Promise<GraphQLSchema> {
        // FIXME: Temporary workaround: reparsing from SHACL, as not to loose directives info
        return this.parser.parseSHACL(TEST_COMPLEX_SHACL_FILE_PATH);
    }
}
