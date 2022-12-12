export interface SdxConfig {
    formatVersion: string;
    repositories: SdxRepository[];

}
export interface SolidManifest {
    formatVersion: string;
    name: string;
    types: SolidType[];
}

export interface SdxRepository {
    name: string;
    uri: string;
}

export interface SolidType {
    name: string;
    revision: string;
    uri: string;
}

export const DEFAULT_SDX_CONFIG: SdxConfig = {
    formatVersion: '1.0.0',
    repositories: []
};

export const DEFAULT_SOLID_MANIFEST: SolidManifest = {
    formatVersion: '1.0.0',
    name: 'my-solid-app',
    types: [],
};
