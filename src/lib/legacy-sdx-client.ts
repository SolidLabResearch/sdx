import { RxHR } from "@akanass/rx-http-request";
import { defaultFieldResolver, graphql, GraphQLResolveInfo, GraphQLSchema, isListType, isNonNullType, isScalarType } from "graphql";
import { DataFactory, Parser, Quad, Store } from "n3";
import { Context } from "./context.js";

const http = RxHR;
const { namedNode } = DataFactory;


export class LegacySdxClient {

    constructor(private schema: GraphQLSchema, private podLocation: string) { }

    async query<T>(query: string, location?: string): Promise<T> {
        const result = await graphql({
            source: query,
            schema: this.schema,
            fieldResolver: this.fieldResolver(location ?? this.podLocation)
        });
        return result.data as T;
    }

    private fieldResolver = <TSource, TArgs>(location: string) => (source: TSource, args: TArgs, context: Context, info: GraphQLResolveInfo): unknown => {
        const { returnType, schema, fieldName, parentType } = info;
        const rootTypes = [
            schema.getQueryType()?.name,
            schema.getMutationType()?.name,
            schema.getSubscriptionType()?.name,
        ].filter(t => !!t);

        // Array
        if (isListType(returnType)) {
            const type = schema.getType(returnType.ofType.toString());
            const className = (type?.extensions!.directives! as any).is['class'] as string;
            return [getContact(className)];

        }
        // Scalar
        else if (isScalarType(returnType) || (isNonNullType(returnType) && isScalarType(returnType.ofType))) {
            if (fieldName === 'id') {
                const type = schema.getType(parentType.toString());
                const className = (type?.extensions!.directives! as any).is['class'] as string;
                // console.log(className)
                return className
            } else {
                // return fieldName
                return defaultFieldResolver(source, args, context, info);
            }
        }
        // Object type
        else {
            console.log('NON scalar')

            // If parentType is RootQueryType
            // Download complete graph
            if (rootTypes.includes(parentType.name)) {
                return getGraph(location);
            } else {
                const type = schema.getType(returnType.toString());
                const className = (type?.extensions!.directives! as any).is['class'] as string;
                return getSubGraph(source as Quad[], className);
            }

            // Else 
            // Load Subgraph


            // if (type && type.name === 'Contact') {
            //     console.log('IN contact')
            //     const contact = getContact(className);;
            //     return contact;
            // } else {
            //     console.log('IN generic')
            //     return defaultFieldResolver(source, args, context, info);
            // }
        }
    };

}

async function getSubGraph(source: Quad[], className: string): Promise<Quad[]> {
    const store = new Store(source);
    // store.
    return [];
}

async function getGraph(location: string): Promise<Quad[]> {
    const doc = await http.get(location).toPromise();
    const ttl = doc.body;
    return new Parser({ format: 'turtle' }).parse(ttl);
}

async function getContact(className: string) {

    return http.get('http://localhost:3000/wkerckho.ttl').toPromise().then(res => {
        const ttl = res.body;
        const store = new Store(new Parser().parse(ttl));
        console.log(store.getQuads(null, null, null, null))
        // const subs = store.getSubjects(RDFS.a, namedNode(className), null).flatMap(sub => store.getQuads(sub, null, null, null));
        const id = 'myId';
        const givenName = store.getObjects(null, namedNode('http://schema.org/givenName'), null).at(0)!.value;
        const familyName = store.getObjects(null, namedNode('http://schema.org/familyName'), null).at(0)!.value;
        const email = store.getObjects(null, namedNode('http://schema.org/email'), null).at(0)?.value;
        return { id, givenName, familyName, email }
    })


}
