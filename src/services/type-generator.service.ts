import { PathLike } from "fs";
import { autoInjectable, singleton } from "tsyringe";

import { codegen } from '@graphql-codegen/core';
import * as typescriptPlugin from '@graphql-codegen/typescript';
import { readFile, writeFile } from "fs/promises";
import { GraphQLSchema, parse } from 'graphql';
import { TEST_COMPLEX_SHACL_FILE_PATH, TEST_GRAPHQL_FILE_PATH } from "../constants.js";
import { ShaclParserService } from "./shacl-parser.service.js";

const TYPES_OUTPUT_PATH = './src/types/generated_types.d.ts';

@singleton()
@autoInjectable()
export class TypeGeneratorService {
    private parser = new ShaclParserService();

    constructor() {
        
    
    }

    
    async generateTypes(schemaPath: PathLike): Promise<void> {
        const schema = await this.getSchema();
        const tmpSchema = parse((await readFile(TEST_GRAPHQL_FILE_PATH)).toString());
        const config = {
            documents: [], 
            config:{},
            filename: TYPES_OUTPUT_PATH,
            schema: tmpSchema,
            plugins: [
                {
                    typescript: {}
                }
            ],
            pluginMap: {
                typescript: typescriptPlugin
            }
        }
        const output = await codegen(config);
        return writeFile(TYPES_OUTPUT_PATH, output, 'utf8');
    }

    private async getSchema(): Promise<GraphQLSchema> {
        // FIXME: Temporary workaround: reparsing from SHACL, as not to loose directives info
        return this.parser.parseSHACL(TEST_COMPLEX_SHACL_FILE_PATH);
    }
}
