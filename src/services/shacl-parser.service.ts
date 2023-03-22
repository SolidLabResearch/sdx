import { RxHR } from "@akanass/rx-http-request";
import { PathLike } from "fs";
import { readFile, readdir, lstat, } from "fs/promises";
import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { DirectiveLocation } from "graphql/language/directiveLocation.js";
import { GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLInputFieldConfig, GraphQLInputObjectType, GraphQLList, GraphQLNonNull, GraphQLObjectTypeConfig, GraphQLType, isInputObjectType, isNonNullType, isScalarType, ThunkObjMap } from "graphql/type/definition.js";
import { GraphQLDirective } from "graphql/type/directives.js";
import * as Scalars from "graphql/type/scalars.js";
import { DataFactory, Parser, Quad } from 'n3';
import { autoInjectable, singleton } from "tsyringe";
import { ERROR } from "../constants.js";
import { Context } from "../lib/context.js";
import { PropertyShape } from "../lib/model/property-shape.js";
import { Shape } from "../lib/model/shape.js";
import { capitalize, decapitalize, isOrContainsScalar, plural } from "../util.js";

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

    async parseSHACL(path: PathLike, ingoreFileNames: string[] = []): Promise<GraphQLSchema> {
        const stat = await lstat(path);
        if (stat.isDirectory() && (await (readdir(path))).length === 0) {
            throw ERROR.NO_SHACL_SCHEMAS;
        }

        const parsePath = async (pathLike: PathLike): Promise<Quad[]> => {
            if (ingoreFileNames.includes(pathLike.toString())) {
                return [];
            }
            const stat = await lstat(pathLike);
            let quads: Quad[] = [];
            if (stat.isDirectory()) {
                for (const fileName of await readdir(pathLike)) {
                    if (!ingoreFileNames.includes(fileName)) {
                        quads.push(... await parsePath(`${pathLike}/${fileName}`));
                    }
                }
            } else {
                const source = await readFile(pathLike);
                quads.push(... this.parser.parse(source.toString()))
            }
            return quads;
        }

        const context = new Context(await parsePath(path), this.generateObjectType);

        // Generate Schema
        return new GraphQLSchema({
            query: this.generateQueryEntryPoints(context.getGraphQLObjectTypes()),
            mutation: this.generateMutationEntryPoints(context.getGraphQLObjectTypes()),
            directives: [IS_DIRECTIVE, PROPERTY_DIRECTIVE, IDENTIFIER_DIRECTIVE],
        });
    }

    /**
     * Generates the entry points for the GraphQL Query schema
     * @param types 
     * @returns 
     */
    private generateQueryEntryPoints(types: GraphQLObjectType[]): GraphQLObjectType {
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

    private generateMutationEntryPoints(types: GraphQLObjectType[]): GraphQLObjectType {
        const mutation = new GraphQLObjectType({
            name: 'RootMutationType',
            fields: types.reduce((prev, type) => {
                const createName = `create${capitalize(type.name)}`;
                const mutateName = `mutate${capitalize(type.name)}`
                return {
                    ...prev,
                    // create type
                    [createName]: {
                        type: new GraphQLNonNull(type),
                        args: { input: { type: this.generateInputObjectType(type, `${capitalize(createName)}Input`) } }
                    },
                    // edit types
                    [mutateName]: {
                        type: this.generateMutationObjectType(type),
                        args: { id: { type: new GraphQLNonNull(Scalars.GraphQLID) } }
                    }
                }
            }, {})
        });
        return mutation;
    }

    private generateInputObjectType(type: GraphQLObjectType, name: string): GraphQLNonNull<GraphQLInputObjectType> {
        return new GraphQLNonNull(new GraphQLInputObjectType({
            name,
            fields: Object.fromEntries(Object.entries(type.toConfig().fields).filter(entry => isInputObjectType(entry[1].type))) as any,
            extensions: type.extensions
        }) as GraphQLInputObjectType);
    }

    private generateMutationObjectType(type: GraphQLObjectType): GraphQLObjectType {
        const fields = {
            delete: {
                type: new GraphQLNonNull(type)
            },
            update: {
                type: new GraphQLNonNull(type),
                args: {
                    input: {
                        type: this.generateInputObjectType(type, `Update${capitalize(type.name)}Input`)
                    }
                }
            }
        };
        return new GraphQLObjectType({
            name: `${capitalize(type.name)}Mutation`,
            fields
        });
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
