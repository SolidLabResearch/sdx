import { RxHR } from "@akanass/rx-http-request";
import { PathLike } from "fs";
import { readFile, writeFile } from "fs/promises";
import { graphql, GraphQLObjectType, GraphQLSchema } from "graphql";
import { defaultFieldResolver } from "graphql/execution/execute.js";
import { DirectiveLocation } from "graphql/language/directiveLocation.js";
import { Source } from "graphql/language/source.js";
import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull, GraphQLObjectTypeConfig, GraphQLResolveInfo, GraphQLType } from "graphql/type/definition.js";
import { GraphQLDirective } from "graphql/type/directives.js";
import { isListType, isNonNullType, isScalarType } from "graphql/type/index.js";
import * as Scalars from "graphql/type/scalars.js";
import { DataFactory, Parser, Store } from 'n3';
import { dirname } from "path";
import { autoInjectable, singleton } from "tsyringe";
import { TARGET_GRAPHQL_FILE_PATH, TEST_GRAPHQL_FILE_PATH } from "../constants.js";
import { Context } from "../lib/context.js";
import { PropertyShape } from "../lib/property-shape.js";
import { SchemaPrinter } from "../lib/schema-printer.js";
import { Shape } from "../lib/shape.js";
import { printSchemaWithDirectives } from "../lib/util.js";
import { ensureDir } from "../util.js";

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
    args: { class: { type: Scalars.GraphQLString } },
    locations: [DirectiveLocation.FIELD_DEFINITION]
})
const http = RxHR;

@singleton()
@autoInjectable()
export class ShaclParserService {
    private parser: Parser;
    private context?: Context;

    constructor(private printer?: SchemaPrinter) {
        this.parser = new Parser({ format: 'turtle' });
    }

    /**
     * Parses a SHACL file at the given `path` to a GraphQL schema.
     * @param path 
     */
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
            directives: [IS_DIRECTIVE, PROPERTY_DIRECTIVE, IDENTIFIER_DIRECTIVE],
            // types: this.context.getGraphQLTypes()
        });

        // Write schema to file
        ensureDir(dirname(TEST_GRAPHQL_FILE_PATH))
            .then(_ => writeFile(TARGET_GRAPHQL_FILE_PATH, printSchemaWithDirectives(schema, this.context!), { flag: 'w' }))
            .then(_ => writeFile(TEST_GRAPHQL_FILE_PATH, this.printer!.printSchema(schema, this.context!), { flag: 'w' }));

        const source = new Source('{ contact(id:"id1") { id givenName } contacts { id givenName }}')

        graphql({
            schema,
            source,
            fieldResolver: this.fieldResolver,
            contextValue: this.context,
        }).then(res => {
            console.log('-------------------------------')
            console.log(JSON.stringify(res.data!, null, 2));
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
        } as GraphQLObjectTypeConfig<any, any>);

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
                                property: { iri: prop.path }
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
                    is: { class: shape.targetClass }
                }
            },
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

    private fieldResolver<TSource, TArgs>(source: TSource, args: TArgs, context: Context, info: GraphQLResolveInfo): unknown {
        const { returnType, schema, fieldName, parentType, rootValue } = info;

        console.debug(`Resolving: ${returnType.toString()} [parent: ${parentType.toString()}]`)
        console.log('rootValue:'+rootValue)
        if (isListType(returnType)) {
            const type = schema.getType(returnType.ofType.toString());
            const className = (type?.extensions!.directives! as any).is['class'] as string;
            return [getContact(className)];

        } else if (isScalarType(returnType) || (isNonNullType(returnType) && isScalarType(returnType.ofType))) {
            if (fieldName === 'id') {
                const type = schema.getType(parentType.toString());
                const className = (type?.extensions!.directives! as any).is['class'] as string;
                // console.log(className)
                return className
            } else {
                // return fieldName
                return defaultFieldResolver(source, args, context, info);
            }
        } else {
            console.log('NON scalar')
            const type = schema.getType(returnType.toString());
            const className = (type?.extensions!.directives! as any).is['class'] as string;
            if (type && type.name === 'Contact') {
                console.log('IN contact')
                const contact = getContact(className);;
                return contact;
            } else {
                console.log('IN generic')
                return defaultFieldResolver(source, args, context, info);
            }
        }
    }

}
async function getContact(className: string) {
    return http.get('http://localhost:8080/my-pod/contacts/wkerckho.ttl').toPromise().then(res => {
        const ttl = res.body;
        const store = new Store(new Parser().parse(ttl));
        // const subs = store.getSubjects(RDFS.a, namedNode(className), null).flatMap(sub => store.getQuads(sub, null, null, null));
        const id = 'myId';
        const givenName = store.getObjects(null, namedNode('http://schema.org/givenName'), null).at(0)!.value;
        const familyName = store.getObjects(null, namedNode('http://schema.org/familyName'), null).at(0)!.value;
        const email = store.getObjects(null, namedNode('http://schema.org/email'), null).at(0)?.value;
        return { id, givenName, familyName, email }
    })
}
