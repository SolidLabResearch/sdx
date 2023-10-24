export interface InitOptions {
  force: boolean;
  noLibs: boolean;
  name?: string;
}

export interface SdxConfig {
  formatVersion: string;
  catalogs: SolidCatalog[];
  options: SdxConfigOptions;
}

export interface SdxConfigOptions {
  /** Trigger autogeneration of GraphQL schema and SDK on (un)installing shacl shapes etc.*/
  autoGenerate: boolean;
  /** Client credentials for authenticating the client */
  clientCredentials?: {
    id: string;
    secret: string;
  };
  /** The requests are raw, meaning they respond with data and error keys (instead of just value of the data key) */
  rawRequest: boolean;
}

export interface SolidManifest {
  formatVersion: string;
  name: string;
  author: string;
  license: string;
  shapePackages: ShapePackage[];
}

export interface SolidCatalog {
  name: string;
  uri: string;
}
export interface ShapePackage extends Dated {
  id: string;
  maintainers: string[];
  name?: string;
  description?: string;
  license?: string;
  contributor?: string;
  homepage?: string;
  repository?: string;
  downloads?: number;
  prefixes?: Record<string, string>;
}

export interface Shape extends Dated {
  id: string;
  packageIdentifier: string;
  name?: string;
  description?: string;
  properties: ShapeProperty[];
}

export interface ShapeProperty {
  class: string | null;
  name: string;
  path: string | null;
  description: string | null;
  datatype: string | null;
  nodeKind: string | null;
  minCount: number | null;
  maxCount: number | null;
}

export interface Page<T> {
  items: T[];
  cursor?: string;
  count?: number;
}

export interface Dated {
  createdAt: string;
  lastModifiedAt?: string;
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
export type FilterArgs = Omit<PageArgs, 'cursor'>;

export interface PackageImportReport {
  shapesCreated: string[];
  shapesUpdated: string[];
}

export interface SearchShapeOutput {
  shapePackage: ShapePackage;
  shapeMatches: string[];
}
