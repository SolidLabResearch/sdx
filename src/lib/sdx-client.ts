import { GraphQLSchema } from "graphql";
import { TEST_COMPLEX_SHACL_FILE_PATH, TEST_SHACL_FILE_PATH } from "../constants.js";
import { ShaclParserService } from "../services/shacl-parser.service.js";
import { LegacySdxClient } from "./legacy-sdx-client.js";

export class SdxClient {
    private parser = new ShaclParserService();

    async query<T>(query: string, documentLocation?: string): Promise<T> {
        const schema = await this.getSchema();        
        const client = new LegacySdxClient(schema, 'http://localhost:3000/complex.ttl');
        
        return client.query<T>(query, documentLocation);
    }

    async mutation(mutation: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

    private async getSchema(): Promise<GraphQLSchema> {
        // FIXME: Temporary workaround: reparsing from SHACL, as not to loose directives info
        return this.parser.parseSHACL(TEST_COMPLEX_SHACL_FILE_PATH);
    }
}
