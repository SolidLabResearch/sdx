import { PathLike } from "fs";
import { readFile, writeFile } from "fs/promises";
import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { DirectiveLocation } from "graphql/language/directiveLocation.js";
import { GraphQLArgumentConfig, GraphQLFieldConfig, GraphQLList, GraphQLNonNull, GraphQLType } from "graphql/type/definition.js";
import { GraphQLDirective } from "graphql/type/directives.js";
import * as Scalars from "graphql/type/scalars.js";
import { printSchema } from "graphql/utilities/printSchema.js";
import { Parser, Store } from 'n3';
import { dirname } from "path";
import { autoInjectable, singleton } from "tsyringe";
import { TEST_GRAPHQL_FILE_PATH } from "../constants.js";
import { Context } from "../lib/context.js";
import { PropertyShape } from "../lib/property-shape.js";
import { Shape } from "../lib/shape.js";
import { groupBySubject, printSchemaWithDirectives } from "../lib/util.js";
import { RDFS, SHACL } from "../lib/vocab.js";
import { ensureDir } from "../util.js";

const ID_FIELD: { 'id': GraphQLFieldConfig<any, any> } = {
    id: {
        description: 'A built-in property that always returns a String identifier for the type (defaults to RDF ID).',
        type: Scalars.GraphQLString
    }
} as const;


const IS_DIRECTIVE = new GraphQLDirective({
    name: 'is',
    args: {class: {type: Scalars.GraphQLString}},
    locations: [DirectiveLocation.OBJECT]
});

const PROPERTY_DIRECTIVE = new GraphQLDirective({
    name: 'property',
    args: {class: {type: Scalars.GraphQLString}},
    locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.FIELD]
})

@singleton()
@autoInjectable()
export class ShaclParserService {
    private parser: Parser;
    private context?: Context;

    constructor() {
        this.parser = new Parser({ format: 'turtle' });
    }

    async parseShacl(path: PathLike): Promise<void> {
        const quads = this.parser.parse((await readFile(path)).toString());
        this.context = new Context(quads);

        // Parse to proprietary Shape format
        const shapes = this.context.allShapes();

        // Parse shapes to GraphQLTypes
        this.context.setGraphQLTypes(shapes.map(shape => this.generateObjectType(shape)));

        // Generate Schema
        const schema = new GraphQLSchema({
            query: this.generateEntryPoints(this.context.getGraphQLTypes()),
            directives: [IS_DIRECTIVE, PROPERTY_DIRECTIVE]
        });

        // Write schema to file
        ensureDir(dirname(TEST_GRAPHQL_FILE_PATH))
            .then(_ => writeFile(TEST_GRAPHQL_FILE_PATH, printSchemaWithDirectives(schema, this.context!), { flag: 'w' }));
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
                    args: { id: { type: Scalars.GraphQLString } }
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
        const props = () => shape.propertyShapes.reduce((prev, prop) => {
            const propType = prop.type ?? prop.class();
            if (!propType) { return prev }
            else {
                return {
                    ...prev,
                    [prop.name]: {
                        type: this.applyMinMaxCount(prop, propType!),
                        description: prop.description,
                        extensions: {
                            directives: {
                                property: {iri: prop.path}
                            }
                        }
                    } as GraphQLFieldConfig<any, any>
                }
            }
        }, { ...ID_FIELD });
        return new GraphQLObjectType({
            name: shape.name,
            fields: props,
            extensions: {
                directives: {
                    is: {class: shape.targetClass}
                }
            }
        });
    }

    private applyMinMaxCount(propertyShape: PropertyShape, type: GraphQLType): GraphQLList<GraphQLType> | GraphQLNonNull<GraphQLType> | GraphQLType {
        let result: GraphQLList<GraphQLType> | GraphQLNonNull<GraphQLType> | GraphQLType = type;
        // collection
        if (!propertyShape.maxCount || (propertyShape.maxCount && propertyShape.maxCount > 1)) {
            result = new GraphQLList(result);
        }
        if (propertyShape.minCount && propertyShape.minCount > 0) {
            result = new GraphQLNonNull(result)
        }
        return result;
    }

    private decapitalize(str: string): string {
        return str.slice(0, 1).toLowerCase() + str.slice(1);
    }
}
