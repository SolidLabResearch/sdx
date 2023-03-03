import { PathLike } from "fs";
import { readFile } from "fs/promises";
import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { GraphQLFieldConfig } from "graphql/type/definition.js";
import * as Scalars from "graphql/type/scalars.js";
import { printSchema } from "graphql/utilities/printSchema.js";
import { Parser, Store } from 'n3';
import { autoInjectable, singleton } from "tsyringe";
import { Shape } from "../lib/shape.js";
import { RDFS, SHACL } from "../lib/vocab.js";

const ID_FIELD: { 'id': GraphQLFieldConfig<any, any> } = {
    id: {
        description: 'A built-in property that always returns a String identifier for the type (defaults to RDF ID).',
        type: Scalars.GraphQLString
    }
} as const;

// TODO: GUIDE https://gitlab.ilabt.imec.be/ibcndevs/solid-sdx/solid-sdx-java/-/blob/master/src/main/kotlin/solidlab/sdx/SHACLParser.kt

@singleton()
@autoInjectable()
export class ShaclParserService {
    private parser: Parser;

    constructor() {
        this.parser = new Parser({ format: 'turtle' });
    }

    async parseShacl(path: PathLike): Promise<void> {
        const quads = this.parser.parse((await readFile(path)).toString());
        const store = new Store(quads);
        // Parse to proprietary Shape format
        const shapes = this.allShapes(store);

        // Parse shapes to GraphQLTypes
        const graphQLTypes = shapes.map(shape => this.generateObjectType(shape))

        // Generate Schema
        const schema = new GraphQLSchema({
            query: this.generateEntryPoints(graphQLTypes)
        });

        // Print schema to console
        console.log(printSchema(schema))
    }



    /**
     * Generates a GraphQLObjectType from a Shape
     * @param shape 
     * @returns 
     */
    private generateObjectType(shape: Shape): GraphQLObjectType {
        return new GraphQLObjectType({
            name: shape.name,
            fields: ID_FIELD
        });
    }

    /**
     * Generates the entry points for the GraphQL Query schema
     * @param types 
     * @returns 
     */
    private generateEntryPoints(types: GraphQLObjectType[]): GraphQLObjectType {
        const query = new GraphQLObjectType({
            name: 'RootQueryType',
            fields: Object.fromEntries(types.map(t => [
                t.name,
                {
                    type: t,
                } as GraphQLFieldConfig<any, any>
            ]))
        });

        return query;

    }

    /**
     * Extract all Shapes from the quads loaded in a Store and converts them in an array of Shapes.
     * @param store 
     * @returns 
     */
    private allShapes(store: Store): Shape[] {
        return store.getSubjects(RDFS.a, SHACL.NodeShape, null).map(sub => {
            return new Shape(store.getQuads(sub, null, null, null));
        });
    }
}
