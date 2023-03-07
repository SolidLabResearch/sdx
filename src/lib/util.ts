export function parseNameFromUri(uriString: string): string {
    const uri = new URL(uriString);
     // If the URI has a fragment, use fragment, otherwise use the last path segment
    return uri.hash.length > 0 ? uri.hash.slice(1) : uri.pathname.slice(uri.pathname.lastIndexOf('/'));
}
