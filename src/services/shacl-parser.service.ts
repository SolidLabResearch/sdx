import { PathLike } from "fs";
import { readFile, writeFile } from "fs/promises";
import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { GraphQLArgumentConfig, GraphQLFieldConfig, GraphQLList } from "graphql/type/definition.js";
import * as Scalars from "graphql/type/scalars.js";
import { printSchema } from "graphql/utilities/printSchema.js";
import { Parser, Store } from 'n3';
import { dirname } from "path";
import { autoInjectable, singleton } from "tsyringe";
import { TEST_GRAPHQL_FILE_PATH } from "../constants.js";
import { Shape } from "../lib/shape.js";
import { RDFS, SHACL } from "../lib/vocab.js";
import { ensureDir } from "../util.js";

const ID_FIELD: { 'id': GraphQLFieldConfig<any, any> } = {
    id: {
        description: 'A built-in property that always returns a String identifier for the type (defaults to RDF ID).',
        type: Scalars.GraphQLString
    }
} as const;

@singleton()
@autoInjectable()
export class ShaclParserService {
    private parser: Parser;
    private _context?: Store;

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
            query: this.generateEntryPoints(graphQLTypes),
            

        });
        
        // Write schema to file
        ensureDir(dirname(TEST_GRAPHQL_FILE_PATH))
            .then(_ => writeFile(TEST_GRAPHQL_FILE_PATH, printSchema(schema), { flag: 'w' }));
    }

    /**
     * Generates the entry points for the GraphQL Query schema
     * @param types 
     * @returns 
     */
    private generateEntryPoints(types: GraphQLObjectType[]): GraphQLObjectType {
        const query = new GraphQLObjectType({
            name: 'RootQueryType',
            fields: types.reduce((prev, type) => ({
                ...prev,
                // Singular type
                [this.decapitalize(type.name)]: {
                    type,
                    args: { id: { type: Scalars.GraphQLString } as GraphQLArgumentConfig }
                },
                // Multiple types
                [`${this.decapitalize(type.name)}s`]: {
                    type: new GraphQLList(type)
                }
            }), {})
        });

        return query;

    }

    /**
     * Generates a GraphQLObjectType from a Shape
     * @param shape 
     * @returns 
     */
    private generateObjectType(shape: Shape): GraphQLObjectType {
        const props = shape.propertyShapes.reduce((prev, prop) => ({
            ...prev,
            [prop.name]: { 
                type: prop.type,
                description: prop.description
             } as GraphQLFieldConfig<any, any>
        }), { ...ID_FIELD });
        return new GraphQLObjectType({
            name: shape.name,
            fields: props
        });
    }


    /**
     * Extract all Shapes from the quads loaded in a Store and converts them in an array of Shapes.
     * @param store 
     * @returns 
     */
    private allShapes(store: Store): Shape[] {
        return store.getSubjects(RDFS.a, SHACL.NodeShape, null).map(sub => {
            return new Shape(store.getQuads(sub, null, null, null), this.getContext(store));
        });
    }

    private decapitalize(str: string): string {
        return str.slice(0, 1).toLowerCase() + str.slice(1);
    }

    private getContext(store: Store): Store {
        if (!this._context) {
            this._context = new Store(store.getQuads(null, null, null, null).filter(({ subject }) => subject.termType === 'BlankNode'));
        }
        return this._context;
    }
}
