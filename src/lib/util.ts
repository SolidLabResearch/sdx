import { GraphQLSchema, printSchema } from 'graphql';
import { Context } from "./context.js";
import { Quad, Quad_Subject, Store } from "n3";

export function parseNameFromUri(uriString: string): string {
    const uri = new URL(uriString);
    // If the URI has a fragment, use fragment, otherwise use the last path segment
    return uri.hash.length > 0 ? uri.hash.slice(1) : uri.pathname.slice(uri.pathname.lastIndexOf('/'));
}

export function groupBySubject(store: Store): Map<Quad_Subject, Quad[]> {
    const index: Map<Quad_Subject, Quad[]> = new Map();
    store.getQuads(null, null, null, null).forEach(quad => {
        if (index.has(quad.subject)) {
            index.get(quad.subject)!.push(quad)
        } else {
            index.set(quad.subject, [quad]);
        }
    });
    return index;
}

export function printSchemaWithDirectives(schema: GraphQLSchema, context: Context): string {
    const sdl = printSchema(schema);
    return sdl.split('\n').map(line => {
        const parts = line.split(/\s/);
        if (parts[0] === 'type') {
            const typeName = parts[1];
            console.log(typeName);
            const type = context.getGraphQLTypes().find(t => typeName === t.name);
            if (type) {
                const directive = (type?.extensions?.directives as any)?.is;
                return line.slice(0, line.length - 1) + `@is(class: "${directive.class}") {`;
            }
        }
        return line;
    }).join('\n');
}
