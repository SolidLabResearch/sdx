export interface NpmSearchResult {
    objects: NpmSearchResultObject[];
    total: number;
    time: string;
}

export interface NpmSearchResultObject {
    package: NpmPackage;
    score: NpmScore;
    searchScore: number;
}

export interface NpmPackage {
    name: string;
    version: string;
    scope: string;
    description: string;
    keywords: string[];
    date: string;
    links: Record<string, string>
    publisher: NpmUser;
    maintainers: NpmUser[];
}

export interface NpmUser {
    username: string;
    email: string;
}

export interface NpmScore {
    final: number;
    detail: {
        quality: number;
        popularity: number;
        maintenance: number;
    }
}

export interface NpmDownloadsPointResult {
    downloads: number;
    start: string;
    end: string;
    package: string;
}

export interface InitOptions {
    force: boolean;
}

export interface SdxConfig {
    formatVersion: string;
    repositories: SdxRepository[];

}
export interface SolidManifest {
    formatVersion: string;
    name: string;
    author: string;
    license: string;
    types: SolidType[];
}

export interface SdxRepository {
    name: string;
    uri: string;
}

export interface SolidType {
    id: string;
    name?: string;
    description?: string;
    license?: string;
    author?: string;
    maintainers: string;
    createdAt: string;
    lastModifiedAt?: string;
    homepage?: string;
    repository?: string;
    downloads: number;
}
export interface Page<T> {
    items: T[];
    cursor?: string;
    count?: number;
}

/**
 * Arguments for querying the API in case of collections.
 */
export interface PageArgs {
    /** Cursor pointing to the next {@link Page} */
    cursor?: string;
    /** Filter to filter the results */
    filter?: string;
    /** Limits the number of items in a page */
    limit?: number;

    /** Order by a field, append with <space> desc|asc */
    orderBy?: string;
}

/**
 * Arguments for filtering, cursor property cannot be used.
 */
export type FilterArgs = Omit<PageArgs, 'cursor'>
