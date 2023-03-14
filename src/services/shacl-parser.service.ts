import { RxHR } from "@akanass/rx-http-request";
import { PathLike } from "fs";
import { readFile } from "fs/promises";
import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { DirectiveLocation } from "graphql/language/directiveLocation.js";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull, GraphQLObjectTypeConfig, GraphQLType } from "graphql/type/definition.js";
import { GraphQLDirective } from "graphql/type/directives.js";
import * as Scalars from "graphql/type/scalars.js";
import { DataFactory, Parser } from 'n3';
import { autoInjectable, singleton } from "tsyringe";
import { Context } from "../lib/context.js";
import { PropertyShape } from "../lib/model/property-shape.js";
import { Shape } from "../lib/model/shape.js";

const { namedNode } = DataFactory;

const ID_FIELD: { 'id': GraphQLFieldConfig<any, any> } = {
    id: {
        description: 'Auto-generated property that will be assigned to the `iri` of the Thing that is being queried.',
        type: new GraphQLNonNull(Scalars.GraphQLID),
        extensions: {
            directives: {
                'identifier': {}
            }
        }
    }
} as const;

const IDENTIFIER_DIRECTIVE = new GraphQLDirective({
    name: 'identifier',
    locations: [DirectiveLocation.FIELD_DEFINITION]
})

const IS_DIRECTIVE = new GraphQLDirective({
    name: 'is',
    args: { class: { type: Scalars.GraphQLString } },
    locations: [DirectiveLocation.OBJECT],

});

const PROPERTY_DIRECTIVE = new GraphQLDirective({
    name: 'property',
    args: { iri: { type: Scalars.GraphQLString } },
    locations: [DirectiveLocation.FIELD_DEFINITION]
})
const http = RxHR;

@singleton()
@autoInjectable()
export class ShaclParserService {
    private parser: Parser;

    constructor() {
        this.parser = new Parser({ format: 'turtle' });
    }

    async parseSHACL(path: PathLike): Promise<GraphQLSchema> {
        const quads = this.parser.parse((await readFile(path)).toString());
        const context = new Context(quads, this.generateObjectType);

        // Generate Schema
        return new GraphQLSchema({
            query: this.generateEntryPoints(context.getGraphQLObjectTypes()),
            directives: [IS_DIRECTIVE, PROPERTY_DIRECTIVE, IDENTIFIER_DIRECTIVE],
        });
    }

    /**
     * Generates the entry points for the GraphQL Query schema
     * @param types 
     * @returns 
     */
    private generateEntryPoints(types: GraphQLObjectType[]): GraphQLObjectType {
        const decapitalize = (str: string): string => str.slice(0, 1).toLowerCase() + str.slice(1);
        const plural = (str: string): string => `${str}Collection`;
        const query = new GraphQLObjectType({
            name: 'RootQueryType',
            fields: types.reduce((prev, type) => ({
                ...prev,
                // Singular type
                [decapitalize(type.name)]: {
                    type,
                    args: { id: { type: Scalars.GraphQLString } }
                },
                // Multiple types
                [plural(decapitalize(type.name))]: {
                    type: new GraphQLList(type)
                }
            }), {})
        } as GraphQLObjectTypeConfig<any, any>);

        return query;

    }

    /**
     * Generates a GraphQLObjectType from a Shape
     * @param shape 
     * @returns 
     */
    private generateObjectType(shape: Shape): GraphQLObjectType {
        const applyMinMaxCount = (propertyShape: PropertyShape, type: GraphQLType): GraphQLList<GraphQLType> | GraphQLNonNull<GraphQLType> | GraphQLType => {
            let result: GraphQLList<GraphQLType> | GraphQLNonNull<GraphQLType> | GraphQLType = type;
            // collection
            if (!propertyShape.maxCount || (propertyShape.maxCount && propertyShape.maxCount > 1)) {
                result = new GraphQLList(result);
            }
            if (propertyShape.minCount && propertyShape.minCount > 0) {
                result = new GraphQLNonNull(result)
            }
            return result;
        };
        const props = () => shape.propertyShapes.reduce((prev, prop) => {
            const propType = prop.type ?? prop.class();
            if (!propType) { return prev }
            else {
                return {
                    ...prev,
                    [prop.name]: {
                        type: applyMinMaxCount(prop, propType!),
                        description: prop.description,
                        extensions: {
                            directives: {
                                property: { iri: prop.path }
                            }
                        }
                    } as GraphQLFieldConfig<any, any>
                }
            }
        }, ID_FIELD);
        return new GraphQLObjectType({
            name: shape.name,
            fields: props,
            extensions: {
                directives: {
                    is: { class: shape.targetClass }
                }
            },
        });
    }
}
