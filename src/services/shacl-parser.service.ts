import { RxHR } from "@akanass/rx-http-request";
import { PathLike } from "fs";
import { readFile, readdir, lstat, } from "fs/promises";
import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { DirectiveLocation } from "graphql/language/directiveLocation.js";
import { GraphQLField, GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLInputField, GraphQLInputFieldConfig, GraphQLInputObjectType, GraphQLInputType, GraphQLList, GraphQLNamedInputType, GraphQLNonNull, GraphQLObjectTypeConfig, GraphQLOutputType, GraphQLScalarType, GraphQLType, isInputObjectType, isListType, isNonNullType, isScalarType, ThunkObjMap } from "graphql/type/definition.js";
import { GraphQLDirective } from "graphql/type/directives.js";
import * as Scalars from "graphql/type/scalars.js";
import { DataFactory, Parser, Quad } from 'n3';
import { autoInjectable, singleton } from "tsyringe";
import { ERROR } from "../constants.js";
import { Context } from "../lib/context.js";
import { PropertyShape } from "../lib/model/property-shape.js";
import { Shape } from "../lib/model/shape.js";
import { capitalize, decapitalize, isOrContainsInputObjectType, isOrContainsObjectType, isOrContainsScalar, plural, toActualType } from "../util.js";

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
            mutation: this.generateMutationEntryPoints(context),
            directives: [IS_DIRECTIVE, PROPERTY_DIRECTIVE, IDENTIFIER_DIRECTIVE],
            // types: context.getInputTypes()
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

    /**
     * Generates a Mutation EntryPoint RootMutationType
     * @param types 
     * @returns 
     */
    private generateMutationEntryPoints(context: Context): GraphQLObjectType {
        const types = context.getGraphQLObjectTypes();
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
                        args: { input: { type: new GraphQLNonNull(this.generateInputObjectType(type, `${capitalize(createName)}Input`, context)) } }
                    },
                    // edit types
                    [mutateName]: {
                        type: this.generateMutationObjectType(type, context),
                        args: { id: { type: new GraphQLNonNull(Scalars.GraphQLID) } }
                    }
                }
            }, {})
        });
        return mutation;
    }

    /**
     * Generates an InputObject type, typically used as an argument in a mutator (always NonNull)
     * @param type 
     * @param name 
     * @returns 
     */
    private generateInputObjectType(type: GraphQLObjectType, name: string, context: Context): GraphQLInputObjectType {
        let inputType = context.getInputTypes().find(type => name === type.name);
        if (!inputType) {
            let fields = Object.fromEntries(Object.entries(type.getFields())
                .filter(([_, field]) => isOrContainsScalar(field.type))
                .filter(([_, field]) => !isIdentifier(field))
                .map(([name, field]) => [name, toInputField(field)]));
            inputType = new GraphQLInputObjectType({
                name,
                fields,
                extensions: type.extensions
            }) as GraphQLInputObjectType;
            context.getInputTypes().push(inputType);
        }
        return inputType;
    }

    private generateMutationObjectType(type: GraphQLObjectType, context: Context): GraphQLObjectType {
        return new GraphQLObjectType({
            name: `${capitalize(type.name)}Mutation`,
            fields: this.generateMutationObjectTypeFields(type, context),
            extensions: type.extensions
        });
    }

    private generateMutationObjectTypeFields(type: GraphQLObjectType, context: Context): ThunkObjMap<GraphQLFieldConfig<any, any>> {
        let fields = {
            update: {
                type: new GraphQLNonNull(type),
                args: {
                    input: {
                        type: new GraphQLNonNull(this.generateInputObjectType(type, `Update${capitalize(type.name)}Input`, context)),
                    }
                }
            },
            delete: {
                type: new GraphQLNonNull(type)
            },
        };

        // TODO: go over all non scalar fields
        Object.values(type.getFields()).forEach(field => {
            if (isOrContainsObjectType(field.type)) {
                // arraylike
                if (isListType(field.type) || (isNonNullType(field.type) && isListType(field.type.ofType))) {
                    fields = { ...fields, ...this.generateMutationObjectTypeFieldsForCollection(field, type, context) };
                }
                // singular
                else {
                    fields = { ...fields, ...this.generateMutationObjectTypeFieldsForSingular(field, type, context) };
                }
            }
        });

        return fields;
    }

    private generateMutationObjectTypeFieldsForCollection(field: GraphQLField<any, any>, parentType: GraphQLOutputType, context: Context): ThunkObjMap<GraphQLFieldConfig<any, any>> {
        const addName = `add${capitalize(field.name)}`;
        const removeName = `remove${capitalize(field.name)}`;
        const linkName = `link${capitalize(field.name)}`;
        const unlinkName = `unlink${capitalize(field.name)}`;
        const returnType = new GraphQLNonNull(parentType);
        const fieldType = toActualType(field.type) as GraphQLObjectType;
        return {
            [addName]: {
                type: returnType,
                args: {
                    input: {
                        type: new GraphQLNonNull(this.generateInputObjectType(fieldType, `Create${capitalize(fieldType.name)}Input`, context))
                    }
                }
            },
            [removeName]: {
                type: returnType,
                args: {
                    id: {
                        type: new GraphQLNonNull(Scalars.GraphQLID)
                    }
                }
            },
            [linkName]: {
                type: returnType,
                args: {
                    id: {
                        type: new GraphQLNonNull(Scalars.GraphQLID)
                    }
                }
            },

            [unlinkName]: {
                type: returnType,
                args: {
                    id: {
                        type: new GraphQLNonNull(Scalars.GraphQLID)
                    }
                }
            }
        }
    }

    private generateMutationObjectTypeFieldsForSingular(field: GraphQLField<any, any>, parentType: GraphQLOutputType, context: Context): ThunkObjMap<GraphQLFieldConfig<any, any>> {
        const setName = `set${capitalize(field.name)}`;
        const clearName = `clear${capitalize(field.name)}`;
        const returnType = new GraphQLNonNull(parentType);
        const fieldType = toActualType(field.type) as GraphQLObjectType;
        return {
            [setName]: {
                type: returnType,
                args: {
                    input: {
                        type: new GraphQLNonNull(this.generateInputObjectType(fieldType, `Create${capitalize(fieldType.name)}Input`, context))
                    }
                }
            },
            [clearName]: {
                type: returnType
            }
        }
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


function toInputField(field: GraphQLField<any, any>): GraphQLInputField {
    const { name, description, type, deprecationReason, extensions, astNode } = field;
    const isCollection = isListType(field.type);
    const isNonNull = isNonNullType(field.type);
    const fieldType = toScalarInputType(field.type);
    return new GraphQLInputObjectType({
        name: '_tmp',
        fields: {
            [field.name]: {
                type: fieldType,
                description: field.description,
                extensions: field.extensions
            }
        }
    }).getFields()[field.name];
}

function toScalarInputType(type: GraphQLOutputType, modifiers: { collection?: boolean, nonNull?: boolean } = {}): GraphQLInputType {
    if (isListType(type)) {
        let res = toScalarInputType(type.ofType, { collection: true });
        if (modifiers.collection) {
            res = new GraphQLList(res);
        }
        if (modifiers.nonNull) {
            res = new GraphQLNonNull(res);
        }
        return res;
    }
    if (isNonNullType(type)) {
        let res = toScalarInputType(type.ofType, { nonNull: true });
        if (modifiers.collection) {
            res = new GraphQLList(res);
        }
        if (modifiers.nonNull) {
            res = new GraphQLNonNull(res);
        }
        return res;
    }
    let res: GraphQLInputType = Scalars.specifiedScalarTypes.find(t => t.name === type.toString())!;
    if (!res) {
        throw new Error(`${type.toString()} is not a Scalar!`);
    }
    if (modifiers.collection) {
        res = new GraphQLList(res);
    }
    if (modifiers.nonNull) {
        res = new GraphQLNonNull(res);
    }
    return res;
}

function isIdentifier(field: GraphQLField<any, any> | GraphQLInputField) {
    const directives = field.extensions.directives as any;
    return directives && directives['identifier'];
}
