import { Quad, Quad_Subject } from "n3";

export function parseNameFromUri(uriString: string): string {
    const uri = new URL(uriString);
    // If the URI has a fragment, use fragment, otherwise use the last path segment
    return uri.hash.length > 0 ? uri.hash.slice(1) : uri.pathname.slice(uri.pathname.lastIndexOf('/') + 1);
}

export function groupBySubject(quads: Quad[]): Map<Quad_Subject, Quad[]> {
    return quads.reduce((index, quad) => {
        if (index.has(quad.subject)) {
            index.get(quad.subject)!.push(quad)
        } else {
            index.set(quad.subject, [quad]);
        }
        return index;
    }, new Map<Quad_Subject, Quad[]>());
}
