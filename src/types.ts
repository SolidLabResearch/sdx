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

export interface ProgramOptions {
    test: boolean;
}

export enum Scope {
    TEST = 'solidlab-types',
    PRODUCTION = 'solid-types'
} 
